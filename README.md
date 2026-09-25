# Physical Intelligence / control room

A single-screen demonstration of camera perception, world state, mission orchestration and robot execution.

**Site:** https://next-project-to-show-physical-ai.vercel.app  
**Control room:** https://next-project-to-show-physical-ai.vercel.app/studio.html

## Run the task

Click **Run mission**. Follow the bottom workflow and the active layer on the left. Approve the scoped valve action when requested. The robot navigates, scans an instrument, performs a valve sequence, verifies the resulting state and returns to its dock.

Switch to **Architecture** to inspect each layer's components and input/output contract. **Trace a sample task** animates the handoffs without executing a mission.

## What is real, and what is simulated

| Component | Implementation |
|---|---|
| Factory video | Self-hosted, recorded footage. Not a live factory feed. |
| Person detection | MediaPipe EfficientDet Lite0 evaluates actual video frames in the browser. Scores are model outputs. |
| Camera-to-world binding | An operator-selected image region is mapped to the demo aisle. This is not automatic metric 3D reconstruction. |
| Mission planning | Bounded rule-based Next.js compiler using current world state. No LLM dependency. |
| Navigation | A* grid planning, obstacle inflation, waypoint execution and local feedback. |
| Robot dynamics | MuJoCo WebAssembly, named joints and position actuators. The mobile base is planar constrained; wheel visuals use odometry. |
| Arm and valve | Joint-space inspection and valve skills. Valve interaction is simulated actuator I/O, not learned grasping or contact-transferred manipulation. |
| Plant pressure | A modeled first-order response to the simulated valve's feedback. Not a reading extracted from the factory footage. |
| Gauge vision | Calibrated needle-pixel analysis on a synthetic instrument. Classical computer vision, not a neural model. |
| Wrist camera | A second rendered camera into the same simulated scene. |
| Safety | Local stop, pause, cancellation, route constraints and scoped approval. Simulation only; no functional-safety certification. |
| Evidence | Timestamped events, source observations and recorded joint/pose snapshots. Local storage, JSON export and state replay. |

The factory observation affects route selection. Missing or stale camera evidence is treated as unknown, not as proof that an area is clear.

## Stack

Intent → mission control → world state → policy router → local runtime → simulation adapter → physical world.

Safety and evidence cross all layers. The interface separates observations, policy decisions, actions and verified feedback.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/studio.html`.

`prepare-studio.mjs` self-hosts the MuJoCo, Three.js and MediaPipe runtime assets, downloads the detection model and prepares the sample footage. A manifest records whether each asset was retrieved.

```bash
npm run build
npm run e2e
```

The browser workflow captures screenshots, checks desktop fit, exercises a complete mission, and records runtime state and errors. Browser evidence—not an HTTP 200 alone—is the acceptance check.

## Media and tools

- [Factory sample: Man working on conveyor machine](https://www.pexels.com/video/man-working-on-conveyor-machine-855091/) — Pixabay / Pexels, CC0.
- [Gauge reference clip](https://www.pexels.com/video/a-gauge-use-to-measure-quantity-and-weight-2853796/) — K / Pexels, Pexels License. Downloaded as a reference, not used to claim a real plant-pressure reading.
- [MuJoCo WebAssembly](https://github.com/google-deepmind/mujoco/tree/main/wasm)
- [MediaPipe browser object detection](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector/web_js)
- [Three.js](https://threejs.org/)

Camera access is opt-in. Raw webcam frames are not uploaded. There is no connection to real machinery.
