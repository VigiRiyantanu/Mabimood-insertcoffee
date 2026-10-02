'use strict';

/* ============================================================
   STORE — CART, ORDERS, HIGH SCORES & USER PROFILE
   ============================================================ */
/* ============================================================
   STORE — CART
   ============================================================ */
const Storage = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const CartStore = {
  items: [],
  init() { this.items = Storage.get('ic_cart') || []; },
  save() { Storage.set('ic_cart', this.items); },
  add(productId) {
    const prod = PRODUCTS.find(p => p.id === productId);
    if (!prod) return;
    const existing = this.items.find(i => i.id === productId);
    if (existing) { existing.qty++; }
    else { this.items.push({ id: productId, name: prod.name, price: prod.price, qty: 1 }); }
    this.save();
    updateCartUI();
  },
  remove(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
    updateCartUI();
  },
  setQty(productId, qty) {
    if (qty <= 0) { this.remove(productId); return; }
    const item = this.items.find(i => i.id === productId);
    if (item) { item.qty = qty; this.save(); updateCartUI(); }
  },
  total() { return this.items.reduce((acc, i) => acc + i.price * i.qty, 0); },
  count() { return this.items.reduce((acc, i) => acc + i.qty, 0); },
  clear() { this.items = []; this.save(); updateCartUI(); },
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ============================================================
   STORE — ORDERS
   ============================================================ */
const OrderStore = {
  current: null,
  history: [],
  init() {
    this.history = Storage.get('ic_orders') || [];
  },
  create(data) {
    const order = {
      id: 'ORD-' + String(Date.now()).slice(-6),
      ...data,
      status: 'wait',
      createdAt: new Date().toISOString(),
    };
    this.current = order;
    this.history.push(order);
    Storage.set('ic_orders', this.history);
    return order;
  },
   simulateProgress(orderId, callback) {
   }
};

/* ============================================================
   STORE — HIGH SCORES
   ============================================================ */
const HSStore = {
  scores: {},
  init() { this.scores = Storage.get('ic_hs') || {}; },
  getTop(gameId, n=3) {
    return (this.scores[gameId] || []).slice(0, n);
  },
  add(gameId, score, playerName = '') {
    if (!this.scores[gameId]) this.scores[gameId] = [];
    const pName = playerName || (typeof UserProfileStore !== 'undefined' && UserProfileStore.get() ? UserProfileStore.get().name : 'PLAYER');
    this.scores[gameId].push({ score, name: pName, date: Date.now() });
    this.scores[gameId].sort((a,b) => b.score - a.score);
    this.scores[gameId] = this.scores[gameId].slice(0, 10);
    Storage.set('ic_hs', this.scores);
  },
  getBest(gameId) {
    const top = this.getTop(gameId, 1);
    return top.length ? top[0].score : 0;
  }
};

/* ============================================================
   STORE — USER / PLAYER PROFILE
   ============================================================ */
let activeAvatarSelection = '★';

const UserProfileStore = {
  get() {
    try {
      const p = localStorage.getItem('ic_user_profile');
      return p ? JSON.parse(p) : null;
    } catch (e) {
      return null;
    }
  },
  set(name, pin, avatar) {
    const profile = {
      name: String(name || '').trim().substring(0, 16),
      pin: String(pin || '').trim(),
      avatar: String(avatar || activeAvatarSelection || '★').trim(),
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('ic_user_profile', JSON.stringify(profile));
    } catch (e) {}
    updateUserProfileUI();
    return profile;
  },
  clear() {
    try {
      localStorage.removeItem('ic_user_profile');
    } catch (e) {}
    updateUserProfileUI();
  }
};

function selectAvatarPreset(emoji) {
  activeAvatarSelection = emoji;
  const urlInput = document.getElementById('profileImageInput');
  if (urlInput) urlInput.value = '';

  const preview = document.getElementById('profileAvatarPreview');
  if (preview) {
    preview.innerHTML = `<span class="avatar-emoji-fallback">${emoji}</span>`;
  }

  document.querySelectorAll('.avatar-preset-chip').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim() === emoji);
  });
}

function handleAvatarUrlInput(url) {
  url = (url || '').trim();
  const preview = document.getElementById('profileAvatarPreview');
  if (!preview) return;

  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'))) {
    activeAvatarSelection = url;
    preview.innerHTML = `<img src="${escapeHtml(url)}" alt="Avatar" onerror="this.onerror=null; selectAvatarPreset('★');">`;
    document.querySelectorAll('.avatar-preset-chip').forEach(btn => btn.classList.remove('active'));
  } else if (!url) {
    selectAvatarPreset('★');
  }
}

function openUserProfileModal() {
  const currentTarget = window.location.hash ? window.location.hash.replace('#', '') : (currentPage || 'home');
  window.location.href = `playerloginpage.html?return=${encodeURIComponent(currentTarget)}`;
}

function closeUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (modal) modal.classList.remove('active');
}

function handleSaveUserProfile(e) {
  if (e) e.preventDefault();
  openUserProfileModal();
}

function handleLogoutUserProfile() {
  if (confirm('Apakah Anda yakin ingin logout dari profil pemain?')) {
    UserProfileStore.clear();
    showToast('Anda telah logout dari profil pemain.', 'warning');
    if (typeof RetroAudio !== 'undefined') RetroAudio.playSelect();
    const protectedPages = ['coffee', 'arcade', 'game', 'checkout'];
    if (protectedPages.includes(currentPage)) {
      navigate('home');
    }
  }
}

function updateUserProfileUI() {
  const profile = UserProfileStore.get();
  const isLoggedIn = Boolean(profile && profile.name);

  // Desktop Elements
  const navBtn = document.getElementById('navPlayerBtn');
  const navAvatar = document.getElementById('navPlayerAvatar');
  const navName = document.getElementById('navPlayerName');

  // Mobile Elements
  const mobileBtn = document.getElementById('navPlayerBtnMobile');
  const mobileAvatar = document.getElementById('navPlayerAvatarMobile');
  const mobileMenuAvatar = document.getElementById('mobileMenuAvatar');
  const mobileName = document.getElementById('mobilePlayerName');

  const guestSvg = `<svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  if (isLoggedIn) {
    const displayName = profile.name;
    const initial = (displayName || 'P').charAt(0).toUpperCase();
    const avatarContent = (profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:image')))
      ? `<img src="${escapeHtml(profile.avatar)}" alt="${escapeHtml(displayName)}">`
      : initial;

    if (navBtn) {
      navBtn.title = `Profil: ${displayName}`;
      navBtn.setAttribute('aria-label', `Profil ${displayName}`);
      navBtn.classList.add('is-logged-in');
    }
    if (navAvatar) navAvatar.innerHTML = avatarContent;
    if (navName) navName.textContent = displayName;

    if (mobileBtn) {
      mobileBtn.title = `Profil: ${displayName}`;
      mobileBtn.setAttribute('aria-label', `Profil ${displayName}`);
      mobileBtn.classList.add('is-logged-in');
    }
    if (mobileAvatar) mobileAvatar.innerHTML = avatarContent;
    if (mobileMenuAvatar) mobileMenuAvatar.innerHTML = avatarContent;
    if (mobileName) mobileName.textContent = displayName;
  } else {
    if (navBtn) {
      navBtn.title = 'Login / Profil Pemain';
      navBtn.setAttribute('aria-label', 'Login / Profil Pemain');
      navBtn.classList.remove('is-logged-in');
    }
    if (navAvatar) navAvatar.innerHTML = guestSvg;
    if (navName) navName.textContent = 'Login / Profil';

    if (mobileBtn) {
      mobileBtn.title = 'Login / Profil Pemain';
      mobileBtn.setAttribute('aria-label', 'Login / Profil Pemain');
      mobileBtn.classList.remove('is-logged-in');
    }
    if (mobileAvatar) mobileAvatar.innerHTML = guestSvg;
    if (mobileMenuAvatar) mobileMenuAvatar.innerHTML = guestSvg;
    if (mobileName) mobileName.textContent = 'Tamu';
  }
}

function initUserProfile() {
  updateUserProfileUI();
}

/* ============================================================
   PLAYER AUTHENTICATION GATE & MODAL
   ============================================================ */
let pendingAuthTarget = null;
let pendingAuthGameId = null;

function isPlayerLoggedIn() {
  const profile = UserProfileStore.get();
  return Boolean(profile && profile.name && profile.name.trim().length > 0);
}

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

function openPlayerAuthModal(targetPage = 'coffee', gameId = null) {
  pendingAuthTarget = targetPage;
  pendingAuthGameId = gameId;

  const modal = document.getElementById('playerAuthModal');
  if (!modal) {
    window.location.href = `playerloginpage.html?return=${encodeURIComponent(targetPage)}`;
    return;
  }

  const badgeEl = document.getElementById('authModalBadgeText');
  const descEl = document.getElementById('authModalDesc');
  const fullLoginLink = document.getElementById('modalLinkFullLogin');

  if (targetPage === 'arcade' || targetPage === 'game') {
    if (badgeEl) badgeEl.textContent = 'ARCADE GAME PASS';
    if (descEl) descEl.textContent = 'Silakan masukkan Gamertag & Password Anda untuk bermain arcade dan mencatat skor ke Leaderboard.';
  } else {
    if (badgeEl) badgeEl.textContent = 'COFFEE MENU ACCESS';
    if (descEl) descEl.textContent = 'Silakan masukkan Gamertag & Password Anda untuk melihat menu kopi dan melakukan pemesanan.';
  }

  if (fullLoginLink) {
    fullLoginLink.href = `playerloginpage.html?return=${encodeURIComponent(targetPage)}`;
  }

  const feedback = document.getElementById('modalAuthFeedback');
  if (feedback) {
    feedback.textContent = '';
    feedback.className = 'modal-auth-feedback';
  }

  const gInput = document.getElementById('modalGamertag');
  const pInput = document.getElementById('modalPassword');
  if (gInput) {
    const existing = UserProfileStore.get();
    gInput.value = (existing && existing.name) ? existing.name : '';
  }
  if (pInput) pInput.value = '';

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  setTimeout(() => {
    if (gInput && !gInput.value) {
      gInput.focus();
    } else if (pInput) {
      pInput.focus();
    }
  }, 100);
}

function closePlayerAuthModal() {
  const modal = document.getElementById('playerAuthModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';

  const protectedPages = ['coffee', 'arcade', 'game', 'checkout'];
  if (protectedPages.includes(currentPage)) {
    navigate('home');
  } else if (window.location.hash && protectedPages.includes(window.location.hash.replace('#', ''))) {
    if (window.location.protocol !== 'file:') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
  pendingAuthTarget = null;
  pendingAuthGameId = null;
}

function toggleModalPasswordVisibility() {
  const pInput = document.getElementById('modalPassword');
  const eyeShow = document.getElementById('modalEyeShow');
  const eyeHide = document.getElementById('modalEyeHide');
  if (!pInput) return;

  const isPassword = pInput.type === 'password';
  pInput.type = isPassword ? 'text' : 'password';

  if (eyeShow && eyeHide) {
    eyeShow.style.display = isPassword ? 'none' : 'block';
    eyeHide.style.display = isPassword ? 'block' : 'none';
  }
  pInput.focus();
}

function goToFullLoginPage(e) {
  if (e) e.preventDefault();
  const target = pendingAuthTarget || (window.location.hash ? window.location.hash.replace('#', '') : 'home');
  window.location.href = `playerloginpage.html?return=${encodeURIComponent(target)}`;
}

async function handlePlayerAuthSubmit(e) {
  if (e) e.preventDefault();

  const gInput = document.getElementById('modalGamertag');
  const pInput = document.getElementById('modalPassword');
  const feedback = document.getElementById('modalAuthFeedback');
  const btnText = document.getElementById('modalAuthBtnText');
  const spinner = document.getElementById('modalAuthSpinner');
  const submitBtn = document.getElementById('btnModalAuthSubmit');

  const gamertag = (gInput ? gInput.value : '').trim();
  const password = (pInput ? pInput.value : '').trim();

  const showModalError = (msg) => {
    if (feedback) {
      feedback.textContent = msg;
      feedback.className = 'modal-auth-feedback active error';
    }
    const card = document.querySelector('.player-auth-card');
    if (card) {
      card.classList.remove('shake-card');
      void card.offsetWidth;
      card.classList.add('shake-card');
      setTimeout(() => card.classList.remove('shake-card'), 400);
    }
  };

  if (!gamertag || gamertag.length < 2) {
    showModalError('Gamertag minimal 2 karakter.');
    gInput?.focus();
    return;
  }

  if (!password || password.length < 3) {
    showModalError('Password minimal 3 karakter.');
    pInput?.focus();
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (btnText) btnText.textContent = 'MEMVERIFIKASI...';

  try {
    const passwordHash = await hashSecret(password);
    const storageKey = `ic_auth_${gamertag.toLowerCase()}`;
    const existingCredential = localStorage.getItem(storageKey);

    await new Promise(r => setTimeout(r, 280));

    if (existingCredential && existingCredential !== passwordHash) {
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (btnText) btnText.textContent = 'MASUK & BUKA AKSES';
      showModalError('Password salah untuk Gamertag ini.');
      pInput?.focus();
      return;
    }

    if (!existingCredential) {
      localStorage.setItem(storageKey, passwordHash);
    }

    const profile = {
      name: gamertag.substring(0, 16),
      pin: passwordHash.substring(0, 8),
      avatar: 'coffee',
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('ic_user_profile', JSON.stringify(profile));
    sessionStorage.removeItem('ic_guest_skipped');

    updateUserProfileUI();

    if (feedback) {
      feedback.textContent = 'Login berhasil! Membuka akses...';
      feedback.className = 'modal-auth-feedback active success';
    }

    const nextTarget = pendingAuthTarget || 'coffee';
    const nextGameId = pendingAuthGameId;

    setTimeout(() => {
      closePlayerAuthModal();
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.style.display = 'none';
      if (btnText) btnText.textContent = 'MASUK & BUKA AKSES';

      showToast(`★ Selamat datang, ${gamertag}! Akses terbuka.`, 'success');
      if (typeof RetroAudio !== 'undefined') RetroAudio.playScore?.();

      if (nextGameId) {
        openGame(nextGameId);
      } else {
        navigate(nextTarget);
      }
    }, 400);

  } catch (err) {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'MASUK & BUKA AKSES';
    showModalError('Gagal memverifikasi akun. Silakan coba lagi.');
  }
}

