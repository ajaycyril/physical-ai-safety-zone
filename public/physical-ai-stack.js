(() => {
  const body = document.body;
  const stack = document.querySelector('[data-operating-stack]');
  if (!stack) return;

  const scenarios = {
    asset: {
      title: 'Asset anomaly → autonomous inspection',
      copy: 'A predictive signal requests independent evidence. Orchestration selects the right embodiment, dispatches a bounded inspection and closes the loop with verified evidence.',
      nodes: ['portal','optelos','levatas','anomaly','missiongraph','policy','dispatch','formant','alphaz','ground','sensors'],
      layers: ['customer','apps','ai','orchestration','native','physical'],
      trace: [
        ['REQUEST','Inspect the at-risk asset'],
        ['GROUND','Resolve asset, location and missing evidence'],
        ['AUTHORIZE','Compile mission + policy'],
        ['EXECUTE','Dispatch capable robot'],
        ['VERIFY','Return thermal / visual evidence'],
        ['CLOSE','Update state + work order']
      ]
    },
    fire: {
      title: 'Fire alarm → robotic / drone verification',
      copy: 'An alarm becomes a governed verification mission: correlate site context, choose a safe observation path, dispatch a drone or robot and return evidence to the emergency workflow.',
      nodes: ['authority','hassantuk','vlm','lidar','missiongraph','policy','dispatch','qualcomm','drone','camera','sensors'],
      layers: ['customer','apps','ai','orchestration','native','physical'],
      trace: [
        ['ALARM','Receive alarm + property identity'],
        ['CORRELATE','Fuse camera / sensor context'],
        ['AUTHORIZE','Apply emergency policy'],
        ['DISPATCH','Launch nearest capable fleet'],
        ['VERIFY','Return live visual / thermal evidence'],
        ['ESCALATE','Update authority workflow']
      ]
    },
    construction: {
      title: 'Construction site → progress + deviation mission',
      copy: 'A scheduled reality-capture mission collects site state, compares it with plan and BIM context, then publishes progress, variance and risk into the project workflow.',
      nodes: ['portal','observance','kael','levatas','lidar','missiongraph','dispatch','qualcomm','drone'],
      layers: ['customer','apps','ai','orchestration','native','physical'],
      trace: [
        ['SCHEDULE','Request site capture'],
        ['CONTEXT','Load BIM + plan + route'],
        ['COMPILE','Define evidence coverage'],
        ['CAPTURE','Fly / scan site'],
        ['COMPARE','Detect progress + variance'],
        ['REPORT','Update project state']
      ]
    },
    security: {
      title: 'Security event → cross-fleet response',
      copy: 'A video alert is enriched with scene context, converted to a bounded response mission and handed to the best available camera, drone or ground robot for verification.',
      nodes: ['portal','qccvms','levatas','vlm','missiongraph','policy','picture','qualcomm','ground','drone','camera'],
      layers: ['customer','apps','ai','orchestration','native','physical'],
      trace: [
        ['DETECT','Receive video event'],
        ['GROUND','Resolve person / zone / asset'],
        ['POLICY','Check response authority'],
        ['ROUTE','Select available fleet'],
        ['VERIFY','Collect live evidence'],
        ['CLOSE','Record incident outcome']
      ]
    }
  };

  const details = {
    portal:['MISSION INTAKE','e& Mission Portal','Customer-facing mission ordering and tracking. A production portal should separate requested intent from the governed mission that will actually execute.',['request','quote','track','receive']],
    api:['API CONTRACT','Mission API','Programmatic mission creation, status, callbacks and data export. The API should expose mission state, not vendor-specific robot commands.',['auth','mission state','webhooks']],
    enterprise:['ENTERPRISE','Enterprise systems','ERP, CMMS, EAM and customer systems provide asset context and receive accountable business actions after physical work.',['work order','asset','SLA']],
    authority:['GOVERNED RESPONSE','Authority / command','Emergency and regulated workflows need explicit acknowledgement, escalation and audit rather than a generic notification.',['authority','ack','audit']],
    qccvms:['APPLICATION','Security / QCC VMS','A surveillance application that converts live and recorded media into security events and operator workflows.',['video','alerts','security']],
    optelos:['PARTNER APPLICATION','Optelos','Visual inspection and digital-twin workflow for asset evidence. In a shared stack, inspection output becomes typed estate state and evidence.',['inspection','digital twin','asset']],
    observance:['PARTNER APPLICATION','Inkers Observance','Reality-capture layer using multimodal site data to measure progress, deviation and as-built state.',['LiDAR','RGB','thermal','BIM']],
    kael:['PARTNER APPLICATION','Inkers Kaël','Project-intelligence layer that joins site observations with schedule, cost and risk to drive project decisions.',['schedule','cost','risk']],
    hassantuk:['SAFETY APPLICATION','Hassantuk / Safety','A regulated safety workflow where alarms, property identity, monitoring, authority response and closure form one accountable product loop.',['alarm','NOC','authority']],
    levatas:['PARTNER AI','Levatas','Hardware-agnostic industrial visual intelligence that can consume imagery from drones, robots and fixed cameras.',['visual AI','edge','multi-device']],
    vlm:['MODEL SERVICE','VLM / vision models','Perception and reasoning models produce bounded observations and hypotheses; they should not silently become authoritative estate truth.',['CV','VLM','confidence']],
    lidar:['SPATIAL CONTEXT','Maps + LiDAR','Geometry, pose, routes and scene context anchor observations to a shared physical frame.',['geometry','pose','map']],
    anomaly:['MODEL SERVICE','Anomaly services','Detect changes, defects or out-of-pattern behavior and attach confidence, source and freshness.',['defect','change','risk']],
    missiongraph:['ORCHESTRATION','Mission graph','A task DAG turns high-level intent into dependencies, preconditions, timeouts, recovery paths and expected evidence.',['DAG','preconditions','recovery']],
    dispatch:['ORCHESTRATION','Event-driven dispatch','Select a capable fleet or system using location, health, payload, risk, latency and operating envelope.',['capability','resource','routing']],
    policy:['GOVERNANCE','Policy + approval','Reasoning proposes. Policy authorizes. High-risk actions are gated by zone, actor, mission class and human approval.',['policy','human-in-loop','fallback']],
    picture:['OPERATIONS','Shared operating picture','Mission progress, robot state, evidence and exceptions remain visible across systems and operators.',['telemetry','exceptions','evidence']],
    qualcomm:['NATIVE PLATFORM','Qualcomm Command Center','Edge and command-center capabilities can handle device / fleet workflows while the orchestration layer remains vendor-neutral.',['edge AI','fleet','robotics']],
    formant:['ROBOT OPERATIONS','Formant','Robot operations and data plane with a robot-side agent, ROS / non-ROS telemetry ingestion, WebRTC teleoperation, fleet observability, commands and developer APIs.',['agent','teleop','fleet','APIs']],
    alphaz:['ROBOT INTELLIGENCE','AlphaZ RMS','Robot-management / autonomy component shown in the e& reference architecture. Public detail is limited; public AlphaZ material emphasizes reasoning, navigation, planning and reliable field deployments.',['reasoning','navigation','missions']],
    oem:['ROBOT EDGE','OEM runtimes','ROS 2, autopilots and OEM SDKs keep deterministic control and vendor-specific autonomy close to the machine.',['ROS 2','SDK','local safety']],
    drone:['EMBODIMENT','Drone fleet + docks','Aerial sensing with repeatable launch, route, payload, dock and evidence workflows.',['RGB','thermal','LiDAR']],
    ground:['EMBODIMENT','Ground robot fleet','Mobile inspection and patrol bodies with local autonomy, safety envelopes and payload-specific skills.',['inspection','patrol','local autonomy']],
    camera:['SENSOR','Fixed / mobile cameras','Continuous or mission-triggered visual context feeding specialist perception and evidence pipelines.',['live video','recorded','VMS']],
    sensors:['SENSOR','IoT + OT sensors','Condition and alarm signals provide weak or strong evidence that can trigger, constrain or verify physical missions.',['condition','alarm','telemetry']]
  };

  const scenarioButtons = [...document.querySelectorAll('[data-scenario]')];
  const layers = [...document.querySelectorAll('[data-layer]')];
  const nodes = [...document.querySelectorAll('[data-node]')];
  const trace = [...document.querySelectorAll('[data-mission-trace] li')];
  const missionTitle = document.querySelector('[data-mission-title]');
  const missionCopy = document.querySelector('[data-mission-copy]');

  function playScenario(key) {
    const s = scenarios[key] || scenarios.asset;
    scenarioButtons.forEach(b => b.classList.toggle('is-active', b.dataset.scenario === key));
    nodes.forEach(n => n.classList.toggle('is-route', s.nodes.includes(n.dataset.node)));
    layers.forEach((l, idx) => {
      l.classList.toggle('route-active', s.layers.includes(l.dataset.layer));
      l.classList.remove('route-pulse');
      if (s.layers.includes(l.dataset.layer)) setTimeout(() => l.classList.add('route-pulse'), idx * 75);
      setTimeout(() => l.classList.remove('route-pulse'), 600 + idx * 75);
    });
    missionTitle.textContent = s.title;
    missionCopy.textContent = s.copy;
    trace.forEach((li, i) => {
      const item = s.trace[i];
      if (!item) return;
      li.querySelector('b').textContent = item[0];
      li.querySelector('small').textContent = item[1];
      li.classList.remove('is-current');
      setTimeout(() => li.classList.add('is-current'), i * 330);
      setTimeout(() => li.classList.remove('is-current'), i * 330 + 700);
    });
    setTimeout(() => trace[trace.length - 1]?.classList.add('is-current'), 6 * 330);
  }

  scenarioButtons.forEach(b => b.addEventListener('click', () => playScenario(b.dataset.scenario)));
  playScenario('asset');

  const lensButtons = [...document.querySelectorAll('[data-lens]')];
  const layerTitles = [...document.querySelectorAll('[data-layer-title]')];
  const copies = {
    eand: [
      'Order a mission, price or authorize it, track execution and receive evidence through one customer-facing surface.',
      'Specialist applications translate customer outcomes into domain context, evidence requirements and enterprise actions.',
      'Fuse video, maps, imagery, LiDAR and sensor streams into typed observations, detections and bounded model outputs.',
      'Compile intent into a mission graph, select capable resources, apply policy, sequence tasks, manage exceptions and route evidence.',
      'Keep vendor-specific fleet health, route execution, low-latency autonomy and robot lifecycle in the platforms designed to do it.',
      'Robots, drones, cameras and sensors execute bounded work while producing high-fidelity telemetry and evidence.'
    ],
    analog: [
      'Expose customer and operator intent through stable APIs and experience surfaces without allowing prompts to bypass governance.',
      'Ana and vertical workflows ground intent in estate context, explain the situation and propose an outcome-oriented plan.',
      'The World Model holds trusted state while a model gateway supplies perception, prediction and specialist intelligence with provenance.',
      'Hive compiles a governed mission, evaluates policy and capability, sequences work, manages recovery and owns enterprise closure.',
      'Capability adapters and edge runtimes translate common missions into vendor-native control while preserving local safety and autonomy.',
      'Embodiments remain replaceable: robots, drones, cameras and sensors execute and return evidence into the same operational memory.'
    ]
  };

  function setLens(mode) {
    body.dataset.lensMode = mode;
    lensButtons.forEach(b => b.classList.toggle('is-active', b.dataset.lens === mode));
    layers.forEach((layer, idx) => {
      const title = mode === 'analog' ? layer.dataset.titleAnalog : layer.dataset.titleEand;
      const titleEl = layer.querySelector('[data-layer-title]');
      const copyEl = layer.querySelector('.band-copy');
      if (titleEl && title) titleEl.textContent = title;
      if (copyEl) copyEl.textContent = copies[mode][idx];
    });
  }
  lensButtons.forEach(b => b.addEventListener('click', () => setLens(b.dataset.lens)));

  const detail = document.querySelector('[data-node-detail]');
  const detailTitle = detail?.querySelector('[data-detail-title]');
  const detailKicker = detail?.querySelector('[data-detail-kicker]');
  const detailCopy = detail?.querySelector('[data-detail-copy]');
  const detailTags = detail?.querySelector('[data-detail-tags]');
  nodes.forEach(node => node.addEventListener('click', () => {
    const d = details[node.dataset.node];
    if (!d || !detail) return;
    detailKicker.textContent = d[0];
    detailTitle.textContent = d[1];
    detailCopy.textContent = d[2];
    detailTags.innerHTML = d[3].map(tag => '<span>' + tag + '</span>').join('');
    detail.classList.add('is-open');
    detail.setAttribute('aria-hidden','false');
  }));
  detail?.querySelector('[data-node-close]')?.addEventListener('click', () => {
    detail.classList.remove('is-open');
    detail.setAttribute('aria-hidden','true');
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && detail?.classList.contains('is-open')) {
      detail.classList.remove('is-open');
      detail.setAttribute('aria-hidden','true');
    }
  });
})();