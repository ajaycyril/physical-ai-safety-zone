export const referenceModules={
  intent:[
    {title:'Mission Portal',subtitle:'Customer layer',body:'Request, quote, track and receive one physical-world outcome through a single mission contract.',chips:['Request','Quote','Track','Receive'],layer:0},
    {title:'Mission API',subtitle:'Open integration edge',body:'Typed mission creation, status, evidence and webhook interfaces. The API exposes the goal contract, not raw robot controls.',chips:['POST /missions','GET /missions/:id','Webhooks','Evidence'],layer:0}
  ],
  applications:[
    {title:'Qualcomm Generative-AI Command Center',subtitle:'Video operations',body:'Published Qualcomm pattern for natural-language queries, snapshots, video retrieval and reporting over edge-processed camera events.',chips:['Video search','Reports','Edge events','Natural language'],partner:'qualcomm',layer:1},
    {title:'Optelos Asset Advisor',subtitle:'Asset intelligence',body:'Visual inspection data, contextualized asset records, AI-ready digital twins and condition workflows.',chips:['Asset context','Digital twin','Inspection AI','Workflow'],partner:'optelos',layer:1},
    {title:'Inkers Observance',subtitle:'Site capture',body:'LiDAR, RGB, thermal and IMU capture feeding as-built models, deviations and construction progress evidence.',chips:['LiDAR','Thermal','As-built BIM','Deviation'],partner:'observance',layer:1},
    {title:'Inkers Kaël',subtitle:'Project intelligence',body:'Construction intelligence combining scans, schedules, costs and observations into project risk, deviation and next-step decisions.',chips:['Schedule','Cost','Risk','Project actions'],partner:'kael',layer:1}
  ],
  intelligence:[
    {title:'Levatas Cognitive Inspection',subtitle:'Specialist visual AI',body:'Hardware-agnostic industrial inspection models for gauges, thermal anomalies, valves, corrosion, safety and other asset conditions.',chips:['Gauge','Thermal','Valve state','HITL'],partner:'levatas',layer:2},
    {title:'General multimodal model',subtitle:'Replaceable semantic layer',body:'Route selected clips and observations to a general VLM for scene understanding where quality, latency and economics justify it.',chips:['Video reasoning','Scene context','Open questions','Model router'],layer:2},
    {title:'World-model service',subtitle:'Predicted physical futures',body:'Action-conditioned prediction remains separate from authoritative operational state and is evaluated before it influences a mission.',chips:['Future state','Counterfactual','Uncertainty','Evaluation'],partner:'cosmos',layer:2}
  ],
  orchestration:[
    {title:'Mission Orchestrator',subtitle:'Platform control point',body:'One mission graph coordinates fleet assignment, approvals, recovery, evidence and enterprise workflow closure.',chips:['Cross-fleet','Event-driven','Approvals','Recovery'],layer:3},
    {title:'Formant integration option',subtitle:'Fleet operations',body:'Potential buy/integrate boundary for fleet visibility, device configuration and operator workflows rather than rebuilding mature fleet operations.',chips:['Fleet views','Health','Config','Operator tools'],partner:'formant',layer:3}
  ],
  native:[
    {title:'Qualcomm Drone Command Center',subtitle:'Aerial native platform',body:'Published Qualcomm pattern for mission control, autonomous flight management, video streaming and GenAI-assisted incident workflows.',chips:['Mission control','Flight ops','Video','Edge AI'],partner:'qualcomm',layer:4},
    {title:'AlphaZ field autonomy',subtitle:'Ground robotics',body:'Field robotics candidate for construction, security and industrial inspection. Integrate behind a bounded skill adapter and explicit feedback contract.',chips:['Patrol','Inspection','Field autonomy','Recovery'],partner:'alphaz',layer:4},
    {title:'Formant fleet operations',subtitle:'Cross-OEM operations',body:'Potential fleet-operations layer for monitoring, configuration and operator intervention across deployed devices.',chips:['Fleet monitor','Config','Telemetry','Operations'],partner:'formant',layer:4}
  ],
  fleets:[
    {title:'Drone fleet + docks',subtitle:'Physical fleet · air',body:'Survey, inspect, stream evidence, return and dock. Local flight control and failsafes remain on the aircraft.',chips:['Drones','Dock','Payload','Return'],layer:5},
    {title:'Ground robot fleet',subtitle:'Physical fleet · ground',body:'Quadruped, wheeled or humanoid executors operating bounded inspection, patrol and manipulation skills.',chips:['Quadruped','Wheeled','Humanoid','Tooling'],layer:5},
    {title:'Fixed infrastructure',subtitle:'Physical fleet · site',body:'Cameras, sensors, PLCs, valves, gates and signals exposed as versioned capabilities with read-back.',chips:['Cameras','Sensors','PLCs','Actuators'],layer:5}
  ]
};

export const partnerDepth={
  qualcomm:{published:['Edge AI Boxes and AI-enabled/IP cameras','On-device event detection and privacy-preserving edge processing','Generative-AI Command Center for queries, snapshots, video and reports','Drone Command Center pattern for missions, streaming and flight operations'],boundary:'Use Qualcomm as edge/video/drone infrastructure where it wins. Keep enterprise mission authority and cross-fleet outcome acceptance above the native stack.'},
  formant:{published:['Fleet-level monitoring views','Device health and status visibility','Configuration templates for fleet provisioning','Robot operations layer suitable for multi-device deployments'],boundary:'Decide explicitly whether mission assignment, teleoperation and operator workflows live in Formant or the platform. Avoid two sources of command authority.'},
  alphaz:{published:['Field robotics for construction, security and industrial work','Robots positioned for repetitive, dull or hazardous tasks','2,000+ missions claimed on the company site','Deployment-oriented field robotics team'],boundary:'Treat AlphaZ as a field-autonomy and deployment partner. Expose patrol, inspect and recover as bounded skills rather than coupling the enterprise layer to a robot-specific API.'},
  levatas:{published:['Industrial visual AI model library','Hardware-agnostic support across robots, drones and cameras','Containerized deployment on cloud, on-prem or edge','Human-in-the-loop validation and enterprise API integration'],boundary:'Benchmark specialist inspection models against a general VLM. Keep the observation/evidence schema stable so the perception provider can change without rebuilding workflows.'},
  optelos:{published:['Ingest visual and spatial data from many sources','Contextualize inspection data around assets','AI-ready digital twins and AI analysis','Visualization and workflow delivery for critical infrastructure'],boundary:'Use Optelos where asset inspection workflows and digital-twin context are valuable; synchronize accepted findings into the common entity and evidence model.'},
  observance:{published:['LiDAR, RGB, thermal and IMU site capture','As-built BIM and 3D models','Design-vs-as-built deviation detection','Construction progress and milestone evidence'],boundary:'Import source time, coordinate frame and project identity with every result. A scan is evidence for the world state, not the world state itself.'},
  kael:{published:['Combines scans, schedules, costs and observations','Predictive delay and coordination risk','Deviation reports and dashboards','Construction-specific project intelligence'],boundary:'Keep recommendations, risk and project workflow separate from machine authority. Export the decision context rather than letting an application silently command executors.'},
  cosmos:{published:['Physical-AI reasoning and world-generation reference','Action-conditioned future observation generation','Simulation and synthetic-data role','Model service rather than authoritative operational database'],boundary:'Use learned prediction to compare possible futures. Keep current operational facts, permissions and completed-action evidence in a separate authoritative layer.'},
  isaac:{published:['Robot simulation and synthetic-data environment','Sensor simulation and robot model integration','Useful for test coverage and sim-to-real evaluation'],boundary:'Simulation is an engineering/evaluation service. Do not let simulated success stand in for field qualification.'},
  nav2:{published:['ROS 2 navigation framework','Localization, planning, control and behavior-tree components','Mobile robot navigation reference'],boundary:'Nav2 owns local navigation logic, not enterprise mission ownership or cross-fleet policy.'},
  moveit:{published:['ROS 2 manipulation planning framework','Planning scene, kinematics and motion-planning components'],boundary:'MoveIt proposes and executes robot-arm motion inside local constraints. Enterprise orchestration should request a skill, not a joint trajectory.'},
  px4:{published:['Open-source flight-control stack','Flight modes, mission execution and failsafe behaviors'],boundary:'Keep stabilization, geofence, loss-link and return behavior local to the aircraft.'}
};

export const integrationRail=[
  ['ALARMS & BMS','Fire / process / building events','Event + source + timestamp'],
  ['CAMERAS & VMS','Live / recorded video evidence','Clip + frame + camera ID'],
  ['CMMS / EAM','Assets, work orders, maintenance','Asset + task + closure'],
  ['PROJECT SYSTEMS','Schedules, BIM, drawings, cost','Project object + revision'],
  ['IDENTITY / IAM','Operator, tenant, authority','Principal + scope + expiry'],
  ['DATA / LAKEHOUSE','Episodes, metrics, evaluation','Evidence + lineage + policy']
];

export const pageStory={
  thesis:[
    ['01','Sense','Raw physical signals are cheap. Context is scarce.'],
    ['02','Understand','Bind signals to persistent entities and uncertainty.'],
    ['03','Orchestrate','Turn intent into a governed mission across partners.'],
    ['04','Execute','Let the local runtime act—and retain its right to refuse.'],
    ['05','Verify','Close on measured feedback, not a status badge.']
  ],
  world:[
    ['Observation','What was actually measured?'],
    ['Entity','Which physical object does it describe?'],
    ['State','What do we currently believe, and how fresh is it?'],
    ['Memory','What happened before, under which policy and model?'],
    ['Prediction','What could happen under candidate actions?'],
    ['Decision interface','What context can the mission layer safely use?']
  ],
  robotics:[
    ['Mission','Name the goal, scope and acceptance evidence.'],
    ['Skill','Choose a capability this embodiment actually supports.'],
    ['Perception','Maintain local pose, obstacle and task state.'],
    ['Planning','Convert task intent into feasible motion.'],
    ['Control','Enforce physical limits and local stop behavior.'],
    ['Feedback','Return independent evidence and service health.']
  ]
};

export const thesisBets=[
  ['MODEL ECONOMICS','General VLMs will absorb more narrow video analytics as quality improves and inference gets cheaper. Specialist models remain where latency, offline operation, determinism or event-level accuracy wins.'],
  ['PLATFORM MOAT','The durable asset is the operational contract: identity, world state, permissions, mission lifecycle, evidence and deployment data—not one detector or one robot.'],
  ['EDGE + CLOUD','Keep safety-critical and latency-sensitive control local; use heavier reasoning, fleet coordination and learning centrally. Hybrid is the default.'],
  ['PARTNER STRATEGY','Buy mature hardware, perception and fleet capabilities. Own the seams where trust, repeatability and customer outcome compound.']
];
