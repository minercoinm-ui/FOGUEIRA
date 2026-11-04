import * as THREE from 'three';

/**
 * Creates high-detail procedural canvas textures with SRGB color space and repeat modes.
 */

// Cached textures
const textureCache = new Map<string, THREE.CanvasTexture>();

export function createGrassDirtTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'grass_dirt';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base earth
  ctx.fillStyle = '#1c2817';
  ctx.fillRect(0, 0, 512, 512);

  // Layer fine dirt / grass speckling
  for (let i = 0; i < 28000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2.5 + 0.5;
    const shade = Math.random();

    if (shade < 0.45) {
      // Dark earth
      ctx.fillStyle = `rgba(18, 22, 14, ${0.4 + Math.random() * 0.4})`;
    } else if (shade < 0.85) {
      // Muted pine/night grass green
      ctx.fillStyle = `rgba(${32 + Math.random() * 25}, ${48 + Math.random() * 35}, ${22 + Math.random() * 20}, ${0.4 + Math.random() * 0.4})`;
    } else {
      // Earthy moss / dry straw
      ctx.fillStyle = `rgba(62, 58, 30, ${0.3 + Math.random() * 0.3})`;
    }

    ctx.fillRect(x, y, size, size);
  }

  // Soft patches of darker moisture
  for (let i = 0; i < 40; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const rad = 20 + Math.random() * 60;
    const grad = ctx.createRadialGradient(px, py, 2, px, py, rad);
    grad.addColorStop(0, 'rgba(12, 16, 10, 0.45)');
    grad.addColorStop(1, 'rgba(12, 16, 10, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  textureCache.set(key, texture);
  return texture;
}

export function createDirtPathTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'dirt_path';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm clay / dirt base
  ctx.fillStyle = '#423323';
  ctx.fillRect(0, 0, 512, 512);

  // Dirt grains
  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 2.2 + 0.4;
    const r = 50 + Math.floor(Math.random() * 45);
    const g = 38 + Math.floor(Math.random() * 35);
    const b = 24 + Math.floor(Math.random() * 22);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, size, size);
  }

  // Subtle cart wheel / foot tracks along vertical
  ctx.fillStyle = 'rgba(28, 20, 12, 0.22)';
  ctx.fillRect(90, 0, 45, 512);
  ctx.fillRect(360, 0, 45, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  textureCache.set(key, texture);
  return texture;
}

export function createWoodPlankTexture(maxAnisotropy = 4, isRedBarn = false): THREE.CanvasTexture {
  const key = isRedBarn ? 'wood_red_barn' : 'wood_natural';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base wood color
  ctx.fillStyle = isRedBarn ? '#4d201a' : '#453526';
  ctx.fillRect(0, 0, 512, 512);

  const plankHeight = 64;
  for (let y = 0; y < 512; y += plankHeight) {
    // Plank horizontal grain lines
    for (let i = 0; i < 60; i++) {
      const ly = y + Math.random() * (plankHeight - 4) + 2;
      const alpha = 0.05 + Math.random() * 0.12;
      ctx.fillStyle = isRedBarn
        ? (Math.random() < 0.5 ? `rgba(90, 30, 25, ${alpha})` : `rgba(30, 10, 8, ${alpha})`)
        : (Math.random() < 0.5 ? `rgba(95, 75, 55, ${alpha})` : `rgba(25, 18, 12, ${alpha})`);
      ctx.fillRect(0, ly, 512, Math.random() * 2.5 + 0.8);
    }

    // Groove between planks
    ctx.fillStyle = 'rgba(12, 8, 5, 0.75)';
    ctx.fillRect(0, y, 512, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(0, y + 3, 512, 1);

    // Nail marks
    ctx.fillStyle = '#1c1510';
    ctx.beginPath();
    ctx.arc(32, y + 32, 2.8, 0, Math.PI * 2);
    ctx.arc(480, y + 32, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  textureCache.set(key, texture);
  return texture;
}

export function createTileRoofTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'tile_roof';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Terracotta red / clay base
  ctx.fillStyle = '#6e3020';
  ctx.fillRect(0, 0, 512, 512);

  const tileW = 40;
  const tileH = 64;

  for (let y = 0; y < 512; y += tileH) {
    for (let x = 0; x < 512; x += tileW) {
      const offsetX = (Math.floor(y / tileH) % 2 === 0) ? 0 : tileW / 2;
      const actualX = (x + offsetX) % 512;

      // Curved shadow & highlight on each tile
      const grad = ctx.createLinearGradient(actualX, y, actualX + tileW, y);
      grad.addColorStop(0, 'rgba(35, 15, 10, 0.7)');
      grad.addColorStop(0.3, 'rgba(145, 65, 45, 0.35)');
      grad.addColorStop(0.7, 'rgba(165, 80, 55, 0.45)');
      grad.addColorStop(1, 'rgba(25, 10, 5, 0.8)');

      ctx.fillStyle = grad;
      ctx.fillRect(actualX, y, tileW, tileH);

      // Bottom overlap shadow
      ctx.fillStyle = 'rgba(15, 6, 4, 0.6)';
      ctx.fillRect(actualX, y + tileH - 4, tileW, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  textureCache.set(key, texture);
  return texture;
}

export function createStoneCobbleTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const key = 'stone_cobble';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Mortar
  ctx.fillStyle = '#2b2a27';
  ctx.fillRect(0, 0, 512, 512);

  // Cobblestones
  const rows = 12;
  const cols = 12;
  const rw = 512 / cols;
  const rh = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * rw + 3 + (Math.random() * 4 - 2);
      const y = r * rh + 3 + (Math.random() * 4 - 2);
      const w = rw - 6;
      const h = rh - 6;

      const stoneVal = 55 + Math.floor(Math.random() * 45);
      ctx.fillStyle = `rgb(${stoneVal + 5}, ${stoneVal}, ${stoneVal - 5})`;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      // Stone texture details
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(x + 2, y + h - 5, w - 4, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x + 4, y + 2, w - 8, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Starry twilight skybox dome texture
 */
export function createStarrySkyTexture(): THREE.CanvasTexture {
  const key = 'starry_sky';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Gradient: deep pitch black / navy zenith down to dark warm dusk horizon
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#03050c'); // Deep zenith
  grad.addColorStop(0.4, '#090d1f'); // Mid night sky
  grad.addColorStop(0.75, '#12122b'); // Night atmosphere
  grad.addColorStop(0.92, '#211728'); // Distant twilight indigo
  grad.addColorStop(1.0, '#381c1c'); // Horizon warm campfire haze
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Milky way nebula band
  const nebulaGrad = ctx.createRadialGradient(512, 180, 20, 512, 180, 260);
  nebulaGrad.addColorStop(0, 'rgba(80, 95, 150, 0.12)');
  nebulaGrad.addColorStop(0.5, 'rgba(100, 70, 120, 0.08)');
  nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebulaGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // Twinkling stars
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 1024;
    // Concentrate stars more towards upper dome
    const y = Math.pow(Math.random(), 1.4) * 440;
    const r = Math.random() * 1.5 + 0.3;
    const brightness = Math.random() * 0.8 + 0.2;

    // Slight tint variations (blue-white, gold-white, soft pink)
    const tint = Math.random();
    if (tint < 0.6) {
      ctx.fillStyle = `rgba(235, 245, 255, ${brightness})`;
    } else if (tint < 0.85) {
      ctx.fillStyle = `rgba(255, 240, 210, ${brightness})`;
    } else {
      ctx.fillStyle = `rgba(200, 220, 255, ${brightness})`;
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Occasional bright star with cross sparkle
    if (r > 1.4 && Math.random() < 0.15) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.7})`;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    }
  }

  // Realistic Crescent Moon
  const moonX = 760;
  const moonY = 110;
  const moonRadius = 26;

  // Moon soft ambient glow halo
  const moonHalo = ctx.createRadialGradient(moonX, moonY, moonRadius, moonX, moonY, moonRadius * 4.5);
  moonHalo.addColorStop(0, 'rgba(240, 245, 255, 0.25)');
  moonHalo.addColorStop(0.4, 'rgba(180, 200, 240, 0.08)');
  moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = moonHalo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius * 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Moon body
  ctx.fillStyle = '#f8f9fe';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  ctx.fill();

  // Crescent cutout
  ctx.fillStyle = '#090e22';
  ctx.beginPath();
  ctx.arc(moonX + 11, moonY - 3, moonRadius * 0.94, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural water normal map for dynamic lake ripples
 */
export function createWaterNormalMap(): THREE.CanvasTexture {
  const key = 'water_normal';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Fill with flat normal (128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 256, 256);

  // Soft wavy ripples
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 4) {
      const angle1 = (x / 256) * Math.PI * 8;
      const angle2 = (y / 256) * Math.PI * 8;
      const nx = Math.sin(angle1 + angle2) * 25 + 128;
      const ny = Math.cos(angle1 * 1.5 - angle2) * 25 + 128;

      ctx.fillStyle = `rgb(${Math.floor(nx)}, ${Math.floor(ny)}, 240)`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural eye texture with iris striations, pupil and lively catchlight
 */
export function createEyeTexture(irisColor = '#4a2f18'): THREE.CanvasTexture {
  const key = `eye_${irisColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // White sclera with soft shading at perimeter
  const scleraGrad = ctx.createRadialGradient(64, 64, 30, 64, 64, 62);
  scleraGrad.addColorStop(0, '#ffffff');
  scleraGrad.addColorStop(0.85, '#f0f3f6');
  scleraGrad.addColorStop(1, '#d8dee4');
  ctx.fillStyle = scleraGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  // Outer limbal ring
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.stroke();

  // Iris
  const irisGrad = ctx.createRadialGradient(64, 64, 10, 64, 64, 40);
  irisGrad.addColorStop(0, irisColor);
  irisGrad.addColorStop(0.7, irisColor);
  irisGrad.addColorStop(1, '#1a1410');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(64, 64, 39, 0, Math.PI * 2);
  ctx.fill();

  // Radial iris fibers
  ctx.lineWidth = 1;
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const r1 = 16 + Math.random() * 4;
    const r2 = 38;
    ctx.strokeStyle = Math.random() < 0.5 ? 'rgba(255, 230, 180, 0.4)' : 'rgba(20, 15, 10, 0.5)';
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(angle) * r1, 64 + Math.sin(angle) * r1);
    ctx.lineTo(64 + Math.cos(angle) * r2, 64 + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // Deep black pupil
  ctx.fillStyle = '#0a0808';
  ctx.beginPath();
  ctx.arc(64, 64, 16, 0, Math.PI * 2);
  ctx.fill();

  // Specular catchlight / gleam
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(54, 52, 6.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(74, 72, 3.2, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural fabrics for farm shirts, jackets, floral blouses and denim
 */
export function createFabricTexture(style: string, baseColor = '#b83a2b'): THREE.CanvasTexture {
  const key = `fabric_${style}_${baseColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  if (style === 'flannel_red' || style === 'flannel_blue') {
    // Classic rural plaid / xadrez
    const stripeColor1 = style === 'flannel_red' ? 'rgba(30, 15, 15, 0.75)' : 'rgba(15, 25, 45, 0.8)';
    const stripeColor2 = 'rgba(240, 230, 200, 0.6)';

    // Vertical thick stripes
    for (let x = 0; x < 256; x += 64) {
      ctx.fillStyle = stripeColor1;
      ctx.fillRect(x, 0, 24, 256);
      ctx.fillStyle = stripeColor2;
      ctx.fillRect(x + 28, 0, 4, 256);
    }
    // Horizontal thick stripes
    for (let y = 0; y < 256; y += 64) {
      ctx.fillStyle = stripeColor1;
      ctx.fillRect(0, y, 256, 24);
      ctx.fillStyle = stripeColor2;
      ctx.fillRect(0, y + 28, 256, 4);
    }
  } else if (style === 'floral_farm') {
    // Delicately scattered rural wildflowers and daisies
    for (let i = 0; i < 48; i++) {
      const cx = (i * 37) % 256;
      const cy = (i * 59) % 256;
      // Flower petals
      ctx.fillStyle = 'rgba(255, 248, 220, 0.85)';
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * 7, cy + Math.sin(angle) * 7, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center dot
      ctx.fillStyle = '#ffbb00';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'denim_vest' || style === 'jeans_classic' || style === 'jeans_dark' || style === 'overalls_dungaree') {
    // Diagonal twill weave + subtle washed texture
    for (let d = -256; d < 512; d += 4) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(d, 0);
      ctx.lineTo(d + 256, 256);
      ctx.stroke();
    }
    // Stitched yellow/gold seams
    ctx.strokeStyle = '#c89e38';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(32, 256);
    ctx.moveTo(224, 0);
    ctx.lineTo(224, 256);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Rustic linen / cotton weave
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2.5, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}
