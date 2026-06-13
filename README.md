# Physical AI Safety Zone

A working physical-AI demo built around [`roboflow/supervision`](https://github.com/roboflow/supervision).

The repo has two pieces:

- **Vercel dashboard**: a Next.js control-room UI, simulator, health endpoint, and lightweight event-ingestion API.
- **Edge agent**: a local Python process that runs YOLO + `supervision` on a webcam or video, tracks people, detects entry into a polygon zone, calculates dwell time, and optionally drives a serial device or posts events to the Vercel API.

## Why this demo

This is intentionally a quick physical win: no custom model training, obvious real-world behavior, and a clear path from laptop webcam to hardware output. `supervision` supplies the reusable CV primitives: detections, annotators, tracking, and polygon zones.

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
```

For the physical loop, run `edge_agent/safety_zone_agent.py` against a webcam or recorded video and confirm:

- person boxes appear,
- tracker IDs stay stable,
- the polygon zone count changes,
- dwell seconds increase per tracked person,
- serial/webhook alerts fire when the zone is occupied.
