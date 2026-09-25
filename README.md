# Physical Intelligence

A visual operating stack with two working environments, by Ajay Cyril.

**[Cognitive city](https://next-project-to-show-physical-ai.vercel.app/city.html)** · **[Factory robotics](https://next-project-to-show-physical-ai.vercel.app/studio.html)**

Run a mission. Watch the active layer, the shared world, the camera evidence and the physical response together. Open Architecture to inspect each layer's input, output and running implementation.

## Cognitive city

Two self-hosted videos feed EfficientDet Lite0 in a browser worker. Actual object counts and frame timestamps update a shared world graph. The mission service checks evidence freshness and scope. Two clones of the same junction model compare signal policies before a survey drone, human approval and an interlocked signal change. Vehicles accelerate, stop, yield and clear the crossing. A field unit dispatches while the drone returns to its rooftop pad.

The district is **Hyderabad-inspired and illustrative**. The clips are **independent stock footage, not Hyderabad CCTV**. Video counts scale scenario demand; there is no calibrated mapping from image coordinates to the 3D streets. Predictions and traffic outcomes are simulated, not measured city benefits. The drone follows a bounded waypoint controller, not a flight physics model. No infrastructure is connected.

## Factory robotics

Recorded factory footage produces real neural person detections. Camera evidence changes route choice. A* planning and MuJoCo joint servos move the robot through inspection, scoped valve approval, a multi-joint valve skill, feedback verification and docking. The robot camera renders the same scene. A synthetic gauge is read using calibrated needle-pixel analysis; it is **not** a pressure measurement taken from the stock film. Valve interaction is simulated actuator I/O, not learned grasping.

## Running components

| Layer | Implementation |
|---|---|
| Intent | Bounded Next.js mission APIs; no LLM dependency |
| Mission control | Cancellable async state machines, approval and evidence |
| World model | Entity graph, source timestamps, history and separate modeled future states |
| Policy | Capability/scope checks, A* routing and deterministic signal-plan comparison |
| Edge | MediaPipe worker inference, multi-reason holds and local controllers |
| Adapters | Typed simulation interfaces; no live equipment access |
| Embodiment | MuJoCo factory; Three.js city with car-following and signal interlocks |
| Learning/evidence | Recorded state replay, local browser episodes and JSON export |

This is a public reference implementation, not a safety-certified autonomous system. Frontier models are research references and possible future integrations, not claimed running dependencies.

## Media provenance

- [Factory conveyor](https://www.pexels.com/video/man-working-on-conveyor-machine-855091/) — Pixabay / Pexels, CC0.
- [Highway traffic](https://www.pexels.com/video/cars-on-highway-854671/) — Pixabay / Pexels, CC0; UK footage.
- [Pedestrian crossing](https://www.pexels.com/video/tourist-crossing-the-street-855565/) — Pixabay / Pexels, CC0.
- [Gauge reference](https://www.pexels.com/video/a-gauge-use-to-measure-quantity-and-weight-2853796/) — K / Pexels license; reference only.

Build scripts download and self-host footage, the neural model and runtime assets. City media has byte counts and SHA-256 provenance in `/media/city-manifest.json`. Missing required city footage fails the build rather than silently showing a placeholder.

## Development and acceptance

```sh
npm install
npm run dev
npm run build
npm run e2e
```

The browser workflow tests video decoding, actual detections, mission completion, approval, cancellation, replay, desktop fit and mobile overflow. Screenshots and JSON state reports are saved as a GitHub Actions artifact. HTTP 200 alone is not the acceptance test.

Primary tools: [MuJoCo](https://github.com/google-deepmind/mujoco/tree/main/wasm), [MediaPipe Object Detector](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector/web_js), [Three.js](https://threejs.org/).
