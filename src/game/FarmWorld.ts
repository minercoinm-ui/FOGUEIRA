import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Campfire } from './environment/Campfire';
import { FarmBuildings } from './environment/FarmBuildings';
import { Nature } from './environment/Nature';
import { Avatar } from './character/Avatar';
import { soundEngine } from '../audio/SoundEngine';
import {
  GameState,
  PlayerCustomization,
  WorldLocation,
  GameSettings,
  SitSpot,
  AvatarAction,
} from '../types/game';
import {
  WORLD_LOCATIONS,
  SIT_SPOTS,
  WORLD_BOUNDS,
  BoxCollider,
} from './constants';
import { socketManager, PlayerNetworkState } from '../server/SocketManager';

export class FarmWorld {
  private container: HTMLElement;
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;

  // Environment & Props
  private campfire!: Campfire;
  private buildings!: FarmBuildings;
  private nature!: Nature;
  public player!: Avatar;
  private remoteAvatars: Map<
    string,
    {
      avatar: Avatar;
      targetPos: THREE.Vector3;
      targetHeading: number;
      action: AvatarAction;
    }
  > = new Map();
  private socketUnsubscribers: (() => void)[] = [];

  // Lighting
  private moonLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  // Collision list
  private colliders: BoxCollider[] = [];

  // Camera Orbit & Controls
  private cameraYaw = 0; // horizontal rotation
  private cameraPitch = 0.28; // vertical elevation angle
  private cameraDistance = 4.2;
  private targetCameraDistance = 4.2;
  private isPointerLocked = false;
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Player Kinematics
  public playerPos = new THREE.Vector3(0, 0, 4.8);
  private playerVelocity = new THREE.Vector3();
  private playerHeading = Math.PI; // Face north initially towards campfire
  private walkSpeed = 3.8;
  private sprintSpeed = 6.8;

  // Active inputs
  private keys: Record<string, boolean> = {};

  // World Status / Callbacks
  public gameState: GameState = 'TITLE';
  public currentLocation: WorldLocation = WORLD_LOCATIONS[0];
  public nearbySitSpot: SitSpot | null = null;
  public isSitting = false;
  public settings: GameSettings;

  private onLocationChange?: (loc: WorldLocation) => void;
  private onNearSitSpotChange?: (spot: SitSpot | null) => void;
  private onSittingStateChange?: (sitting: boolean) => void;

  // Game Loop
  private clock = new THREE.Clock();
  private frameId = 0;
  private isDestroyed = false;
  private titleCamAngle = 0;

  constructor(
    container: HTMLElement,
    customization: PlayerCustomization,
    settings: GameSettings,
    callbacks?: {
      onLocationChange?: (loc: WorldLocation) => void;
      onNearSitSpotChange?: (spot: SitSpot | null) => void;
      onSittingStateChange?: (sitting: boolean) => void;
    }
  ) {
    this.container = container;
    this.settings = settings;
    if (callbacks) {
      this.onLocationChange = callbacks.onLocationChange;
      this.onNearSitSpotChange = callbacks.onNearSitSpotChange;
      this.onSittingStateChange = callbacks.onSittingStateChange;
    }

    this.initThree();
    this.initScene(customization);
    this.initInputListeners();
    this.initSocketListeners();
    this.startLoop();
  }

  private initSocketListeners(): void {
    const unsubJoin = socketManager.onPlayerJoin((remote) => {
      this.addRemotePlayer(remote);
    });

    const unsubUpdate = socketManager.onPlayerUpdate((sessionId, state) => {
      this.updateRemotePlayer(sessionId, state);
    });

    const unsubLeave = socketManager.onPlayerLeave((sessionId) => {
      this.removeRemotePlayer(sessionId);
    });

    this.socketUnsubscribers.push(unsubJoin, unsubUpdate, unsubLeave);
  }

  private initThree(): void {
    // Detect software WebGL per Three.js skill
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isSoftwareGl && this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Scene setup
    this.scene = new THREE.Scene();

    // Atmosphere: Night/twilight fog matching horizon
    this.scene.fog = new THREE.FogExp2(0x0e1424, 0.016);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.2, 250);
    this.camera.position.set(0, 3, 8);

    // PMREM Environment reflections
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Fallback
    }

    // Window resize observer
    window.addEventListener('resize', this.onWindowResize);
  }

  private initScene(customization: PlayerCustomization): void {
    // 1. Lighting Rig
    // Cool Moonlight (Directional key light with soft shadows)
    this.moonLight = new THREE.DirectionalLight(0x8faee0, 0.75);
    this.moonLight.position.set(24, 38, -20);
    this.moonLight.castShadow = this.settings.shadows;
    this.moonLight.shadow.mapSize.width = 1024;
    this.moonLight.shadow.mapSize.height = 1024;
    this.moonLight.shadow.bias = -0.0005;
    this.moonLight.shadow.normalBias = 0.02;
    this.moonLight.shadow.camera.near = 1;
    this.moonLight.shadow.camera.far = 80;
    this.moonLight.shadow.camera.left = -30;
    this.moonLight.shadow.camera.right = 30;
    this.moonLight.shadow.camera.top = 30;
    this.moonLight.shadow.camera.bottom = -30;
    this.scene.add(this.moonLight);

    // Soft Hemisphere ambient fill (cool night sky, warm farm soil)
    this.hemiLight = new THREE.HemisphereLight(0x1a2948, 0x2b1e15, 0.55);
    this.scene.add(this.hemiLight);

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    // 2. Nature & Landscape
    this.nature = new Nature(maxAnisotropy);
    this.scene.add(this.nature.group);
    this.colliders.push(...this.nature.colliders);

    // 3. Central Campfire
    this.campfire = new Campfire(maxAnisotropy);
    this.scene.add(this.campfire.group);
    this.colliders.push(...this.campfire.colliders);

    // 4. Farm Buildings
    this.buildings = new FarmBuildings(maxAnisotropy);
    this.scene.add(this.buildings.group);
    this.colliders.push(...this.buildings.colliders);

    // 5. Player Character
    this.player = new Avatar(customization);
    this.player.group.position.copy(this.playerPos);
    this.player.group.rotation.y = this.playerHeading;
    this.scene.add(this.player.group);
  }

  private initInputListeners(): void {
    const canvas = this.renderer.domElement;

    // Keyboard
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Mouse drag / look
    canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        const sensitivity = 0.0022 * this.settings.mouseSensitivity;
        this.cameraYaw -= e.movementX * sensitivity;
        this.cameraPitch = Math.max(-0.25, Math.min(1.15, this.cameraPitch + e.movementY * sensitivity));
      } else if (this.isMouseDown) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const sensitivity = 0.0035 * this.settings.mouseSensitivity;
        this.cameraYaw -= deltaX * sensitivity;
        this.cameraPitch = Math.max(-0.25, Math.min(1.15, this.cameraPitch + deltaY * sensitivity));
      }
    });

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetCameraDistance = Math.max(2.5, Math.min(8.0, this.targetCameraDistance + e.deltaY * 0.004));
    }, { passive: false });

    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // If user is typing in chat input, ignore game keys!
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();
    this.keys[key] = true;

    if (e.key === 'Shift') this.keys['shift'] = true;

    // Se estiver sentado e pressionar teclas de movimento (WASD, setas, espaço), levanta automaticamente
    if (this.isSitting && ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      this.toggleSitInteract();
      return;
    }

    // Hotkeys
    if (key === 'e') {
      this.toggleSitInteract();
    } else if (key === '1') {
      this.setEmote('warmHands');
    } else if (key === '2') {
      this.setEmote('wave');
    } else if (key === '3') {
      this.setEmote('talk');
    } else if (key === '4') {
      this.setEmote('celebrate');
    } else if (key === 'c') {
      // Toggle camera view distance
      this.targetCameraDistance = this.targetCameraDistance > 3.5 ? 2.8 : 5.0;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
    if (e.key === 'Shift') this.keys['shift'] = false;
  };

  public toggleSitInteract(): void {
    if (this.isSitting) {
      // Stand up: desativa estado de sentar e projeta o boneco suavemente para frente,
      // desvencilhando-o totalmente da caixa de colisão do banco
      this.isSitting = false;
      this.player.setAction('idle');

      // Projeta o personagem para fora do banco na direção que ele estava olhando
      const exitDist = 1.0;
      const exitX = this.playerPos.x + Math.sin(this.playerHeading) * exitDist;
      const exitZ = this.playerPos.z + Math.cos(this.playerHeading) * exitDist;
      this.playerPos.set(exitX, 0, exitZ);
      this.player.group.position.copy(this.playerPos);

      if (this.onSittingStateChange) this.onSittingStateChange(false);
      socketManager.sendSitInteract(false);
      socketManager.sendPlayerTransform(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        this.playerHeading,
        'idle',
        false,
        true
      );
      return;
    }

    if (this.nearbySitSpot) {
      // Senta no banco ou toco próximo
      this.isSitting = true;
      const [sx, sy, sz] = this.nearbySitSpot.position;
      this.playerPos.set(sx, sy, sz);
      this.playerHeading = this.nearbySitSpot.rotationY;
      this.player.group.position.copy(this.playerPos);
      this.player.group.rotation.y = this.playerHeading;
      this.player.setAction('sit');
      if (this.onSittingStateChange) this.onSittingStateChange(true);
      socketManager.sendSitInteract(true, this.nearbySitSpot.id);
      socketManager.sendPlayerTransform(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        this.playerHeading,
        'sit',
        true,
        true
      );
    }
  }

  public setEmote(action: 'idle' | 'wave' | 'warmHands' | 'talk' | 'celebrate'): void {
    this.player.setAction(action);
    socketManager.sendEmote(action);
    if (action !== 'idle') {
      const duration = action === 'celebrate' ? 2600 : 3500;
      setTimeout(() => {
        if (this.player.action === action) {
          const revertAction = this.isSitting ? 'sit' : 'idle';
          this.player.setAction(revertAction);
          socketManager.sendEmote(revertAction);
        }
      }, duration);
    }
  }

  public requestPointerLock(): void {
    try {
      this.renderer.domElement.requestPointerLock();
    } catch {
      // Ignore if user denied
    }
  }

  public setGameState(state: GameState): void {
    this.gameState = state;
    if (state === 'PLAYING') {
      soundEngine.init();
    }
  }

  public updateCustomization(customization: PlayerCustomization): void {
    this.player.updateCustomization(customization);
    socketManager.sendCustomizationUpdate(customization);
  }

  public sendChatMessage(text: string): void {
    this.player.showMessage(text);
    socketManager.sendChatMessage(text, this.player.customization.name);
  }

  // Remote players lifecycle
  public addRemotePlayer(player: PlayerNetworkState): void {
    if (this.remoteAvatars.has(player.sessionId)) return;

    const avatar = new Avatar(player.customization);
    avatar.group.position.set(player.x, player.y, player.z);
    avatar.group.rotation.y = player.rotationY;
    if (player.isSitting) {
      avatar.setAction('sit');
    } else {
      avatar.setAction(player.action);
    }

    this.scene.add(avatar.group);
    this.remoteAvatars.set(player.sessionId, {
      avatar,
      targetPos: new THREE.Vector3(player.x, player.y, player.z),
      targetHeading: player.rotationY,
      action: player.action,
    });
  }

  public updateRemotePlayer(sessionId: string, state: Partial<PlayerNetworkState>): void {
    const item = this.remoteAvatars.get(sessionId);
    if (!item) return;

    if (state.x !== undefined && state.z !== undefined) {
      item.targetPos.set(state.x, state.y ?? item.targetPos.y, state.z);
    }
    if (state.rotationY !== undefined) {
      item.targetHeading = state.rotationY;
    }
    if (state.action !== undefined && state.action !== item.action) {
      item.action = state.action;
      item.avatar.setAction(state.action);
    }
    if (state.isSitting !== undefined) {
      if (state.isSitting && !item.avatar.isSitting) {
        item.avatar.setAction('sit');
      } else if (!state.isSitting && item.avatar.isSitting) {
        item.avatar.setAction(state.action || 'idle');
      }
    }
  }

  public removeRemotePlayer(sessionId: string): void {
    const item = this.remoteAvatars.get(sessionId);
    if (item) {
      this.scene.remove(item.avatar.group);
      this.remoteAvatars.delete(sessionId);
    }
  }

  public getRemoteAvatar(nameOrSessionId: string): Avatar | undefined {
    for (const [id, item] of this.remoteAvatars.entries()) {
      if (id === nameOrSessionId || item.avatar.customization.name === nameOrSessionId) {
        return item.avatar;
      }
    }
    return undefined;
  }

  public setTimeOfDay(time: 'night' | 'twilight' | 'dawn'): void {
    if (time === 'night') {
      this.scene.fog = new THREE.FogExp2(0x0e1424, 0.016);
      this.renderer.toneMappingExposure = 1.15;
      this.moonLight.color.setHex(0x8faee0);
      this.moonLight.intensity = 0.75;
      this.hemiLight.color.setHex(0x1a2948);
      this.hemiLight.groundColor.setHex(0x2b1e15);
    } else if (time === 'twilight') {
      this.scene.fog = new THREE.FogExp2(0x22182e, 0.014);
      this.renderer.toneMappingExposure = 1.35;
      this.moonLight.color.setHex(0xf4b182);
      this.moonLight.intensity = 1.1;
      this.hemiLight.color.setHex(0x3e2b4d);
      this.hemiLight.groundColor.setHex(0x3a2216);
    } else {
      // Dawn
      this.scene.fog = new THREE.FogExp2(0x282a3a, 0.012);
      this.renderer.toneMappingExposure = 1.45;
      this.moonLight.color.setHex(0xffdfb0);
      this.moonLight.intensity = 1.3;
      this.hemiLight.color.setHex(0x4a4a60);
      this.hemiLight.groundColor.setHex(0x453120);
    }
  }

  private updatePlayerMovement(delta: number): boolean {
    if (this.gameState !== 'PLAYING') {
      return false;
    }

    // Se estiver sentado, verifica se alguma tecla de movimento foi acionada
    if (this.isSitting) {
      const anyMoveKey =
        this.keys['w'] ||
        this.keys['arrowup'] ||
        this.keys['s'] ||
        this.keys['arrowdown'] ||
        this.keys['a'] ||
        this.keys['arrowleft'] ||
        this.keys['d'] ||
        this.keys['arrowright'];

      if (anyMoveKey) {
        this.toggleSitInteract();
      } else {
        return false;
      }
    }

    let forward = 0;
    let strafe = 0;

    if (this.keys['w'] || this.keys['arrowup']) forward += 1;
    if (this.keys['s'] || this.keys['arrowdown']) forward -= 1;
    if (this.keys['a'] || this.keys['arrowleft']) strafe -= 1;
    if (this.keys['d'] || this.keys['arrowright']) strafe += 1;

    const isMoving = forward !== 0 || strafe !== 0;

    if (!isMoving) {
      this.playerVelocity.set(0, 0, 0);
      return false;
    }

    const isSprinting = Boolean(this.keys['shift']);
    const speed = isSprinting ? this.sprintSpeed : this.walkSpeed;

    // Movement relative to camera yaw
    const moveAngle = Math.atan2(strafe, forward);
    const worldAngle = this.cameraYaw + moveAngle;

    const targetHeading = worldAngle;
    // Smooth angular rotation interpolation
    let angleDiff = targetHeading - this.playerHeading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.playerHeading += angleDiff * Math.min(1, delta * 14);

    const moveX = Math.sin(worldAngle) * speed * delta;
    const moveZ = Math.cos(worldAngle) * speed * delta;

    const newX = this.playerPos.x + moveX;
    const newZ = this.playerPos.z + moveZ;

    // Collision check against box colliders
    const playerRadius = 0.38;
    let allowedX = newX;
    let allowedZ = newZ;

    for (const c of this.colliders) {
      // Verifica se a posição atual já estava em sobreposição com o colisor
      const curInsideX =
        this.playerPos.x + playerRadius > c.minX &&
        this.playerPos.x - playerRadius < c.maxX;
      const curInsideZ =
        this.playerPos.z + playerRadius > c.minZ &&
        this.playerPos.z - playerRadius < c.maxZ;

      // Check X motion
      if (
        allowedX + playerRadius > c.minX &&
        allowedX - playerRadius < c.maxX &&
        this.playerPos.z + playerRadius > c.minZ &&
        this.playerPos.z - playerRadius < c.maxZ
      ) {
        // Se já estava dentro do colisor (ex: acabou de levantar do banco), permite afastar-se
        if (!curInsideX || (curInsideX && curInsideZ && Math.abs(allowedX - (c.minX + c.maxX) / 2) < Math.abs(this.playerPos.x - (c.minX + c.maxX) / 2))) {
          allowedX = this.playerPos.x; // Block X se estiver adentrando
        }
      }

      // Check Z motion
      if (
        allowedX + playerRadius > c.minX &&
        allowedX - playerRadius < c.maxX &&
        allowedZ + playerRadius > c.minZ &&
        allowedZ - playerRadius < c.maxZ
      ) {
        if (!curInsideZ || (curInsideX && curInsideZ && Math.abs(allowedZ - (c.minZ + c.maxZ) / 2) < Math.abs(this.playerPos.z - (c.minZ + c.maxZ) / 2))) {
          allowedZ = this.playerPos.z; // Block Z se estiver adentrando
        }
      }
    }

    // World boundary clamping
    allowedX = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, allowedX));
    allowedZ = Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, allowedZ));

    this.playerPos.x = allowedX;
    this.playerPos.z = allowedZ;

    this.player.group.position.copy(this.playerPos);
    this.player.group.rotation.y = this.playerHeading;

    // Send transform to Colyseus server (throttled ~20Hz)
    socketManager.sendPlayerTransform(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      this.playerHeading,
      this.player.action,
      this.isSitting
    );

    return isMoving;
  }

  private updateProximityChecks(): void {
    // 1. Check nearby sit spot
    let closestSpot: SitSpot | null = null;
    let minDist = 2.0;

    for (const spot of SIT_SPOTS) {
      const dx = this.playerPos.x - spot.position[0];
      const dz = this.playerPos.z - spot.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        closestSpot = spot;
      }
    }

    if (closestSpot !== this.nearbySitSpot) {
      this.nearbySitSpot = closestSpot;
      if (this.onNearSitSpotChange) this.onNearSitSpotChange(closestSpot);
    }

    // 2. Check current farm location zone
    let activeLoc = WORLD_LOCATIONS[0];
    let minLocDist = Infinity;

    for (const loc of WORLD_LOCATIONS) {
      const dx = this.playerPos.x - loc.center[0];
      const dz = this.playerPos.z - loc.center[1];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < loc.radius && dist < minLocDist) {
        minLocDist = dist;
        activeLoc = loc;
      }
    }

    if (activeLoc.name !== this.currentLocation.name) {
      this.currentLocation = activeLoc;
      if (this.onLocationChange) this.onLocationChange(activeLoc);
    }
  }

  private updateCamera(delta: number): void {
    // Exponential damping on distance zoom
    this.cameraDistance = THREE.MathUtils.damp(this.cameraDistance, this.targetCameraDistance, 8, delta);

    if (this.gameState === 'TITLE') {
      // Cinematic slow title orbit around campfire and farmhouse
      this.titleCamAngle += delta * 0.12;
      const camRadius = 14;
      const cx = Math.sin(this.titleCamAngle) * camRadius;
      const cz = Math.cos(this.titleCamAngle) * camRadius;
      const cy = 4.8 + Math.sin(this.titleCamAngle * 0.5) * 1.5;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(0, 1.2, 0); // Focus on campfire
      return;
    }

    // Third-person character follow camera
    const targetY = this.playerPos.y + 1.45;
    const lookTarget = new THREE.Vector3(this.playerPos.x, targetY, this.playerPos.z);

    // Compute camera offset from player
    const horizontalDist = Math.cos(this.cameraPitch) * this.cameraDistance;
    const verticalDist = Math.sin(this.cameraPitch) * this.cameraDistance;

    const camX = this.playerPos.x - Math.sin(this.cameraYaw) * horizontalDist;
    const camY = targetY + verticalDist;
    const camZ = this.playerPos.z - Math.cos(this.cameraYaw) * horizontalDist;

    // Smooth camera damping towards target position
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 12, delta);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 12, delta);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 12, delta);

    this.camera.lookAt(lookTarget);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.isDestroyed) return;

      const rawDt = this.clock.getDelta();
      const delta = Math.min(rawDt, 0.05); // Frame delta clamp

      // 1. Update player physics & movement
      const isMoving = this.updatePlayerMovement(delta);
      const isSprinting = Boolean(this.keys['shift']);

      if (isMoving && this.player.action === 'idle') {
        this.player.setAction(isSprinting ? 'run' : 'walk');
      } else if (!isMoving && (this.player.action === 'walk' || this.player.action === 'run')) {
        this.player.setAction('idle');
      }

      // 2. Update character model animations & speech bubble facing
      this.player.update(delta, isMoving, isSprinting, this.camera);

      // 3. Update remote avatars interpolation and animations
      this.remoteAvatars.forEach(({ avatar, targetPos, targetHeading }) => {
        const dx = targetPos.x - avatar.group.position.x;
        const dz = targetPos.z - avatar.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const remoteIsMoving = dist > 0.05;

        avatar.group.position.x = THREE.MathUtils.damp(avatar.group.position.x, targetPos.x, 14, delta);
        avatar.group.position.z = THREE.MathUtils.damp(avatar.group.position.z, targetPos.z, 14, delta);
        avatar.group.position.y = targetPos.y;

        // Rotation damping
        let diff = targetHeading - avatar.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        avatar.group.rotation.y += diff * Math.min(1, delta * 12);

        avatar.update(delta, remoteIsMoving, false, this.camera);
      });

      // 4. Update environment components
      this.campfire.update(delta);
      this.buildings.update(delta);
      this.nature.update(delta);

      // 5. Update proximity to interactable logs and locations
      this.updateProximityChecks();

      // 6. Update audio spatial engine
      soundEngine.updatePlayerPosition(this.playerPos.x, this.playerPos.y, this.playerPos.z);

      // 7. Update camera
      this.updateCamera(delta);

      // 8. Render scene
      this.renderer.render(this.scene, this.camera);

      this.frameId = requestAnimationFrame(tick);
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private onWindowResize = (): void => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy(): void {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.socketUnsubscribers.forEach((unsub) => unsub());
    this.socketUnsubscribers = [];

    // Clear remote avatars
    this.remoteAvatars.forEach(({ avatar }) => {
      this.scene.remove(avatar.group);
    });
    this.remoteAvatars.clear();

    soundEngine.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
