import * as THREE from 'three';
import {
  createWoodPlankTexture,
  createTileRoofTexture,
  createStoneCobbleTexture,
} from '../proceduralTextures';
import { BoxCollider } from '../constants';

export class FarmBuildings {
  public group: THREE.Group;
  public colliders: BoxCollider[] = [];
  private lanternLights: THREE.PointLight[] = [];
  private time = 0;

  constructor(maxAnisotropy = 4) {
    this.group = new THREE.Group();
    this.group.name = 'FarmBuildings';

    this.buildOldFarmHouse(maxAnisotropy);
    this.buildRusticBarn(maxAnisotropy);
    this.buildRusticWell(maxAnisotropy);
  }

  /**
   * Casa rural antiga com varanda colonial, telhas artesanais e janelas acolhedoras
   */
  private buildOldFarmHouse(maxAnisotropy: number): void {
    const houseGroup = new THREE.Group();
    houseGroup.position.set(-18, 0, -14);
    houseGroup.rotation.y = Math.PI * 0.15; // Angled slightly towards the campfire

    const woodTex = createWoodPlankTexture(maxAnisotropy, false);
    const roofTex = createTileRoofTexture(maxAnisotropy);
    const stoneTex = createStoneCobbleTexture(maxAnisotropy);

    // Whitewashed rustic stucco wall material
    const stuccoMat = new THREE.MeshStandardMaterial({
      color: 0xe8e2d2,
      roughness: 0.92,
      metalness: 0.05,
    });

    // Dark structural timber
    const timberMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x3d2c1e,
      roughness: 0.85,
    });

    // Terracotta roof material
    const roofMat = new THREE.MeshStandardMaterial({
      map: roofTex,
      color: 0xaa5035,
      roughness: 0.82,
    });

    // Warm glowing window material
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      emissive: 0xffaa33,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    });

    // 1. Stone foundation base
    const foundGeo = new THREE.BoxGeometry(10.6, 0.6, 7.6);
    const foundMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x6e6862,
      roughness: 0.9,
    });
    const foundMesh = new THREE.Mesh(foundGeo, foundMat);
    foundMesh.position.set(0, 0.3, 0);
    foundMesh.receiveShadow = true;
    houseGroup.add(foundMesh);

    // 2. Main house body
    const bodyGeo = new THREE.BoxGeometry(10.2, 3.8, 7.2);
    const bodyMesh = new THREE.Mesh(bodyGeo, stuccoMat);
    bodyMesh.position.set(0, 2.5, 0);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    houseGroup.add(bodyMesh);

    // Decorative dark timber corner posts
    [
      [-5.1, -3.6],
      [5.1, -3.6],
      [-5.1, 3.6],
      [5.1, 3.6],
    ].forEach(([cx, cz]) => {
      const cornerGeo = new THREE.BoxGeometry(0.35, 3.8, 0.35);
      const corner = new THREE.Mesh(cornerGeo, timberMat);
      corner.position.set(cx, 2.5, cz);
      corner.castShadow = true;
      houseGroup.add(corner);
    });

    // 3. Dual-pitch terracotta roof
    const roofGroup = new THREE.Group();
    roofGroup.position.set(0, 4.4, 0);

    const roofSlopeGeo = new THREE.BoxGeometry(11.2, 0.25, 4.6);
    // South pitch
    const roofSouth = new THREE.Mesh(roofSlopeGeo, roofMat);
    roofSouth.position.set(0, 1.1, 2.0);
    roofSouth.rotation.x = 0.52;
    roofSouth.castShadow = true;
    roofSouth.receiveShadow = true;
    roofGroup.add(roofSouth);

    // North pitch
    const roofNorth = new THREE.Mesh(roofSlopeGeo, roofMat);
    roofNorth.position.set(0, 1.1, -2.0);
    roofNorth.rotation.x = -0.52;
    roofNorth.castShadow = true;
    roofNorth.receiveShadow = true;
    roofGroup.add(roofNorth);

    // Triangular gables (front/back)
    const gableShape = new THREE.Shape();
    gableShape.moveTo(-3.6, 0);
    gableShape.lineTo(0, 2.1);
    gableShape.lineTo(3.6, 0);
    gableShape.closePath();

    const gableGeo = new THREE.ShapeGeometry(gableShape);
    const gableMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x4a3625,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });

    const gableEast = new THREE.Mesh(gableGeo, gableMat);
    gableEast.position.set(5.1, 0, 0);
    gableEast.rotation.y = Math.PI / 2;
    roofGroup.add(gableEast);

    const gableWest = new THREE.Mesh(gableGeo, gableMat);
    gableWest.position.set(-5.1, 0, 0);
    gableWest.rotation.y = -Math.PI / 2;
    roofGroup.add(gableWest);

    houseGroup.add(roofGroup);

    // 4. Varanda (Front porch facing the farm/campfire)
    const porchGroup = new THREE.Group();
    porchGroup.position.set(0, 0, 4.8);

    // Porch floor
    const porchFloorGeo = new THREE.BoxGeometry(9.6, 0.35, 2.8);
    const porchFloor = new THREE.Mesh(porchFloorGeo, timberMat);
    porchFloor.position.set(0, 0.42, 0);
    porchFloor.castShadow = true;
    porchFloor.receiveShadow = true;
    porchGroup.add(porchFloor);

    // Porch roof awning
    const porchRoofGeo = new THREE.BoxGeometry(10.2, 0.18, 3.2);
    const porchRoof = new THREE.Mesh(porchRoofGeo, roofMat);
    porchRoof.position.set(0, 3.3, 0.2);
    porchRoof.rotation.x = 0.22;
    porchRoof.castShadow = true;
    porchRoof.receiveShadow = true;
    porchGroup.add(porchRoof);

    // Porch support columns (4 turned wooden pillars)
    [-4.2, -1.4, 1.4, 4.2].forEach((px) => {
      const colGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.7, 8);
      const col = new THREE.Mesh(colGeo, timberMat);
      col.position.set(px, 1.85, 1.2);
      col.castShadow = true;
      porchGroup.add(col);
    });

    // Porch railing (between posts)
    [-2.8, 2.8].forEach((rx) => {
      const railGeo = new THREE.BoxGeometry(2.5, 0.1, 0.1);
      const topRail = new THREE.Mesh(railGeo, timberMat);
      topRail.position.set(rx, 1.3, 1.2);
      porchGroup.add(topRail);

      // Balusters
      for (let b = -1.0; b <= 1.0; b += 0.35) {
        const balGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6);
        const bal = new THREE.Mesh(balGeo, timberMat);
        bal.position.set(rx + b, 0.95, 1.2);
        porchGroup.add(bal);
      }
    });

    // Porch entrance steps
    const stepGeo = new THREE.BoxGeometry(2.2, 0.2, 0.6);
    const step = new THREE.Mesh(stepGeo, timberMat);
    step.position.set(0, 0.2, 1.6);
    step.receiveShadow = true;
    porchGroup.add(step);

    // Cozy wooden porch bench
    const benchGeo = new THREE.BoxGeometry(2.0, 0.12, 0.5);
    const benchMesh = new THREE.Mesh(benchGeo, timberMat);
    benchMesh.position.set(2.6, 0.85, -0.2);
    benchMesh.castShadow = true;
    porchGroup.add(benchMesh);

    houseGroup.add(porchGroup);

    // 5. Front door
    const doorGeo = new THREE.BoxGeometry(1.4, 2.4, 0.1);
    const doorMesh = new THREE.Mesh(doorGeo, timberMat);
    doorMesh.position.set(0, 1.8, 3.65);
    houseGroup.add(doorMesh);

    // Door knob
    const knobGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 });
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.position.set(0.48, 1.8, 3.73);
    houseGroup.add(knob);

    // 6. Windows with shutters and warm interior light
    [-2.8, 2.8].forEach((wx) => {
      const winGeo = new THREE.BoxGeometry(1.2, 1.4, 0.1);
      const win = new THREE.Mesh(winGeo, windowMat);
      win.position.set(wx, 2.2, 3.65);
      houseGroup.add(win);

      // Wooden shutters
      [-0.7, 0.7].forEach((sx) => {
        const shutGeo = new THREE.BoxGeometry(0.45, 1.4, 0.08);
        const shutter = new THREE.Mesh(shutGeo, timberMat);
        shutter.position.set(wx + sx, 2.2, 3.7);
        houseGroup.add(shutter);
      });
    });

    // 7. Hanging Lantern on the Porch with warm dynamic light
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(0, 2.9, 5.8);

    const lFrameGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.35, 6);
    const lFrameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4 });
    const lFrame = new THREE.Mesh(lFrameGeo, lFrameMat);
    lanternGroup.add(lFrame);

    const lGlassGeo = new THREE.CylinderGeometry(0.09, 0.12, 0.22, 6);
    const lGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffd27d,
      emissive: 0xffaa22,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.85,
    });
    const lGlass = new THREE.Mesh(lGlassGeo, lGlassMat);
    lanternGroup.add(lGlass);

    const porchLight = new THREE.PointLight(0xffa834, 1.4, 12, 1.6);
    porchLight.position.set(0, -0.05, 0);
    porchLight.castShadow = true;
    porchLight.shadow.bias = -0.002;
    lanternGroup.add(porchLight);
    this.lanternLights.push(porchLight);

    houseGroup.add(lanternGroup);

    // 8. Stone Chimney
    const chimGeo = new THREE.BoxGeometry(1.2, 6.2, 1.4);
    const chimMesh = new THREE.Mesh(chimGeo, foundMat);
    chimMesh.position.set(-5.3, 3.1, -1.2);
    chimMesh.castShadow = true;
    chimMesh.receiveShadow = true;
    houseGroup.add(chimMesh);

    this.group.add(houseGroup);

    // Colliders for the house & porch
    // Main house body bounds (approx world coordinates)
    this.colliders.push({
      minX: -24.5,
      maxX: -11.5,
      minZ: -19.5,
      maxZ: -9.5,
      name: 'Casa Rural Antiga',
    });
  }

  /**
   * Celeiro rústico com tábuas de madeira vermelha, porta aberta e fardos de feno
   */
  private buildRusticBarn(maxAnisotropy: number): void {
    const barnGroup = new THREE.Group();
    barnGroup.position.set(18, 0, -12);
    barnGroup.rotation.y = -Math.PI * 0.18; // Angled towards central yard

    const barnWoodTex = createWoodPlankTexture(maxAnisotropy, true);
    const darkWoodTex = createWoodPlankTexture(maxAnisotropy, false);
    const roofTex = createTileRoofTexture(maxAnisotropy);

    const barnMat = new THREE.MeshStandardMaterial({
      map: barnWoodTex,
      color: 0x822922,
      roughness: 0.86,
    });

    const beamMat = new THREE.MeshStandardMaterial({
      map: darkWoodTex,
      color: 0x2e1c14,
      roughness: 0.9,
    });

    const roofMat = new THREE.MeshStandardMaterial({
      map: roofTex,
      color: 0x48423f, // Weathered slate / corrugated roof
      roughness: 0.8,
    });

    // 1. Barn main walls (12m x 9m x 5.5m high)
    const barnGeo = new THREE.BoxGeometry(12, 5.5, 9);
    const barnMesh = new THREE.Mesh(barnGeo, barnMat);
    barnMesh.position.set(0, 2.75, 0);
    barnMesh.castShadow = true;
    barnMesh.receiveShadow = true;
    barnGroup.add(barnMesh);

    // Structural timber cross-beams on walls
    const beamHorizGeo = new THREE.BoxGeometry(12.1, 0.25, 0.15);
    const beamH1 = new THREE.Mesh(beamHorizGeo, beamMat);
    beamH1.position.set(0, 2.75, 4.52);
    barnGroup.add(beamH1);

    // 2. Gambrel / Steep Pitched Barn Roof
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-4.6, 0);
    roofShape.lineTo(-3.6, 2.4);
    roofShape.lineTo(0, 3.8);
    roofShape.lineTo(3.6, 2.4);
    roofShape.lineTo(4.6, 0);
    roofShape.closePath();

    // Front & Back barn gables
    const gableGeo = new THREE.ShapeGeometry(roofShape);
    const gableFront = new THREE.Mesh(gableGeo, barnMat);
    gableFront.position.set(6.01, 5.5, 0);
    gableFront.rotation.y = Math.PI / 2;
    gableFront.castShadow = true;
    barnGroup.add(gableFront);

    const gableBack = new THREE.Mesh(gableGeo, barnMat);
    gableBack.position.set(-6.01, 5.5, 0);
    gableBack.rotation.y = -Math.PI / 2;
    gableBack.castShadow = true;
    barnGroup.add(gableBack);

    // Sloped roof surfaces
    const mainRoofGeo = new THREE.BoxGeometry(13.2, 0.2, 4.2);
    const roofLeft = new THREE.Mesh(mainRoofGeo, roofMat);
    roofLeft.position.set(0, 7.8, -2.1);
    roofLeft.rotation.x = -0.58;
    roofLeft.castShadow = true;
    roofLeft.receiveShadow = true;
    barnGroup.add(roofLeft);

    const roofRight = new THREE.Mesh(mainRoofGeo, roofMat);
    roofRight.position.set(0, 7.8, 2.1);
    roofRight.rotation.x = 0.58;
    roofRight.castShadow = true;
    roofRight.receiveShadow = true;
    barnGroup.add(roofRight);

    // 3. Large Double Barn Doors with "X" braces
    const doorW = 2.0;
    const doorH = 3.6;

    // Left door (slightly ajar 15 deg)
    const leftDoorGroup = new THREE.Group();
    leftDoorGroup.position.set(-doorW, 1.8, 4.55);
    leftDoorGroup.rotation.y = 0.25;

    const leftDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.12), beamMat);
    leftDoorMesh.position.set(doorW / 2, 0, 0);
    leftDoorMesh.castShadow = true;
    leftDoorGroup.add(leftDoorMesh);

    // X brace
    const braceGeo = new THREE.BoxGeometry(2.3, 0.15, 0.05);
    const brace1 = new THREE.Mesh(braceGeo, beamMat);
    brace1.position.set(doorW / 2, 0, 0.07);
    brace1.rotation.z = 0.8;
    leftDoorGroup.add(brace1);
    barnGroup.add(leftDoorGroup);

    // Right door
    const rightDoorGroup = new THREE.Group();
    rightDoorGroup.position.set(doorW, 1.8, 4.55);
    const rightDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.12), beamMat);
    rightDoorMesh.position.set(-doorW / 2, 0, 0);
    rightDoorMesh.castShadow = true;
    rightDoorGroup.add(rightDoorMesh);
    barnGroup.add(rightDoorGroup);

    // Warm glow from inside the barn doorway
    const barnLight = new THREE.PointLight(0xffa834, 1.2, 10, 1.8);
    barnLight.position.set(0, 2.4, 4.2);
    barnGroup.add(barnLight);
    this.lanternLights.push(barnLight);

    // 4. Hayloft window and beam
    const loftWinGeo = new THREE.BoxGeometry(1.6, 1.6, 0.1);
    const loftWin = new THREE.Mesh(loftWinGeo, beamMat);
    loftWin.position.set(0, 6.4, 4.55);
    barnGroup.add(loftWin);

    // Pulley beam extending out
    const beamGeo = new THREE.BoxGeometry(0.2, 0.25, 2.4);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 7.8, 4.8);
    beam.castShadow = true;
    barnGroup.add(beam);

    // 5. Exterior Props: Hay bales, barrels, crates
    // Hay bale material
    const hayMat = new THREE.MeshStandardMaterial({
      color: 0xcca655,
      roughness: 0.95,
    });

    // 3 Hay bales near front
    const hayPositions: [number, number, number, number][] = [
      [-3.8, 0.45, 5.2, 0.1],
      [-2.4, 0.45, 5.4, -0.2],
      [-3.1, 1.25, 5.3, 0.15],
    ];

    hayPositions.forEach(([hx, hy, hz, hrot]) => {
      const baleGeo = new THREE.BoxGeometry(1.6, 0.8, 0.9);
      const bale = new THREE.Mesh(baleGeo, hayMat);
      bale.position.set(hx, hy, hz);
      bale.rotation.y = hrot;
      bale.castShadow = true;
      bale.receiveShadow = true;
      barnGroup.add(bale);
    });

    // Wooden barrels
    const barrelGeo = new THREE.CylinderGeometry(0.38, 0.44, 1.0, 10);
    const barrelMat = new THREE.MeshStandardMaterial({
      map: darkWoodTex,
      color: 0x4d3725,
      roughness: 0.8,
    });

    [
      [3.8, 0.5, 5.2],
      [4.7, 0.5, 5.0],
    ].forEach(([bx, by, bz]) => {
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(bx, by, bz);
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      barnGroup.add(barrel);
    });

    this.group.add(barnGroup);

    // Add barn collider
    this.colliders.push({
      minX: 11.5,
      maxX: 24.5,
      minZ: -17.5,
      maxZ: -6.5,
      name: 'Celeiro Rústico',
    });
  }

  /**
   * Poço de água colonial com base de pedra e telhadinho
   */
  private buildRusticWell(maxAnisotropy: number): void {
    const wellGroup = new THREE.Group();
    wellGroup.position.set(-6, 0, 7);

    const stoneTex = createStoneCobbleTexture(maxAnisotropy);
    const woodTex = createWoodPlankTexture(maxAnisotropy, false);
    const roofTex = createTileRoofTexture(maxAnisotropy);

    // Stone well ring
    const wellStoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x78726b,
      roughness: 0.88,
    });
    const wellGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.9, 14, 1, true);
    const wellMesh = new THREE.Mesh(wellGeo, wellStoneMat);
    wellMesh.position.set(0, 0.45, 0);
    wellMesh.castShadow = true;
    wellMesh.receiveShadow = true;
    wellGroup.add(wellMesh);

    // Inner dark water plane
    const waterGeo = new THREE.CircleGeometry(1.05, 12);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x050e14,
      roughness: 0.1,
      metalness: 0.8,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, 0.25, 0);
    wellGroup.add(waterMesh);

    // Wood pillars
    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0x422f20,
      roughness: 0.85,
    });
    [-1.0, 1.0].forEach((px) => {
      const pillarGeo = new THREE.CylinderGeometry(0.08, 0.09, 2.2, 8);
      const pillar = new THREE.Mesh(pillarGeo, woodMat);
      pillar.position.set(px, 1.5, 0);
      pillar.castShadow = true;
      wellGroup.add(pillar);
    });

    // Crossbar & crank
    const crossGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8);
    const cross = new THREE.Mesh(crossGeo, woodMat);
    cross.position.set(0, 1.9, 0);
    cross.rotation.z = Math.PI / 2;
    wellGroup.add(cross);

    // Terracotta rooflet over the well
    const roofletGeo = new THREE.BoxGeometry(2.4, 0.12, 1.8);
    const roofletMat = new THREE.MeshStandardMaterial({
      map: roofTex,
      color: 0xaa5035,
      roughness: 0.8,
    });
    const roofletL = new THREE.Mesh(roofletGeo, roofletMat);
    roofletL.position.set(0, 2.8, -0.6);
    roofletL.rotation.x = -0.45;
    roofletL.castShadow = true;
    wellGroup.add(roofletL);

    const roofletR = new THREE.Mesh(roofletGeo, roofletMat);
    roofletR.position.set(0, 2.8, 0.6);
    roofletR.rotation.x = 0.45;
    roofletR.castShadow = true;
    wellGroup.add(roofletR);

    // Wooden bucket hanging
    const bucketGeo = new THREE.CylinderGeometry(0.2, 0.16, 0.35, 8);
    const bucket = new THREE.Mesh(bucketGeo, woodMat);
    bucket.position.set(0, 1.0, 0);
    bucket.castShadow = true;
    wellGroup.add(bucket);

    this.group.add(wellGroup);

    this.colliders.push({
      minX: -7.5,
      maxX: -4.5,
      minZ: 5.5,
      maxZ: 8.5,
      name: 'Poço de Água Colonial',
    });
  }

  public update(delta: number): void {
    this.time += delta;
    // Subtle lantern wick flicker
    const lFlicker = Math.sin(this.time * 8.2) * 0.12 + Math.cos(this.time * 19.3) * 0.08;
    this.lanternLights.forEach((light) => {
      light.intensity = 1.3 + lFlicker;
    });
  }
}
