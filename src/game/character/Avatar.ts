import * as THREE from 'three';
import { PlayerCustomization, AvatarAction, Gender } from '../../types/game';
import { soundEngine } from '../../audio/SoundEngine';
import { createFabricTexture, createEyeTexture } from '../proceduralTextures';

export class Avatar {
  public group: THREE.Group;
  public customization: PlayerCustomization;

  // Kinematics and Root Parts
  private hips!: THREE.Group;
  private torso!: THREE.Group;
  private headGroup!: THREE.Group;
  private leftArmGroup!: THREE.Group;
  private rightArmGroup!: THREE.Group;
  private leftForearmGroup!: THREE.Group;
  private rightForearmGroup!: THREE.Group;
  private leftLegGroup!: THREE.Group;
  private rightLegGroup!: THREE.Group;
  private leftCalfGroup!: THREE.Group;
  private rightCalfGroup!: THREE.Group;

  // Facial elements for expressions
  private leftEyeMesh!: THREE.Mesh;
  private rightEyeMesh!: THREE.Mesh;
  private mouthMesh!: THREE.Mesh;
  private blinkTimer = 0;
  private isBlinking = false;

  // Speech Bubble Billboard
  private speechBubbleMesh: THREE.Mesh | null = null;
  private speechCanvas: HTMLCanvasElement;
  private speechTexture: THREE.CanvasTexture;
  private speechTimeout: number | null = null;

  // Animation State
  public action: AvatarAction = 'idle';
  private animTime = 0;
  private footstepTimer = 0;

  // Sitting state transition
  private sitTransition = 0; // 0 = standing, 1 = seated
  public isSitting = false;

  constructor(customization: PlayerCustomization) {
    this.customization = customization;
    this.group = new THREE.Group();
    this.group.name = 'PlayerAvatar';

    // Speech bubble setup
    this.speechCanvas = document.createElement('canvas');
    this.speechCanvas.width = 512;
    this.speechCanvas.height = 128;
    this.speechTexture = new THREE.CanvasTexture(this.speechCanvas);

    this.buildCharacterMesh();
    this.buildSpeechBubble();
  }

  private buildCharacterMesh(): void {
    const isFemale = this.customization.gender === 'female';

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.skinTone),
      roughness: 0.58,
      metalness: 0.04,
    });

    const fabricTex = createFabricTexture(
      this.customization.shirtStyle,
      this.customization.shirtColor
    );
    const shirtMat = new THREE.MeshStandardMaterial({
      map: fabricTex,
      color: new THREE.Color(this.customization.shirtColor),
      roughness: 0.82,
      metalness: 0.02,
    });

    const pantsTex = createFabricTexture(
      this.customization.pantsStyle,
      this.customization.pantsColor
    );
    const pantsMat = new THREE.MeshStandardMaterial({
      map: pantsTex,
      color: new THREE.Color(this.customization.pantsColor),
      roughness: 0.88,
      metalness: 0.02,
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x221710, // Dark leather
      roughness: 0.45,
      metalness: 0.12,
    });

    const bootSoleMat = new THREE.MeshStandardMaterial({
      color: 0x140e0a,
      roughness: 0.85,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.customization.hairColor),
      roughness: 0.75,
      metalness: 0.05,
    });

    // Proportions: Female has narrower waist/shoulders and softer contours
    const hipWidth = isFemale ? 0.38 : 0.42;
    const waistWidth = isFemale ? 0.32 : 0.40;
    const shoulderWidth = isFemale ? 0.40 : 0.48;
    const torsoHeight = isFemale ? 0.48 : 0.52;

    // 1. Hips (central root pivot)
    this.hips = new THREE.Group();
    this.hips.position.set(0, 0.94, 0);

    const pelvisGeo = new THREE.CylinderGeometry(waistWidth * 0.5, hipWidth * 0.52, 0.22, 10);
    const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
    pelvis.position.set(0, 0, 0);
    pelvis.castShadow = true;
    pelvis.receiveShadow = true;
    this.hips.add(pelvis);

    // Leather belt with brass buckle
    const beltGeo = new THREE.CylinderGeometry(waistWidth * 0.51, waistWidth * 0.52, 0.06, 12);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.45 });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.set(0, 0.09, 0);
    this.hips.add(belt);

    // Brass buckle
    const buckleGeo = new THREE.BoxGeometry(0.09, 0.07, 0.04);
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, 0.09, waistWidth * 0.27);
    this.hips.add(buckle);

    // 2. Torso
    this.torso = new THREE.Group();
    this.torso.position.set(0, 0.1, 0);

    // Sculpted chest & waist taper
    const torsoGeo = new THREE.CylinderGeometry(shoulderWidth * 0.5, waistWidth * 0.5, torsoHeight, 10);
    torsoGeo.translate(0, torsoHeight * 0.5, 0);
    const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.torso.add(torsoMesh);

    // Overalls details (if overalls style)
    if (this.customization.pantsStyle === 'overalls_dungaree') {
      const bibGeo = new THREE.BoxGeometry(waistWidth * 0.75, 0.26, 0.03);
      const bib = new THREE.Mesh(bibGeo, pantsMat);
      bib.position.set(0, 0.22, waistWidth * 0.26);
      this.torso.add(bib);

      // Brass buttons on straps
      [-0.1, 0.1].forEach((bx) => {
        const btnGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8);
        const btn = new THREE.Mesh(btnGeo, buckleMat);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(bx, 0.32, waistWidth * 0.27);
        this.torso.add(btn);
      });
    }

    // Shirt collar lapels
    const collarGeo = new THREE.BoxGeometry(shoulderWidth * 0.45, 0.06, 0.18);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.position.set(0, torsoHeight + 0.02, 0);
    this.torso.add(collar);

    // 3. Neck & Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, torsoHeight + 0.05, 0);

    // Slender contoured neck
    const neckGeo = new THREE.CylinderGeometry(0.065, isFemale ? 0.075 : 0.085, 0.12, 10);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.set(0, 0.06, 0);
    this.headGroup.add(neck);

    // Stylized friendly sculpted head (smooth jaw and cheeks)
    const headGeo = new THREE.SphereGeometry(0.16, 16, 14);
    headGeo.scale(1.0, 1.18, 1.05);
    headGeo.translate(0, 0.24, 0.01);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Cute stylized nose
    const noseGeo = new THREE.ConeGeometry(0.026, 0.05, 6);
    noseGeo.rotateX(Math.PI * 0.45);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.23, 0.17);
    this.headGroup.add(nose);

    // Expressive stylized eyes (with specular catchlight)
    const eyeTex = createEyeTexture(this.customization.hairColor === '#140f0c' ? '#22150d' : '#4a2f18');
    const eyeMat = new THREE.MeshBasicMaterial({ map: eyeTex });

    const eyeGeo = new THREE.SphereGeometry(0.032, 10, 8);
    eyeGeo.scale(1.0, 0.95, 0.4);

    // Left eye
    this.leftEyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEyeMesh.position.set(-0.06, 0.26, 0.155);
    this.leftEyeMesh.rotation.y = -0.15;
    this.headGroup.add(this.leftEyeMesh);

    // Right eye
    this.rightEyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEyeMesh.position.set(0.06, 0.26, 0.155);
    this.rightEyeMesh.rotation.y = 0.15;
    this.headGroup.add(this.rightEyeMesh);

    // Curved friendly eyebrows
    const browMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(this.customization.hairColor), roughness: 0.8 });
    [-0.06, 0.06].forEach((bx, i) => {
      const browGeo = new THREE.BoxGeometry(0.05, 0.012, 0.02);
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(bx, 0.30, 0.165);
      brow.rotation.z = (i === 0 ? 0.08 : -0.08);
      this.headGroup.add(brow);
    });

    // Friendly smiling mouth (curved arc)
    const mouthGeo = new THREE.TorusGeometry(0.032, 0.007, 6, 12, Math.PI * 0.8);
    const mouthMat = new THREE.MeshBasicMaterial({ color: isFemale ? 0xb5434d : 0x7a362f });
    this.mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    this.mouthMesh.position.set(0, 0.18, 0.16);
    this.mouthMesh.rotation.x = -Math.PI * 0.45;
    this.mouthMesh.rotation.z = Math.PI * 0.9;
    this.headGroup.add(this.mouthMesh);

    // Rosy friendly cheeks
    const cheekMat = new THREE.MeshBasicMaterial({
      color: 0xeb7b70,
      transparent: true,
      opacity: isFemale ? 0.45 : 0.25,
      depthWrite: false,
    });
    [-0.09, 0.09].forEach((cx) => {
      const cheekGeo = new THREE.CircleGeometry(0.024, 10);
      const cheek = new THREE.Mesh(cheekGeo, cheekMat);
      cheek.position.set(cx, 0.22, 0.152);
      cheek.rotation.y = cx > 0 ? 0.35 : -0.35;
      this.headGroup.add(cheek);
    });

    // Ears
    const earGeo = new THREE.SphereGeometry(0.032, 8, 6);
    earGeo.scale(0.5, 1.2, 0.7);
    [-0.16, 0.16].forEach((ex) => {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(ex, 0.24, 0);
      this.headGroup.add(ear);
    });

    // 4. Hairstyles in 3D
    this.buildHairstyle(hairMat);

    // 5. Hats
    this.buildHat();

    this.torso.add(this.headGroup);

    // 6. Arms & Sculpted Hands
    // Left Arm
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-shoulderWidth * 0.52, torsoHeight - 0.04, 0);

    const upperArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.28, 8);
    upperArmGeo.translate(0, -0.14, 0);
    const lUpper = new THREE.Mesh(upperArmGeo, shirtMat);
    lUpper.castShadow = true;
    this.leftArmGroup.add(lUpper);

    this.leftForearmGroup = new THREE.Group();
    this.leftForearmGroup.position.set(0, -0.28, 0);

    const forearmGeo = new THREE.CylinderGeometry(0.052, 0.044, 0.26, 8);
    forearmGeo.translate(0, -0.13, 0);
    const lForearm = new THREE.Mesh(forearmGeo, skinMat);
    lForearm.castShadow = true;
    this.leftForearmGroup.add(lForearm);

    // Left Hand (Palm + Thumb + Fingers)
    const lHand = this.createHandMesh(skinMat, true);
    lHand.position.set(0, -0.26, 0);
    this.leftForearmGroup.add(lHand);

    this.leftArmGroup.add(this.leftForearmGroup);
    this.torso.add(this.leftArmGroup);

    // Right Arm
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(shoulderWidth * 0.52, torsoHeight - 0.04, 0);

    const rUpper = new THREE.Mesh(upperArmGeo, shirtMat);
    rUpper.castShadow = true;
    this.rightArmGroup.add(rUpper);

    this.rightForearmGroup = new THREE.Group();
    this.rightForearmGroup.position.set(0, -0.28, 0);

    const rForearm = new THREE.Mesh(forearmGeo, skinMat);
    rForearm.castShadow = true;
    this.rightForearmGroup.add(rForearm);

    // Right Hand
    const rHand = this.createHandMesh(skinMat, false);
    rHand.position.set(0, -0.26, 0);
    this.rightForearmGroup.add(rHand);

    this.rightArmGroup.add(this.rightForearmGroup);
    this.torso.add(this.rightArmGroup);

    this.hips.add(this.torso);

    // 7. Legs & Boots
    const legSpacing = hipWidth * 0.28;

    // Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-legSpacing, -0.06, 0);

    const thighGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.42, 8);
    thighGeo.translate(0, -0.21, 0);
    const lThigh = new THREE.Mesh(thighGeo, pantsMat);
    lThigh.castShadow = true;
    this.leftLegGroup.add(lThigh);

    this.leftCalfGroup = new THREE.Group();
    this.leftCalfGroup.position.set(0, -0.42, 0);

    const calfGeo = new THREE.CylinderGeometry(0.075, 0.062, 0.38, 8);
    calfGeo.translate(0, -0.19, 0);
    const lCalf = new THREE.Mesh(calfGeo, pantsMat);
    lCalf.castShadow = true;
    this.leftCalfGroup.add(lCalf);

    const lBoot = this.createBootMesh(bootMat, bootSoleMat);
    lBoot.position.set(0, -0.38, 0);
    this.leftCalfGroup.add(lBoot);

    this.leftLegGroup.add(this.leftCalfGroup);
    this.hips.add(this.leftLegGroup);

    // Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(legSpacing, -0.06, 0);

    const rThigh = new THREE.Mesh(thighGeo, pantsMat);
    rThigh.castShadow = true;
    this.rightLegGroup.add(rThigh);

    this.rightCalfGroup = new THREE.Group();
    this.rightCalfGroup.position.set(0, -0.42, 0);

    const rCalf = new THREE.Mesh(calfGeo, pantsMat);
    rCalf.castShadow = true;
    this.rightCalfGroup.add(rCalf);

    const rBoot = this.createBootMesh(bootMat, bootSoleMat);
    rBoot.position.set(0, -0.38, 0);
    this.rightCalfGroup.add(rBoot);

    this.rightLegGroup.add(this.rightCalfGroup);
    this.hips.add(this.rightLegGroup);

    this.group.add(this.hips);
  }

  /**
   * Sculpted hand with palm, distinct thumb and fingers
   */
  private createHandMesh(skinMat: THREE.Material, isLeft: boolean): THREE.Group {
    const handGroup = new THREE.Group();

    // Palm
    const palmGeo = new THREE.BoxGeometry(0.065, 0.075, 0.035);
    palmGeo.translate(0, -0.035, 0);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.castShadow = true;
    handGroup.add(palm);

    // Thumb
    const thumbGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.045, 6);
    thumbGeo.translate(0, -0.022, 0);
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    const side = isLeft ? 1 : -1;
    thumb.position.set(side * 0.038, -0.025, 0.015);
    thumb.rotation.z = side * -0.55;
    thumb.rotation.x = 0.2;
    handGroup.add(thumb);

    // 4 fingers sculpted as an articulated forward group
    const fingerGeo = new THREE.BoxGeometry(0.055, 0.045, 0.025);
    fingerGeo.translate(0, -0.02, 0);
    const fingers = new THREE.Mesh(fingerGeo, skinMat);
    fingers.position.set(0, -0.075, 0);
    handGroup.add(fingers);

    return handGroup;
  }

  /**
   * Rugged leather farm boots with sole, heel and turn-down cuff
   */
  private createBootMesh(bootMat: THREE.Material, soleMat: THREE.Material): THREE.Group {
    const bootGroup = new THREE.Group();

    // Boot upper shaft
    const shaftGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.12, 8);
    const shaft = new THREE.Mesh(shaftGeo, bootMat);
    shaft.position.set(0, 0.05, 0);
    shaft.castShadow = true;
    bootGroup.add(shaft);

    // Boot foot
    const footGeo = new THREE.BoxGeometry(0.12, 0.11, 0.24);
    footGeo.translate(0, 0, 0.05);
    const foot = new THREE.Mesh(footGeo, bootMat);
    foot.castShadow = true;
    bootGroup.add(foot);

    // Rugged rubber sole
    const soleGeo = new THREE.BoxGeometry(0.13, 0.03, 0.26);
    soleGeo.translate(0, -0.06, 0.05);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.receiveShadow = true;
    bootGroup.add(sole);

    // Raised heel
    const heelGeo = new THREE.BoxGeometry(0.12, 0.04, 0.08);
    heelGeo.translate(0, -0.06, -0.05);
    const heel = new THREE.Mesh(heelGeo, soleMat);
    bootGroup.add(heel);

    return bootGroup;
  }

  /**
   * 3D Hairstyles
   */
  private buildHairstyle(hairMat: THREE.Material): void {
    const style = this.customization.hairStyle;

    if (style === 'short_part') {
      // Side part with styled crown volume
      const capGeo = new THREE.SphereGeometry(0.175, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, 0.25, 0.01);
      this.headGroup.add(cap);

      // Side part ridge
      const partGeo = new THREE.BoxGeometry(0.08, 0.05, 0.2);
      const part = new THREE.Mesh(partGeo, hairMat);
      part.position.set(-0.06, 0.38, 0.02);
      part.rotation.z = 0.2;
      this.headGroup.add(part);
    } else if (style === 'long_wavy') {
      // Voluminous crown
      const capGeo = new THREE.SphereGeometry(0.18, 12, 10);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, 0.26, 0);
      this.headGroup.add(cap);

      // Left & right wavy locks flowing past shoulders
      [-0.14, 0.14].forEach((lx) => {
        const lockGeo = new THREE.CylinderGeometry(0.04, 0.025, 0.38, 6);
        lockGeo.translate(0, -0.19, 0);
        const lock = new THREE.Mesh(lockGeo, hairMat);
        lock.position.set(lx, 0.24, 0.06);
        lock.rotation.z = lx > 0 ? -0.2 : 0.2;
        this.headGroup.add(lock);
      });

      // Back flowing locks
      const backGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.42, 8);
      backGeo.translate(0, -0.21, 0);
      const backLock = new THREE.Mesh(backGeo, hairMat);
      backLock.position.set(0, 0.22, -0.09);
      this.headGroup.add(backLock);
    } else if (style === 'braids') {
      // Two farm pigtail braids with cute ribbons
      const capGeo = new THREE.SphereGeometry(0.175, 12, 10);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, 0.25, 0);
      this.headGroup.add(cap);

      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xd63031 });

      [-0.13, 0.13].forEach((bx) => {
        const braidGroup = new THREE.Group();
        braidGroup.position.set(bx, 0.22, 0.04);

        // Braid segments (3 spherical links)
        for (let s = 0; s < 4; s++) {
          const segGeo = new THREE.SphereGeometry(0.03 - s * 0.004, 8, 6);
          segGeo.scale(0.8, 1.3, 0.8);
          const seg = new THREE.Mesh(segGeo, hairMat);
          seg.position.set(0, -s * 0.07, 0);
          braidGroup.add(seg);
        }

        // Ribbon bow
        const bowGeo = new THREE.BoxGeometry(0.06, 0.025, 0.03);
        const bow = new THREE.Mesh(bowGeo, ribbonMat);
        bow.position.set(0, -0.26, 0.01);
        braidGroup.add(bow);

        this.headGroup.add(braidGroup);
      });
    } else if (style === 'rustic_bun') {
      // High bun + textured base
      const capGeo = new THREE.SphereGeometry(0.175, 12, 10);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, 0.25, 0);
      this.headGroup.add(cap);

      const bunGeo = new THREE.SphereGeometry(0.08, 10, 8);
      bunGeo.scale(1.2, 0.8, 1.1);
      const bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, 0.40, -0.08);
      this.headGroup.add(bun);
    } else {
      // 'curly_afro': sculpted curly volume
      const afroGeo = new THREE.SphereGeometry(0.21, 14, 12);
      afroGeo.scale(1.05, 1.12, 1.05);
      const afro = new THREE.Mesh(afroGeo, hairMat);
      afro.position.set(0, 0.27, 0.01);
      this.headGroup.add(afro);

      // Extra curl details on periphery
      for (let c = 0; c < 8; c++) {
        const angle = (c / 8) * Math.PI * 2;
        const curlGeo = new THREE.SphereGeometry(0.06, 8, 6);
        const curl = new THREE.Mesh(curlGeo, hairMat);
        curl.position.set(Math.cos(angle) * 0.17, 0.32, Math.sin(angle) * 0.17);
        this.headGroup.add(curl);
      }
    }
  }

  /**
   * Hats (Straw hat, rural cap, country fedora)
   */
  private buildHat(): void {
    if (this.customization.hatType === 'none') return;

    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.36, 0);

    if (this.customization.hatType === 'straw') {
      const strawMat = new THREE.MeshStandardMaterial({
        color: 0xdeb86a, // Warm rural straw
        roughness: 0.88,
      });

      // Wide circular brim with slight organic curve
      const brimGeo = new THREE.CylinderGeometry(0.40, 0.44, 0.035, 18);
      const brim = new THREE.Mesh(brimGeo, strawMat);
      hatGroup.add(brim);

      // Crown
      const crownGeo = new THREE.CylinderGeometry(0.18, 0.21, 0.16, 14);
      crownGeo.translate(0, 0.08, 0);
      const crown = new THREE.Mesh(crownGeo, strawMat);
      crown.castShadow = true;
      hatGroup.add(crown);

      // Red fabric ribbon
      const ribbonGeo = new THREE.CylinderGeometry(0.215, 0.215, 0.035, 14);
      ribbonGeo.translate(0, 0.03, 0);
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.6 });
      const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
      hatGroup.add(ribbon);
    } else if (this.customization.hatType === 'cap') {
      const capMat = new THREE.MeshStandardMaterial({ color: 0x243242, roughness: 0.75 });
      const domeGeo = new THREE.SphereGeometry(0.185, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
      const dome = new THREE.Mesh(domeGeo, capMat);
      hatGroup.add(dome);

      // Curved visor
      const visorGeo = new THREE.BoxGeometry(0.24, 0.025, 0.16);
      visorGeo.translate(0, 0, 0.18);
      visorGeo.rotateX(0.12);
      const visor = new THREE.Mesh(visorGeo, capMat);
      hatGroup.add(visor);
    } else if (this.customization.hatType === 'country_fedora') {
      const feltMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8 });
      const brimGeo = new THREE.CylinderGeometry(0.36, 0.38, 0.03, 16);
      const brim = new THREE.Mesh(brimGeo, feltMat);
      hatGroup.add(brim);

      const crownGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.18, 12);
      crownGeo.translate(0, 0.09, 0);
      const crown = new THREE.Mesh(crownGeo, feltMat);
      crown.castShadow = true;
      hatGroup.add(crown);

      const bandGeo = new THREE.CylinderGeometry(0.195, 0.195, 0.035, 12);
      bandGeo.translate(0, 0.035, 0);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x1a110a, roughness: 0.5 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      hatGroup.add(band);
    }

    this.headGroup.add(hatGroup);
  }

  /**
   * Floating 3D billboard speech bubble above avatar
   */
  private buildSpeechBubble(): void {
    const bubbleGeo = new THREE.PlaneGeometry(2.4, 0.6);
    const bubbleMat = new THREE.MeshBasicMaterial({
      map: this.speechTexture,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.speechBubbleMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
    this.speechBubbleMesh.position.set(0, 2.35, 0);
    this.speechBubbleMesh.visible = false;
    this.group.add(this.speechBubbleMesh);
  }

  public showMessage(text: string): void {
    const ctx = this.speechCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 128);

    // Rounded speech bubble background
    ctx.fillStyle = 'rgba(20, 16, 12, 0.92)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 90, 16);
    ctx.fill();
    ctx.stroke();

    // Bubble pointer tail
    ctx.beginPath();
    ctx.moveTo(246, 100);
    ctx.lineTo(256, 120);
    ctx.lineTo(266, 100);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#fff8ee';
    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const truncated = text.length > 36 ? text.substring(0, 34) + '...' : text;
    ctx.fillText(truncated, 256, 55);

    this.speechTexture.needsUpdate = true;
    if (this.speechBubbleMesh) {
      this.speechBubbleMesh.visible = true;
    }

    if (this.speechTimeout) window.clearTimeout(this.speechTimeout);
    this.speechTimeout = window.setTimeout(() => {
      if (this.speechBubbleMesh) {
        this.speechBubbleMesh.visible = false;
      }
    }, 4500);

    soundEngine.playInteractionTone('message');
  }

  public updateCustomization(customization: PlayerCustomization): void {
    this.customization = customization;
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.buildCharacterMesh();
    this.buildSpeechBubble();
  }

  public setAction(action: AvatarAction): void {
    if (this.action === action) return;
    this.action = action;

    if (action === 'sit') {
      this.isSitting = true;
      soundEngine.playInteractionTone('sit');
    } else if (this.isSitting) {
      this.isSitting = false;
      soundEngine.playInteractionTone('stand');
    } else if (action === 'celebrate') {
      soundEngine.playInteractionTone('celebrate');
    } else if (action === 'talk') {
      soundEngine.playInteractionTone('talk');
    }
  }

  public update(delta: number, isMoving: boolean, isSprinting: boolean, cameraObj?: THREE.Camera): void {
    this.animTime += delta;

    // Face speech bubble toward active camera
    if (this.speechBubbleMesh && this.speechBubbleMesh.visible && cameraObj) {
      this.speechBubbleMesh.quaternion.copy(cameraObj.quaternion);
    }

    // Natural eye blinking animation
    this.blinkTimer += delta;
    if (!this.isBlinking && this.blinkTimer > 3.2 + Math.random() * 2) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      if (this.leftEyeMesh && this.rightEyeMesh) {
        this.leftEyeMesh.scale.y = 0.1;
        this.rightEyeMesh.scale.y = 0.1;
      }
    } else if (this.isBlinking && this.blinkTimer > 0.14) {
      this.isBlinking = false;
      this.blinkTimer = 0;
      if (this.leftEyeMesh && this.rightEyeMesh) {
        this.leftEyeMesh.scale.y = 0.95;
        this.rightEyeMesh.scale.y = 0.95;
      }
    }

    // Determine target sit transition: 0 = standing, 1 = seated
    const targetSit = this.isSitting ? 1.0 : 0.0;
    this.sitTransition = THREE.MathUtils.damp(this.sitTransition, targetSit, 7, delta);

    if (this.sitTransition > 0.01) {
      // Lower hips towards bench height (~0.52m)
      this.hips.position.y = THREE.MathUtils.lerp(0.94, 0.52, this.sitTransition);

      // Thighs bend forward 90 degrees
      const thighAngle = -Math.PI * 0.48 * this.sitTransition;
      this.leftLegGroup.rotation.x = thighAngle;
      this.rightLegGroup.rotation.x = thighAngle;

      // Calves drop vertically downward
      const calfAngle = Math.PI * 0.5 * this.sitTransition;
      this.leftCalfGroup.rotation.x = calfAngle;
      this.rightCalfGroup.rotation.x = calfAngle;

      this.leftLegGroup.rotation.z = 0;
      this.rightLegGroup.rotation.z = 0;
    } else {
      this.hips.position.y = 0.94;
    }

    if (this.isSitting) {
      if (this.action === 'warmHands') {
        // Extend both arms toward fire with relaxed warm palms
        this.leftArmGroup.rotation.x = -Math.PI * 0.42;
        this.leftArmGroup.rotation.z = 0.22;
        this.rightArmGroup.rotation.x = -Math.PI * 0.42;
        this.rightArmGroup.rotation.z = -0.22;
        this.leftForearmGroup.rotation.x = -0.15;
        this.rightForearmGroup.rotation.x = -0.15;
      } else if (this.action === 'talk') {
        // Expressive conversational gestures while seated
        const tWave = Math.sin(this.animTime * 4.5);
        this.leftArmGroup.rotation.x = -Math.PI * 0.32 + tWave * 0.08;
        this.leftArmGroup.rotation.z = 0.18;
        this.rightArmGroup.rotation.x = -Math.PI * 0.36 - tWave * 0.12;
        this.rightArmGroup.rotation.z = -0.22;
        this.headGroup.rotation.y = Math.sin(this.animTime * 2.5) * 0.15;
        this.headGroup.rotation.x = Math.sin(this.animTime * 4) * 0.08;
      } else {
        // Peaceful resting pose with hands on thighs
        this.leftArmGroup.rotation.x = -Math.PI * 0.28;
        this.leftArmGroup.rotation.z = 0.12;
        this.rightArmGroup.rotation.x = -Math.PI * 0.28;
        this.rightArmGroup.rotation.z = -0.12;
        this.leftForearmGroup.rotation.x = 0;
        this.rightForearmGroup.rotation.x = 0;
        this.headGroup.rotation.set(0, 0, 0);
      }
      return;
    }

    // Standing / Walking / Running
    if (isMoving) {
      const paceSpeed = isSprinting ? 14 : 9;
      const legSwingAmp = isSprinting ? 0.72 : 0.50;
      const armSwingAmp = isSprinting ? 0.68 : 0.46;

      // Pendulum leg swing with hip counter-rotation
      this.leftLegGroup.rotation.x = Math.sin(this.animTime * paceSpeed) * legSwingAmp;
      this.rightLegGroup.rotation.x = -Math.sin(this.animTime * paceSpeed) * legSwingAmp;

      // Natural knee bend on backswing
      this.leftCalfGroup.rotation.x = Math.max(0, -Math.sin(this.animTime * paceSpeed) * 0.65);
      this.rightCalfGroup.rotation.x = Math.max(0, Math.sin(this.animTime * paceSpeed) * 0.65);

      // Natural elbow flexion
      this.leftForearmGroup.rotation.x = -0.25 + Math.abs(Math.sin(this.animTime * paceSpeed)) * 0.2;
      this.rightForearmGroup.rotation.x = -0.25 + Math.abs(Math.sin(this.animTime * paceSpeed)) * 0.2;

      // Opposing arm swings
      this.leftArmGroup.rotation.x = -Math.sin(this.animTime * paceSpeed) * armSwingAmp;
      this.rightArmGroup.rotation.x = Math.sin(this.animTime * paceSpeed) * armSwingAmp;

      // Dynamic forward lean
      this.torso.rotation.x = isSprinting ? 0.16 : 0.04;
      this.torso.rotation.y = Math.sin(this.animTime * paceSpeed) * 0.08;

      // Vertical bounce
      this.hips.position.y = 0.94 + Math.abs(Math.sin(this.animTime * paceSpeed)) * (isSprinting ? 0.06 : 0.03);

      // Footstep audio rhythm
      this.footstepTimer += delta * paceSpeed;
      if (this.footstepTimer > Math.PI) {
        this.footstepTimer = 0;
        soundEngine.playFootstep(isSprinting);
      }
    } else {
      // Idle breathing and emotes
      const breath = Math.sin(this.animTime * 2.0) * 0.02;
      this.hips.position.y = 0.94 + breath;
      this.torso.rotation.x = breath * 0.6;
      this.torso.rotation.y = 0;

      if (this.action === 'celebrate') {
        // Joyously throwing both hands up into the air with cheer!
        const cheerWave = Math.sin(this.animTime * 8);
        this.leftArmGroup.rotation.x = -Math.PI * 0.88;
        this.leftArmGroup.rotation.z = 0.45 + cheerWave * 0.1;
        this.rightArmGroup.rotation.x = -Math.PI * 0.88;
        this.rightArmGroup.rotation.z = -0.45 - cheerWave * 0.1;
        this.leftForearmGroup.rotation.x = -0.3;
        this.rightForearmGroup.rotation.x = -0.3;

        // Joyous hop
        this.hips.position.y = 0.94 + Math.abs(Math.sin(this.animTime * 6)) * 0.12;
        this.headGroup.rotation.x = -0.2;
      } else if (this.action === 'talk') {
        // Conversational hand gestures and nodding
        const tWave = Math.sin(this.animTime * 5.0);
        this.leftArmGroup.rotation.x = -Math.PI * 0.35 + tWave * 0.15;
        this.leftArmGroup.rotation.z = 0.25;
        this.rightArmGroup.rotation.x = -Math.PI * 0.42 - tWave * 0.18;
        this.rightArmGroup.rotation.z = -0.28;
        this.leftForearmGroup.rotation.x = -0.4;
        this.rightForearmGroup.rotation.x = -0.4;

        this.headGroup.rotation.y = Math.sin(this.animTime * 2.5) * 0.18;
        this.headGroup.rotation.x = Math.sin(this.animTime * 4.5) * 0.1;
      } else if (this.action === 'wave') {
        // Friendly wave with right arm
        this.rightArmGroup.rotation.x = -Math.PI * 0.82;
        this.rightArmGroup.rotation.z = Math.sin(this.animTime * 6) * 0.3 + 0.25;
        this.rightForearmGroup.rotation.x = -0.2;
        this.leftArmGroup.rotation.x = 0;
        this.leftArmGroup.rotation.z = 0.06;
        this.leftForearmGroup.rotation.x = 0;
        this.headGroup.rotation.y = 0.1;
      } else if (this.action === 'warmHands') {
        // Warm hands pose
        this.leftArmGroup.rotation.x = -Math.PI * 0.45;
        this.leftArmGroup.rotation.z = 0.22;
        this.rightArmGroup.rotation.x = -Math.PI * 0.45;
        this.rightArmGroup.rotation.z = -0.22;
        this.leftForearmGroup.rotation.x = -0.2;
        this.rightForearmGroup.rotation.x = -0.2;
        this.headGroup.rotation.x = 0.12;
      } else {
        // Natural resting arms
        this.leftArmGroup.rotation.x = Math.sin(this.animTime * 0.8) * 0.04;
        this.leftArmGroup.rotation.z = 0.08;
        this.rightArmGroup.rotation.x = -Math.sin(this.animTime * 0.8) * 0.04;
        this.rightArmGroup.rotation.z = -0.08;
        this.leftForearmGroup.rotation.x = 0;
        this.rightForearmGroup.rotation.x = 0;
        this.headGroup.rotation.set(0, 0, 0);
      }

      this.leftLegGroup.rotation.set(0, 0, 0);
      this.rightLegGroup.rotation.set(0, 0, 0);
      this.leftCalfGroup.rotation.set(0, 0, 0);
      this.rightCalfGroup.rotation.set(0, 0, 0);
    }
  }
}
