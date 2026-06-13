from __future__ import annotations

import argparse
import json
import time
from dataclasses import dataclass, field
from typing import Iterable

import cv2
import numpy as np
import requests
import supervision as sv
from ultralytics import YOLO

try:
    import serial
except ImportError:  # pragma: no cover - pyserial is optional unless --serial-port is used
    serial = None


PERSON_CLASS_ID = 0


@dataclass
class DwellState:
    entered_at: dict[int, float] = field(default_factory=dict)

    def update(self, tracker_ids: Iterable[int], now: float) -> dict[int, float]:
        active_ids = set(int(tracker_id) for tracker_id in tracker_ids)
        for tracker_id in active_ids:
            self.entered_at.setdefault(tracker_id, now)

        for tracker_id in list(self.entered_at):
            if tracker_id not in active_ids:
                del self.entered_at[tracker_id]

        return {tracker_id: now - entered_at for tracker_id, entered_at in self.entered_at.items()}


class SerialAlert:
    def __init__(self, port: str | None, baudrate: int) -> None:
        self.port = port
        self.state: bool | None = None
        self.connection = None
        if port:
            if serial is None:
                raise RuntimeError("pyserial is required when --serial-port is provided")
            self.connection = serial.Serial(port, baudrate=baudrate, timeout=1)

    def set(self, alert: bool) -> None:
        if self.state == alert:
            return

        self.state = alert
        if self.connection:
            command = b"ALERT_ON\n" if alert else b"ALERT_OFF\n"
            self.connection.write(command)

    def close(self) -> None:
        if self.connection:
            self.connection.close()


def parse_source(source: str) -> int | str:
    return int(source) if source.isdigit() else source


def parse_zone(points: str) -> np.ndarray:
    parsed_points = []
    for point in points.split():
        x_raw, y_raw = point.split(",", 1)
        parsed_points.append([int(x_raw), int(y_raw)])

    if len(parsed_points) < 3:
        raise ValueError("Zone must contain at least three points")

    return np.array(parsed_points, dtype=np.int32)


def draw_zone_from_frame(frame: np.ndarray) -> np.ndarray:
    points: list[list[int]] = []
    window_name = "Draw restricted zone - click points, Enter to lock"

    def on_mouse(event, x, y, _flags, _param):
        if event == cv2.EVENT_LBUTTONDOWN:
            points.append([x, y])

    cv2.namedWindow(window_name)
    cv2.setMouseCallback(window_name, on_mouse)

    while True:
        preview = frame.copy()
        for index, point in enumerate(points):
            cv2.circle(preview, point, 5, (34, 130, 72), -1)
            cv2.putText(
                preview,
                str(index + 1),
                (point[0] + 8, point[1] - 8),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (34, 130, 72),
                2,
                cv2.LINE_AA,
            )
        if len(points) > 1:
            cv2.polylines(preview, [np.array(points, dtype=np.int32)], False, (34, 130, 72), 2)
        if len(points) > 2:
            closed = np.array(points, dtype=np.int32)
            overlay = preview.copy()
            cv2.fillPoly(overlay, [closed], (34, 130, 72))
            preview = cv2.addWeighted(overlay, 0.18, preview, 0.82, 0)

        cv2.putText(
            preview,
            "Click 3+ points. Enter=lock zone, Backspace=undo, Esc/Q=cancel",
            (18, 32),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.imshow(window_name, preview)
        key = cv2.waitKey(20) & 0xFF
        if key in (13, 10) and len(points) >= 3:
            cv2.destroyWindow(window_name)
            return np.array(points, dtype=np.int32)
        if key in (8, 127) and points:
            points.pop()
        if key in (27, ord("q")):
            cv2.destroyWindow(window_name)
            raise RuntimeError("Zone drawing cancelled")


def post_event(webhook_url: str | None, payload: dict) -> None:
    if not webhook_url:
        return

    try:
        requests.post(webhook_url, json=payload, timeout=1.5)
    except requests.RequestException as exc:
        print(f"warning: failed to post event: {exc}")


def open_writer(path: str | None, capture: cv2.VideoCapture, width: int, height: int):
    if not path:
        return None

    fps = capture.get(cv2.CAP_PROP_FPS)
    if not fps or fps < 1:
        fps = 25
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    return cv2.VideoWriter(path, fourcc, fps, (width, height))


def build_labels(detections: sv.Detections, dwell_seconds: dict[int, float]) -> list[str]:
    labels = []
    tracker_ids = detections.tracker_id
    confidences = detections.confidence

    if tracker_ids is None:
        return ["person" for _ in detections]

    for index, tracker_id in enumerate(tracker_ids):
        confidence = confidences[index] if confidences is not None else 0
        dwell = dwell_seconds.get(int(tracker_id), 0)
        suffix = f" dwell {dwell:.1f}s" if dwell > 0 else ""
        labels.append(f"person #{int(tracker_id)} {confidence:.2f}{suffix}")

    return labels


def run(args: argparse.Namespace) -> None:
    model = YOLO(args.weights)
    capture = cv2.VideoCapture(parse_source(args.source))

    if not capture.isOpened():
        raise RuntimeError(f"Unable to open source: {args.source}")

    ok, frame = capture.read()
    if not ok:
        raise RuntimeError("Unable to read first frame")

    height, width = frame.shape[:2]
    capture.set(cv2.CAP_PROP_POS_FRAMES, 0)

    zone_polygon = draw_zone_from_frame(frame) if args.draw_zone or not args.zone else parse_zone(args.zone)
    zone = sv.PolygonZone(polygon=zone_polygon)
    tracker = sv.ByteTrack()
    dwell = DwellState()
    serial_alert = SerialAlert(args.serial_port, args.serial_baudrate)
    writer = open_writer(args.output, capture, width, height)

    box_annotator = sv.BoxAnnotator(thickness=2)
    label_annotator = sv.LabelAnnotator(text_thickness=1, text_scale=0.45)
    trace_annotator = sv.TraceAnnotator(thickness=2)
    zone_annotator = sv.PolygonZoneAnnotator(zone=zone, opacity=0.18, thickness=3)

    last_event_at = 0.0
    last_tick = time.perf_counter()
    fps = 0.0

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                if args.loop and not str(args.source).isdigit():
                    capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                break

            now = time.perf_counter()
            delta = max(now - last_tick, 1e-6)
            last_tick = now
            fps = fps * 0.9 + (1 / delta) * 0.1 if fps else 1 / delta

            result = model(frame, conf=args.confidence, iou=args.iou, verbose=False)[0]
            detections = sv.Detections.from_ultralytics(result)
            detections = detections[detections.class_id == PERSON_CLASS_ID]
            detections = tracker.update_with_detections(detections)

            in_zone_mask = zone.trigger(detections)
            detections_in_zone = detections[in_zone_mask]
            tracker_ids = detections_in_zone.tracker_id.tolist() if detections_in_zone.tracker_id is not None else []
            dwell_seconds = dwell.update(tracker_ids, now)
            alert = zone.current_count > 0
            serial_alert.set(alert)

            labels = build_labels(detections, dwell_seconds)
            annotated = frame.copy()
            annotated = trace_annotator.annotate(scene=annotated, detections=detections)
            annotated = box_annotator.annotate(scene=annotated, detections=detections)
            annotated = label_annotator.annotate(scene=annotated, detections=detections, labels=labels)
            annotated = zone_annotator.annotate(scene=annotated, label=f"restricted: {zone.current_count}")

            cv2.putText(
                annotated,
                f"{'ALERT' if alert else 'CLEAR'} | people in zone: {zone.current_count} | fps: {fps:.1f}",
                (18, 32),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.8,
                (34, 34, 220) if alert else (34, 130, 72),
                2,
                cv2.LINE_AA,
            )

            if writer:
                writer.write(annotated)

            if args.display:
                cv2.imshow("Physical AI Safety Zone", annotated)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            if args.webhook_url and time.time() - last_event_at >= args.event_interval:
                payload = {
                    "id": f"edge-{int(time.time() * 1000)}",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "alert": alert,
                    "zoneCount": zone.current_count,
                    "maxDwellSeconds": max(dwell_seconds.values(), default=0.0),
                    "source": args.source,
                    "fps": round(fps, 2),
                    "trackedIds": [int(tracker_id) for tracker_id in tracker_ids],
                }
                post_event(args.webhook_url, payload)
                if args.print_events:
                    print(json.dumps(payload))
                last_event_at = time.time()

            if args.max_frames and capture.get(cv2.CAP_PROP_POS_FRAMES) >= args.max_frames:
                break
    finally:
        serial_alert.close()
        capture.release()
        if writer:
            writer.release()
        if args.display:
            cv2.destroyAllWindows()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Physical AI restricted-zone monitor using roboflow/supervision.")
    parser.add_argument("--source", default="0", help="Camera index or video file path.")
    parser.add_argument("--zone", help='Polygon points, for example: "160,130 500,110 560,400 120,420".')
    parser.add_argument("--draw-zone", action="store_true", help="Draw the polygon interactively on the first frame.")
    parser.add_argument("--weights", default="yolo11n.pt", help="Ultralytics YOLO weights.")
    parser.add_argument("--confidence", type=float, default=0.35, help="Detection confidence threshold.")
    parser.add_argument("--iou", type=float, default=0.7, help="NMS IoU threshold.")
    parser.add_argument("--display", action=argparse.BooleanOptionalAction, default=True, help="Show annotated OpenCV window.")
    parser.add_argument("--loop", action="store_true", help="Loop video files.")
    parser.add_argument("--output", help="Optional annotated MP4 output path.")
    parser.add_argument("--max-frames", type=int, default=0, help="Stop after N frames. Useful for smoke tests.")
    parser.add_argument("--webhook-url", help="Optional Vercel /api/events URL.")
    parser.add_argument("--event-interval", type=float, default=1.0, help="Seconds between webhook events.")
    parser.add_argument("--print-events", action="store_true", help="Print webhook payloads to stdout.")
    parser.add_argument("--serial-port", help="Optional serial port, for example COM5 or /dev/ttyUSB0.")
    parser.add_argument("--serial-baudrate", type=int, default=115200)
    return parser


if __name__ == "__main__":
    run(build_parser().parse_args())
