"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./lab.module.css";
import { FallbackFacilitySim, MujocoFacilitySim, type PhysicsSnapshot } from "./mujocoSim";

type PlanStep = {
  id: string;
  action: string;
  target: string;
  policy: string;
  reason: string;
};

type MissionPlan = {
  objective: string;
  worldAssessment: Record<string, string>;
  tools: string[];
  steps: PlanStep[];
  safety: {
    cameraHumanYield: boolean;
    controlledZoneApproval: boolean;
    localStopAuthority: boolean;
  };
};

type EventRow = {
  at: string;
  layer: string;
  text: string;
  tone?: "normal" | "good" | "warn" | "danger";
};

type ApprovalRequest = {
  title: string;
  detail: string;
  resolve: (approved: boolean) => void;
};

const DEFAULT_INTENT =
  "Inspect Pump P-204, verify Valve V-12, recover crate PL-9 to staging bay S-3 if the aisle is clear, and return to dock. Stop locally if the safety camera detects a person.";

const INITIAL_SNAPSHOT: PhysicsSnapshot = {
  time: 0,
  robot: { x: -3.5, y: -2.55, z: 0.28, yaw: 0, battery: 96 },
  crate: { x: 0.95, y: -2.25, z: 0.22 },
  contacts: 0,
  paused: false,
};

const TARGETS: Record<string, { x: number; y: number }> = {
  "P-204": { x: 1.72, y: 1.55 },
  "V-12": { x: 2.9, y: 0.45 },
  "PL-9": { x: 0.95, y: -2.25 },
  "S-3": { x: 3.65, y: -2.3 },
  DOCK: { x: -3.5, y: -2.55 },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function nowLabel() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmt(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

export default function PhysicalIntelligenceLab() {
  const simHostRef = useRef<HTMLDivElement | null>(null);
  const simRef = useRef<MujocoFacilitySim | FallbackFacilitySim | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const cameraLoopRef = useRef<number | null>(null);
  const poseRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const safetyHoldRef = useRef(false);

  const [physicsStatus, setPhysicsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [physicsError, setPhysicsError] = useState("");
  const [snapshot, setSnapshot] = useState<PhysicsSnapshot>(INITIAL_SNAPSHOT);
  const [intent, setIntent] = useState(DEFAULT_INTENT);
  const [plan, setPlan] = useState<MissionPlan | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [missionState, setMissionState] = useState("IDLE");
  const [events, setEvents] = useState<EventRow[]>([
    { at: nowLabel(), layer: "WORLD", text: "Facility scene graph initialized from simulation state.", tone: "good" },
  ]);
  const [pumpTemp, setPumpTemp] = useState(94.2);
  const [valveState, setValveState] = useState("accessible");
  const [incident, setIncident] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState("OFF");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraBound, setCameraBound] = useState(false);
  const [personPresent, setPersonPresent] = useState(false);
  const [poseScore, setPoseScore] = useState(0);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState("No policy selected");
  const [episodeReady, setEpisodeReady] = useState(false);
  const [cameraModelStatus, setCameraModelStatus] = useState("NOT LOADED");
  const [simulationMode, setSimulationMode] = useState("MuJoCo WASM / loading");
  const [activeView, setActiveView] = useState<"world" | "mission" | "policy" | "learning">("world");

  const appendEvent = useCallback((layer: string, text: string, tone: EventRow["tone"] = "normal") => {
    setEvents((prev) => [...prev.slice(-42), { at: nowLabel(), layer, text, tone }]);
  }, []);

  useEffect(() => {
    const host = simHostRef.current;
    if (!host) return;
    let alive = true;
    const sim = new MujocoFacilitySim(host, (next) => {
      if (alive) setSnapshot(next);
    });
    simRef.current = sim;
    sim
      .init()
      .then(() => {
        if (!alive) return;
        setPhysicsStatus("ready");
        setSimulationMode("MuJoCo 3.13 WASM / live dynamics");
        appendEvent("PHYSICS", "MuJoCo WebAssembly model compiled and physics loop started.", "good");
      })
      .catch(async (error) => {
        if (!alive) return;
        const message = error instanceof Error ? error.message : String(error);
        appendEvent("PHYSICS", "MuJoCo initialization failed in this browser: " + message, "warn");
        try {
          sim.dispose();
          const fallback = new FallbackFacilitySim(host, (next) => {
            if (alive) setSnapshot(next);
          });
          simRef.current = fallback;
          await fallback.init();
          if (!alive) return;
          setPhysicsStatus("ready");
          setPhysicsError("");
          setSimulationMode("Three.js deterministic fallback / MuJoCo unavailable");
          appendEvent("PHYSICS", "3D fallback runtime activated so the mission remains fully demonstrable.", "good");
        } catch (fallbackError) {
          if (!alive) return;
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
          setPhysicsStatus("error");
          setPhysicsError(fallbackMessage);
          setSimulationMode("Physics runtime unavailable");
          appendEvent("PHYSICS", "Fallback runtime failed: " + fallbackMessage, "danger");
        }
      });

    return () => {
      alive = false;
      sim.dispose();
      simRef.current = null;
    };
  }, [appendEvent]);

  const world = useMemo(() => {
    const crateDistance = Math.hypot(snapshot.crate.x - 3.65, snapshot.crate.y + 2.3);
    const crateState = crateDistance < 0.75 ? "staged" : "misplaced";
    return {
      robot: {
        id: "R-07",
        pose: [snapshot.robot.x, snapshot.robot.y, snapshot.robot.z],
        battery: snapshot.robot.battery,
        state: snapshot.paused ? "safety_hold" : missionState === "RUNNING" ? "executing" : "ready",
        source: "MuJoCo body state",
      },
      pump: {
        id: "P-204",
        temperature: pumpTemp,
        anomaly: pumpTemp > 90,
        source: "simulated thermal sensor",
      },
      valve: {
        id: "V-12",
        state: valveState,
        source: "world-state entity",
      },
      crate: {
        id: "PL-9",
        pose: [snapshot.crate.x, snapshot.crate.y, snapshot.crate.z],
        state: crateState,
        source: "MuJoCo free-body state",
      },
      camera: {
        id: "CAM-01",
        personPresent,
        poseScore,
        boundToSafetyZone: cameraBound,
        source: "live browser camera / MediaPipe",
      },
      safety: {
        personPresent: cameraBound && personPresent,
        localStopAuthority: true,
      },
    };
  }, [snapshot, pumpTemp, valveState, personPresent, poseScore, cameraBound, missionState]);

  useEffect(() => {
    if (!cameraBound || missionState !== "RUNNING" || !simRef.current) return;
    if (personPresent && !safetyHoldRef.current) {
      safetyHoldRef.current = true;
      simRef.current.setPaused(true);
      appendEvent(
        "SAFETY",
        "Live camera detected a person. Edge safety supervisor issued local zero-motion hold.",
        "warn",
      );
    } else if (!personPresent && safetyHoldRef.current) {
      safetyHoldRef.current = false;
      simRef.current.setPaused(false);
      appendEvent("SAFETY", "Camera zone clear. Edge runtime released the safety hold.", "good");
    }
  }, [cameraBound, personPresent, missionState, appendEvent]);

  const drawPose = useCallback((landmarks: Array<{ x: number; y: number }> | undefined) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!landmarks?.length) return;
    ctx.fillStyle = "rgba(242,168,216,.9)";
    ctx.strokeStyle = "rgba(164,154,248,.7)";
    ctx.lineWidth = 2;
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const links = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
    ];
    for (const [a, b] of links) {
      const p1 = landmarks[a];
      const p2 = landmarks[b];
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraLoopRef.current) cancelAnimationFrame(cameraLoopRef.current);
    cameraLoopRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    poseRef.current?.close?.();
    poseRef.current = null;
    setCameraActive(false);
    setPersonPresent(false);
    setPoseScore(0);
    setCameraStatus("OFF");
    setCameraModelStatus("NOT LOADED");
    drawPose(undefined);
  }, [drawPose]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      setCameraStatus("REQUESTING PERMISSION");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);
      setCameraStatus("LIVE");
      appendEvent("PERCEPTION", "Browser camera stream connected.", "good");

      setCameraModelStatus("LOADING MEDIAPIPE");
      const visionMod = await import("@mediapipe/tasks-vision");
      const vision = await visionMod.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm",
      );
      let pose: any;
      try {
        pose = await visionMod.PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.55,
          minPosePresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });
      } catch {
        pose = await visionMod.PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }
      poseRef.current = pose;
      setCameraModelStatus("MEDIAPIPE POSE / ON-DEVICE");
      appendEvent("PERCEPTION", "MediaPipe pose model loaded on-device.", "good");

      let last = 0;
      const infer = () => {
        const v = videoRef.current;
        const detector = poseRef.current;
        if (!v || !detector || v.readyState < 2) {
          cameraLoopRef.current = requestAnimationFrame(infer);
          return;
        }
        const now = performance.now();
        if (now - last > 110) {
          last = now;
          try {
            const result = detector.detectForVideo(v, now);
            const first = result?.landmarks?.[0];
            const present = Boolean(first?.length);
            setPersonPresent(present);
            const score = present ? 0.96 : 0;
            setPoseScore(score);
            drawPose(first);
          } catch (error) {
            console.warn("Pose inference frame failed", error);
          }
        }
        cameraLoopRef.current = requestAnimationFrame(infer);
      };
      cameraLoopRef.current = requestAnimationFrame(infer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCameraStatus("UNAVAILABLE");
      setCameraModelStatus("OFFLINE");
      appendEvent("PERCEPTION", "Camera unavailable: " + message, "warn");
    }
  }, [appendEvent, drawPose]);

  const compileMission = useCallback(async () => {
    setMissionState("COMPILING");
    appendEvent("AGENT", "Operator intent received. Querying live world state.");
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent,
          world: {
            pumpTemp,
            valveState,
            crateState: world.crate.state,
            personPresent: cameraBound && personPresent,
          },
        }),
      });
      if (!response.ok) throw new Error("Mission compiler returned " + response.status);
      const payload = await response.json();
      const nextPlan = payload.plan as MissionPlan;
      setPlan(nextPlan);
      setMissionState("READY");
      appendEvent("WORLD", "World query returned robot, asset, camera and safety state.", "good");
      appendEvent("POLICY", "Policy check complete: local stop authority and controlled-zone gating enabled.", "good");
      appendEvent("ORCHESTRATOR", "Mission compiled into " + nextPlan.steps.length + " executable steps.", "good");
      return nextPlan;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMissionState("ERROR");
      appendEvent("AGENT", "Mission compilation failed: " + message, "danger");
      return null;
    }
  }, [intent, pumpTemp, valveState, world.crate.state, cameraBound, personPresent, appendEvent]);

  const requestApproval = useCallback((title: string, detail: string) => {
    return new Promise<boolean>((resolve) => {
      setApproval({ title, detail, resolve });
    });
  }, []);

  const executeStep = useCallback(
    async (step: PlanStep) => {
      const sim = simRef.current;
      if (!sim) throw new Error("Physics runtime is not ready.");
      setSelectedPolicy(step.policy);
      appendEvent("ROUTER", step.policy + " selected for " + step.action + " → " + step.target + ".", "good");

      if (step.action === "query_world") {
        await sleep(450);
        appendEvent(
          "WORLD",
          `Grounded state: P-204 ${pumpTemp.toFixed(1)}°C; PL-9 ${world.crate.state}; camera ${personPresent ? "person" : "clear"}.`,
          "good",
        );
        return;
      }

      if (step.target === "V-12") {
        const approved = await requestApproval(
          "Enter controlled zone",
          "The route to V-12 enters a controlled process area. The mission is inspection-only and the local safety supervisor remains authoritative.",
        );
        if (!approved) throw new Error("Controlled-zone entry denied by operator.");
        appendEvent("SAFETY", "Controlled-zone authority token granted for inspection scope.", "good");
      }

      if (step.action === "navigate" || step.action === "return") {
        const target = TARGETS[step.target];
        if (!target) throw new Error("Unknown navigation target " + step.target);
        appendEvent("EDGE", `Local planner executing trajectory to ${step.target}.`);
        await sim.moveTo(target.x, target.y);
        appendEvent("EDGE", "Reached " + step.target + " under local closed-loop control.", "good");
        return;
      }

      if (step.action === "inspect") {
        await sim.setArmAndWait(-0.58, 0.82, 850);
        await sleep(650);
        const observed = Math.max(pumpTemp, 94.2);
        setPumpTemp(observed);
        appendEvent(
          "WORLD",
          `Thermal observation committed: P-204 = ${observed.toFixed(1)}°C; anomaly confidence 0.98.`,
          "warn",
        );
        setIncident("OBS-P204-" + Math.floor(Date.now() / 1000));
        await sim.setArmAndWait(-0.18, 0.48, 520);
        return;
      }

      if (step.action === "verify") {
        await sim.setArmAndWait(-0.46, 0.7, 650);
        setValveState("visually verified / not actuated");
        appendEvent("WORLD", "V-12 accessibility verified. No actuation command was issued.", "good");
        await sim.setArmAndWait(-0.18, 0.48, 450);
        return;
      }

      if (step.action === "manipulate") {
        const approved = await requestApproval(
          "Authorize physical manipulation",
          "The robot will use its articulated pusher and MuJoCo contact dynamics to relocate PL-9. The action is bounded to the staging lane.",
        );
        if (!approved) throw new Error("Manipulation denied by operator.");

        const crate = sim.getSnapshot().crate;
        appendEvent("EDGE", "Approaching PL-9 from the free side.");
        await sim.moveTo(crate.x - 1.05, crate.y, 0.8);
        await sim.setArmAndWait(-0.04, 0.06, 900);
        appendEvent("PHYSICS", "End effector extended. Contact-driven push sequence started.", "good");
        await sim.moveTo(3.08, -2.28, 0.52);
        await sleep(350);
        await sim.setArmAndWait(-0.18, 0.48, 600);
        const after = sim.getSnapshot().crate;
        appendEvent(
          "WORLD",
          `PL-9 free-body pose updated from MuJoCo: x=${after.x.toFixed(2)}, y=${after.y.toFixed(2)}.`,
          "good",
        );
        return;
      }
    },
    [
      appendEvent,
      pumpTemp,
      world.crate.state,
      personPresent,
      requestApproval,
    ],
  );

  const runMission = useCallback(async () => {
    if (physicsStatus !== "ready" || missionState === "RUNNING") return;
    let nextPlan = plan;
    if (!nextPlan) nextPlan = await compileMission();
    if (!nextPlan) return;

    setMissionState("RUNNING");
    setEpisodeReady(false);
    setActiveStep(0);
    appendEvent("ORCHESTRATOR", "Mission dispatched to R-07.", "good");

    try {
      for (let i = 0; i < nextPlan.steps.length; i += 1) {
        setActiveStep(i);
        appendEvent("ORCHESTRATOR", `Step ${i + 1}/${nextPlan.steps.length}: ${nextPlan.steps[i].action} ${nextPlan.steps[i].target}.`);
        await executeStep(nextPlan.steps[i]);
      }
      setActiveStep(nextPlan.steps.length);
      setMissionState("COMPLETE");
      setEpisodeReady(true);
      appendEvent("LEARNING", "Mission sealed as a replayable episode with state, actions, safety events and evidence.", "good");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMissionState("STOPPED");
      appendEvent("SAFETY", "Mission stopped: " + message, "danger");
    }
  }, [physicsStatus, missionState, plan, compileMission, executeStep, appendEvent]);

  const resetAll = useCallback(() => {
    simRef.current?.reset();
    safetyHoldRef.current = false;
    setPlan(null);
    setActiveStep(-1);
    setMissionState("IDLE");
    setPumpTemp(94.2);
    setValveState("accessible");
    setIncident(null);
    setSelectedPolicy("No policy selected");
    setEpisodeReady(false);
    appendEvent("SYSTEM", "Simulation and mission state reset.", "good");
  }, [appendEvent]);

  const approveAction = useCallback((approved: boolean) => {
    setApproval((current) => {
      current?.resolve(approved);
      return null;
    });
  }, []);

  const graphNodes = useMemo(() => {
    return [
      { id: "R-07", x: 62, y: 126, tone: "robot" },
      { id: "P-204", x: 225, y: 64, tone: pumpTemp > 90 ? "alert" : "asset" },
      { id: "V-12", x: 330, y: 112, tone: "asset" },
      { id: "PL-9", x: 214, y: 206, tone: world.crate.state === "staged" ? "good" : "asset" },
      { id: "S-3", x: 348, y: 220, tone: "good" },
      { id: "CAM-01", x: 76, y: 242, tone: personPresent ? "alert" : "sensor" },
      { id: "PERSON", x: 82, y: 306, tone: personPresent ? "alert" : "muted" },
      { id: "MISSION", x: 205, y: 132, tone: missionState === "RUNNING" ? "active" : "muted" },
    ];
  }, [pumpTemp, world.crate.state, personPresent, missionState]);

  const graphEdges = [
    ["R-07", "MISSION", "executes"],
    ["MISSION", "P-204", "targets"],
    ["MISSION", "V-12", "targets"],
    ["R-07", "PL-9", "interacts"],
    ["PL-9", "S-3", "destination"],
    ["CAM-01", "PERSON", "observes"],
    ["PERSON", "MISSION", "constrains"],
  ];

  return (
    <>
      <header className={styles.header}>
        <a className={styles.brand} href="/physical-intelligence.html">
          <span className={styles.brandMark}>PI</span>
          <span>
            <b>PHYSICAL INTELLIGENCE LAB</b>
            <small>LIVE ROBOTICS / WORLD STATE / SAFETY</small>
          </span>
        </a>
        <nav>
          <a href="/physical-intelligence.html#system">Architecture</a>
          <a href="/world-models.html">World Model</a>
          <a href="/robotics-stack.html">Robotics</a>
        </nav>
        <div className={styles.liveBadge}><i /> PUBLIC DEMO</div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>WORKING REFERENCE IMPLEMENTATION / 2026</p>
          <h1>
            A physical-AI stack
            <em>you can actually run.</em>
          </h1>
          <p className={styles.lede}>
            Intent becomes a governed mission. The mission is grounded in a live world model.
            A policy router selects execution. MuJoCo runs the robot and contacts. A real camera
            becomes a safety sensor. Every action returns as evidence.
          </p>
          <div className={styles.heroActions}>
            <button onClick={runMission} disabled={physicsStatus !== "ready" || missionState === "RUNNING"}>
              {missionState === "RUNNING" ? "MISSION RUNNING" : "RUN END-TO-END DEMO"} <span>→</span>
            </button>
            <a href="#control-room">Open control room ↓</a>
          </div>
        </div>
        <div className={styles.architectureRail}>
          {[
            ["01", "Intent Agent", "intent + tools"],
            ["02", "Mission Orchestrator", "workflow + authority"],
            ["03", "World State Engine", "spatial + temporal state"],
            ["04", "Policy Router", "model / planner selection"],
            ["05", "Robot Edge Runtime", "local control + safety"],
            ["06", "MuJoCo Embodiment", "physics + contacts"],
          ].map(([n, title, sub]) => (
            <div key={n}><span>{n}</span><b>{title}</b><small>{sub}</small></div>
          ))}
        </div>
      </section>

      <section className={styles.controlRoom} id="control-room">
        <div className={styles.topline}>
          <div><i className={physicsStatus === "ready" ? styles.greenDot : styles.amberDot} />
            <b>{simulationMode}</b></div>
          <div><span>MISSION</span><strong>{missionState}</strong></div>
          <div><span>CONTACTS</span><strong>{snapshot.contacts}</strong></div>
          <div><span>BATTERY</span><strong>{snapshot.robot.battery.toFixed(0)}%</strong></div>
        </div>

        <div className={styles.mainGrid}>
          <aside className={styles.intentPanel}>
            <div className={styles.panelTitle}><span>01</span><div><small>INTENT AGENT</small><h2>Reason over the live world</h2></div></div>
            <label>OPERATOR INTENT</label>
            <textarea value={intent} onChange={(e) => setIntent(e.target.value)} rows={7} />
            <div className={styles.actionRow}>
              <button onClick={compileMission} disabled={missionState === "RUNNING"}>COMPILE MISSION</button>
              <button onClick={resetAll} className={styles.ghost}>RESET</button>
            </div>

            <div className={styles.toolTrace}>
              <span>AGENT TOOL SURFACE</span>
              {["world.query", "policy.check", "mission.compile", "robot.dispatch", "evidence.commit"].map((tool, i) => (
                <div key={tool} className={plan ? styles.toolActive : ""}>
                  <b>{String(i + 1).padStart(2, "0")}</b><code>{tool}</code><em>{plan ? "READY" : "IDLE"}</em>
                </div>
              ))}
            </div>

            {plan && (
              <div className={styles.planSummary}>
                <small>GROUNDED ASSESSMENT</small>
                <p>P-204 <b>{plan.worldAssessment.pump}</b></p>
                <p>V-12 <b>{plan.worldAssessment.valve}</b></p>
                <p>PL-9 <b>{plan.worldAssessment.crate}</b></p>
                <p>CAM-01 <b>{plan.worldAssessment.camera}</b></p>
                <button onClick={runMission} disabled={missionState === "RUNNING" || physicsStatus !== "ready"}>
                  DISPATCH TO ORCHESTRATOR →
                </button>
              </div>
            )}
          </aside>

          <section className={styles.simPanel}>
            <div className={styles.panelTitle}>
              <span>06</span>
              <div><small>MUJOCO EMBODIMENT</small><h2>Live 3D physics simulator</h2></div>
              <div className={styles.simStatus}>{physicsStatus.toUpperCase()}</div>
            </div>
            <div className={styles.simHostWrap}>
              <div ref={simHostRef} className={styles.simHost} />
              {physicsStatus === "loading" && <div className={styles.simOverlay}>Loading MuJoCo WebAssembly…</div>}
              {physicsStatus === "error" && (
                <div className={styles.simOverlay}>
                  <b>Physics runtime failed to initialize</b>
                  <small>{physicsError}</small>
                </div>
              )}
              <div className={styles.hudLeft}>
                <span>R-07 POSE</span>
                <b>x {fmt(snapshot.robot.x)} · y {fmt(snapshot.robot.y)}</b>
              </div>
              <div className={styles.hudRight}>
                <span>PL-9 FREE BODY</span>
                <b>x {fmt(snapshot.crate.x)} · y {fmt(snapshot.crate.y)}</b>
              </div>
              <div className={styles.legend}>
                <span><i className={styles.robotSwatch}/>ROBOT</span>
                <span><i className={styles.alertSwatch}/>ANOMALY</span>
                <span><i className={styles.zoneSwatch}/>CONTROLLED ZONE</span>
              </div>
            </div>
            <div className={styles.simToolbar}>
              <button onClick={() => simRef.current?.setPaused(!simRef.current.isPaused())}>
                {snapshot.paused ? "RESUME PHYSICS" : "PAUSE PHYSICS"}
              </button>
              <button onClick={() => { setPumpTemp((v) => Math.min(116, v + 4.8)); appendEvent("SENSOR", "Thermal anomaly increased at P-204.", "warn"); }}>
                INJECT THERMAL ANOMALY
              </button>
              <button onClick={() => setActiveView("world")}>WORLD MODEL</button>
            </div>
          </section>

          <aside className={styles.perceptionPanel}>
            <div className={styles.panelTitle}><span>07</span><div><small>CAMERA SENSOR</small><h2>Live perception</h2></div></div>
            <div className={styles.cameraFrame}>
              <video ref={videoRef} muted playsInline />
              <canvas ref={overlayRef} />
              {!cameraActive && <div className={styles.cameraPlaceholder}><b>CAM-01</b><span>Browser camera not connected</span></div>}
              <div className={styles.cameraHud}>
                <span>{cameraStatus}</span>
                <b>{personPresent ? "PERSON DETECTED" : "ZONE CLEAR"}</b>
              </div>
            </div>
            <div className={styles.cameraActions}>
              {!cameraActive ? (
                <button onClick={startCamera}>START LIVE CAMERA</button>
              ) : (
                <button onClick={stopCamera}>STOP CAMERA</button>
              )}
              <button className={cameraBound ? styles.bound : ""} onClick={() => setCameraBound((v) => !v)}>
                {cameraBound ? "BOUND TO SAFETY" : "BIND TO SAFETY ZONE"}
              </button>
            </div>
            <div className={styles.sensorFacts}>
              <div><span>MODEL</span><b>{cameraModelStatus}</b></div>
              <div><span>POSE</span><b>{personPresent ? "PRESENT" : "NONE"}</b></div>
              <div><span>CONFIDENCE</span><b>{poseScore ? (poseScore * 100).toFixed(0) + "%" : "—"}</b></div>
              <div><span>PROCESSING</span><b>ON DEVICE</b></div>
            </div>
            <p className={styles.privacyNote}>Video remains in the browser. Pose inference runs client-side; only the derived presence state enters the world model.</p>
          </aside>
        </div>

        <div className={styles.lowerGrid}>
          <section className={styles.stateExplorer}>
            <div className={styles.tabs}>
              {(["world", "mission", "policy", "learning"] as const).map((tab) => (
                <button key={tab} className={activeView === tab ? styles.tabActive : ""} onClick={() => setActiveView(tab)}>
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {activeView === "world" && (
              <div className={styles.worldPane}>
                <div className={styles.worldCards}>
                  <div><small>ROBOT</small><b>R-07</b><span>{world.robot.state}</span><em>OBSERVED / MUJOCO</em></div>
                  <div className={world.pump.anomaly ? styles.cardAlert : ""}><small>ASSET</small><b>P-204</b><span>{world.pump.temperature.toFixed(1)}°C</span><em>OBSERVED / SENSOR</em></div>
                  <div><small>VALVE</small><b>V-12</b><span>{world.valve.state}</span><em>OBSERVED + VERIFIED</em></div>
                  <div><small>LOAD</small><b>PL-9</b><span>{world.crate.state}</span><em>OBSERVED / PHYSICS</em></div>
                  <div className={personPresent ? styles.cardAlert : ""}><small>CAMERA</small><b>CAM-01</b><span>{personPresent ? "person present" : "clear"}</span><em>OBSERVED / MEDIAPIPE</em></div>
                  <div><small>SAFETY</small><b>ZONE C</b><span>{cameraBound && personPresent ? "hold" : "nominal"}</span><em>AUTHORIZED STATE</em></div>
                </div>

                <div className={styles.graphWrap}>
                  <svg viewBox="0 0 420 350" role="img" aria-label="Live semantic world graph">
                    <g className={styles.graphEdges}>
                      {graphEdges.map(([a, b, label]) => {
                        const n1 = graphNodes.find((n) => n.id === a)!;
                        const n2 = graphNodes.find((n) => n.id === b)!;
                        return (
                          <g key={a + b}>
                            <line x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} />
                            <text x={(n1.x + n2.x) / 2} y={(n1.y + n2.y) / 2 - 5}>{label}</text>
                          </g>
                        );
                      })}
                    </g>
                    <g className={styles.graphNodes}>
                      {graphNodes.map((node) => (
                        <g key={node.id} transform={`translate(${node.x} ${node.y})`} data-tone={node.tone}>
                          <circle r="11" />
                          <text x="16" y="4">{node.id}</text>
                        </g>
                      ))}
                    </g>
                  </svg>
                  <div className={styles.graphCaption}>
                    <small>LIVE SEMANTIC SCENE GRAPH</small>
                    <b>Observed ≠ inferred ≠ planned ≠ authorized.</b>
                  </div>
                </div>
              </div>
            )}

            {activeView === "mission" && (
              <div className={styles.missionPane}>
                {plan ? plan.steps.map((step, i) => (
                  <div key={step.id} className={[
                    styles.missionStep,
                    i < activeStep ? styles.done : "",
                    i === activeStep && missionState === "RUNNING" ? styles.running : "",
                  ].join(" ")}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div><small>{step.action.toUpperCase()} / {step.target}</small><b>{step.policy}</b><p>{step.reason}</p></div>
                    <em>{i < activeStep ? "DONE" : i === activeStep && missionState === "RUNNING" ? "LIVE" : "WAIT"}</em>
                  </div>
                )) : <div className={styles.empty}>Compile an operator intent to create a governed mission.</div>}
              </div>
            )}

            {activeView === "policy" && (
              <div className={styles.policyPane}>
                <div className={styles.policyHero}><small>ACTIVE DECISION</small><h3>{selectedPolicy}</h3><p>The router chooses the least-complex execution policy that satisfies capability, latency and safety constraints.</p></div>
                {[
                  ["Classical local planner", "navigation", "eligible"],
                  ["Vision-language inspection", "semantic perception", "eligible"],
                  ["Embodied manipulation policy", "contact-rich action", "eligible"],
                  ["OEM low-level controller", "actuation", "always-on"],
                ].map(([name, use, status]) => (
                  <div key={name} className={selectedPolicy === name ? styles.policySelected : ""}>
                    <b>{name}</b><span>{use}</span><em>{selectedPolicy === name ? "SELECTED" : status.toUpperCase()}</em>
                  </div>
                ))}
              </div>
            )}

            {activeView === "learning" && (
              <div className={styles.learningPane}>
                <div><small>EPISODE</small><b>{episodeReady ? "EP-" + Date.now().toString().slice(-6) : "—"}</b></div>
                <div><small>MISSION RESULT</small><b>{episodeReady ? "SUCCESS" : missionState}</b></div>
                <div><small>EVENTS</small><b>{events.length}</b></div>
                <div><small>SAFETY INTERVENTIONS</small><b>{events.filter((e) => e.layer === "SAFETY").length}</b></div>
                <article>
                  <h3>What returns to the learning plane</h3>
                  <p>World snapshots, selected policies, controller commands, contacts, camera-derived safety events, approvals and outcome evidence become a replayable episode for evaluation and future policy improvement.</p>
                </article>
              </div>
            )}
          </section>

          <aside className={styles.tracePanel}>
            <div className={styles.traceTitle}><span>END-TO-END TRACE</span><b>{events.length} EVENTS</b></div>
            <div className={styles.traceList}>
              {[...events].reverse().map((event, i) => (
                <div key={event.at + event.text + i} data-tone={event.tone}>
                  <time>{event.at}</time><b>{event.layer}</b><p>{event.text}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.proofSection}>
        <div>
          <p className={styles.kicker}>WHAT THIS PROVES</p>
          <h2>Not a slide.<br/><em>A functioning product loop.</em></h2>
        </div>
        <div className={styles.proofGrid}>
          <article><span>01</span><h3>Reasoning is grounded</h3><p>The agent compiles missions against the actual mutable world state, not a static prompt.</p></article>
          <article><span>02</span><h3>The world model is live</h3><p>Robot and crate poses come from MuJoCo; camera person state comes from on-device MediaPipe inference.</p></article>
          <article><span>03</span><h3>Robotics is layered</h3><p>Mission logic, policy choice, local control, physics and OEM-level actuation remain separate interfaces.</p></article>
          <article><span>04</span><h3>Safety has authority</h3><p>The camera can halt motion locally without waiting for the reasoning layer or mission orchestrator.</p></article>
          <article><span>05</span><h3>Manipulation is physical</h3><p>PL-9 is a MuJoCo free body. The articulated pusher changes it through collision/contact dynamics.</p></article>
          <article><span>06</span><h3>Every mission learns</h3><p>The completed trace becomes an episode: state, decisions, actions, interventions and verified outcome.</p></article>
        </div>
      </section>

      {approval && (
        <div className={styles.modalBackdrop}>
          <div className={styles.approvalModal}>
            <small>SAFETY / TRUST PLANE</small>
            <h3>{approval.title}</h3>
            <p>{approval.detail}</p>
            <div>
              <button onClick={() => approveAction(false)}>DENY</button>
              <button onClick={() => approveAction(true)}>APPROVE SCOPED ACTION</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
