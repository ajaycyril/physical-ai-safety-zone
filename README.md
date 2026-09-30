# Physical Intelligence

A visual operating stack with two working environments, by Ajay Cyril.

**[Cognitive city](https://analog-physical-intelligence.vercel.app/demos/city)** · **[Factory robotics](https://analog-physical-intelligence.vercel.app/demos/factory)**

Play the one-minute guided mission. Watch the problem, world state, decision, coordinated response and verified outcome in one workspace. Explore controls retains manual authority and detailed inspection.

## Live intelligence workspace

The World, Agent and Hive tabs read the same controllers that operate the 3D scenes. Guided mode follows the active layer; selecting a tab keeps that view open. `?layer=world`, `?layer=agent` and `?layer=hive` link directly to each view.

- **World:** current entity values, typed dependencies, camera frame IDs and freshness limits, source-specific provenance, process / traffic counterfactuals and a bounded 100-revision memory. Historical snapshots are labeled and never become current observations.
- **Agent:** an ANA-equivalent interaction built from the existing bounded mission compiler and diagnostic rules. It shows the actual plan's input frames, policy checks, approval scope and output. Questions query controller facts; no neural-agent endpoint is implied.
- **Hive:** coordination across the simulated robot, survey vehicle, field unit and infrastructure adapters. Tasks complete from readback, with pause, stop, scoped authority and export connected to the existing state machines.

Two completed or stopped episodes can be retained locally. Export uses the `physical-intelligence-episode/v1` schema. This is browser storage, not shared enterprise persistence. Product correspondences follow [Analog's public overview](https://analog.io/); these are independently implemented demo equivalents.

`npm run test:intelligence` checks both complete missions, live revisions, grounded questions, automatic layer changes, pause/resume, approval lineage, task feedback, prediction, replay and responsive widths. Set `BASE_URL` to the running site (default `http://localhost:3003`). `npm run test:guided` also verifies manual approval contrast and authority.

## Cognitive city

Two self-hosted videos feed EfficientDet Lite0 in a browser worker. Actual object counts and frame timestamps update a shared world graph. The mission service checks evidence freshness and scope. Two clones of the same junction model compare signal policies before a survey drone, human approval and an interlocked signal change. Vehicles accelerate, stop, yield and clear the crossing. A field unit dispatches while the drone returns to its rooftop pad.

The district is **Abu Dhabi-inspired and illustrative**. The clips are **independent stock footage, not Abu Dhabi CCTV**. Video counts scale scenario demand; there is no calibrated mapping from image coordinates to the 3D streets. Predictions and traffic outcomes are simulated, not measured city benefits. The drone follows a bounded waypoint controller, not a flight physics model. No infrastructure is connected.

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

## Analog site structure (September 2026 overhaul)

Canonical sections: `/thesis`, `/operating-stack`, `/world-model`, `/robotics`, `/demos`, `/roadmap`, `/why-ajay`. The root opens Thesis; legacy HTML URLs redirect to their canonical section. Navigation is sourced from `content/navigation.json` for both generated pages and the React shell.

`npm run build` prepares retained runtime/media assets, then runs `scripts/prepare-site.mjs`. Generated `public/pages`, media and vendor files are excluded from Git. Edit page content in the generator, not generated output. The Operating Stack preserves the detailed partner architecture and interactive scenario traces.

The factory and city consoles add authored asset topology, selection, layer controls, bounded natural-language target resolution, scoped release, hold/cancel, modeled recovery verification and JSON evidence export. Core plant/city interventions delegate to the original physics runtime. The World Model inspector exposes entity contracts, dependencies, bounded counterfactuals and a session snapshot timeline.

**Implementation boundary:** this is a production-shaped demonstration, not a production control system. Assets and geography are authored; recorded-camera inference and regional weather retain provenance. No Cosmos model is hosted. No equipment or municipal agency is connected. Shared durable storage, enterprise identity, calibrated models, production messaging and OEM integration are explicit deployment requirements.

Verification: `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` and `npm run test:runtime`. The latter two require a running site on localhost:3000, or `BASE_URL`, and a Playwright Chromium installation. Reports and screenshots are written to `test-report/`.
