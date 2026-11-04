import * as THREE from 'three';
import { createWoodPlankTexture, createStoneCobbleTexture } from '../proceduralTextures';
import { BoxCollider } from '../constants';

export class Campfire {
  public group: THREE.Group;
  public colliders: BoxCollider[] = [];
  private pointLight!: THREE.PointLight;
  private groundLight!: THREE.PointLight;
  private flameMeshes: THREE.Mesh[] = [];
  private embersGeometry!: THREE.BufferGeometry;
  private embersParticles!: THREE.Points;
  private emberPositions!: Float32Array;
  private emberVelocities!: Float32Array;
  private emberLifetimes!: Float32Array;
  private emberMaxLifetimes!: Float32Array;
  private emberCount = 140;

  private smokeGeometry!: THREE.BufferGeometry;
  private smokeParticles!: THREE.Points;
  private smokePositions!: Float32Array;
  private smokeCount = 45;

  private time = 0;
  private baseLightIntensity = 3.6;

  constructor(maxAnisotropy = 4) {
    this.group = new THREE.Group();
    this.group.name = 'CampfireArea';

    this.buildCampfireBase(maxAnisotropy);
    this.buildCircularBenches(maxAnisotropy);
    this.buildFlames();
    this.buildParticles();
    this.setupLighting();
  }

  private buildCampfireBase(maxAnisotropy: number): void {
    // 1. Dark charred ground circle beneath the fire
    const ashGeo = new THREE.CircleGeometry(2.4, 32);
    const ashMat = new THREE.MeshStandardMaterial({
      color: 0x140e0b,
      roughness: 0.95,
      metalness: 0.05,
    });
    const ashMesh = new THREE.Mesh(ashGeo, ashMat);
    ashMesh.rotation.x = -Math.PI / 2;
    ashMesh.position.y = 0.02;
    ashMesh.receiveShadow = true;
    this.group.add(ashMesh);

    // 2. Stone fire pit ring (16 stones)
    const stoneTex = createStoneCobbleTexture(maxAnisotropy);
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x8a7f76,
      roughness: 0.88,
      metalness: 0.12,
    });

    const stoneRadius = 1.35;
    const stoneCount = 16;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const r = stoneRadius + (Math.random() * 0.15 - 0.075);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const stoneGeo = new THREE.DodecahedronGeometry(0.24 + Math.random() * 0.08, 1);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(x, 0.15, z);
      stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      stone.scale.set(1.2, 0.85, 1.1);
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.group.add(stone);
    }

    // 3. Central burning logs (pyramid stack)
    const woodTex = createWoodPlankTexture(maxAnisotropy, false);
    const logMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x2e2017,
      roughness: 0.9,
    });

    const emberCoreMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff4500,
      emissiveIntensity: 1.8,
      roughness: 0.8,
    });

    // Glowing ember bed at core
    const emberBedGeo = new THREE.CylinderGeometry(0.65, 0.8, 0.25, 12);
    const emberBed = new THREE.Mesh(emberBedGeo, emberCoreMat);
    emberBed.position.set(0, 0.12, 0);
    this.group.add(emberBed);

    // Leaning logs in tepee arrangement
    const logCount = 8;
    for (let i = 0; i < logCount; i++) {
      const angle = (i / logCount) * Math.PI * 2 + (i % 2) * 0.2;
      const logGeo = new THREE.CylinderGeometry(0.09, 0.13, 1.5, 8);
      const log = new THREE.Mesh(logGeo, logMat);

      log.position.set(Math.cos(angle) * 0.45, 0.55, Math.sin(angle) * 0.45);
      log.rotation.x = -Math.sin(angle) * 0.55;
      log.rotation.z = Math.cos(angle) * 0.55;
      log.rotation.y = angle;
      log.castShadow = true;
      log.receiveShadow = true;
      this.group.add(log);
    }

    // Horizontal foundation logs
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI;
      const hLogGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.8, 8);
      const hLog = new THREE.Mesh(hLogGeo, logMat);
      hLog.position.set(0, 0.18 + i * 0.1, 0);
      hLog.rotation.y = angle;
      hLog.rotation.z = Math.PI / 2;
      hLog.castShadow = true;
      this.group.add(hLog);
    }

    // Add central collider so player doesn't walk inside fire
    this.colliders.push({
      minX: -1.3,
      maxX: 1.3,
      minZ: -1.3,
      maxZ: 1.3,
      name: 'Fogueira Central',
    });
  }

  private buildCircularBenches(maxAnisotropy: number): void {
    const woodTex = createWoodPlankTexture(maxAnisotropy, false);
    const benchMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x54402e,
      roughness: 0.82,
      metalness: 0.08,
    });

    const benchSupportMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x3b2b1d,
      roughness: 0.9,
    });

    // 4 curved / angled bench logs around fire (North, South, East, West)
    const positions: [number, number, number, number][] = [
      [0, 0, -3.4, 0],
      [0, 0, 3.4, Math.PI],
      [3.4, 0, 0, -Math.PI / 2],
      [-3.4, 0, 0, Math.PI / 2],
    ];

    positions.forEach(([x, y, z, rotY], index) => {
      const benchGroup = new THREE.Group();
      benchGroup.position.set(x, y, z);
      benchGroup.rotation.y = rotY;

      // Main seat log (halved/split timber with smooth flat top)
      const seatGeo = new THREE.BoxGeometry(2.4, 0.22, 0.55);
      const seat = new THREE.Mesh(seatGeo, benchMat);
      seat.position.set(0, 0.44, 0);
      seat.castShadow = true;
      seat.receiveShadow = true;
      benchGroup.add(seat);

      // Backrest rail on back of the bench
      const railGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.3, 8);
      const rail = new THREE.Mesh(railGeo, benchMat);
      rail.position.set(0, 0.82, -0.24);
      rail.rotation.z = Math.PI / 2;
      rail.castShadow = true;
      benchGroup.add(rail);

      // Backrest vertical posts
      [-0.9, 0.9].forEach((px) => {
        const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.5, 8);
        const post = new THREE.Mesh(postGeo, benchSupportMat);
        post.position.set(px, 0.62, -0.24);
        post.castShadow = true;
        benchGroup.add(post);
      });

      // Stump legs support
      [-0.85, 0.85].forEach((lx) => {
        const stumpGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.44, 10);
        const stump = new THREE.Mesh(stumpGeo, benchSupportMat);
        stump.position.set(lx, 0.22, 0);
        stump.castShadow = true;
        stump.receiveShadow = true;
        benchGroup.add(stump);
      });

      this.group.add(benchGroup);

      // Add collider for each bench
      const halfW = 1.3;
      const halfD = 0.5;
      if (index === 0 || index === 1) {
        this.colliders.push({
          minX: x - halfW,
          maxX: x + halfW,
          minZ: z - halfD,
          maxZ: z + halfD,
          name: `Banco Fogueira ${index + 1}`,
        });
      } else {
        this.colliders.push({
          minX: x - halfD,
          maxX: x + halfD,
          minZ: z - halfW,
          maxZ: z + halfW,
          name: `Banco Fogueira ${index + 1}`,
        });
      }
    });

    // 2 small wood stump stools in corner slots
    const stoolPositions: [number, number][] = [
      [2.5, 2.5],
      [-2.5, -2.5],
    ];

    stoolPositions.forEach(([sx, sz], i) => {
      const stoolGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.42, 10);
      const stool = new THREE.Mesh(stoolGeo, benchSupportMat);
      stool.position.set(sx, 0.21, sz);
      stool.castShadow = true;
      stool.receiveShadow = true;
      this.group.add(stool);

      this.colliders.push({
        minX: sx - 0.35,
        maxX: sx + 0.35,
        minZ: sz - 0.35,
        maxZ: sz + 0.35,
        name: `Toco de Madeira ${i + 1}`,
      });
    });
  }

  private buildFlames(): void {
    // Layered semi-transparent flame cones with additive blending
    const flameMat1 = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const flameMat2 = new THREE.MeshBasicMaterial({
      color: 0xff3b00,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const flameMat3 = new THREE.MeshBasicMaterial({
      color: 0xfff0aa,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Outer flame cone
    const flameGeo1 = new THREE.ConeGeometry(0.65, 1.6, 12, 1, true);
    flameGeo1.translate(0, 0.8, 0);
    const flame1 = new THREE.Mesh(flameGeo1, flameMat2);
    flame1.position.set(0, 0.35, 0);
    this.group.add(flame1);
    this.flameMeshes.push(flame1);

    // Mid flame cone
    const flameGeo2 = new THREE.ConeGeometry(0.45, 1.4, 10, 1, true);
    flameGeo2.translate(0, 0.7, 0);
    const flame2 = new THREE.Mesh(flameGeo2, flameMat1);
    flame2.position.set(0, 0.4, 0);
    this.group.add(flame2);
    this.flameMeshes.push(flame2);

    // Core bright flame
    const flameGeo3 = new THREE.ConeGeometry(0.24, 1.1, 8, 1, true);
    flameGeo3.translate(0, 0.55, 0);
    const flame3 = new THREE.Mesh(flameGeo3, flameMat3);
    flame3.position.set(0, 0.42, 0);
    this.group.add(flame3);
    this.flameMeshes.push(flame3);
  }

  private buildParticles(): void {
    // 1. Embers / Sparks
    this.embersGeometry = new THREE.BufferGeometry();
    this.emberPositions = new Float32Array(this.emberCount * 3);
    this.emberVelocities = new Float32Array(this.emberCount * 3);
    this.emberLifetimes = new Float32Array(this.emberCount);
    this.emberMaxLifetimes = new Float32Array(this.emberCount);

    for (let i = 0; i < this.emberCount; i++) {
      this.resetEmber(i, true);
    }

    this.embersGeometry.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));

    // Procedural glowing round spark point texture
    const sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 32;
    sparkCanvas.height = 32;
    const sctx = sparkCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(255, 230, 160, 1)');
    grad.addColorStop(0.3, 'rgba(255, 120, 20, 0.9)');
    grad.addColorStop(0.7, 'rgba(220, 40, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 32);

    const sparkTexture = new THREE.CanvasTexture(sparkCanvas);

    const emberMat = new THREE.PointsMaterial({
      size: 0.28,
      map: sparkTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffaa44,
    });

    this.embersParticles = new THREE.Points(this.embersGeometry, emberMat);
    this.group.add(this.embersParticles);

    // 2. Soft Night Smoke
    this.smokeGeometry = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(this.smokeCount * 3);

    for (let i = 0; i < this.smokeCount; i++) {
      this.smokePositions[i * 3] = (Math.random() - 0.5) * 0.8;
      this.smokePositions[i * 3 + 1] = 1.2 + Math.random() * 4.5;
      this.smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }

    this.smokeGeometry.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));

    const smokeCanvas = document.createElement('canvas');
    smokeCanvas.width = 64;
    smokeCanvas.height = 64;
    const smCtx = smokeCanvas.getContext('2d')!;
    const smGrad = smCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    smGrad.addColorStop(0, 'rgba(60, 50, 45, 0.28)');
    smGrad.addColorStop(0.6, 'rgba(40, 35, 30, 0.12)');
    smGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    smCtx.fillStyle = smGrad;
    smCtx.fillRect(0, 0, 64, 64);

    const smokeTex = new THREE.CanvasTexture(smokeCanvas);

    const smokeMat = new THREE.PointsMaterial({
      size: 1.8,
      map: smokeTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.22,
    });

    this.smokeParticles = new THREE.Points(this.smokeGeometry, smokeMat);
    this.group.add(this.smokeParticles);
  }

  private resetEmber(index: number, initialRandom = false): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.45;
    this.emberPositions[index * 3] = Math.cos(angle) * radius;
    this.emberPositions[index * 3 + 1] = initialRandom ? 0.3 + Math.random() * 2.5 : 0.45;
    this.emberPositions[index * 3 + 2] = Math.sin(angle) * radius;

    // Upward velocity with wind drift
    this.emberVelocities[index * 3] = (Math.random() - 0.45) * 0.35;
    this.emberVelocities[index * 3 + 1] = 0.8 + Math.random() * 1.2;
    this.emberVelocities[index * 3 + 2] = (Math.random() - 0.5) * 0.35;

    this.emberMaxLifetimes[index] = 1.2 + Math.random() * 1.8;
    this.emberLifetimes[index] = initialRandom ? Math.random() * this.emberMaxLifetimes[index] : 0;
  }

  private setupLighting(): void {
    // Primary warm campfire light
    this.pointLight = new THREE.PointLight(0xff7a18, this.baseLightIntensity, 28, 1.4);
    this.pointLight.position.set(0, 1.1, 0);
    this.pointLight.castShadow = true;
    this.pointLight.shadow.mapSize.width = 1024;
    this.pointLight.shadow.mapSize.height = 1024;
    this.pointLight.shadow.bias = -0.002;
    this.pointLight.shadow.camera.near = 0.4;
    this.pointLight.shadow.camera.far = 28;
    this.group.add(this.pointLight);

    // Ground level red-orange fill light for the logs and stones
    this.groundLight = new THREE.PointLight(0xff3300, 1.8, 6, 2);
    this.groundLight.position.set(0, 0.3, 0);
    this.group.add(this.groundLight);
  }

  public update(delta: number): void {
    this.time += delta;

    // 1. Organic multi-octave flicker for lighting
    const flicker1 = Math.sin(this.time * 14.5) * 0.35;
    const flicker2 = Math.sin(this.time * 26.2 + 1.2) * 0.25;
    const flicker3 = Math.cos(this.time * 7.1) * 0.2;
    const totalFlicker = 1.0 + flicker1 + flicker2 + flicker3;

    this.pointLight.intensity = Math.max(1.8, this.baseLightIntensity * totalFlicker);
    this.pointLight.position.x = Math.sin(this.time * 8.0) * 0.08;
    this.pointLight.position.z = Math.cos(this.time * 9.5) * 0.08;
    this.groundLight.intensity = 1.6 + flicker2 * 0.6;

    // 2. Animated flame meshes scale and slight twist
    this.flameMeshes.forEach((mesh, index) => {
      const speed = 12 + index * 4;
      const wave = Math.sin(this.time * speed + index);
      const waveCos = Math.cos(this.time * (speed * 0.8) + index * 2);
      mesh.scale.set(
        1 + wave * 0.12,
        1 + waveCos * 0.22,
        1 + wave * 0.12
      );
      mesh.rotation.y = this.time * (1.2 + index * 0.5);
      mesh.rotation.x = wave * 0.08;
      mesh.rotation.z = waveCos * 0.08;
    });

    // 3. Update embers
    for (let i = 0; i < this.emberCount; i++) {
      this.emberLifetimes[i] += delta;
      if (this.emberLifetimes[i] >= this.emberMaxLifetimes[i]) {
        this.resetEmber(i, false);
        continue;
      }

      // Physics: rise, gentle turbulence
      const pIdx = i * 3;
      this.emberPositions[pIdx] += this.emberVelocities[pIdx] * delta + Math.sin(this.time * 3 + i) * 0.012;
      this.emberPositions[pIdx + 1] += this.emberVelocities[pIdx + 1] * delta;
      this.emberPositions[pIdx + 2] += this.emberVelocities[pIdx + 2] * delta + Math.cos(this.time * 3 + i) * 0.012;

      // Slight drag on upward movement
      this.emberVelocities[pIdx + 1] = Math.max(0.3, this.emberVelocities[pIdx + 1] - delta * 0.15);
    }
    this.embersGeometry.attributes.position.needsUpdate = true;

    // 4. Update smoke
    for (let i = 0; i < this.smokeCount; i++) {
      const pIdx = i * 3;
      this.smokePositions[pIdx + 1] += delta * 0.85;
      this.smokePositions[pIdx] += (Math.sin(this.time * 0.5 + i) * 0.08 + 0.04) * delta;

      if (this.smokePositions[pIdx + 1] > 6.0) {
        this.smokePositions[pIdx + 1] = 1.0;
        this.smokePositions[pIdx] = (Math.random() - 0.5) * 0.6;
        this.smokePositions[pIdx + 2] = (Math.random() - 0.5) * 0.6;
      }
    }
    this.smokeGeometry.attributes.position.needsUpdate = true;
  }
}
