# Physical AI Safety Zone

A working physical-AI demo built around [`roboflow/supervision`](https://github.com/roboflow/supervision).

Live production demo: https://next-project-to-show-physical-ai.vercel.app

The repo has two pieces:

- **Vercel dashboard**: a Next.js control-room UI, simulator, health endpoint, and lightweight event-ingestion API.
- **Edge agent**: a local Python process that runs YOLO + `supervision` on a webcam or video, tracks people, detects entry into a polygon zone, calculates dwell time, and optionally drives a serial device or posts events to the Vercel API.

## Why this demo

This is intentionally a quick physical win: no custom model training, obvious real-world behavior, and a clear path from laptop webcam to hardware output. `supervision` supplies the reusable CV primitives: detections, annotators, tracking, and polygon zones.

## What it demonstrates

The demo turns an ordinary webcam into a simple no-go-zone monitor:

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
Camera or video file
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
        +--> webhook events: /api/events
                  |
                  v
        Vercel-hosted Next.js dashboard
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

- person boxes appear,
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
