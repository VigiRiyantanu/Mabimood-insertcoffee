/**
 * AVANT-GARDE TYPOGRAPHIC ENGINE // FAHMI EL MUROTTAL
 * Kinetic 3D Perspective, Staggered Split-Text Reveal, Custom Cursor, Web Audio Synth
 */

document.addEventListener('DOMContentLoaded', () => {
  // --------------------------------------------------------------------------
  // 1. Audio Synthesizer (Web Audio API)
  // --------------------------------------------------------------------------
  let audioCtx = null;
  let audioEnabled = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTickSound() {
    if (!audioEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.03);
    } catch (e) {}
  }

  function playConfirmSound() {
    if (!audioEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.07, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.14);
    } catch (e) {}
  }

  const audioToggleBtn = document.getElementById('audioToggle');
  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      initAudio();
      audioEnabled = !audioEnabled;
      const audioIcon = document.getElementById('audioIcon');
      const audioText = document.getElementById('audioText');
      if (audioIcon && audioText) {
        audioIcon.textContent = audioEnabled ? '🔊' : '🔇';
        audioText.textContent = audioEnabled ? 'ON' : 'OFF';
      } else {
        audioToggleBtn.innerHTML = audioEnabled ? '<span>🔊</span> <span>ON</span>' : '<span>🔇</span> <span>OFF</span>';
      }
      audioToggleBtn.classList.toggle('active', audioEnabled);
      if (audioEnabled) playConfirmSound();
    });
  }

  // --------------------------------------------------------------------------
  // 2. Theme engine disabled: page remains in light mode.
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // 3. Real-Time Telemetry HUD (Clock & Scroll Depth)
  // --------------------------------------------------------------------------
  const hudClock = document.getElementById('hudClock');
  const hudScroll = document.getElementById('hudScroll');

  function updateHUDClock() {
    if (!hudClock) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    hudClock.textContent = `${hours}:${mins}:${secs} WIB`;
  }
  setInterval(updateHUDClock, 1000);
  updateHUDClock();

  function updateScrollDepth() {
    if (!hudScroll) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const pct = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0;
    hudScroll.textContent = `SCROLL: ${String(pct).padStart(2, '0')}%`;
  }
  window.addEventListener('scroll', updateScrollDepth, { passive: true });

  // --------------------------------------------------------------------------
  // 4. Custom Kinetic Cursor System
  // --------------------------------------------------------------------------
  const cursorContainer = document.querySelector('.custom-cursor-container');
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  const cursorGhost = document.querySelector('.cursor-ghost-text');

  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let defaultGhostText = '7.9569°S 112.6145°E';

  if (cursorContainer && cursorDot && cursorRing) {
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = `${mouseX}px`;
      cursorDot.style.top = `${mouseY}px`;
    });

    // Smooth Lerp loop for ring & ghost label
    function renderCursor() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;

      cursorRing.style.left = `${ringX}px`;
      cursorRing.style.top = `${ringY}px`;

      if (cursorGhost) {
        cursorGhost.style.left = `${ringX}px`;
        cursorGhost.style.top = `${ringY}px`;
      }

      requestAnimationFrame(renderCursor);
    }
    requestAnimationFrame(renderCursor);

    // Interactive element hover handlers
    const interactiveElements = document.querySelectorAll('a, button, input, textarea, [data-interactive]');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        document.body.classList.add('cursor-hover');
        playTickSound();
        const customPrompt = el.getAttribute('data-cursor');
        if (cursorGhost && customPrompt) {
          cursorGhost.textContent = customPrompt;
          cursorGhost.style.borderColor = 'var(--accent-neon)';
        }
      });
      el.addEventListener('mouseleave', () => {
        document.body.classList.remove('cursor-hover');
        if (cursorGhost) {
          cursorGhost.textContent = defaultGhostText;
          cursorGhost.style.borderColor = 'rgba(255, 62, 0, 0.3)';
        }
      });
    });
  }

  // --------------------------------------------------------------------------
  // 5. Lenis Smooth Scroll Integration
  // --------------------------------------------------------------------------
  let lenisInstance = null;
  if (typeof Lenis !== 'undefined') {
    lenisInstance = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95
    });

    function raf(time) {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenisInstance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  // --------------------------------------------------------------------------
  // 6. Split-Text Staggered Reveal Engine
  // --------------------------------------------------------------------------
  const splitTargets = document.querySelectorAll('[data-split-reveal]');
  splitTargets.forEach((el) => {
    const rawText = el.textContent.trim();
    el.innerHTML = '';
    const words = rawText.split(' ');

    words.forEach((word, wIdx) => {
      const wordMask = document.createElement('span');
      wordMask.className = 'word-mask';

      for (let i = 0; i < word.length; i++) {
        const charMask = document.createElement('span');
        charMask.className = 'char-mask';

        const charInner = document.createElement('span');
        charInner.className = 'char-inner';
        charInner.textContent = word[i];

        charMask.appendChild(charInner);
        wordMask.appendChild(charMask);
      }

      el.appendChild(wordMask);
      if (wIdx < words.length - 1) {
        const space = document.createTextNode(' ');
        el.appendChild(space);
      }
    });
  });

  // Reveal trigger using GSAP ScrollTrigger if available, or IntersectionObserver
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);

    splitTargets.forEach((target) => {
      const chars = target.querySelectorAll('.char-inner');
      gsap.to(chars, {
        scrollTrigger: {
          trigger: target,
          start: 'top 88%',
          toggleActions: 'play none none none'
        },
        y: '0%',
        rotate: 0,
        opacity: 1,
        duration: 1.0,
        stagger: 0.015,
        ease: 'power4.out'
      });
    });

    // ------------------------------------------------------------------------
    // 7. 3D Scroll Perspective (Endless Spatial Depth)
    // ------------------------------------------------------------------------
    const heroTilt = document.getElementById('heroTiltPlane');
    if (heroTilt) {
      gsap.to(heroTilt, {
        scrollTrigger: {
          trigger: '#heroSection',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2
        },
        rotateX: 38,
        translateZ: -420,
        y: 120,
        opacity: 0.15,
        transformOrigin: '50% 10%'
      });
    }

    // 3D Tilt for Section Titles
    const sectionTiltHeads = document.querySelectorAll('.tilt-on-scroll');
    sectionTiltHeads.forEach((head) => {
      gsap.fromTo(head, 
        { rotateX: -25, translateZ: -200, opacity: 0.3 },
        {
          scrollTrigger: {
            trigger: head,
            start: 'top 90%',
            end: 'top 30%',
            scrub: 1
          },
          rotateX: 0,
          translateZ: 0,
          opacity: 1,
          ease: 'power3.out'
        }
      );
    });

    // Parallax background watermarks
    const watermarks = document.querySelectorAll('.ghost-watermark');
    watermarks.forEach((wm) => {
      gsap.to(wm, {
        scrollTrigger: {
          trigger: wm.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5
        },
        y: -140,
        rotate: 3,
        ease: 'none'
      });
    });

    // Interactive Metric Fill Animation
    const metricFills = document.querySelectorAll('.metric-bar-fill');
    metricFills.forEach((bar) => {
      const targetWidth = bar.getAttribute('data-percentage') || '50%';
      const numberTarget = bar.closest('.metric-row')?.querySelector('.metric-num');

      ScrollTrigger.create({
        trigger: bar,
        start: 'top 85%',
        onEnter: () => {
          bar.style.width = targetWidth;
          if (numberTarget) {
            const rawVal = parseInt(targetWidth, 10);
            let current = 0;
            const timer = setInterval(() => {
              current += 2;
              if (current >= rawVal) {
                current = rawVal;
                clearInterval(timer);
              }
              numberTarget.textContent = `${String(current).padStart(2, '0')}%`;
            }, 25);
          }
        }
      });
    });

    // Ribbon continuous kinetic speed boost on scroll
    const ribbonTrack1 = document.getElementById('ribbonTrack1');
    const ribbonTrack2 = document.getElementById('ribbonTrack2');
    
    if (ribbonTrack1 && ribbonTrack2) {
      let ribbonTween1 = gsap.to(ribbonTrack1, {
        xPercent: -50,
        repeat: -1,
        duration: 20,
        ease: 'none'
      });

      let ribbonTween2 = gsap.to(ribbonTrack2, {
        xPercent: 50,
        repeat: -1,
        duration: 24,
        ease: 'none'
      });

      ScrollTrigger.create({
        onUpdate: (self) => {
          const velocity = Math.abs(self.getVelocity() / 300);
          const timeScale = Math.min(Math.max(1 + velocity, 1), 6);
          gsap.to(ribbonTween1, { timeScale: timeScale, duration: 0.3 });
          gsap.to(ribbonTween2, { timeScale: timeScale, duration: 0.3 });
        }
      });
    }

  } else {
    // Pure fallback if GSAP is blocked or delayed
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.2 });

    splitTargets.forEach(t => observer.observe(t));

    // Fallback for metric bars
    const metricFills = document.querySelectorAll('.metric-bar-fill');
    metricFills.forEach(bar => {
      bar.style.width = bar.getAttribute('data-percentage') || '50%';
    });
  }

  // --------------------------------------------------------------------------
  // 8. Interactive Character Scrambler Engine
  // --------------------------------------------------------------------------
  const scrambleElements = document.querySelectorAll('[data-scramble]');
  const scrambleGlyphs = 'ABCDEFGHJKLMNOPQRSTUVWXYZ0123456789_/+%#$*!';

  scrambleElements.forEach((el) => {
    const originalText = el.textContent.trim();
    let isScrambling = false;

    el.addEventListener('mouseenter', () => {
      if (isScrambling) return;
      isScrambling = true;
      playTickSound();

      let iteration = 0;
      const interval = setInterval(() => {
        el.textContent = originalText
          .split('')
          .map((letter, index) => {
            if (index < iteration) {
              return originalText[index];
            }
            if (letter === ' ') return ' ';
            return scrambleGlyphs[Math.floor(Math.random() * scrambleGlyphs.length)];
          })
          .join('');

        if (iteration >= originalText.length) {
          clearInterval(interval);
          el.textContent = originalText;
          isScrambling = false;
        }

        iteration += 1 / 2;
      }, 30);
    });
  });


  // --------------------------------------------------------------------------
  // 10. Smooth Anchor Navigation (Lenis Compatible)
  // --------------------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          playTickSound();
          if (lenisInstance) {
            lenisInstance.scrollTo(targetEl, { offset: -60, duration: 1.4 });
          } else {
            targetEl.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  });

  // Interactive 3D Card Hover Tilt for Project Dossiers
  const projectRows = document.querySelectorAll('.project-row');
  projectRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      playTickSound();
    });
  });

  // Console signature
  console.log(
    '%c FAHMI EL MUROTTAL %c AVANT-GARDE TYPOGRAPHIC MONOGRAPH 2026 %c',
    'background: #ff3e00; color: #fff; font-weight: bold; padding: 4px 8px; font-family: monospace;',
    'background: #111; color: #f5f4ef; padding: 4px 8px; font-family: monospace;',
    'background: transparent;'
  );
});
