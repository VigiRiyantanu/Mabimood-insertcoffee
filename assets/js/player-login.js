/* -------------------------------------------------------------
   1. 3D RETRO COFFEE CUP + FLOATING BEANS + STEAM
   ------------------------------------------------------------- */
(function initRetroCoffee3D() {
  const canvas = document.getElementById('coffee3dCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = 220;
  const height = 170;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const segs = 12;
  const rawVertices = [];
  const faces = [];

  // Ring 0: Top outer rim (radius 30, y = -14)
  const rTop = 30;
  const yTop = -14;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    rawVertices.push({ x: Math.cos(a) * rTop, y: yTop, z: Math.sin(a) * rTop });
  }

  // Ring 1: Bottom base (radius 20, y = 24)
  const rBot = 20;
  const yBot = 24;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    rawVertices.push({ x: Math.cos(a) * rBot, y: yBot, z: Math.sin(a) * rBot });
  }

  // Ring 2: Inner liquid coffee surface (radius 26, y = -8)
  const rLiq = 26;
  const yLiq = -8;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    rawVertices.push({ x: Math.cos(a) * rLiq, y: yLiq, z: Math.sin(a) * rLiq });
  }

  // Center liquid vertex
  const idxLiqCenter = rawVertices.length;
  rawVertices.push({ x: 0, y: yLiq, z: 0 });

  // Center bottom base vertex
  const idxBotCenter = rawVertices.length;
  rawVertices.push({ x: 0, y: yBot, z: 0 });

  // Ring 3: Saucer Coaster (radius 44, y = 28)
  const rSaucer = 44;
  const ySaucer = 28;
  const idxSaucerStart = rawVertices.length;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    rawVertices.push({ x: Math.cos(a) * rSaucer, y: ySaucer, z: Math.sin(a) * rSaucer });
  }

  // Outer Side Wall Faces
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    faces.push({ idx: [i, next, segs + next, segs + i], type: 'cup_wall' });
  }

  // Liquid Coffee Surface
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    faces.push({ idx: [2 * segs + i, 2 * segs + next, idxLiqCenter], type: 'coffee_surface' });
  }

  // Inner Lip Rim
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    faces.push({ idx: [i, 2 * segs + i, 2 * segs + next, next], type: 'cup_lip' });
  }

  // Saucer Plate
  for (let i = 0; i < segs; i++) {
    const next = (i + 1) % segs;
    faces.push({ idx: [segs + i, segs + next, idxSaucerStart + next, idxSaucerStart + i], type: 'saucer_plate' });
  }

  // Mug Handle
  const idxH1 = rawVertices.length;
  rawVertices.push({ x: 30, y: -6, z: 0 });
  const idxH2 = rawVertices.length;
  rawVertices.push({ x: 44, y: 0, z: 0 });
  const idxH3 = rawVertices.length;
  rawVertices.push({ x: 44, y: 14, z: 0 });
  const idxH4 = rawVertices.length;
  rawVertices.push({ x: 24, y: 18, z: 0 });
  faces.push({ idx: [idxH1, idxH2, idxH3, idxH4], type: 'handle' });

  // Floating Steam Particles
  const steamParticles = [
    { x: -6, y: -25, vy: 0.38, phase: 0 },
    { x: 3,  y: -35, vy: 0.42, phase: 2 },
    { x: -1, y: -45, vy: 0.35, phase: 4 },
    { x: 5,  y: -20, vy: 0.32, phase: 1.5 }
  ];

  // Floating Ambient Roasted Coffee Beans (6 drifting beans)
  const ambientBeans = [
    { x: -70, y: -20, z: 50,  vx: 0.12, vy: -0.15, rot: 0.2, vrot: 0.015, size: 4.5 },
    { x: 75,  y: 10,  z: -40, vx: -0.10, vy: -0.18, rot: 1.1, vrot: 0.02,  size: 3.8 },
    { x: -60, y: 45,  z: 20,  vx: 0.08, vy: -0.12, rot: 2.3, vrot: 0.01,  size: 3.2 },
    { x: 65,  y: -40, z: 80,  vx: -0.14, vy: -0.10, rot: 3.0, vrot: 0.018, size: 4.0 },
    { x: -80, y: -50, z: -20, vx: 0.06, vy: -0.14, rot: 0.7, vrot: 0.012, size: 3.0 },
    { x: 80,  y: 55,  z: 10,  vx: -0.09, vy: -0.16, rot: 1.8, vrot: 0.022, size: 3.5 }
  ];

  // Studio Keylight
  const lightDir = { x: 0.45, y: -0.65, z: 0.6 };
  const lLen = Math.hypot(lightDir.x, lightDir.y, lightDir.z);
  lightDir.x /= lLen;
  lightDir.y /= lLen;
  lightDir.z /= lLen;

  let rotX = 0.38;
  let rotY = 0.45;
  let targetRotX = 0.38;
  let targetRotY = 0.45;
  let autoTimer = 0;

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);

    targetRotY = 0.45 + dx * 1.35;
    targetRotX = 0.38 - dy * 0.85;
  }, { passive: true });

  function rotatePoint(p, rx, ry) {
    const y1 = p.y * Math.cos(rx) - p.z * Math.sin(rx);
    const z1 = p.y * Math.sin(rx) + p.z * Math.cos(rx);
    const x2 = p.x * Math.cos(ry) + z1 * Math.sin(ry);
    const z2 = -p.x * Math.sin(ry) + z1 * Math.cos(ry);
    return { x: x2, y: y1, z: z2 };
  }

  const fov = 320;
  const originX = width / 2;
  const originY = height / 2 + 10;

  function render() {
    ctx.clearRect(0, 0, width, height);

    autoTimer += 0.012;
    // Rhythmic organic bobbing
    const floatY = Math.sin(autoTimer * 1.8) * 4.5;
    const swayX = Math.cos(autoTimer * 1.2) * 2;

    rotX += (targetRotX - rotX) * 0.07;
    rotY += (targetRotY - rotY) * 0.07;

    const curX = rotX + Math.sin(autoTimer * 0.8) * 0.05;
    const curY = rotY + autoTimer * 0.38;

    // 1. Render Floating Ambient Coffee Beans in Background
    for (let i = 0; i < ambientBeans.length; i++) {
      const b = ambientBeans[i];
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.vrot;

      // Wrap
      if (b.y < -75) b.y = 80;
      if (b.x < -100) b.x = 100;
      if (b.x > 100) b.x = -100;

      const bp = rotatePoint(b, curX * 0.4, curY * 0.4);
      const bDepth = bp.z + fov;
      const bScale = fov / Math.max(bDepth, 1);
      const bx = originX + (bp.x) * bScale;
      const by = originY + (bp.y + floatY * 0.5) * bScale;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(b.rot);
      // Draw 3D coffee bean shape
      ctx.fillStyle = 'rgba(78, 48, 28, 0.45)';
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.size * bScale * 1.5, b.size * bScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Center bean crease
      ctx.strokeStyle = 'rgba(20, 14, 10, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-b.size * bScale * 1.1, 0);
      ctx.quadraticCurveTo(0, b.size * bScale * 0.3, b.size * bScale * 1.1, 0);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Project 3D Cup Vertices
    const projected = rawVertices.map(v => {
      const r = rotatePoint(v, curX, curY);
      const depth = r.z + fov;
      const scale = fov / Math.max(depth, 1);
      return {
        sx: originX + (r.x + swayX) * scale,
        sy: originY + (r.y + floatY) * scale,
        z: r.z,
        rx: r.x,
        ry: r.y,
        rz: r.z
      };
    });

    // 3. Face Depth Sorting
    const sortedFaces = faces.map(f => {
      let sumZ = 0;
      for (let i = 0; i < f.idx.length; i++) {
        sumZ += projected[f.idx[i]].z;
      }
      const avgZ = sumZ / f.idx.length;

      const p0 = projected[f.idx[0]];
      const p1 = projected[f.idx[1]];
      const p2 = projected[f.idx[2]];

      const ax = p1.rx - p0.rx;
      const ay = p1.ry - p0.ry;
      const az = p1.rz - p0.rz;
      const bx = p2.rx - p0.rx;
      const by = p2.ry - p0.ry;
      const bz = p2.rz - p0.rz;

      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const nLen = Math.hypot(nx, ny, nz) || 1;

      return {
        idx: f.idx,
        type: f.type,
        avgZ: avgZ,
        normal: { x: nx / nLen, y: ny / nLen, z: nz / nLen }
      };
    }).sort((a, b) => a.avgZ - b.avgZ);

    // 4. Draw Faces
    for (let i = 0; i < sortedFaces.length; i++) {
      const f = sortedFaces[i];
      const pts = f.idx.map(id => projected[id]);
      const dot = Math.max(0.12, f.normal.x * lightDir.x + f.normal.y * lightDir.y + f.normal.z * lightDir.z);

      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      for (let k = 1; k < pts.length; k++) {
        ctx.lineTo(pts[k].sx, pts[k].sy);
      }
      ctx.closePath();

      if (f.type === 'coffee_surface') {
        const r = Math.round(36 + dot * 50);
        const g = Math.round(22 + dot * 35);
        const b = Math.round(14 + dot * 16);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = `rgba(212, 168, 83, ${0.25 + dot * 0.35})`;
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
      } else if (f.type === 'saucer_plate') {
        const r = Math.round(48 + dot * 45);
        const g = Math.round(38 + dot * 35);
        const b = Math.round(30 + dot * 25);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.strokeStyle = `rgba(156, 114, 72, ${0.2 + dot * 0.25})`;
        ctx.lineWidth = 0.8;
        ctx.fill();
        ctx.stroke();
      } else if (f.type === 'handle') {
        ctx.fillStyle = `rgba(180, 140, 95, ${0.4 + dot * 0.5})`;
        ctx.strokeStyle = '#d4a853';
        ctx.lineWidth = 2.4;
        ctx.stroke();
      } else {
        const l = Math.round(24 + dot * 58);
        ctx.fillStyle = `hsl(38, 28%, ${l}%)`;
        ctx.strokeStyle = `rgba(212, 168, 83, ${0.15 + dot * 0.25})`;
        ctx.lineWidth = 0.8;
        ctx.fill();
        ctx.stroke();
      }
    }

    // 5. Render Animated Steam Wisps
    for (let i = 0; i < steamParticles.length; i++) {
      const sp = steamParticles[i];
      sp.y -= sp.vy;
      if (sp.y < -65) sp.y = -18;

      const waveX = Math.sin(autoTimer * 2.8 + sp.phase) * 6;
      const progress = (-sp.y - 18) / 47;
      const alpha = Math.sin(progress * Math.PI) * 0.5;

      const scale = fov / (fov + 20);
      const sx = originX + (sp.x + waveX + swayX) * scale;
      const sy = originY + (sp.y + floatY) * scale;

      ctx.fillStyle = `rgba(237, 232, 225, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.8 + progress * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();

/* -------------------------------------------------------------
   2. DYNAMIC REAL-TIME MULTI-LAYER MOUSE PARALLAX
   ------------------------------------------------------------- */
(function initDynamicParallaxMotion() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cupWrap = document.getElementById('coffee3dWrap');
  const header = document.getElementById('loginHeader');
  const group1 = document.getElementById('groupGamertag');
  const group2 = document.getElementById('groupPassword');
  const btn = document.getElementById('btnLogin');
  const bottomNav = document.getElementById('bottomNav');

  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);

  window.addEventListener('mousemove', (e) => {
    if (isTouch) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    targetX = (e.clientX - cx) / cx; // -1 to +1
    targetY = (e.clientY - cy) / cy; // -1 to +1
  }, { passive: true });

  // Only light cup parallax on touch, NEVER shift form inputs on mobile
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetX = (t.clientX - cx) / cx * 0.4;
      targetY = (t.clientY - cy) / cy * 0.4;
    }
  }, { passive: true });

  function updateParallax() {
    mouseX += (targetX - mouseX) * 0.08;
    mouseY += (targetY - mouseY) * 0.08;

    // Apply distinct layered depth offsets
    if (cupWrap) {
      cupWrap.style.setProperty('--px-cup', `${(mouseX * 16).toFixed(2)}px`);
      cupWrap.style.setProperty('--py-cup', `${(mouseY * 10).toFixed(2)}px`);
    }
    if (header && !isTouch) {
      header.style.setProperty('--px-hdr', `${(mouseX * 10).toFixed(2)}px`);
      header.style.setProperty('--py-hdr', `${(mouseY * 6).toFixed(2)}px`);
    }
    if (group1 && !isTouch) {
      group1.style.setProperty('--px-f1', `${(mouseX * 6).toFixed(2)}px`);
      group1.style.setProperty('--py-f1', `${(mouseY * 4).toFixed(2)}px`);
    }
    if (group2 && !isTouch) {
      group2.style.setProperty('--px-f2', `${(mouseX * 4).toFixed(2)}px`);
      group2.style.setProperty('--py-f2', `${(mouseY * 3).toFixed(2)}px`);
    }
    if (btn && !isTouch) {
      btn.style.setProperty('--px-btn', `${(mouseX * 8).toFixed(2)}px`);
      btn.style.setProperty('--py-btn', `${(mouseY * 5).toFixed(2)}px`);
    }
    if (bottomNav && !isTouch) {
      bottomNav.style.setProperty('--px-nav', `${(mouseX * 4).toFixed(2)}px`);
      bottomNav.style.setProperty('--py-nav', `${(mouseY * 3).toFixed(2)}px`);
    }

    requestAnimationFrame(updateParallax);
  }

  requestAnimationFrame(updateParallax);
})();

/* -------------------------------------------------------------
   3. PASSWORD TOGGLE
   ------------------------------------------------------------- */
function togglePasswordVisibility() {
  const input = document.getElementById('inputPassword');
  const eyeShow = document.getElementById('eyeShow');
  const eyeHide = document.getElementById('eyeHide');
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (eyeShow && eyeHide) {
    eyeShow.style.display = isPassword ? 'none' : 'block';
    eyeHide.style.display = isPassword ? 'block' : 'none';
  }
  input.focus();
}

/* -------------------------------------------------------------
   4. AUTHENTICATION & SESSION HANDLING
   ------------------------------------------------------------- */
async function hashSecret(secret) {
  if (!window.crypto || !window.crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
      hash = ((hash << 5) - hash) + secret.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + '_ic_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function showFeedback(msg, isSuccess = false) {
  const el = document.getElementById('loginFeedback');
  if (!el) return;
  el.textContent = msg;
  el.className = `login-feedback active ${isSuccess ? 'success' : ''}`;

  if (!isSuccess) {
    const container = document.getElementById('loginContainer');
    if (container) {
      container.classList.remove('shake-wrap');
      void container.offsetWidth;
      container.classList.add('shake-wrap');
      setTimeout(() => container.classList.remove('shake-wrap'), 400);
    }
  }
}

function clearFeedback() {
  const el = document.getElementById('loginFeedback');
  if (el) {
    el.textContent = '';
    el.className = 'login-feedback';
  }
}

function setSubmitting(isSubmitting) {
  const btn = document.getElementById('btnLogin');
  const spinner = document.getElementById('btnSpinner');
  const text = document.getElementById('btnText');
  const gInput = document.getElementById('inputGamertag');
  const pInput = document.getElementById('inputPassword');

  if (!btn) return;
  btn.disabled = isSubmitting;
  if (gInput) gInput.disabled = isSubmitting;
  if (pInput) pInput.disabled = isSubmitting;

  if (isSubmitting) {
    if (spinner) spinner.style.display = 'inline-block';
    if (text) text.textContent = 'BREWING...';
  } else {
    if (spinner) spinner.style.display = 'none';
    if (text) text.textContent = 'LOGIN';
  }
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  clearFeedback();

  const gInput = document.getElementById('inputGamertag');
  const pInput = document.getElementById('inputPassword');
  const gamertag = gInput ? gInput.value.trim() : '';
  const password = pInput ? pInput.value.trim() : '';

  if (!gamertag) {
    showFeedback('Please enter your gamertag.');
    gInput?.focus();
    return;
  }

  if (!password) {
    showFeedback('Please enter your password.');
    pInput?.focus();
    return;
  }

  setSubmitting(true);

  try {
    const passwordHash = await hashSecret(password);
    const storageKey = `ic_auth_${gamertag.toLowerCase()}`;
    const existingCredential = localStorage.getItem(storageKey);

    // Natural brief auth latency
    await new Promise(r => setTimeout(r, 380));

    // Verify password if already registered
    if (existingCredential && existingCredential !== passwordHash) {
      setSubmitting(false);
      showFeedback('Incorrect password for this gamertag.');
      pInput?.focus();
      return;
    }

    if (!existingCredential) {
      localStorage.setItem(storageKey, passwordHash);
    }

    // Save profile for minigames & coffee orders
    const profile = {
      name: gamertag.substring(0, 16),
      pin: passwordHash.substring(0, 8),
      avatar: 'coffee',
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('ic_user_profile', JSON.stringify(profile));
    sessionStorage.removeItem('ic_guest_skipped');

    showFeedback('Login successful. Enjoy the coffee!', true);

    const btn = document.getElementById('btnLogin');
    if (btn) {
      btn.style.background = '#4ade80';
      btn.style.color = '#14110e';
      const text = document.getElementById('btnText');
      if (text) text.textContent = 'SERVED';
    }

    const urlParams = new URLSearchParams(window.location.search);
    const returnTarget = urlParams.get('return') || '';

    setTimeout(() => {
      if (returnTarget === 'leaderboard') {
        window.location.href = 'leaderboard.html';
      } else if (returnTarget) {
        window.location.href = `index.html#${returnTarget}`;
      } else {
        window.location.href = 'index.html';
      }
    }, 450);

  } catch (err) {
    setSubmitting(false);
    showFeedback('Unable to authenticate. Please retry.');
  }
}

// Prefill existing gamertag if available
document.addEventListener('DOMContentLoaded', () => {
  try {
    const raw = localStorage.getItem('ic_user_profile');
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.name) {
        const input = document.getElementById('inputGamertag');
        if (input && !input.value) input.value = p.name;
      }
    }
  } catch (e) {}
});
