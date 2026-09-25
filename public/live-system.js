(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $("worldCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = 1100, H = 700;

  const d = {
    command:$("anaCommand"), ask:$("askAna"), reset:$("resetSim"), dispatch:$("dispatchMission"),
    compile:$("missionCompile"), missionTitle:$("missionTitle"), reasoning:$("reasoningBox"),
    anaStatus:$("anaStatus"), stackStatus:$("stackStatus"), pause:$("pauseMission"),
    inject:$("injectAnomaly"), approval:$("approvalModal"), approvalText:$("approvalText"),
    grant:$("grantApproval"), deny:$("denyApproval"), clock:$("simClock"),
    hudRobot:$("hudRobot"), hudPose:$("hudPose"), hudMission:$("hudMission"), hudSafety:$("hudSafety"),
    battery:$("batteryValue"), batteryBar:$("batteryBar"), episodeId:$("episodeId"), episodeBar:$("episodeBar"),
    worldList:$("worldStateList"), entityCount:$("entityCount"), factCount:$("factCount"),
    worldConfidence:$("worldConfidence"), graph:$("worldGraph"), hiveMission:$("hiveMission"),
    hiveState:$("hiveState"), hiveProgress:$("hiveProgress"), missionSteps:$("missionSteps"),
    routerDecision:$("routerDecision"), routerOptions:$("routerOptions"), edgeLog:$("edgeLog"),
    trace:$("traceEvents"), clearTrace:$("clearTrace"), evidenceStatus:$("evidenceStatus"),
    thermalTemp:$("thermalTemp"), evidenceFacts:$("evidenceFacts"), replay:$("replayMission"),
    success:$("successScore"), interventions:$("interventionCount"), eventCount:$("eventCount"),
    episodeTimeline:$("episodeTimeline"), heroRun:$("heroRun"), safetyMode:$("safetyMode")
  };

  const C = {ink:"#08070b",pink:"#f2a8d8",violet:"#a49af8",blue:"#87aef8",mint:"#9bd9cb",amber:"#f4c98f",red:"#f4a3a3"};

  const presets = {
    inspection:{
      title:"Thermal inspection / P-204",
      prompt:"Inspect pump P-204. If temperature exceeds 90°C, verify valve V-12, create a maintenance incident, and return to dock.",
      reasoning:[
        ["GROUND","Resolved P-204 to Pump / Cooling Loop A. Current temperature 94.2°C; vibration 7.8 mm/s; anomaly confidence 0.96."],
        ["CONTEXT","V-12 is the upstream isolation valve. Access route crosses Controlled Zone C; robot entry requires maintenance approval."],
        ["PLAN","Inspect P-204 → verify V-12 accessibility → create incident with evidence → return to D-01."],
        ["POLICY","No valve actuation requested. Physical control remains prohibited; inspection-only mission compiled."]
      ],
      steps:[
        {kind:"navigate",label:"Navigate to Pump P-204",target:"P-204",risk:"LOW"},
        {kind:"inspect",label:"Thermal + vibration inspection",target:"P-204",risk:"LOW"},
        {kind:"navigate",label:"Enter Zone C / approach V-12",target:"V-12",risk:"CONTROLLED",approval:true},
        {kind:"verify",label:"Verify valve accessibility",target:"V-12",risk:"LOW"},
        {kind:"workflow",label:"Create maintenance incident",target:"P-204",risk:"LOW"},
        {kind:"return",label:"Return to dock D-01",target:"D-01",risk:"LOW"}
      ]
    },
    safety:{
      title:"Autonomous safety patrol / Zone C",
      prompt:"Patrol the restricted corridor in Zone C. If a person enters the exclusion area, stop safely, preserve evidence, reroute through checkpoint C2, and complete the patrol.",
      reasoning:[
        ["GROUND","Zone C is a controlled corridor. Current occupancy: clear. AX-07 has patrol permission but must yield to people."],
        ["PLAN","Navigate C1 → scan corridor → hold on human intrusion → reroute C2 → complete patrol → dock."],
        ["SAFETY","Human detection overrides mission progress locally at the edge. No cloud approval is required to stop."],
        ["EVIDENCE","Store intrusion frame, stop latency, reroute decision and completion state as one replayable episode."]
      ],
      steps:[
        {kind:"navigate",label:"Navigate to checkpoint C1",target:"C-1",risk:"LOW"},
        {kind:"patrol",label:"Patrol restricted corridor",target:"C-2",risk:"CONTROLLED"},
        {kind:"reroute",label:"Reroute around detected person",target:"C-2",risk:"LOW"},
        {kind:"inspect",label:"Verify corridor clear",target:"C-2",risk:"LOW"},
        {kind:"return",label:"Return to dock D-01",target:"D-01",risk:"LOW"}
      ]
    },
    manipulation:{
      title:"Pallet recovery / Aisle 3",
      prompt:"Recover pallet PL-9 from aisle 3 and move it to staging bay S-3. Choose the safest available manipulation policy and return to dock.",
      reasoning:[
        ["GROUND","PL-9 located in Aisle 3. Payload estimate 11.8 kg. Path to S-3 is clear; no humans within 4 m."],
        ["CAPABILITY","AX-07 manipulation attachment supports 15 kg. Grasp confidence from current view: 0.88."],
        ["ROUTE","Navigation can use classical local planning; manipulation requires an embodied policy and human approval for material movement."],
        ["PLAN","Navigate → inspect grasp → approve → manipulate PL-9 → verify placement at S-3 → dock."]
      ],
      steps:[
        {kind:"navigate",label:"Navigate to pallet PL-9",target:"PL-9",risk:"LOW"},
        {kind:"inspect",label:"Estimate grasp + payload",target:"PL-9",risk:"LOW"},
        {kind:"manipulate",label:"Recover and move pallet",target:"S-3",source:"PL-9",risk:"CONTROLLED",approval:true},
        {kind:"verify",label:"Verify staging placement",target:"S-3",risk:"LOW"},
        {kind:"return",label:"Return to dock D-01",target:"D-01",risk:"LOW"}
      ]
    }
  };

  const assets = () => ({
    "D-01":{id:"D-01",type:"Dock",x:128,y:588,status:"READY"},
    "P-204":{id:"P-204",type:"Pump",x:804,y:226,status:"ALERT",temp:94.2,vibration:7.8},
    "V-12":{id:"V-12",type:"Valve",x:886,y:318,status:"ACCESSIBLE"},
    "E-17":{id:"E-17",type:"Panel",x:416,y:164,status:"NORMAL"},
    "PL-9":{id:"PL-9",type:"Pallet",x:692,y:542,status:"MISPLACED",mass:11.8},
    "S-3":{id:"S-3",type:"Staging",x:890,y:545,status:"CLEAR"},
    "C-1":{id:"C-1",type:"Checkpoint",x:620,y:175,status:"CLEAR"},
    "C-2":{id:"C-2",type:"Checkpoint",x:620,y:390,status:"CLEAR"}
  });

  const s = {
    scenario:"inspection", world:null, mission:null, running:false, paused:false,
    approvalResolver:null, episodeCounter:41, currentPolicy:null, humanVisible:false,
    scanPulse:0, lastEpisode:null, simSeconds:9*3600+42*60+16, routeTarget:null
  };

  const sleep = ms => new Promise(r => setTimeout(r,ms));
  const simTime = ms => {
    const sec=Math.floor(s.simSeconds%60), min=Math.floor(s.simSeconds/60)%60, hr=Math.floor(s.simSeconds/3600)%24;
    const base=[hr,min,sec].map(v=>String(v).padStart(2,"0")).join(":");
    return ms ? base+"."+String(Math.floor(performance.now()%1000)).padStart(3,"0") : base;
  };

  function addTrace(layer,text){
    const el=document.createElement("div");
    el.className="trace-event "+layer.toLowerCase();
    el.innerHTML="<time>"+simTime(true)+"</time><span>"+layer+"</span><p>"+text+"</p>";
    d.trace.appendChild(el);
    while(d.trace.children.length>30)d.trace.removeChild(d.trace.firstElementChild);
    d.trace.scrollLeft=d.trace.scrollWidth;
    if(s.mission){s.mission.events.push({time:simTime(true),layer,text});d.eventCount.textContent=String(s.mission.events.length);}
  }

  function edgeLog(channel,text){
    const el=document.createElement("div");
    el.innerHTML="<time>"+simTime()+"</time><span>"+channel+"</span><p>"+text+"</p>";
    d.edgeLog.prepend(el);
    while(d.edgeLog.children.length>18)d.edgeLog.removeChild(d.edgeLog.lastElementChild);
  }

  function resetWorld(){
    s.world={
      robot:{id:"AX-07",x:128,y:588,heading:0,battery:92,status:"IDLE"},
      assets:assets(), zoneC:{x:565,y:105,w:370,h:325,label:"CONTROLLED ZONE C"},
      human:{id:"H-14",x:750,y:280,visible:false}, incident:null
    };
    s.mission=null;s.running=false;s.paused=false;s.currentPolicy=null;s.humanVisible=false;s.routeTarget=null;
    d.compile.hidden=true;d.approval.hidden=true;d.anaStatus.textContent="READY";d.anaStatus.className="panel-status ready";
    d.stackStatus.textContent="ONLINE";d.hudRobot.textContent="AX-07 / IDLE";d.hudMission.textContent="NO ACTIVE MISSION";
    d.hudSafety.textContent="NOMINAL";d.safetyMode.textContent="ARMED";d.hiveMission.textContent="—";d.hiveState.textContent="IDLE";
    d.hiveProgress.textContent="0%";d.missionSteps.innerHTML='<p class="empty-copy">No mission compiled.</p>';
    d.episodeId.textContent="—";d.episodeBar.style.width="0%";
    d.reasoning.innerHTML='<div class="reason-line muted"><span>ANA</span><p>Awaiting operator intent.</p></div>';
    d.pause.textContent="PAUSE";
    renderRouter(null);renderWorldState();renderGraph();updateHUD();
  }

  function renderWorldState(){
    const a=s.world.assets;
    const rows=[
      ["AX-07","ROBOT / "+s.world.robot.status,Math.round(s.world.robot.battery)+"%",""],
      ["P-204","PUMP / "+a["P-204"].temp.toFixed(1)+"°C / "+a["P-204"].vibration.toFixed(1)+" mm/s",a["P-204"].status,a["P-204"].status==="ALERT"?"alert":""],
      ["V-12","VALVE / ZONE C",a["V-12"].status,""],
      ["PL-9","PALLET / "+a["PL-9"].mass.toFixed(1)+" kg",a["PL-9"].status,a["PL-9"].status==="MISPLACED"?"warn":""],
      ["ZONE C","CONTROLLED / HUMAN-YIELD",s.humanVisible?"OCCUPIED":"CLEAR",s.humanVisible?"alert":""]
    ];
    d.worldList.innerHTML=rows.map(r=>'<div class="state-item '+r[3]+'"><div><small>'+r[1]+'</small><strong>'+r[0]+'</strong></div><span>'+r[2]+'</span></div>').join("");
    d.entityCount.textContent=s.humanVisible?"12":"11";d.factCount.textContent=s.mission?String(27+Math.min(s.mission.events.length,12)):"27";
    d.worldConfidence.textContent=(97.8-(s.humanVisible?.5:0)).toFixed(1)+"%";
  }

  function renderGraph(){
    const svg=d.graph?.querySelector("svg");if(!svg)return;
    const links=svg.querySelector(".graph-links"),nodes=svg.querySelector(".graph-nodes");
    const pts=[["SITE",210,28,""],["ZONE C",210,88,""],["P-204",100,152,"alert"],["V-12",210,188,""],["AX-07",320,148,""],["H-14",330,65,s.humanVisible?"alert":""],["PL-9",70,70,""],["S-3",75,210,""]];
    const ep=[[0,1],[1,2],[1,3],[1,4],[1,5],[0,6],[6,7],[4,2],[4,3]];
    links.innerHTML=ep.map(([i,j])=>'<line x1="'+pts[i][1]+'" y1="'+pts[i][2]+'" x2="'+pts[j][1]+'" y2="'+pts[j][2]+'"/>').join("");
    nodes.innerHTML=pts.map(([label,x,y,cls])=>'<circle class="'+cls+'" cx="'+x+'" cy="'+y+'" r="8"/><text x="'+(x+12)+'" y="'+(y+3)+'">'+label+"</text>").join("");
  }

  function renderMissionSteps(){
    if(!s.mission)return;
    d.missionSteps.innerHTML=s.mission.steps.map((step,i)=>{
      const status=i<s.mission.index?"done":i===s.mission.index&&s.running?"active":"";
      const label=i<s.mission.index?"DONE":i===s.mission.index&&s.running?"RUN":"WAIT";
      return '<div class="mission-step '+status+'"><span>'+String(i+1).padStart(2,"0")+'</span><div><small>'+step.kind.toUpperCase()+" / "+step.risk+"</small><strong>"+step.label+"</strong></div><b>"+label+"</b></div>";
    }).join("");
  }

  function renderRouter(selected){
    const opts=[["CLASSICAL NAV","Classical Nav + OEM locomotion"],["GEMINI ROBOTICS ER 2","Gemini Robotics ER 2"],["ISAAC GR00T","Isaac GR00T"],["SKILD S1","Skild S1"],["OEM POLICY","OEM Policy"]];
    d.routerOptions.innerHTML=opts.map(([label,key])=>'<div class="'+(selected===key?"selected":"")+'"><span>'+label+"</span><b>"+(selected===key?"SELECTED":key.includes("Classical")||key==="OEM Policy"?"ELIGIBLE":"STANDBY")+"</b></div>").join("");
  }

  function routePolicy(step){
    let selected="OEM Policy",why="OEM-native policy provides the safest supported behavior for this step.";
    if(["navigate","return","reroute"].includes(step.kind)){selected="Classical Nav + OEM locomotion";why="Deterministic navigation meets the task with lower latency and a known safety envelope.";}
    else if(["inspect","verify","patrol"].includes(step.kind)){selected="Gemini Robotics ER 2";why="Embodied reasoning interprets multimodal scene context while motion remains under deterministic local control.";}
    else if(step.kind==="manipulate"){selected="Skild S1";why="An embodied manipulation policy is selected for the pallet task; capability and payload envelope are compatible.";}
    s.currentPolicy=selected;renderRouter(selected);
    d.routerDecision.innerHTML='<small>ROBOT INTELLIGENCE ROUTER</small><h3>'+selected+"</h3><p>"+why+"</p>";
    addTrace("ROUTER",'Selected '+selected+' for “'+step.label+'”.');edgeLog("router.policy",selected+" selected / risk "+step.risk);
  }

  function compileMission(name){
    const p=presets[name];s.scenario=name;
    s.mission={id:"MSN-"+String(s.episodeCounter).padStart(4,"0"),title:p.title,steps:p.steps.map(x=>({...x})),index:0,status:"COMPILED",progress:0,events:[],interventions:0,start:null,end:null};
    d.missionTitle.textContent=p.title;d.compile.hidden=false;d.hiveMission.textContent=s.mission.id;d.hiveState.textContent="COMPILED";d.hiveProgress.textContent="0%";
    d.episodeId.textContent="EP-"+String(s.episodeCounter).padStart(4,"0");renderMissionSteps();
    addTrace("HIVE","Mission "+s.mission.id+" compiled with "+s.mission.steps.length+" governed steps.");
  }

  async function anaReason(name){
    if(s.running)return;
    const p=presets[name];s.scenario=name;d.anaStatus.textContent="REASONING";d.anaStatus.className="panel-status busy";d.reasoning.innerHTML="";d.compile.hidden=true;
    addTrace("ANA","Intent received: "+d.command.value.trim());
    try{
      const res=await fetch("/api/ana",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({intent:d.command.value,scenario:name})});
      if(res.ok){const out=await res.json();if(out?.trace?.length)p.reasoning=out.trace;}
    }catch(_){}
    for(const [tag,text] of p.reasoning){await sleep(310);const el=document.createElement("div");el.className="reason-line "+(["SAFETY","POLICY"].includes(tag)?"warn":tag==="PLAN"?"good":"");el.innerHTML="<span>"+tag+"</span><p>"+text+"</p>";d.reasoning.appendChild(el);d.reasoning.scrollTop=d.reasoning.scrollHeight;}
    await sleep(220);compileMission(name);d.anaStatus.textContent="PLAN READY";d.anaStatus.className="panel-status ready";
  }

  function inferScenario(text){
    const t=text.toLowerCase();if(/pallet|aisle|staging|move|grasp|recover/.test(t))return"manipulation";if(/patrol|person|human|restricted corridor|exclusion/.test(t))return"safety";return"inspection";
  }
  function setScenario(name){s.scenario=name;d.command.value=presets[name].prompt;document.querySelectorAll("[data-scenario]").forEach(b=>b.classList.toggle("active",b.dataset.scenario===name));}

  function updateHUD(){
    const r=s.world.robot;d.hudRobot.textContent=r.id+" / "+r.status;d.hudPose.textContent="x "+(r.x/10).toFixed(1)+" / y "+(r.y/10).toFixed(1);
    d.battery.textContent=Math.round(r.battery)+"%";d.batteryBar.style.width=Math.max(0,r.battery)+"%";
    if(s.mission){d.hudMission.textContent=s.mission.id+" / "+s.mission.status;d.episodeBar.style.width=s.mission.progress+"%";}
  }
  async function waitIfPaused(){while(s.paused&&s.running)await sleep(100);}

  async function moveTo(targetId,speed=2.25){
    const target=s.world.assets[targetId];if(!target)return;s.routeTarget=target;s.world.robot.status="MOVING";addTrace("EDGE","Local planner accepted route to "+targetId+".");edgeLog("nav.local","Path accepted → "+targetId);
    const r=s.world.robot;
    return new Promise(resolve=>{
      let last=performance.now();
      function step(now){
        if(!s.running)return resolve();if(s.paused){last=now;requestAnimationFrame(step);return;}
        const dt=Math.min(32,now-last);last=now;const dx=target.x-r.x,dy=target.y-r.y,dist=Math.hypot(dx,dy);
        if(dist<5){r.x=target.x;r.y=target.y;r.status="ARRIVED";s.routeTarget=null;updateHUD();resolve();return;}
        const amt=speed*dt/16;r.heading=Math.atan2(dy,dx);r.x+=dx/dist*Math.min(amt,dist);r.y+=dy/dist*Math.min(amt,dist);r.battery=Math.max(18,r.battery-.004);updateHUD();requestAnimationFrame(step);
      }requestAnimationFrame(step);
    });
  }

  function setEvidence(assetId,observation,outcome){
    const a=s.world.assets[assetId]||s.world.assets["P-204"];d.evidenceStatus.textContent="CAPTURED";d.thermalTemp.textContent=a.temp?a.temp.toFixed(1)+"°C":"31.4°C";
    d.evidenceFacts.innerHTML='<div><span>ASSET</span><b>'+assetId+'</b></div><div><span>OBSERVATION</span><b>'+observation+'</b></div><div><span>OUTCOME</span><b>'+outcome+"</b></div>";
  }

  async function requestApproval(step){
    s.mission.interventions++;d.interventions.textContent=String(s.mission.interventions);s.world.robot.status="SAFETY HOLD";d.hudSafety.textContent="APPROVAL REQUIRED";d.safetyMode.textContent="HOLD";
    d.approvalText.textContent=step.kind==="manipulate"?"Material movement is a controlled physical action. Capability is valid, but human authority is required before execution.":"Entry into Controlled Zone C requires human approval for this robot mission.";
    d.approval.hidden=false;addTrace("SAFETY","Mission paused. Human approval required for "+step.label+".");edgeLog("safety.supervisor","HOLD / awaiting authority token");
    const approved=await new Promise(resolve=>{s.approvalResolver=resolve;});d.approval.hidden=true;s.approvalResolver=null;
    if(!approved){addTrace("SAFETY","Action denied by operator. Mission aborted safely.");s.mission.status="ABORTED";s.running=false;s.world.robot.status="SAFE STOP";d.hiveState.textContent="ABORTED";d.hudSafety.textContent="SAFE STOP";d.safetyMode.textContent="SAFE STOP";updateHUD();renderMissionSteps();return false;}
    addTrace("SAFETY","Human approval granted. Scoped authority token issued.");edgeLog("safety.supervisor","Authority token verified / resume");s.world.robot.status="RESUMING";d.hudSafety.textContent="NOMINAL";d.safetyMode.textContent="ARMED";return true;
  }

  async function executeStep(step,index){
    await waitIfPaused();routePolicy(step);renderMissionSteps();addTrace("HIVE","Executing step "+(index+1)+"/"+s.mission.steps.length+": "+step.label+".");
    if(step.approval){const ok=await requestApproval(step);if(!ok)return false;}

    if(["navigate","return","reroute"].includes(step.kind)){await moveTo(step.target,step.kind==="reroute"?2.8:2.25);addTrace("EDGE","Arrived at "+step.target+".");}
    if(step.kind==="inspect"){
      if(Math.hypot(s.world.robot.x-s.world.assets[step.target].x,s.world.robot.y-s.world.assets[step.target].y)>22)await moveTo(step.target);
      s.world.robot.status="INSPECTING";s.scanPulse=1;edgeLog("sensor.payload","Thermal / RGB / vibration capture started");await sleep(900);await waitIfPaused();
      if(step.target==="P-204"){const a=s.world.assets["P-204"];a.temp=Math.max(a.temp,94.2);a.vibration=Math.max(a.vibration,7.8);a.status="ALERT";setEvidence("P-204",a.temp.toFixed(1)+"°C / "+a.vibration.toFixed(1)+" mm/s","ANOMALY CONFIRMED");addTrace("WORLD","P-204 observation written: thermal anomaly confirmed / confidence 0.98.");}
      else if(step.target==="PL-9"){setEvidence("PL-9","11.8 kg / grasp 0.88","MANIPULATION FEASIBLE");addTrace("WORLD","PL-9 payload and grasp estimate written to shared state.");}
      else{setEvidence(step.target,"CORRIDOR CLEAR","PATROL VERIFIED");addTrace("WORLD",step.target+" inspection state updated.");}s.scanPulse=0;
    }
    if(step.kind==="verify"){
      if(Math.hypot(s.world.robot.x-s.world.assets[step.target].x,s.world.robot.y-s.world.assets[step.target].y)>22)await moveTo(step.target);
      s.world.robot.status="VERIFYING";s.scanPulse=1;await sleep(650);s.scanPulse=0;
      if(step.target==="V-12"){s.world.assets["V-12"].status="ACCESSIBLE";addTrace("WORLD","V-12 verified accessible. No actuation performed.");setEvidence("P-204","94.2°C anomaly + V-12 accessible","INCIDENT READY");}
      else if(step.target==="S-3"){s.world.assets["S-3"].status="OCCUPIED / PL-9";addTrace("WORLD","Pallet placement verified at S-3.");}
    }
    if(step.kind==="workflow"){s.world.robot.status="STANDING BY";await sleep(540);s.world.incident={id:"INC-8842",asset:"P-204",severity:"HIGH",status:"OPEN"};addTrace("HIVE","Incident INC-8842 created with thermal evidence and asset context.");edgeLog("sync.evidence","Evidence package acknowledged by Hive");}
    if(step.kind==="manipulate"){
      if(step.source)await moveTo(step.source,2);s.world.robot.status="MANIPULATING";addTrace("EDGE","Skill runtime executing pallet_recover with bounded workspace.");await sleep(1000);await waitIfPaused();
      s.world.assets["PL-9"].status="IN TRANSIT";await moveTo(step.target,1.55);s.world.assets["PL-9"].x=s.world.assets[step.target].x;s.world.assets["PL-9"].y=s.world.assets[step.target].y;s.world.assets["PL-9"].status="STAGED";addTrace("WORLD","PL-9 state changed MISPLACED → STAGED at S-3.");setEvidence("PL-9","Controlled relocation","STAGED AT S-3");
    }
    if(step.kind==="patrol"){
      await moveTo("C-1",2.2);s.world.robot.status="PATROLLING";addTrace("EDGE","Patrol behavior active. Human-yield monitor armed locally.");await sleep(450);
      s.humanVisible=true;s.world.human.visible=true;renderWorldState();renderGraph();addTrace("SAFETY","H-14 entered exclusion path. Edge supervisor commanded zero velocity.");edgeLog("safety.human_yield","STOP < 110 ms / dynamic obstacle H-14");
      s.world.robot.status="SAFE STOP";d.hudSafety.textContent="HUMAN YIELD";d.safetyMode.textContent="LOCAL HOLD";s.mission.interventions++;d.interventions.textContent=String(s.mission.interventions);await sleep(1000);
      s.world.human.x=790;s.world.human.y=155;addTrace("WORLD","H-14 trajectory updated. Reroute corridor C2 now clear.");d.hudSafety.textContent="NOMINAL";d.safetyMode.textContent="ARMED";
    }
    s.world.robot.status="READY";renderWorldState();renderGraph();updateHUD();return true;
  }

  async function runMission(){
    if(!s.mission||s.running)return;s.running=true;s.paused=false;s.mission.status="EXECUTING";s.mission.start=simTime(true);d.hiveState.textContent="EXECUTING";d.stackStatus.textContent="MISSION LIVE";
    addTrace("HIVE","Mission "+s.mission.id+" dispatched to AX-07.");edgeLog("mission.exec","Mission "+s.mission.id+" accepted");
    for(let i=s.mission.index;i<s.mission.steps.length;i++){if(!s.running)break;s.mission.index=i;s.mission.progress=Math.round(i/s.mission.steps.length*100);d.hiveProgress.textContent=s.mission.progress+"%";renderMissionSteps();updateHUD();const ok=await executeStep(s.mission.steps[i],i);if(!ok)return;s.mission.index=i+1;s.mission.progress=Math.round((i+1)/s.mission.steps.length*100);d.hiveProgress.textContent=s.mission.progress+"%";renderMissionSteps();updateHUD();await sleep(150);}
    if(!s.running)return;s.mission.status="COMPLETE";s.mission.end=simTime(true);s.mission.progress=100;s.world.robot.status="IDLE";s.running=false;d.hiveState.textContent="COMPLETE";d.hiveProgress.textContent="100%";d.stackStatus.textContent="ONLINE";d.hudMission.textContent=s.mission.id+" / COMPLETE";
    addTrace("HIVE","Mission complete. Outcome evidence committed to episode store.");edgeLog("episode.close","Episode sealed / sync complete");finishEpisode();renderMissionSteps();updateHUD();
  }

  function finishEpisode(){
    const m=s.mission;s.lastEpisode={scenario:s.scenario,events:[...m.events],interventions:m.interventions,id:"EP-"+String(s.episodeCounter).padStart(4,"0")};
    d.success.textContent="100%";d.interventions.textContent=String(m.interventions);d.eventCount.textContent=String(m.events.length);d.replay.disabled=false;
    d.episodeTimeline.innerHTML=m.events.slice(-12).map(e=>'<div class="episode-row"><time>'+e.time.split(".")[0]+'</time><p><strong>'+e.layer+"</strong> · "+e.text+"</p></div>").join("");s.episodeCounter++;
  }

  function drawAsset(a){
    let color=C.violet;if(a.status==="ALERT")color=C.red;if(a.type==="Dock"||a.type==="Staging")color=C.mint;if(a.type==="Checkpoint")color=C.blue;
    ctx.save();ctx.translate(a.x,a.y);ctx.strokeStyle=color;ctx.fillStyle="rgba(8,7,11,.85)";ctx.lineWidth=1.5;
    if(a.type==="Pump"){ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,0,7,0,Math.PI*2);ctx.stroke();}
    else if(a.type==="Valve"){ctx.rotate(Math.PI/4);ctx.strokeRect(-11,-11,22,22);ctx.rotate(-Math.PI/4);ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.stroke();}
    else if(a.type==="Pallet"){ctx.strokeRect(-16,-11,32,22);ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(16,0);ctx.stroke();}
    else if(a.type==="Dock"){ctx.strokeRect(-18,-13,36,26);ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();}
    else{ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.fillStyle="rgba(255,255,255,.68)";ctx.font="9px DM Mono";ctx.fillText(a.id,22,4);
    if(a.status==="ALERT"){ctx.strokeStyle="rgba(244,163,163,.32)";ctx.beginPath();ctx.arc(0,0,24+Math.sin(performance.now()/240)*4,0,Math.PI*2);ctx.stroke();}ctx.restore();
  }

  function drawHuman(h){ctx.save();ctx.translate(h.x,h.y);ctx.fillStyle=C.amber;ctx.beginPath();ctx.arc(0,-7,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle=C.amber;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(0,12);ctx.moveTo(-7,5);ctx.lineTo(7,5);ctx.moveTo(0,12);ctx.lineTo(-6,21);ctx.moveTo(0,12);ctx.lineTo(6,21);ctx.stroke();ctx.fillStyle="rgba(244,201,143,.75)";ctx.font="9px DM Mono";ctx.fillText("H-14",13,1);ctx.restore();}
  function drawRobot(r){
    ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.heading);ctx.shadowColor="rgba(164,154,248,.55)";ctx.shadowBlur=18;ctx.fillStyle="#171420";ctx.strokeStyle=C.violet;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-19,-12,38,24,8);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.strokeStyle="rgba(255,255,255,.5)";
    [[-15,-9,-27,-18],[-15,9,-27,18],[15,-9,27,-18],[15,9,27,18]].forEach(v=>{ctx.beginPath();ctx.moveTo(v[0],v[1]);ctx.lineTo(v[2],v[3]);ctx.stroke();});ctx.fillStyle=C.pink;ctx.beginPath();ctx.arc(12,0,3.5,0,Math.PI*2);ctx.fill();
    if(s.scanPulse>0){ctx.strokeStyle="rgba(135,174,248,.35)";for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(15,0,28+i*13+(performance.now()/35)%13,-.55,.55);ctx.stroke();}}ctx.restore();ctx.fillStyle="rgba(255,255,255,.7)";ctx.font="9px DM Mono";ctx.fillText("AX-07",r.x+28,r.y-18);
  }

  function drawWorld(){
    ctx.clearRect(0,0,W,H);ctx.fillStyle=C.ink;ctx.fillRect(0,0,W,H);ctx.strokeStyle="rgba(255,255,255,.025)";ctx.lineWidth=1;
    for(let x=0;x<W;x+=35){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(let y=0;y<H;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.strokeStyle="rgba(255,255,255,.16)";ctx.lineWidth=2;ctx.strokeRect(72,72,956,556);ctx.strokeRect(72,72,390,230);ctx.strokeRect(72,322,390,306);ctx.strokeRect(486,72,542,355);ctx.strokeRect(486,451,542,177);
    const z=s.world.zoneC;ctx.fillStyle="rgba(244,201,143,.035)";ctx.fillRect(z.x,z.y,z.w,z.h);ctx.strokeStyle="rgba(244,201,143,.32)";ctx.setLineDash([8,8]);ctx.strokeRect(z.x,z.y,z.w,z.h);ctx.setLineDash([]);ctx.fillStyle="rgba(244,201,143,.62)";ctx.font="10px DM Mono";ctx.fillText(z.label,z.x+12,z.y+20);
    ctx.fillStyle="rgba(255,255,255,.22)";ctx.font="11px DM Mono";ctx.fillText("ELECTRICAL",92,95);ctx.fillText("SERVICE BAY",92,347);ctx.fillText("PROCESS HALL",506,95);ctx.fillText("LOGISTICS / AISLE 3",506,476);
    if(s.routeTarget){const r=s.world.robot,t=s.routeTarget;ctx.strokeStyle="rgba(164,154,248,.65)";ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.setLineDash([]);}
    const p=s.world.assets["P-204"],v=s.world.assets["V-12"];ctx.strokeStyle="rgba(255,255,255,.08)";ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(v.x,v.y);ctx.stroke();
    Object.values(s.world.assets).forEach(drawAsset);if(s.humanVisible)drawHuman(s.world.human);drawRobot(s.world.robot);requestAnimationFrame(drawWorld);
  }

  document.querySelectorAll("[data-scenario]").forEach(btn=>btn.addEventListener("click",()=>setScenario(btn.dataset.scenario)));
  document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll("[data-tab]").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".tab-pane").forEach(p=>p.classList.remove("active"));btn.classList.add("active");$("tab-"+btn.dataset.tab)?.classList.add("active");}));
  d.ask.addEventListener("click",()=>anaReason(inferScenario(d.command.value)));d.dispatch.addEventListener("click",runMission);d.reset.addEventListener("click",()=>{resetWorld();setScenario("inspection");});
  d.pause.addEventListener("click",()=>{if(!s.running)return;s.paused=!s.paused;d.pause.textContent=s.paused?"RESUME":"PAUSE";s.world.robot.status=s.paused?"PAUSED":"RESUMING";addTrace("HIVE",s.paused?"Mission paused by operator.":"Mission resumed by operator.");});
  d.inject.addEventListener("click",()=>{const p=s.world.assets["P-204"];p.temp=Math.min(118,p.temp+5.7);p.vibration=Math.min(12,p.vibration+1.4);p.status="ALERT";addTrace("WORLD","Injected anomaly: P-204 now "+p.temp.toFixed(1)+"°C / "+p.vibration.toFixed(1)+" mm/s.");renderWorldState();});
  d.grant.addEventListener("click",()=>s.approvalResolver?.(true));d.deny.addEventListener("click",()=>s.approvalResolver?.(false));d.clearTrace.addEventListener("click",()=>d.trace.innerHTML="");
  d.replay.addEventListener("click",async()=>{if(!s.lastEpisode)return;const name=s.lastEpisode.scenario;resetWorld();setScenario(name);await anaReason(name);await sleep(250);runMission();document.getElementById("control-room")?.scrollIntoView({behavior:"smooth"});});
  d.heroRun.addEventListener("click",async()=>{setScenario("inspection");document.getElementById("control-room")?.scrollIntoView({behavior:"smooth"});await sleep(550);await anaReason("inspection");});

  setInterval(()=>{s.simSeconds++;if(d.clock)d.clock.textContent=simTime();},1000);
  resetWorld();setScenario("inspection");drawWorld();
})();