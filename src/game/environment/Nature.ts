import * as THREE from 'three';
import {
  createGrassDirtTexture,
  createDirtPathTexture,
  createWoodPlankTexture,
  createStarrySkyTexture,
  createWaterNormalMap,
} from '../proceduralTextures';
import { BoxCollider } from '../constants';

export class Nature {
  public group: THREE.Group;
  public colliders: BoxCollider[] = [];
  private waterMesh!: THREE.Mesh;
  private waterNormalTex!: THREE.CanvasTexture;
  private skyMesh!: THREE.Mesh;
  private time = 0;

  constructor(maxAnisotropy = 4) {
    this.group = new THREE.Group();
    this.group.name = 'NatureEnvironment';

    this.buildSkyDome();
    this.buildGround(maxAnisotropy);
    this.buildPaths(maxAnisotropy);
    this.buildLake(maxAnisotropy);
    this.buildFences(maxAnisotropy);
    this.buildTrees(maxAnisotropy);
    this.buildFoliage();
  }

  /**
   * Sky dome with starry night texture, moon, and nebula gradient
   */
  private buildSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(140, 32, 24);
    const skyTex = createStarrySkyTexture();
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    });
    this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
    this.skyMesh.rotation.y = Math.PI * 0.35;
    this.group.add(this.skyMesh);
  }

  /**
   * Main farm ground plane with grass/loam texture and subtle micro-relief
   */
  private buildGround(maxAnisotropy: number): void {
    const groundGeo = new THREE.PlaneGeometry(160, 160, 64, 64);
    const groundTex = createGrassDirtTexture(maxAnisotropy);
    groundTex.repeat.set(24, 24);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.94,
      metalness: 0.04,
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  /**
   * Caminhos de terra batida (Dirt paths) connecting key farm areas
   */
  private buildPaths(maxAnisotropy: number): void {
    const pathTex = createDirtPathTexture(maxAnisotropy);
    pathTex.repeat.set(1, 8);

    const pathMat = new THREE.MeshStandardMaterial({
      map: pathTex,
      roughness: 0.92,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    // Helper to create curved or linear path ribbon
    const makePathSegment = (points: [number, number][], width = 2.4) => {
      const curvePoints = points.map(([x, z]) => new THREE.Vector3(x, 0.03, z));
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      const divisions = 30;
      const pathPts = curve.getPoints(divisions);

      const pathGeo = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i < pathPts.length; i++) {
        const pt = pathPts[i];
        let tangent = new THREE.Vector3(0, 0, 1);
        if (i < pathPts.length - 1) {
          tangent.subVectors(pathPts[i + 1], pt).normalize();
        } else if (i > 0) {
          tangent.subVectors(pt, pathPts[i - 1]).normalize();
        }

        const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        const halfW = width * 0.5;

        // Left vertex
        vertices.push(pt.x + normal.x * halfW, pt.y, pt.z + normal.z * halfW);
        // Right vertex
        vertices.push(pt.x - normal.x * halfW, pt.y, pt.z - normal.z * halfW);

        const vProgress = i / (pathPts.length - 1);
        uvs.push(0, vProgress * 4);
        uvs.push(1, vProgress * 4);

        if (i < pathPts.length - 1) {
          const base = i * 2;
          indices.push(base, base + 1, base + 2);
          indices.push(base + 1, base + 3, base + 2);
        }
      }

      pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      pathGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      pathGeo.setIndex(indices);
      pathGeo.computeVertexNormals();

      const mesh = new THREE.Mesh(pathGeo, pathMat);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    };

    // Path 1: Campfire -> Casa Antiga (North-West)
    makePathSegment([
      [0, -1.8],
      [-5, -4],
      [-11, -8],
      [-16, -11.5],
    ], 2.2);

    // Path 2: Campfire -> Celeiro (North-East)
    makePathSegment([
      [1.8, -0.5],
      [7, -3],
      [13, -7],
      [17, -8.5],
    ], 2.4);

    // Path 3: Campfire -> Lago & Pier (South-East)
    makePathSegment([
      [1.5, 1.5],
      [6, 6],
      [11, 11],
      [14.5, 14],
    ], 2.0);

    // Path 4: Campfire -> Entrada Sul da Fazenda
    makePathSegment([
      [0, 2.5],
      [-1, 10],
      [0, 22],
      [0, 38],
    ], 2.8);
  }

  /**
   * Lago (Lake / Pond) with animated reflective water and wooden pier
   */
  private buildLake(maxAnisotropy: number): void {
    const lakeGroup = new THREE.Group();
    lakeGroup.position.set(15, 0, 16);

    // 1. Lake basin excavated shore ring
    const shoreGeo = new THREE.RingGeometry(5.8, 8.2, 32);
    const shoreMat = new THREE.MeshStandardMaterial({
      color: 0x33281d,
      roughness: 0.9,
    });
    const shore = new THREE.Mesh(shoreGeo, shoreMat);
    shore.rotation.x = -Math.PI / 2;
    shore.position.y = 0.02;
    shore.receiveShadow = true;
    lakeGroup.add(shore);

    // 2. Lake water plane with specular reflections and procedural wave normal map
    this.waterNormalTex = createWaterNormalMap();
    this.waterNormalTex.repeat.set(4, 4);

    const waterGeo = new THREE.CircleGeometry(6.6, 36);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x09212d,
      roughness: 0.12,
      metalness: 0.75,
      normalMap: this.waterNormalTex,
      transparent: true,
      opacity: 0.88,
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = 0.05;
    this.waterMesh.receiveShadow = true;
    lakeGroup.add(this.waterMesh);

    // River stones / pebbles along water margin
    const pebbleGeo = new THREE.DodecahedronGeometry(0.22, 1);
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x5a554e, roughness: 0.7 });
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.1;
      const r = 6.2 + Math.random() * 0.6;
      const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
      pebble.position.set(Math.cos(angle) * r, 0.12, Math.sin(angle) * r);
      pebble.scale.set(1 + Math.random() * 0.5, 0.6, 1 + Math.random() * 0.5);
      pebble.castShadow = true;
      lakeGroup.add(pebble);
    }

    // 3. Píer de Madeira (Wooden dock extending out onto the lake)
    const pierGroup = new THREE.Group();
    pierGroup.position.set(-1.8, 0, -3.2);
    pierGroup.rotation.y = -Math.PI * 0.25;

    const woodTex = createWoodPlankTexture(maxAnisotropy, false);
    const pierWoodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x483526,
      roughness: 0.85,
    });

    // Pier deck (length: 4.8m, width: 1.6m)
    const deckGeo = new THREE.BoxGeometry(1.6, 0.16, 4.8);
    const deck = new THREE.Mesh(deckGeo, pierWoodMat);
    deck.position.set(0, 0.38, 2.4);
    deck.castShadow = true;
    deck.receiveShadow = true;
    pierGroup.add(deck);

    // Mooring posts (4 vertical logs driven into the water)
    [
      [-0.7, 0.4],
      [0.7, 0.4],
      [-0.7, 4.4],
      [0.7, 4.4],
    ].forEach(([px, pz]) => {
      const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8);
      const post = new THREE.Mesh(postGeo, pierWoodMat);
      post.position.set(px, 0.6, pz);
      post.castShadow = true;
      pierGroup.add(post);
    });

    // Fishing rod prop resting on pier
    const rodGeo = new THREE.CylinderGeometry(0.015, 0.03, 2.8, 6);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x8a6234, roughness: 0.6 });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(0.65, 0.55, 3.8);
    rod.rotation.set(0.3, 0.2, 0.7);
    pierGroup.add(rod);

    lakeGroup.add(pierGroup);
    this.group.add(lakeGroup);

    // Lake water body collider (shallow margin allows walking up to pier)
    this.colliders.push({
      minX: 11,
      maxX: 19,
      minZ: 14,
      maxZ: 21,
      name: 'Lago Profundo',
    });
  }

  /**
   * Cercas rústicas de madeira (Wooden split-rail fences)
   */
  private buildFences(maxAnisotropy: number): void {
    const woodTex = createWoodPlankTexture(maxAnisotropy, false);
    const fenceMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x423120,
      roughness: 0.88,
    });

    // Line generator for split-rail fence runs
    const buildFenceRun = (startX: number, startZ: number, endX: number, endZ: number) => {
      const dx = endX - startX;
      const dz = endZ - startZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      const postSpacing = 3.2;
      const numPosts = Math.max(2, Math.floor(length / postSpacing) + 1);

      const runGroup = new THREE.Group();
      runGroup.position.set(startX, 0, startZ);
      runGroup.rotation.y = angle;

      const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.3, 7);
      const railGeo = new THREE.CylinderGeometry(0.06, 0.07, postSpacing * 1.05, 6);

      for (let p = 0; p < numPosts; p++) {
        const dist = p * postSpacing;
        if (dist > length + 0.1) break;

        // Vertical post
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(0, 0.65, dist);
        post.rotation.y = (p % 2) * 0.4;
        post.castShadow = true;
        runGroup.add(post);

        // Horizontal rails between posts
        if (p < numPosts - 1) {
          const midZ = dist + postSpacing * 0.5;
          // Top rail
          const rail1 = new THREE.Mesh(railGeo, fenceMat);
          rail1.position.set(0.05, 0.95, midZ);
          rail1.rotation.x = Math.PI / 2;
          rail1.castShadow = true;
          runGroup.add(rail1);

          // Bottom rail
          const rail2 = new THREE.Mesh(railGeo, fenceMat);
          rail2.position.set(-0.05, 0.5, midZ);
          rail2.rotation.x = Math.PI / 2;
          rail2.castShadow = true;
          runGroup.add(rail2);
        }
      }

      this.group.add(runGroup);

      // Add approximate bounding box collider
      this.colliders.push({
        minX: Math.min(startX, endX) - 0.4,
        maxX: Math.max(startX, endX) + 0.4,
        minZ: Math.min(startZ, endZ) - 0.4,
        maxZ: Math.max(startZ, endZ) + 0.4,
        name: 'Cerca de Madeira',
      });
    };

    // North property fence
    buildFenceRun(-35, -30, 35, -30);
    // East pasture fence
    buildFenceRun(35, -30, 35, 30);
    // West orchard fence
    buildFenceRun(-35, -30, -35, 30);
    // South fence with gate opening for farm path
    buildFenceRun(-35, 30, -5, 30);
    buildFenceRun(5, 30, 35, 30);

    // Decorative rustic pasture corral fence near barn
    buildFenceRun(12, -2, 28, -2);
    buildFenceRun(28, -2, 28, 8);
  }

  /**
   * Procedural Multi-Part Trees (3-12 parts per tree following Three.js guidelines)
   */
  private buildTrees(maxAnisotropy: number): void {
    const woodTex = createWoodPlankTexture(maxAnisotropy, false);
    const barkMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x36271c,
      roughness: 0.9,
    });

    const needleMat = new THREE.MeshStandardMaterial({
      color: 0x1a331c,
      roughness: 0.85,
    });

    const leafMatWarm = new THREE.MeshStandardMaterial({
      color: 0x274520,
      roughness: 0.82,
    });

    const leafMatDark = new THREE.MeshStandardMaterial({
      color: 0x1a3818,
      roughness: 0.88,
    });

    // Type 1: Araucária / Pine (Composite 5-tier canopy)
    const createPineTree = (x: number, z: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      tree.scale.setScalar(scale);

      // Trunk (flared base)
      const trunkGeo = new THREE.CylinderGeometry(0.24, 0.45, 4.5, 8);
      trunkGeo.translate(0, 2.25, 0);
      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      trunk.castShadow = true;
      tree.add(trunk);

      // 4 tiered needle cones
      const tiers = [
        { y: 3.2, r: 2.4, h: 2.2 },
        { y: 4.5, r: 1.9, h: 2.0 },
        { y: 5.8, r: 1.4, h: 1.8 },
        { y: 7.0, r: 0.8, h: 1.6 },
      ];

      tiers.forEach(({ y, r, h }, i) => {
        const coneGeo = new THREE.ConeGeometry(r, h, 8);
        coneGeo.translate(0, h * 0.5, 0);
        const cone = new THREE.Mesh(coneGeo, needleMat);
        cone.position.set(0, y, 0);
        cone.rotation.y = i * 0.7;
        cone.castShadow = true;
        cone.receiveShadow = true;
        tree.add(cone);
      });

      this.group.add(tree);

      this.colliders.push({
        minX: x - 0.7,
        maxX: x + 0.7,
        minZ: z - 0.7,
        maxZ: z + 0.7,
        name: 'Pinheiro Antigo',
      });
    };

    // Type 2: Broad Oak / Ipê (gnarled multi-canopy tree)
    const createBroadTree = (x: number, z: number, scale = 1.0) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      tree.scale.setScalar(scale);

      // Main trunk
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, 3.2, 8);
      trunkGeo.translate(0, 1.6, 0);
      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      trunk.castShadow = true;
      tree.add(trunk);

      // Secondary branches
      [-0.6, 0.6].forEach((bx, i) => {
        const bGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.8, 6);
        bGeo.translate(0, 0.9, 0);
        const branch = new THREE.Mesh(bGeo, barkMat);
        branch.position.set(0, 2.6, 0);
        branch.rotation.z = (i === 0 ? 0.45 : -0.45);
        branch.castShadow = true;
        tree.add(branch);
      });

      // Layered lush foliage blobs (Dodecahedrons with subdivision)
      const foliageClusters = [
        { pos: [0, 4.6, 0], rad: 2.2, mat: leafMatWarm },
        { pos: [-1.4, 3.8, 0.6], rad: 1.6, mat: leafMatDark },
        { pos: [1.3, 3.9, -0.5], rad: 1.7, mat: leafMatWarm },
        { pos: [0.3, 5.8, 0.2], rad: 1.5, mat: leafMatDark },
      ];

      foliageClusters.forEach(({ pos, rad, mat }) => {
        const fGeo = new THREE.DodecahedronGeometry(rad, 1);
        const fMesh = new THREE.Mesh(fGeo, mat);
        fMesh.position.set(pos[0], pos[1], pos[2]);
        fMesh.castShadow = true;
        fMesh.receiveShadow = true;
        tree.add(fMesh);
      });

      this.group.add(tree);

      this.colliders.push({
        minX: x - 0.8,
        maxX: x + 0.8,
        minZ: z - 0.8,
        maxZ: z + 0.8,
        name: 'Árvore Frondosa',
      });
    };

    // Strategically place trees around farm periphery and yard
    // Leaving central campfire circle (r < 8m) unobstructed!
    const treePositions: { type: 'pine' | 'broad'; x: number; z: number; scale: number }[] = [
      // Near House
      { type: 'broad', x: -26, z: -10, scale: 1.2 },
      { type: 'broad', x: -24, z: -20, scale: 1.1 },
      { type: 'pine', x: -14, z: -25, scale: 1.25 },
      // Near Barn
      { type: 'pine', x: 26, z: -20, scale: 1.3 },
      { type: 'broad', x: 28, z: -6, scale: 1.05 },
      { type: 'pine', x: 12, z: -24, scale: 1.15 },
      // Near Lake
      { type: 'broad', x: 25, z: 18, scale: 1.15 },
      { type: 'broad', x: 18, z: 26, scale: 1.0 },
      { type: 'pine', x: 8, z: 25, scale: 1.2 },
      // Orchard / Pasture
      { type: 'broad', x: -18, z: 12, scale: 1.1 },
      { type: 'broad', x: -24, z: 16, scale: 1.0 },
      { type: 'broad', x: -16, z: 24, scale: 1.15 },
      { type: 'pine', x: -28, z: 28, scale: 1.3 },
      // Outer perimeter groves
      { type: 'pine', x: -32, z: 0, scale: 1.2 },
      { type: 'pine', x: 32, z: 2, scale: 1.25 },
      { type: 'pine', x: -6, z: -32, scale: 1.35 },
      { type: 'pine', x: 6, z: -32, scale: 1.2 },
    ];

    treePositions.forEach((tp) => {
      if (tp.type === 'pine') {
        createPineTree(tp.x, tp.z, tp.scale);
      } else {
        createBroadTree(tp.x, tp.z, tp.scale);
      }
    });
  }

  /**
   * Bushes, grass clumps, and flowers
   */
  private buildFoliage(): void {
    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x1f3c1a,
      roughness: 0.85,
    });

    const bushGeo = new THREE.DodecahedronGeometry(0.75, 1);

    // Cluster bushes along house foundation and fences
    const bushCoords: [number, number][] = [
      [-12, -18],
      [-13, -9],
      [-23, -13],
      [14, -17],
      [22, -17],
      [24, 7],
      [-14, 8],
      [-8, 6],
      [10, 13],
      [21, 14],
    ];

    bushCoords.forEach(([bx, bz]) => {
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.set(bx, 0.45, bz);
      bush.scale.set(1.2 + Math.random() * 0.4, 0.7 + Math.random() * 0.3, 1.1 + Math.random() * 0.3);
      bush.castShadow = true;
      bush.receiveShadow = true;
      this.group.add(bush);
    });
  }

  public update(delta: number): void {
    this.time += delta;

    // Animate lake water ripples
    if (this.waterNormalTex) {
      this.waterNormalTex.offset.x = (this.time * 0.03) % 1;
      this.waterNormalTex.offset.y = (this.time * 0.02) % 1;
    }

    // Slow celestial rotation of sky dome
    if (this.skyMesh) {
      this.skyMesh.rotation.y += delta * 0.001;
    }
  }
}
