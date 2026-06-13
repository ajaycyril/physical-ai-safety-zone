# Physical AI Safety Zone

A working physical-AI demo built around [`roboflow/supervision`](https://github.com/roboflow/supervision).

Live production demo: https://next-project-to-show-physical-ai.vercel.app

The repo has two real-time pieces:

- **Vercel webcam demo**: a Next.js browser app that opens your webcam, lets you draw a polygon zone, and alerts when motion enters the zone.
- **Supervision edge agent**: a local Python process that runs YOLO + `supervision` on a webcam or video, tracks people, detects entry into a polygon zone, calculates dwell time, and optionally drives a serial device or posts events to the Vercel API.

## Why this demo

This is intentionally a quick physical win: no custom model training, obvious real-world behavior, and a clear path from laptop webcam to hardware output. `supervision` supplies the reusable CV primitives: detections, annotators, tracking, and polygon zones.

## What it demonstrates

The browser demo turns an ordinary webcam into a simple no-go-zone monitor:

1. Open the live Vercel page.
2. Click **Start webcam** and allow camera access.
3. Use the sample zone or draw your own polygon by clicking on the live video.
4. Move your hand or another object inside the zone.
5. The dashboard changes to `ALERT` when motion is detected inside the zone.

The local `supervision` edge agent runs the model-based version:

1. A camera watches a workcell, counter, aisle, or taped floor area.
2. YOLO detects people locally.
3. `supervision` converts model output into `sv.Detections`.
4. `sv.ByteTrack` assigns persistent IDs.
5. `sv.PolygonZone` detects whether tracked people are inside a restricted polygon.
6. The edge agent calculates dwell time and emits `ALERT_ON` or `ALERT_OFF`.
7. The dashboard visualizes zone state, recent events, and the end-to-end architecture.

This maps cleanly to industrial safety, retail queue monitoring, warehouse restricted areas, robot-cell supervision, and smart-space demos.

## Architecture

```text
Browser webcam
        |
        v
Vercel-hosted Next.js dashboard
  - draw polygon zone
  - detect motion inside zone
  - post alert events

Local camera or video file
        |
        v
Local Python edge agent
  - Ultralytics YOLO
  - roboflow/supervision Detections
  - ByteTrack
  - PolygonZone
  - annotators
        |
        +--> serial output: LED, buzzer, relay, controller
        |
        +--> webhook events: Vercel /api/events
```

## Run the dashboard

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run the edge agent

Python 3.10+ recommended.

```bash
cd edge_agent
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python safety_zone_agent.py --source 0 --zone "160,130 500,110 560,400 120,420"
```

Draw the zone interactively instead:

```bash
python safety_zone_agent.py --source 0 --draw-zone
```

Post telemetry to a deployed dashboard:

```bash
python safety_zone_agent.py ^
  --source 0 ^
  --zone "160,130 500,110 560,400 120,420" ^
  --webhook-url "https://YOUR-VERCEL-APP.vercel.app/api/events"
```

Drive an Arduino/ESP32 over USB serial:

```bash
python safety_zone_agent.py --source 0 --zone "160,130 500,110 560,400 120,420" --serial-port COM5
```

The serial protocol is intentionally small:

- `ALERT_ON\n` while one or more people are inside the zone.
- `ALERT_OFF\n` when the zone is clear.

## Production note

The Vercel `/api/events` endpoint is a demo-grade ephemeral event buffer. It is enough to prove edge-to-cloud wiring, but durable production telemetry should use a real store such as Postgres, Redis, or a message queue.

## Verification

```bash
npm run verify
npm run e2e
```

For the physical loop, run `edge_agent/safety_zone_agent.py` against a webcam or recorded video and confirm:

- webcam/video frames appear in real time,
- the browser demo alerts when hand/object motion enters the drawn zone,
- the Python edge agent shows person boxes,
- tracker IDs stay stable,
- the polygon zone count changes,
- dwell seconds increase per tracked person,
- serial/webhook alerts fire when the zone is occupied.

Latest verified production status:

- Vercel production URL: https://next-project-to-show-physical-ai.vercel.app
- Production e2e passed
- `/api/health` returned 200
- `/api/events` accepted POST and returned the posted event
- no browser console errors
- Vercel runtime error log scan was clean
