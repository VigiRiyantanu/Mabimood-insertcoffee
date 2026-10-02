'use strict';

/* ============================================================
   EFFECTS — 3D CANVAS, TILT, PARALLAX & DINO BACKGROUND
   ============================================================ */
/* ============================================================
    BACKGROUND AUTO DINO GAME (IMPROVED & UNCLIPPED)
    ============================================================ */
function initBgDino() {
  const canvas = document.getElementById('bgDinoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = canvas.offsetWidth || 800;
  let height = canvas.height = canvas.offsetHeight || 125;

  const groundLevel = height - 12;

  const dino = {
    x: 90,
    w: 26,
    h: 32,
    y: groundLevel - 32,
    groundY: groundLevel - 32,
    vy: 0,
    gravity: 0.28,
    jump: -6.4,
    isJumping: false,
    blinkTimer: 0
  };

  function updateDimensions() {
    if (canvas.offsetWidth) {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight || 125;
      const gLevel = height - 12;
      dino.groundY = gLevel - dino.h;
      if (!dino.isJumping) dino.y = dino.groundY;
      dino.x = Math.min(width * 0.18, 120);
    }
  }

  window.addEventListener('resize', updateDimensions);

  let obstacles = [];
  let clouds = [
    { x: width * 0.2, y: 14, w: 46, h: 12, speed: 0.35 },
    { x: width * 0.55, y: 22, w: 58, h: 14, speed: 0.45 },
    { x: width * 0.85, y: 16, w: 42, h: 10, speed: 0.3 }
  ];
  let groundDots = [];
  for (let i = 0; i < 22; i++) {
    groundDots.push({
      x: Math.random() * (width || 800),
      y: (height - 12) + 2 + Math.random() * 8,
      len: 2 + Math.random() * 6,
      speed: 2.2
    });
  }

  let dustParticles = [];
  let popups = [];
  let frameCount = 0;
  let score = 0;
  let hiScore = 420;

  function doJump() {
    if (!dino.isJumping) {
      dino.vy = dino.jump;
      dino.isJumping = true;
      // Spawn jump dust burst
      for (let i = 0; i < 4; i++) {
        dustParticles.push({
          x: dino.x + 8 + Math.random() * 10,
          y: dino.groundY + 30,
          vx: -(1 + Math.random() * 1.5),
          vy: -(0.5 + Math.random()),
          size: 2.5,
          alpha: 0.85
        });
      }
    }
  }

  // Interactive user jump on click/tap
  canvas.addEventListener('click', (e) => {
    e.stopPropagation();
    doJump();
  });
  canvas.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    doJump();
  }, { passive: true });

  // Optional Space/ArrowUp jump when home page is visible
  window.addEventListener('keydown', (e) => {
    const homePage = document.getElementById('page-home');
    if (homePage && homePage.classList.contains('active') && (e.code === 'Space' || e.code === 'ArrowUp')) {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        doJump();
      }
    }
  });

  const obstacleTypes = ['cup', 'beans', 'cactus'];

  function spawnObstacle() {
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    const currentGround = height - 12;
    let obs = {
      x: width + 25,
      speed: 2.2,
      type
    };

    if (type === 'cup') {
      obs.w = 20; obs.h = 25; obs.y = currentGround - 25;
    } else if (type === 'beans') {
      obs.w = 22; obs.h = 16; obs.y = currentGround - 16;
    } else {
      obs.w = 16; obs.h = 26; obs.y = currentGround - 26;
    }
    obstacles.push(obs);
  }

  function update() {
    frameCount++;

    // Dino Physics
    dino.y += dino.vy;
    dino.vy += dino.gravity;

    // Strict headroom ceiling clamp: CAN NEVER BE CLIPPED AT TOP
    if (dino.y < 12) {
      dino.y = 12;
      dino.vy = Math.max(0, dino.vy);
    }

    if (dino.y >= dino.groundY) {
      if (dino.isJumping) {
        // Landing dust
        for (let i = 0; i < 3; i++) {
          dustParticles.push({
            x: dino.x + 8 + (Math.random() - 0.5) * 12,
            y: dino.groundY + 30,
            vx: (Math.random() - 0.5) * 2,
            vy: -Math.random() * 0.8,
            size: 2,
            alpha: 0.7
          });
        }
      }
      dino.y = dino.groundY;
      dino.vy = 0;
      dino.isJumping = false;
    }

    // Auto-jump assistance so dino stays autonomous
    obstacles.forEach(obs => {
      obs.x -= obs.speed;
      const dist = obs.x - dino.x;
      if (!dino.isJumping && dist > 15 && dist < 62) {
        if (Math.random() < 0.96) {
          doJump();
          popups.push({ text: '+10', x: dino.x + 12, y: dino.y - 4, vy: -0.8, alpha: 1 });
        }
      }
    });

    // Clean up passed obstacles
    obstacles = obstacles.filter(obs => obs.x > -40);

    // Spawn obstacles periodically
    if (frameCount % 160 === 0) {
      spawnObstacle();
    }

    // Clouds drifting
    clouds.forEach(c => {
      c.x -= c.speed;
      if (c.x + c.w < -10) {
        c.x = width + 20;
        c.y = 10 + Math.random() * 20;
      }
    });

    // Ground dots scrolling
    groundDots.forEach(d => {
      d.x -= d.speed;
      if (d.x < -10) {
        d.x = width + Math.random() * 20;
        d.y = (height - 12) + 2 + Math.random() * 8;
      }
    });

    // Running dust while on ground
    if (!dino.isJumping && frameCount % 7 === 0) {
      dustParticles.push({
        x: dino.x + 2,
        y: dino.groundY + 28,
        vx: -(1.2 + Math.random() * 0.8),
        vy: -(0.3 + Math.random() * 0.4),
        size: 2,
        alpha: 0.6
      });
    }

    // Update dust particles
    dustParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.035;
    });
    dustParticles = dustParticles.filter(p => p.alpha > 0);

    // Update popups
    popups.forEach(pop => {
      pop.y += pop.vy;
      pop.alpha -= 0.025;
    });
    popups = popups.filter(pop => pop.alpha > 0);

    score++;
    if (score > hiScore) hiScore = score;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const currentGround = height - 12;

    // 1. Drifting Pixel Clouds
    ctx.fillStyle = 'rgba(212, 168, 83, 0.15)';
    clouds.forEach(c => {
      ctx.fillRect(c.x + 6, c.y, c.w - 12, c.h);
      ctx.fillRect(c.x, c.y + 4, c.w, c.h - 4);
      ctx.fillRect(c.x + 12, c.y - 3, c.w - 24, 3);
    });

    // 2. Ground line & ground dashes
    ctx.strokeStyle = '#3D3530';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, currentGround);
    ctx.lineTo(width, currentGround);
    ctx.stroke();

    ctx.fillStyle = '#2A2420';
    groundDots.forEach(d => {
      ctx.fillRect(d.x, d.y, d.len, 1.5);
    });

    // 3. Dust particles
    dustParticles.forEach(p => {
      ctx.fillStyle = `rgba(212, 168, 83, ${p.alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // 4. Draw Dino with Retro Sunglasses & Animation
    const dx = dino.x, dy = Math.round(dino.y);
    ctx.fillStyle = '#EDE8E1'; // Light vintage dino bone

    // Head & Snout
    ctx.fillRect(dx + 12, dy, 16, 12);
    ctx.fillRect(dx + 10, dy + 2, 4, 10);
    // Mouth notch
    ctx.fillStyle = '#14100D';
    ctx.fillRect(dx + 22, dy + 10, 6, 2);

    // Sunglasses (Cool Pixel Barista Dino!)
    ctx.fillStyle = '#100E0C';
    ctx.fillRect(dx + 17, dy + 3, 9, 5);
    // Sunglasses Gold Lens Glint
    ctx.fillStyle = '#D4A853';
    ctx.fillRect(dx + 19, dy + 4, 2, 2);
    ctx.fillRect(dx + 23, dy + 4, 2, 2);

    // Body & Neck
    ctx.fillStyle = '#EDE8E1';
    ctx.fillRect(dx + 8, dy + 12, 14, 14);

    // Tail
    ctx.fillRect(dx + 2, dy + 14, 6, 6);
    ctx.fillRect(dx - 2, dy + 12, 4, 4);

    // Tiny T-Rex Arms
    ctx.fillRect(dx + 20, dy + 16, 5, 2.5);
    ctx.fillRect(dx + 23, dy + 18, 2, 3);

    // Animated Running Legs
    const legCycle = Math.floor(frameCount / 7) % 3;
    if (dino.isJumping) {
      // Both legs tucked back in air
      ctx.fillRect(dx + 8, dy + 26, 3, 5);
      ctx.fillRect(dx + 10, dy + 29, 3, 2);
      ctx.fillRect(dx + 16, dy + 26, 3, 5);
      ctx.fillRect(dx + 18, dy + 29, 3, 2);
    } else if (legCycle === 0) {
      // Left leg forward, right leg back
      ctx.fillRect(dx + 8, dy + 26, 3, 6);
      ctx.fillRect(dx + 6, dy + 30, 4, 2);
      ctx.fillRect(dx + 16, dy + 26, 3, 4);
      ctx.fillRect(dx + 18, dy + 28, 3, 2);
    } else if (legCycle === 1) {
      // Mid stride
      ctx.fillRect(dx + 10, dy + 26, 3, 6);
      ctx.fillRect(dx + 15, dy + 26, 3, 6);
    } else {
      // Right leg forward, left leg back
      ctx.fillRect(dx + 8, dy + 26, 3, 4);
      ctx.fillRect(dx + 7, dy + 28, 3, 2);
      ctx.fillRect(dx + 16, dy + 26, 3, 6);
      ctx.fillRect(dx + 16, dy + 30, 4, 2);
    }

    // 5. Draw Themed Obstacles
    obstacles.forEach(obs => {
      if (obs.type === 'cup') {
        // Pixel Coffee To-Go Cup
        ctx.fillStyle = '#2C241E';
        ctx.fillRect(obs.x + 2, obs.y + 6, obs.w - 4, obs.h - 6);
        ctx.strokeStyle = '#D4A853';
        ctx.lineWidth = 1;
        ctx.strokeRect(obs.x + 2, obs.y + 6, obs.w - 4, obs.h - 6);

        // Cup Sleeve
        ctx.fillStyle = '#D4A853';
        ctx.fillRect(obs.x + 3, obs.y + 11, obs.w - 6, 7);

        // Lid
        ctx.fillStyle = '#EDE8E1';
        ctx.fillRect(obs.x, obs.y + 3, obs.w, 4);

        // Steam waves
        ctx.strokeStyle = 'rgba(212, 168, 83, 0.7)';
        ctx.lineWidth = 1;
        const st = (frameCount * 0.08);
        const off1 = Math.sin(st) * 2;
        const off2 = Math.cos(st) * 2;
        ctx.beginPath();
        ctx.moveTo(obs.x + 6 + off1, obs.y + 1);
        ctx.lineTo(obs.x + 6 + off1, obs.y - 6);
        ctx.moveTo(obs.x + 13 + off2, obs.y + 1);
        ctx.lineTo(obs.x + 13 + off2, obs.y - 8);
        ctx.stroke();

      } else if (obs.type === 'beans') {
        // Double Roasted Coffee Beans
        ctx.fillStyle = '#5A3825';
        ctx.fillRect(obs.x, obs.y + 4, 10, 12);
        ctx.fillRect(obs.x + 10, obs.y + 2, 11, 14);

        // Center Crease
        ctx.fillStyle = '#2A180E';
        ctx.fillRect(obs.x + 4, obs.y + 5, 2, 10);
        ctx.fillRect(obs.x + 14, obs.y + 3, 2, 12);

        // Golden roast shine
        ctx.fillStyle = '#D4A853';
        ctx.fillRect(obs.x + 2, obs.y + 5, 2, 2);
        ctx.fillRect(obs.x + 12, obs.y + 3, 2, 2);

      } else {
        // Retro Pixel Cactus
        ctx.fillStyle = '#3E6B4E';
        ctx.fillRect(obs.x + 5, obs.y + 4, 6, obs.h - 4);
        // Left arm
        ctx.fillRect(obs.x, obs.y + 10, 5, 4);
        ctx.fillRect(obs.x, obs.y + 6, 4, 6);
        // Right arm
        ctx.fillRect(obs.x + 11, obs.y + 13, 5, 4);
        ctx.fillRect(obs.x + 12, obs.y + 9, 4, 6);
        // Little amber bloom on top
        ctx.fillStyle = '#EFC97C';
        ctx.fillRect(obs.x + 6, obs.y + 1, 4, 3);
      }
    });

    // 6. Draw floating score popups (+10)
    popups.forEach(pop => {
      ctx.fillStyle = `rgba(212, 168, 83, ${pop.alpha})`;
      ctx.font = 'bold 11px Space Mono, monospace';
      ctx.fillText(pop.text, pop.x, pop.y);
    });

    // 7. Retro Score & Hint display in upper corner
    ctx.fillStyle = '#8A7A6E';
    ctx.font = '10px Space Mono, monospace';
    const scoreStr = String(Math.floor(score / 5)).padStart(5, '0');
    const hiStr = String(Math.floor(hiScore / 5)).padStart(5, '0');
    ctx.fillText(`HI ${hiStr}  ${scoreStr}`, width - 110, 16);

    // Subtle click/tap hint
    if (frameCount < 320 && width > 480) {
      ctx.fillStyle = 'rgba(212, 168, 83, 0.45)';
      ctx.font = '9px Space Mono, monospace';
      ctx.fillText('[CLICK / SPACE TO JUMP]', dino.x + 36, currentGround - 8);
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  loop();
}

setTimeout(initBgDino, 100);
window.addEventListener('load', initBgDino);


/* ============================================================
   3D AMBIENT PARTICLE & COFFEE BEAN CONSTELLATION ENGINE
   ============================================================ */
function init3DAmbientCanvas() {
  const canvas = document.getElementById('ambient3dCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;

  let mouse = { x: w / 2, y: h / 2, targetX: w / 2, targetY: h / 2 };

  window.addEventListener('resize', () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
  });

  const FOV = 420;
  const NUM_PARTICLES = 36;
  const particles = [];

  for (let i = 0; i < NUM_PARTICLES; i++) {
    const type = i % 3 === 0 ? 'bean' : (i % 3 === 1 ? 'cube' : 'spark');
    particles.push({
      x: (Math.random() - 0.5) * w * 1.5,
      y: (Math.random() - 0.5) * h * 1.5,
      z: Math.random() * 800 + 60,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.25 - Math.random() * 0.5,
      vz: (Math.random() - 0.5) * 0.3,
      rotX: Math.random() * Math.PI * 2,
      rotY: Math.random() * Math.PI * 2,
      rotZ: Math.random() * Math.PI * 2,
      vrotX: (Math.random() - 0.5) * 0.02,
      vrotY: (Math.random() - 0.5) * 0.02,
      vrotZ: (Math.random() - 0.5) * 0.02,
      size: type === 'bean' ? 12 : (type === 'cube' ? 10 : 3.5),
      type
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    mouse.x += (mouse.targetX - mouse.x) * 0.05;
    mouse.y += (mouse.targetY - mouse.y) * 0.05;

    const camOffsetX = (mouse.x - w / 2) * 0.15;
    const camOffsetY = (mouse.y - h / 2) * 0.15;

    particles.sort((a, b) => b.z - a.z);

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.rotX += p.vrotX;
      p.rotY += p.vrotY;
      p.rotZ += p.vrotZ;

      if (p.y < -h * 0.8) p.y = h * 0.8;
      if (p.y > h * 0.8) p.y = -h * 0.8;
      if (p.x < -w * 0.8) p.x = w * 0.8;
      if (p.x > w * 0.8) p.x = -w * 0.8;
      if (p.z < 30) p.z = 850;
      if (p.z > 850) p.z = 30;

      const scale = FOV / (FOV + p.z);
      const projX = (p.x - camOffsetX) * scale + w / 2;
      const projY = (p.y - camOffsetY) * scale + h / 2;

      if (projX < -50 || projX > w + 50 || projY < -50 || projY > h + 50) continue;

      const alpha = Math.min(1, Math.max(0.12, 1 - p.z / 900));

      ctx.save();
      ctx.translate(projX, projY);
      ctx.scale(scale, scale);

      if (p.type === 'bean') {
        ctx.rotate(p.rotZ);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.3, p.size * 0.85, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(156, 114, 72, ${alpha * 0.45})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(212, 168, 83, ${alpha * 0.35})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-p.size * 0.9, 0);
        ctx.bezierCurveTo(-p.size * 0.3, p.size * 0.4, p.size * 0.3, -p.size * 0.4, p.size * 0.9, 0);
        ctx.strokeStyle = `rgba(61, 38, 19, ${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.type === 'cube') {
        ctx.rotate(p.rotX);
        const s = p.size;
        ctx.strokeStyle = `rgba(122, 110, 160, ${alpha * 0.5})`;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-s/2, -s/2, s, s);
        ctx.strokeRect(-s/3, -s/3, s, s);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239, 201, 124, ${alpha * 0.65})`;
        ctx.shadowColor = 'rgba(212, 168, 83, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
}

/* ============================================================
   UNIVERSAL 3D TILT ENGINE
   ============================================================ */
function init3DTilt() {
  const cards = document.querySelectorAll('.tilt-card, .game-card, .game-preview-card, .how-step, .order-details-card, .about-hours');
  cards.forEach(card => {
    if (card._tiltInitialized) return;
    card._tiltInitialized = true;

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const xNorm = (x / rect.width - 0.5) * 2;
      const yNorm = (y / rect.height - 0.5) * 2;

      card.style.transform = `perspective(1000px) rotateX(${-yNorm * 8}deg) rotateY(${xNorm * 8}deg) translateZ(8px) scale3d(1.015, 1.015, 1.015)`;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0) scale3d(1, 1, 1)';
    });
  });
}

/* ============================================================
   HERO 3D PARALLAX CONTROLLER
   ============================================================ */
function initHero3DParallax() {
  const hero = document.querySelector('.hero');
  const scene = document.getElementById('heroScene3D');
  if (!hero || !scene) return;

  let currentRotX = 0, currentRotY = 0;
  let targetRotX = 0, targetRotY = 0;
  let isHovered = false;

  hero.addEventListener('mousemove', (e) => {
    isHovered = true;
    const rect = hero.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width - 0.5;
    const yRatio = (e.clientY - rect.top) / rect.height - 0.5;
    targetRotY = xRatio * 28;
    targetRotX = -yRatio * 24;
  });

  hero.addEventListener('mouseleave', () => {
    isHovered = false;
    targetRotX = 0;
    targetRotY = 0;
  });

  let t = 0;
  function updateParallax() {
    t += 0.025;
    if (!isHovered) {
      targetRotX = Math.sin(t) * 4;
      targetRotY = Math.cos(t * 0.8) * 6;
    }

    currentRotX += (targetRotX - currentRotX) * 0.08;
    currentRotY += (targetRotY - currentRotY) * 0.08;

    scene.style.transform = `perspective(1200px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
    requestAnimationFrame(updateParallax);
  }
  requestAnimationFrame(updateParallax);
}

/* ============================================================
   CART FLY PARTICLE & BOUNCE
   ============================================================ */
function spawnCartFlyParticle(btn) {
  const badge = document.getElementById('cartBadge');
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;

  // 1. Primary Glowing Flight Pill (+1)
  const particle = document.createElement('div');
  particle.className = 'floating-cart-particle';
  particle.textContent = '+1 ★';
  particle.style.left = `${startX}px`;
  particle.style.top = `${startY}px`;
  document.body.appendChild(particle);

  // 2. Sparkling Coffee Ember Burst
  const sparkCount = 6;
  const sparks = ['★', '•', '✦', '◆'];
  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement('div');
    spark.className = 'sparkle-cart-particle';
    spark.textContent = sparks[i % sparks.length];
    spark.style.left = `${startX}px`;
    spark.style.top = `${startY}px`;
    spark.style.color = i % 2 === 0 ? '#d4a853' : '#efc97c';
    spark.style.fontSize = i % 2 === 0 ? '14px' : '10px';
    const angle = (Math.PI * 2 * i) / sparkCount;
    const distance = 25 + Math.random() * 25;
    spark.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    spark.style.setProperty('--ty', `${Math.sin(angle) * distance - 20}px`);
    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 700);
  }

  // 3. Audio & Target Badge Animation
  if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
    RetroAudio.playSelect();
  }

  setTimeout(() => {
    particle.remove();
    if (badge) {
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
    }
  }, 750);
}

/* ============================================================
   CELEBRATION CONFETTI & COFFEE BEANS
   ============================================================ */
function launchCoffeeCelebrationConfetti() {
  const count = 40;
  const colors = ['#D4A853', '#9C7248', '#EFC97C', '#4A7A5A', '#EDE8E1'];
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * 0.4;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const isBean = i % 2 === 0;
    el.textContent = isBean ? '★' : '✦';
    el.style.position = 'fixed';
    el.style.left = `${centerX}px`;
    el.style.top = `${centerY}px`;
    el.style.fontSize = isBean ? '20px' : '16px';
    el.style.color = colors[i % colors.length];
    el.style.zIndex = '99999';
    el.style.pointerEvents = 'none';
    el.style.transition = 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 1.2s ease-out';
    el.style.transform = 'translate(0, 0) scale(0)';
    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 260 + 80;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance + 60;
    const rot = (Math.random() - 0.5) * 720;

    requestAnimationFrame(() => {
      el.style.transform = `translate(${destX}px, ${destY}px) scale(1) rotate(${rot}deg)`;
      el.style.opacity = '1';
    });

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    }, 1000);
  }
}

/* ============================================================
   SCROLL 3D REVEAL OBSERVER
   ============================================================ */
function initScrollReveal() {
  const elements = document.querySelectorAll('.section, .product-card, .game-card, .how-step, .about-hours');
  elements.forEach(el => el.classList.add('reveal-3d'));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
  } else {
    elements.forEach(el => el.classList.add('revealed'));
  }
}