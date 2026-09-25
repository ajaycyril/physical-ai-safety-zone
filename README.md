# Physical Intelligence Lab

A public, working reference implementation for a **Physical Intelligence operating stack**: grounded intent, world state, mission orchestration, policy routing, robot-edge safety, browser physics, live camera perception, and evidence replay.

**Live site:** https://next-project-to-show-physical-ai.vercel.app  
**Live robotics lab:** https://next-project-to-show-physical-ai.vercel.app/lab  
**World State deep dive:** https://next-project-to-show-physical-ai.vercel.app/world-models.html  
**Robotics Stack deep dive:** https://next-project-to-show-physical-ai.vercel.app/robotics-stack.html

## The thesis

Robot hardware and frontier models will keep changing. The durable product layer is the operating loop that connects human intent to trusted physical state, governed missions, safe execution, and verified outcomes.

```text
Intent Agent
    ↓
Mission Orchestrator
    ↓
World State Engine
    ↓
Policy Router
    ↓
Robot Edge Runtime
    ↓
OEM Runtime
    ↓
Embodiment

↕ Data / Learning Plane
↕ Safety / Trust Plane
```

The live lab implements that loop rather than only diagramming it.

## What is actually running

### 1. Browser robot physics

The primary simulator uses the official Google DeepMind **MuJoCo JavaScript/WebAssembly bindings** with a Three.js renderer.

The MJCF scene contains:

- planar mobile robot R-07,
- articulated two-joint arm and pusher,
- Pump P-204,
- Valve V-12,
- a controlled operating zone,
- free-body crate PL-9,
- staging bay S-3,
- walls, contacts, friction, gravity, actuators, and local motor control.

Navigation is closed-loop. Robot pose is read back from MuJoCo state. PL-9 is a free body and the manipulation sequence moves it through physical contact.

MuJoCo JS bindings: https://github.com/google-deepmind/mujoco/tree/main/wasm

A deterministic Three.js fallback is intentionally included for demo resilience. The UI explicitly reports which runtime is active; it never labels the fallback as MuJoCo.

### 2. Intent Agent

The operator writes an operational request such as:

> Inspect Pump P-204, verify Valve V-12, recover crate PL-9 to staging bay S-3 if the aisle is clear, and return to dock. Stop locally if the safety camera detects a person.

The browser sends the intent together with the current world snapshot to `/api/agent`.

The mission compiler returns:

- grounded world assessment,
- tool surface,
- executable mission steps,
- selected execution policies,
- safety requirements,
- approval boundaries.

The current implementation is deterministic by design so the demo has no model/API-key dependency. The agent interface is intentionally separable from the execution stack so a frontier reasoning model can later sit behind the same tool contract without changing robot control.

### 3. Live World State Engine

The world view fuses state from multiple sources:

| Entity | Live source |
| --- | --- |
| R-07 robot pose | MuJoCo body state |
| PL-9 crate pose | MuJoCo free-body state |
| P-204 thermal condition | simulated sensor observation |
| V-12 verification state | mission evidence |
| CAM-01 person state | MediaPipe browser inference |
| Mission state | Mission Orchestrator |
| Safety state | local safety policy |

The interface distinguishes **observed**, **verified**, **planned**, and **authorized** state and renders the current relationships as a semantic scene graph.

### 4. Mission Orchestrator

A compiled intent becomes a stateful mission rather than a direct robot command.

Typical mission:

```text
world.query
→ navigate P-204
→ inspect P-204
→ navigate V-12
→ verify V-12
→ navigate PL-9
→ manipulate PL-9 → S-3
→ return DOCK
→ evidence.commit
```

The orchestrator owns mission progress, approvals, evidence, and end-to-end traceability.

### 5. Policy Router

Execution is deliberately heterogeneous.

The reference router demonstrates the boundary between:

- deterministic local navigation,
- vision-language inspection,
- embodied manipulation policy,
- OEM low-level control.

The architecture is designed so robotics foundation models can be plugged behind these contracts without coupling the customer workflow to one model vendor.

### 6. Robot Edge Runtime and safety

Safety remains below the reasoning layer.

The edge/runtime boundary demonstrates:

- local motion authority,
- pause / resume,
- controlled-zone approval,
- human-yield behavior,
- safe stopping independent of the mission planner.

A cloud agent is never treated as an emergency stop.

### 7. Real browser camera stream

The lab can open the user’s webcam with `getUserMedia()`.

MediaPipe Pose Landmarker runs **in the browser** and derives person presence. Raw video is not uploaded by this demo.

MediaPipe Tasks Vision: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js

When **Bind to Safety Zone** is enabled, live person presence becomes world state and can pause robot motion locally while a mission is executing.

### 8. Evidence and learning loop

The system trace records:

- grounded state,
- mission steps,
- selected policies,
- robot actions,
- physics outcomes,
- safety interventions,
- approvals,
- observations and verification events.

At mission completion the trace is treated as a replayable episode for evaluation and future learning.

## Technology stack

- Next.js 16 / React
- Vercel
- TypeScript
- Google DeepMind MuJoCo JS/WASM
- Three.js
- MediaPipe Tasks Vision
- browser `getUserMedia`
- server-side Next route handlers
- static high-performance strategy/deep-dive pages

## Run locally

Requirements:

- Node.js 20+
- a modern Chromium/Safari browser with WebGL
- HTTPS or localhost for camera access

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/lab
```

Production build:

```bash
npm run build
npm start
```

## Demo sequence

For the strongest end-to-end walkthrough:

1. Open the architecture page and explain the layer separation.
2. Open **Live Lab**.
3. Confirm the top-left runtime reads `MuJoCo ... live dynamics`.
4. Click **Start Live Camera** and allow camera access.
5. Enable **Bind to Safety Zone**.
6. Compile the default mission.
7. Dispatch it.
8. Watch R-07 physically navigate in the 3D scene.
9. Approve controlled-zone entry.
10. Approve crate manipulation.
11. Watch the articulated robot push PL-9 toward S-3.
12. During motion, step into the webcam view to demonstrate local human-yield safety.
13. Clear the camera and let the mission continue.
14. Open the World / Mission / Policy / Learning tabs and show the full trace.

## Architecture principles

- **Intent is not actuation.**
- **The world model owns trusted state, not imagined truth.**
- **Mission orchestration owns workflow and evidence.**
- **Policy selection is pluggable.**
- **Safety authority lives below reasoning.**
- **Robot/OEM diversity is hidden behind stable capability contracts.**
- **Every mission returns evidence and learning data.**

## Transparency

This is a reference implementation and product thesis, not a claim that every frontier robotics model shown in the architecture is running inside the browser.

What is real in the live lab:

- browser physics runtime,
- 3D robot movement,
- articulated manipulation,
- mutable world state,
- mission compiler,
- orchestration state machine,
- policy routing,
- safety approvals,
- live camera input,
- on-device person detection,
- safety binding,
- event/evidence trace.

The goal is to make the interfaces between a production Physical Intelligence stack tangible and executable.
