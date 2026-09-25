# Physical Intelligence / control room

A readable, single-screen demonstration of camera evidence, shared world state, governed missions and visible action.

**Factory:** https://next-project-to-show-physical-ai.vercel.app/studio.html  
**Cognitive City:** https://next-project-to-show-physical-ai.vercel.app/studio.html?scenario=city

## What to show

Choose **Factory** or **Cognitive City**, then **Run mission**. The bottom workflow and left execution stack follow the task. **Architecture** opens the layer contracts. **Next layers** connects the implemented interfaces to current embodied-reasoning and world-model directions, with primary-source references.

### Factory

Recorded factory footage → on-device person detection → camera-to-aisle constraint → A* route → articulated inspection → synthetic gauge reading → scoped approval → simulated valve I/O → measured plant response → dock and evidence.

The robot uses MuJoCo joint dynamics. Wheels are visualized from odometry. Valve interaction is a joint-space skill plus modeled actuator I/O, not a learned grasp.

### Cognitive City

Two independent recorded cameras → local vehicle/person detections → source-aware junction state → scope and freshness checks → two cloned traffic-model rollouts → geofenced drone survey → operator approval → protected pedestrian and traffic phases → field-unit dispatch → verified simulated feedback → recorded episode.

The district is Hyderabad-inspired, not a surveyed Hyderabad twin or an official project. Stock footage is clearly labeled and is not misrepresented as Hyderabad CCTV.

## What actually runs

| Component | Implementation |
|---|---|
| Factory camera | Recorded CC0 footage, self-hosted. |
| City cameras | Separate CC0 traffic and crossing clips, self-hosted with source manifests. |
| Perception | MediaPipe EfficientDet Lite0 evaluates decoded video frames in a browser worker. Boxes, classes and scores are actual model outputs. |
| Tracking | Lightweight same-class image-box association. No face or identity recognition. |
| Source binding | Manual camera-to-scenario mapping; not metric reconstruction or camera synchronization. |
| World state | Observations retain source, frame, video time, age and confidence; simulation state is separate. |
| City predictions | Two cloned, seeded car-following models compare fixed and protected signal policies for 30 simulated seconds. This is not a trained world foundation model. |
| Mission planning | Bounded Next.js rule-based compilers with scope, freshness and approval checks. No live LLM dependency. |
| Factory execution | MuJoCo WASM, A* waypoints, local feedback and named joint commands. |
| City execution | Three.js plus a local traffic state model, signal interlocks, drone survey motion and field-vehicle tasks. Not MuJoCo flight dynamics. |
| Safety | Pause, stop, cancel, geofence and scoped user approval. Demonstration logic, not certified functional safety. |
| Evidence | Recorded source observations, decision events and scene states; local storage, JSON export and state replay. |

No real machinery, traffic signals or municipal systems are connected. Raw webcam frames are not uploaded.

## Technology direction

The interface separates **running implementation** from **future adapters**. Gemini Robotics ER 2 is relevant to high-level embodied reasoning and lower-level controller handoff. Cosmos 3 is relevant to learned physical reasoning and future-state generation. Neither is falsely presented as running in this browser. The current classical controllers are intentionally inspectable and reproducible.

## Development

```bash
npm install
npm run dev
```

Open `/studio.html` or `/studio.html?scenario=city`.

The preparation scripts self-host MuJoCo, Three.js and MediaPipe, download the detector and recorded samples, and record asset availability and source provenance.

```bash
npm run build
node --test tests/city-model.test.mjs
npm run e2e
```

Browser acceptance covers the full factory task and city response, actual detections, stop stability, desktop fit, minimum primary label sizes, mobile width and episode replay. Build success or HTTP 200 alone is not the acceptance criterion.

## Primary references and media

- [Factory sample](https://www.pexels.com/video/man-working-on-conveyor-machine-855091/), Pixabay / Pexels, CC0.
- [Traffic sample](https://www.pexels.com/video/cars-on-highway-854671/), Pixabay / Pexels, CC0. UK footage, not Hyderabad.
- [Crossing sample](https://www.pexels.com/video/tourist-crossing-the-street-855565/), Pixabay / Pexels, CC0.
- [MediaPipe browser object detection](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js).
- [MuJoCo](https://mujoco.readthedocs.io/en/stable/overview.html).
- [Gemini Robotics ER 2](https://deepmind.google/models/gemini-robotics/embodied-reasoning/).
- [NVIDIA Cosmos 3](https://nvidianews.nvidia.com/news/nvidia-launches-cosmos-3-the-open-frontier-foundation-model-for-physical-ai).
