"use client";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Vec2 = { x: number; y: number };
export type PhysicsSnapshot = {
  time: number;
  robot: { x: number; y: number; z: number; yaw: number; battery: number };
  crate: { x: number; y: number; z: number };
  contacts: number;
  paused: boolean;
};

type MoveCommand = {
  target: Vec2;
  resolve: () => void;
  reject: (error: Error) => void;
  speedScale: number;
};

const MJCF = String.raw`
<mujoco model="physical_intelligence_lab">
  <compiler angle="degree"/>
  <option timestep="0.01" gravity="0 0 -9.81" integrator="RK4"/>
  <visual>
    <global azimuth="135" elevation="-24"/>
    <rgba haze=".02 .02 .04 1"/>
  </visual>
  <default>
    <joint damping="4" armature=".04"/>
    <geom friction="1 .08 .02" solref=".004 1"/>
  </default>

  <worldbody>
    <light pos="0 0 7" dir="0 0 -1" diffuse=".8 .78 .9"/>
    <light pos="-4 -3 4" dir="1 1 -1" diffuse=".35 .38 .55"/>
    <geom name="floor" type="plane" size="6 5 .15" rgba=".035 .032 .055 1"/>

    <geom name="wall_n" type="box" pos="0 4.7 .45" size="5.6 .08 .45" rgba=".14 .13 .19 1"/>
    <geom name="wall_s" type="box" pos="0 -4.7 .45" size="5.6 .08 .45" rgba=".14 .13 .19 1"/>
    <geom name="wall_e" type="box" pos="5.5 0 .45" size=".08 4.7 .45" rgba=".14 .13 .19 1"/>
    <geom name="wall_w" type="box" pos="-5.5 0 .45" size=".08 4.7 .45" rgba=".14 .13 .19 1"/>

    <geom name="zone_c_floor" type="box" pos="2.9 1.65 .015" size="2.0 1.45 .015" rgba=".18 .13 .06 .22" contype="0" conaffinity="0"/>

    <body name="pump_p204" pos="2.4 1.55 .4">
      <geom type="cylinder" size=".34 .4" rgba=".75 .25 .37 1"/>
      <geom type="cylinder" pos="0 0 .48" size=".18 .12" rgba=".92 .55 .62 1"/>
    </body>

    <body name="valve_v12" pos="3.55 .45 .45">
      <geom type="cylinder" size=".18 .45" rgba=".42 .48 .68 1"/>
      <geom type="box" pos="0 0 .55" size=".26 .05 .05" rgba=".65 .7 .92 1"/>
      <geom type="box" pos="0 0 .55" size=".05 .26 .05" rgba=".65 .7 .92 1"/>
    </body>

    <body name="staging_s3" pos="3.65 -2.3 .07">
      <geom type="box" size=".78 .72 .07" rgba=".18 .52 .43 .55" contype="0" conaffinity="0"/>
    </body>

    <body name="crate_pl9" pos=".95 -2.25 .22">
      <freejoint/>
      <geom type="box" size=".34 .34 .22" mass="10.5" rgba=".58 .38 .18 1"/>
    </body>

    <body name="robot" pos="-3.5 -2.55 .28">
      <joint name="base_x" type="slide" axis="1 0 0" damping="8"/>
      <joint name="base_y" type="slide" axis="0 1 0" damping="8"/>
      <joint name="base_yaw" type="hinge" axis="0 0 1" damping="5"/>
      <geom name="robot_base" type="box" size=".48 .34 .18" mass="22" rgba=".34 .29 .7 1"/>
      <geom type="cylinder" pos=".24 0 .32" size=".08 .25" rgba=".7 .64 .98 1"/>
      <geom type="sphere" pos=".24 0 .62" size=".09" rgba=".95 .67 .84 1"/>

      <body name="arm_1" pos=".05 0 .35">
        <joint name="shoulder" type="hinge" axis="0 1 0" range="-75 70" damping="3"/>
        <geom type="capsule" fromto="0 0 0 .72 0 0" size=".075" mass="2.4" rgba=".58 .53 .91 1"/>
        <body name="arm_2" pos=".72 0 0">
          <joint name="elbow" type="hinge" axis="0 1 0" range="-115 100" damping="2.5"/>
          <geom type="capsule" fromto="0 0 0 .62 0 0" size=".065" mass="1.6" rgba=".72 .68 .96 1"/>
          <geom name="pusher" type="box" pos=".68 0 0" size=".08 .22 .15" mass=".8" rgba=".94 .64 .82 1"/>
          <site name="tool_tip" pos=".76 0 0" size=".04" rgba=".95 .8 .9 1"/>
        </body>
      </body>
    </body>
  </worldbody>

  <actuator>
    <motor name="mx" joint="base_x" gear="1" ctrlrange="-180 180"/>
    <motor name="my" joint="base_y" gear="1" ctrlrange="-180 180"/>
    <motor name="myaw" joint="base_yaw" gear="1" ctrlrange="-70 70"/>
    <motor name="mshoulder" joint="shoulder" gear="1" ctrlrange="-55 55"/>
    <motor name="melbow" joint="elbow" gear="1" ctrlrange="-45 45"/>
  </actuator>
</mujoco>
`;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function angleError(target: number, current: number) {
  let d = target - current;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class MujocoFacilitySim {
  private host: HTMLDivElement;
  private onSnapshot: (snapshot: PhysicsSnapshot) => void;
  private mujoco: any;
  private model: any;
  private data: any;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private mjvScene: any;
  private mjvOption: any;
  private mjvPerturb: any;
  private mjvCamera: any;
  private meshes: THREE.Mesh[] = [];
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private raf: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastSnapshotAt = 0;
  private paused = false;
  private moveCommand: MoveCommand | null = null;
  private armTarget = { shoulder: -0.18, elbow: 0.48 };
  private battery = 96;
  private robotBodyId = -1;
  private crateBodyId = -1;
  private qposAdr = { x: -1, y: -1, yaw: -1, shoulder: -1, elbow: -1 };
  private dofAdr = { x: -1, y: -1, yaw: -1, shoulder: -1, elbow: -1 };
  private disposed = false;

  constructor(host: HTMLDivElement, onSnapshot: (snapshot: PhysicsSnapshot) => void) {
    this.host = host;
    this.onSnapshot = onSnapshot;
  }

  async init() {
    const mod = await import("@mujoco/mujoco");
    const loadMujoco = mod.default;
    this.mujoco = await loadMujoco();

    this.model = this.mujoco.MjModel.from_xml_string(MJCF);
    if (!this.model) throw new Error("MuJoCo model failed to compile.");
    this.data = new this.mujoco.MjData(this.model);
    if (!this.data) throw new Error("MuJoCo data allocation failed.");

    this.robotBodyId = this.mujoco.mj_name2id(
      this.model,
      this.mujoco.mjtObj.mjOBJ_BODY.value,
      "robot",
    );
    this.crateBodyId = this.mujoco.mj_name2id(
      this.model,
      this.mujoco.mjtObj.mjOBJ_BODY.value,
      "crate_pl9",
    );

    const jointAddress = (name: string) => {
      const id = this.mujoco.mj_name2id(
        this.model,
        this.mujoco.mjtObj.mjOBJ_JOINT.value,
        name,
      );
      if (id < 0) throw new Error("MuJoCo joint not found: " + name);
      return {
        qpos: this.model.jnt_qposadr[id],
        dof: this.model.jnt_dofadr[id],
      };
    };
    const x = jointAddress("base_x");
    const y = jointAddress("base_y");
    const yaw = jointAddress("base_yaw");
    const shoulder = jointAddress("shoulder");
    const elbow = jointAddress("elbow");
    this.qposAdr = { x: x.qpos, y: y.qpos, yaw: yaw.qpos, shoulder: shoulder.qpos, elbow: elbow.qpos };
    this.dofAdr = { x: x.dof, y: y.dof, yaw: yaw.dof, shoulder: shoulder.dof, elbow: elbow.dof };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#08070d");
    this.scene.fog = new THREE.FogExp2("#08070d", 0.035);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.host.replaceChildren(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(43, 1, 0.05, 80);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(-7.8, -8.4, 7.0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0.35);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxDistance = 18;
    this.controls.minDistance = 4.5;
    this.controls.maxPolarAngle = Math.PI * 0.48;

    this.mjvPerturb = new this.mujoco.MjvPerturb();
    this.mjvOption = new this.mujoco.MjvOption();
    this.mjvCamera = new this.mujoco.MjvCamera();
    this.mjvScene = new this.mujoco.MjvScene(this.model, 32768);

    this.addLighting();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();

    this.mujoco.mj_forward(this.model, this.data);
    this.run();
  }

  private addLighting() {
    const hemi = new THREE.HemisphereLight(0xc7c2ff, 0x09080d, 1.25);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.75);
    key.position.set(-5, -4, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    this.scene.add(key);

    const rim = new THREE.PointLight(0xf2a8d8, 18, 12, 2);
    rim.position.set(3.2, 1.0, 3.4);
    this.scene.add(rim);
  }

  private resize() {
    if (!this.renderer || !this.camera) return;
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private getGeometry(mjvGeom: any) {
    const key = JSON.stringify([mjvGeom.type, Array.from(mjvGeom.size ?? []), mjvGeom.dataid]);
    const cached = this.geometryCache.get(key);
    if (cached) return cached;

    let geometry: THREE.BufferGeometry;
    const t = this.mujoco.mjtGeom;
    if (mjvGeom.type === t.mjGEOM_PLANE.value) {
      geometry = new THREE.PlaneGeometry(
        2 * (mjvGeom.size[0] || 20),
        2 * (mjvGeom.size[1] || 20),
      );
    } else if (mjvGeom.type === t.mjGEOM_SPHERE.value) {
      geometry = new THREE.SphereGeometry(mjvGeom.size[0], 28, 18);
    } else if (mjvGeom.type === t.mjGEOM_CAPSULE.value) {
      const radius = mjvGeom.size[0];
      const length = Math.max(0.001, 2 * mjvGeom.size[2]);
      geometry = new THREE.CapsuleGeometry(radius, length, 10, 18);
      geometry.rotateX(Math.PI / 2);
    } else if (mjvGeom.type === t.mjGEOM_BOX.value) {
      geometry = new THREE.BoxGeometry(
        2 * mjvGeom.size[0],
        2 * mjvGeom.size[1],
        2 * mjvGeom.size[2],
      );
    } else if (mjvGeom.type === t.mjGEOM_CYLINDER.value) {
      geometry = new THREE.CylinderGeometry(
        mjvGeom.size[0],
        mjvGeom.size[0],
        2 * mjvGeom.size[2],
        28,
      );
      geometry.rotateX(Math.PI / 2);
    } else if (mjvGeom.type === t.mjGEOM_ELLIPSOID.value) {
      geometry = new THREE.SphereGeometry(1, 24, 16);
      geometry.scale(mjvGeom.size[0], mjvGeom.size[1], mjvGeom.size[2]);
    } else {
      geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    }
    this.geometryCache.set(key, geometry);
    return geometry;
  }

  private updateVisualScene() {
    this.mujoco.mjv_updateScene(
      this.model,
      this.data,
      this.mjvOption,
      this.mjvPerturb,
      this.mjvCamera,
      this.mujoco.mjtCatBit.mjCAT_ALL.value,
      this.mjvScene,
    );

    const geoms = this.mjvScene.geoms;
    const count = Number(this.mjvScene.ngeom);
    for (let i = 0; i < count; i += 1) {
      const g = geoms.get(i);
      let mesh = this.meshes[i];
      if (!mesh) {
        const geometry = this.getGeometry(g);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(g.rgba[0], g.rgba[1], g.rgba[2]),
          roughness: 0.66,
          metalness: 0.08,
          transparent: g.rgba[3] < 0.999,
          opacity: g.rgba[3],
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.meshes[i] = mesh;
        this.scene.add(mesh);
      } else {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.color.setRGB(g.rgba[0], g.rgba[1], g.rgba[2]);
        material.opacity = g.rgba[3];
        material.transparent = g.rgba[3] < 0.999;
      }

      mesh.visible = true;
      mesh.matrix.set(
        g.mat[0], g.mat[1], g.mat[2], g.pos[0],
        g.mat[3], g.mat[4], g.mat[5], g.pos[1],
        g.mat[6], g.mat[7], g.mat[8], g.pos[2],
        0, 0, 0, 1,
      );
      mesh.matrixWorldNeedsUpdate = true;
      g.delete();
    }
    for (let i = count; i < this.meshes.length; i += 1) {
      this.meshes[i].visible = false;
    }
    geoms.delete();
  }

  private control() {
    const qpos = this.data.qpos as Float64Array;
    const qvel = this.data.qvel as Float64Array;
    const ctrl = this.data.ctrl as Float64Array;

    if (this.paused) {
      for (let i = 0; i < Math.min(3, ctrl.length); i += 1) ctrl[i] = 0;
      return;
    }

    if (this.moveCommand) {
      const robot = this.robotPosition();
      const dx = this.moveCommand.target.x - robot.x;
      const dy = this.moveCommand.target.y - robot.y;
      const dist = Math.hypot(dx, dy);
      const desiredYaw = Math.atan2(dy, dx);
      const speedScale = this.moveCommand.speedScale;

      const vx = qvel[this.dofAdr.x];
      const vy = qvel[this.dofAdr.y];
      const wyaw = qvel[this.dofAdr.yaw];
      ctrl[0] = clamp(dx * 48 * speedScale - vx * 12, -150, 150);
      ctrl[1] = clamp(dy * 48 * speedScale - vy * 12, -150, 150);
      ctrl[2] = clamp(
        angleError(desiredYaw, qpos[this.qposAdr.yaw]) * 18 - wyaw * 5,
        -60,
        60,
      );

      if (dist < 0.13 && Math.hypot(vx, vy) < 0.35) {
        ctrl[0] = 0;
        ctrl[1] = 0;
        ctrl[2] = 0;
        const done = this.moveCommand;
        this.moveCommand = null;
        done.resolve();
      }
    } else {
      ctrl[0] = clamp(-qvel[this.dofAdr.x] * 10, -50, 50);
      ctrl[1] = clamp(-qvel[this.dofAdr.y] * 10, -50, 50);
      ctrl[2] = clamp(-qvel[this.dofAdr.yaw] * 5, -30, 30);
    }

    const shoulder = qpos[this.qposAdr.shoulder];
    const elbow = qpos[this.qposAdr.elbow];
    ctrl[3] = clamp(
      (this.armTarget.shoulder - shoulder) * 34 - qvel[this.dofAdr.shoulder] * 5,
      -50,
      50,
    );
    ctrl[4] = clamp(
      (this.armTarget.elbow - elbow) * 30 - qvel[this.dofAdr.elbow] * 4,
      -42,
      42,
    );
  }

  private robotPosition() {
    const xpos = this.data.xpos as Float64Array;
    const i = this.robotBodyId * 3;
    return { x: xpos[i], y: xpos[i + 1], z: xpos[i + 2] };
  }

  private cratePosition() {
    const xpos = this.data.xpos as Float64Array;
    const i = this.crateBodyId * 3;
    return { x: xpos[i], y: xpos[i + 1], z: xpos[i + 2] };
  }

  private emitSnapshot(now: number) {
    if (now - this.lastSnapshotAt < 90) return;
    this.lastSnapshotAt = now;
    const r = this.robotPosition();
    const c = this.cratePosition();
    const qpos = this.data.qpos as Float64Array;
    this.onSnapshot({
      time: this.data.time,
      robot: { ...r, yaw: qpos[this.qposAdr.yaw], battery: this.battery },
      crate: c,
      contacts: this.data.ncon ?? 0,
      paused: this.paused,
    });
  }

  private run() {
    const frame = (now: number) => {
      if (this.disposed) return;
      try {
        if (!this.paused) {
          const start = this.data.time;
          while (this.data.time - start < 1 / 60) {
            this.control();
            this.mujoco.mj_step(this.model, this.data);
          }
          if (this.moveCommand) this.battery = Math.max(18, this.battery - 0.004);
        } else {
          this.control();
        }
        this.updateVisualScene();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.emitSnapshot(now);
      } catch (error) {
        console.error("MuJoCo frame error", error);
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  moveTo(x: number, y: number, speedScale = 1) {
    if (this.disposed) return Promise.reject(new Error("Simulation disposed."));
    if (this.moveCommand) this.moveCommand.reject(new Error("Move superseded."));
    return new Promise<void>((resolve, reject) => {
      this.moveCommand = { target: { x, y }, resolve, reject, speedScale };
    });
  }

  setArm(shoulder: number, elbow: number) {
    this.armTarget = { shoulder, elbow };
  }

  async setArmAndWait(shoulder: number, elbow: number, ms = 800) {
    this.setArm(shoulder, elbow);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  setPaused(value: boolean) {
    this.paused = value;
  }

  isPaused() {
    return this.paused;
  }

  getSnapshot(): PhysicsSnapshot {
    const r = this.robotPosition();
    const c = this.cratePosition();
    const qpos = this.data.qpos as Float64Array;
    return {
      time: this.data.time,
      robot: { ...r, yaw: qpos[this.qposAdr.yaw], battery: this.battery },
      crate: c,
      contacts: this.data.ncon ?? 0,
      paused: this.paused,
    };
  }

  reset() {
    if (this.moveCommand) {
      this.moveCommand.reject(new Error("Simulation reset."));
      this.moveCommand = null;
    }
    this.mujoco.mj_resetData(this.model, this.data);
    this.mujoco.mj_forward(this.model, this.data);
    this.armTarget = { shoulder: -0.18, elbow: 0.48 };
    this.battery = 96;
    this.paused = false;
  }

  dispose() {
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.meshes.forEach((mesh) => {
      mesh.geometry?.dispose();
      const material = mesh.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
    this.geometryCache.forEach((geometry) => geometry.dispose());
    this.mjvScene?.delete?.();
    this.mjvCamera?.delete?.();
    this.mjvPerturb?.delete?.();
    this.mjvOption?.delete?.();
    this.data?.delete?.();
    this.model?.delete?.();
  }
}


export class FallbackFacilitySim {
  private host: HTMLDivElement;
  private onSnapshot: (snapshot: PhysicsSnapshot) => void;
  private scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private robot = new THREE.Group();
  private arm1 = new THREE.Group();
  private arm2 = new THREE.Group();
  private crate: THREE.Mesh;
  private raf: number | null = null;
  private resizeObserver: ResizeObserver;
  private paused = false;
  private battery = 96;
  private move: { x:number; y:number; resolve:()=>void; speed:number } | null = null;
  private last = performance.now();
  private disposed = false;

  constructor(host: HTMLDivElement, onSnapshot: (snapshot: PhysicsSnapshot) => void) {
    this.host = host;
    this.onSnapshot = onSnapshot;
    this.renderer = new THREE.WebGLRenderer({ antialias:true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.host.replaceChildren(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(43,1,.05,80);
    this.camera.up.set(0,0,1);
    this.camera.position.set(-7.8,-8.4,7);
    this.controls = new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.target.set(0,0,.35);
    this.controls.enableDamping = true;

    this.scene.background = new THREE.Color("#08070d");
    this.scene.fog = new THREE.FogExp2("#08070d",.035);
    this.scene.add(new THREE.HemisphereLight(0xc7c2ff,0x09080d,1.3));
    const key = new THREE.DirectionalLight(0xffffff,1.8);
    key.position.set(-5,-4,8); key.castShadow = true; this.scene.add(key);
    const rim = new THREE.PointLight(0xf2a8d8,18,12,2); rim.position.set(3,1,3.2); this.scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(11.2,9.4,.08),
      new THREE.MeshStandardMaterial({color:0x0e0c16,roughness:.9})
    );
    floor.position.z=-.04; floor.receiveShadow=true; this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({color:0x24202f,roughness:.85});
    const wall = (x:number,y:number,sx:number,sy:number) => {
      const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,.9),wallMat);
      m.position.set(x,y,.45);m.castShadow=true;this.scene.add(m);
    };
    wall(0,4.7,11.2,.16);wall(0,-4.7,11.2,.16);wall(5.5,0,.16,9.4);wall(-5.5,0,.16,9.4);

    const zone = new THREE.Mesh(
      new THREE.BoxGeometry(4,2.9,.025),
      new THREE.MeshStandardMaterial({color:0x6c4a1f,transparent:true,opacity:.22})
    );
    zone.position.set(2.9,1.65,.015);this.scene.add(zone);

    const pump = new THREE.Mesh(
      new THREE.CylinderGeometry(.34,.34,.8,28),
      new THREE.MeshStandardMaterial({color:0xbf405e,roughness:.6})
    );
    pump.rotation.x=Math.PI/2;pump.position.set(2.4,1.55,.4);this.scene.add(pump);
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(.18,.18,.9,24),
      new THREE.MeshStandardMaterial({color:0x6b79ad,roughness:.55})
    );
    valve.rotation.x=Math.PI/2;valve.position.set(3.55,.45,.45);this.scene.add(valve);

    const stage = new THREE.Mesh(
      new THREE.BoxGeometry(1.56,1.44,.14),
      new THREE.MeshStandardMaterial({color:0x2e856e,transparent:true,opacity:.55})
    );
    stage.position.set(3.65,-2.3,.07);this.scene.add(stage);

    this.crate = new THREE.Mesh(
      new THREE.BoxGeometry(.68,.68,.44),
      new THREE.MeshStandardMaterial({color:0x96612e,roughness:.8})
    );
    this.crate.position.set(.95,-2.25,.22);this.crate.castShadow=true;this.scene.add(this.crate);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(.96,.68,.36),
      new THREE.MeshStandardMaterial({color:0x574ab2,roughness:.45,metalness:.12})
    );
    base.castShadow=true;this.robot.add(base);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(.08,.08,.5,18),
      new THREE.MeshStandardMaterial({color:0xb4a8f8})
    );
    mast.rotation.x=Math.PI/2;mast.position.set(.24,0,.32);this.robot.add(mast);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(.09,18,12),
      new THREE.MeshStandardMaterial({color:0xf2a8d8,emissive:0x4d223b,emissiveIntensity:.5})
    );
    head.position.set(.24,0,.62);this.robot.add(head);

    const armOneMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(.075,.57,8,14),
      new THREE.MeshStandardMaterial({color:0x9387e8})
    );
    armOneMesh.rotation.z=-Math.PI/2;armOneMesh.position.x=.36;this.arm1.add(armOneMesh);
    this.arm1.position.set(.05,0,.35);this.robot.add(this.arm1);
    const armTwoMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(.065,.49,8,14),
      new THREE.MeshStandardMaterial({color:0xb6adf5})
    );
    armTwoMesh.rotation.z=-Math.PI/2;armTwoMesh.position.x=.31;this.arm2.add(armTwoMesh);
    this.arm2.position.x=.72;this.arm1.add(this.arm2);
    const pusher = new THREE.Mesh(
      new THREE.BoxGeometry(.16,.44,.3),
      new THREE.MeshStandardMaterial({color:0xf0a3d0})
    );
    pusher.position.x=.68;this.arm2.add(pusher);

    this.robot.position.set(-3.5,-2.55,.28);this.scene.add(this.robot);
    this.resizeObserver = new ResizeObserver(()=>this.resize());
  }

  async init() {
    this.resizeObserver.observe(this.host);
    this.resize();
    this.setArm(-.18,.48);
    this.run();
  }

  private resize(){
    const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);
    this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }

  private run(){
    const loop=(now:number)=>{
      if(this.disposed)return;
      const dt=Math.min(.04,(now-this.last)/1000);this.last=now;
      if(!this.paused&&this.move){
        const dx=this.move.x-this.robot.position.x,dy=this.move.y-this.robot.position.y;
        const dist=Math.hypot(dx,dy);
        if(dist<.06){
          const done=this.move;this.move=null;done.resolve();
        }else{
          const step=Math.min(dist,dt*1.3*this.move.speed);
          this.robot.rotation.z=Math.atan2(dy,dx);
          const oldX=this.robot.position.x,oldY=this.robot.position.y;
          this.robot.position.x+=dx/dist*step;this.robot.position.y+=dy/dist*step;
          this.battery=Math.max(18,this.battery-step*.02);
          const crateDist=Math.hypot(this.crate.position.x-this.robot.position.x,this.crate.position.y-this.robot.position.y);
          if(crateDist<1.25&&this.arm1.rotation.y>-0.18){
            const mx=this.robot.position.x-oldX,my=this.robot.position.y-oldY;
            this.crate.position.x+=mx*.9;this.crate.position.y+=my*.9;
          }
        }
      }
      this.controls.update();this.renderer.render(this.scene,this.camera);
      this.onSnapshot(this.getSnapshot());this.raf=requestAnimationFrame(loop);
    };
    this.raf=requestAnimationFrame(loop);
  }

  moveTo(x:number,y:number,speedScale=1){
    return new Promise<void>((resolve)=>{this.move={x,y,resolve,speed:speedScale};});
  }
  setArm(shoulder:number,elbow:number){
    this.arm1.rotation.y=shoulder;this.arm2.rotation.y=elbow;
  }
  async setArmAndWait(shoulder:number,elbow:number,ms=600){
    this.setArm(shoulder,elbow);await new Promise(r=>setTimeout(r,ms));
  }
  setPaused(value:boolean){this.paused=value;}
  isPaused(){return this.paused;}
  getSnapshot():PhysicsSnapshot{
    return {
      time:performance.now()/1000,
      robot:{x:this.robot.position.x,y:this.robot.position.y,z:this.robot.position.z,yaw:this.robot.rotation.z,battery:this.battery},
      crate:{x:this.crate.position.x,y:this.crate.position.y,z:this.crate.position.z},
      contacts:Math.hypot(this.crate.position.x-this.robot.position.x,this.crate.position.y-this.robot.position.y)<1.2?1:0,
      paused:this.paused,
    };
  }
  reset(){
    this.move=null;this.robot.position.set(-3.5,-2.55,.28);this.robot.rotation.z=0;this.crate.position.set(.95,-2.25,.22);this.battery=96;this.paused=false;this.setArm(-.18,.48);
  }
  dispose(){
    this.disposed=true;if(this.raf)cancelAnimationFrame(this.raf);this.resizeObserver.disconnect();this.controls.dispose();this.renderer.dispose();
  }
}
