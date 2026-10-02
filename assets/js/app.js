'use strict';

/* ============================================================
   APP — ORCHESTRATOR, NAVIGATION, CART UI, CATALOG & DISPLAY
   ============================================================ */
/* ============================================================
   FORMAT HELPERS
   ============================================================ */
const fmt = (n) => 'Rp' + n.toLocaleString('id-ID');

/* ============================================================
   NAVIGATION
   ============================================================ */
let currentPage = 'home';
let currentGame = null;

function navigate(page) {
  // Gate coffee, arcade, and game until player logs in with Gamertag and Password
  const protectedPages = ['coffee', 'arcade', 'game', 'checkout'];
  if (protectedPages.includes(page) && !isPlayerLoggedIn()) {
    openPlayerAuthModal(page);
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  currentPage = page;
  window.scrollTo(0,0);

  // Stop game when leaving
  if (page !== 'game' && currentGame) {
    currentGame.destroy?.();
    currentGame = null;
  }

  // Handle display auto-update
  if (page === 'display') {
    startDisplayAutoUpdate();
    renderDisplay();
  } else {
    stopDisplayAutoUpdate();
  }

  // Admin & Leaderboard pages redirection
  if (page === 'admin-panel' || page === 'admin-login') {
    window.location.href = 'admin/index.html';
    return;
  }
  if (page === 'leaderboard') {
    window.location.href = window.location.protocol === 'file:' ? 'leaderboard/index.html' : 'leaderboard.html';
    return;
  }

  // Update browser URL hash cleanly without reloading
  if (window.location.protocol !== 'file:') {
    try {
      if (page === 'home') {
        if (window.location.hash) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        history.replaceState(null, '', '#' + page);
      }
    } catch (e) {}
  }

  // Update nav active state
  ['home','coffee','arcade','leaderboard','about','display','admin-panel'].forEach(id => {
    document.getElementById('nav-' + id)?.classList.toggle('active', id === page);
  });

  // Page-specific init
  if (page === 'coffee') renderMenu();
  if (page === 'arcade') renderArcade();
  if (page === 'checkout') renderCheckout();
  updateCartBadge();
}

/* ============================================================
   CART UI
   ============================================================ */
function updateCartBadge() {
  const count = CartStore.count();
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }
  const mBadge = document.getElementById('mobileCartBadge');
  if (mBadge) {
    mBadge.textContent = count;
    mBadge.classList.toggle('visible', count > 0);
  }
  const mc = document.getElementById('menuCartCount');
  if (mc) mc.textContent = count > 0 ? `(${count})` : '';
  const mcc = document.getElementById('mobileCartCount');
  if (mcc) mcc.textContent = count > 0 ? `(${count})` : '';
}

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
  renderCartItems();
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
}

function renderCartItems() {
  const el = document.getElementById('cartItemsEl');
  const foot = document.getElementById('cartFootEl');
  if (!el || !foot) return;

  if (CartStore.items.length === 0) {
    el.innerHTML = `<div class="cart-empty-msg"><div class="empty-icon">[ ]</div><p>No items yet. Head to the menu.</p></div>`;
    foot.innerHTML = '';
    return;
  }

  el.innerHTML = CartStore.items.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${fmt(item.price)}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="CartStore.setQty('${item.id}', ${item.qty-1}); renderCartItems();" aria-label="Decrease quantity">-</button>
          <span class="qty-num" aria-label="Quantity: ${item.qty}">${item.qty}</span>
          <button class="qty-btn" onclick="CartStore.setQty('${item.id}', ${item.qty+1}); renderCartItems();" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="cart-item-del" onclick="CartStore.remove('${item.id}'); renderCartItems();" aria-label="Remove ${item.name}">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
      </button>
    </div>
  `).join('');

  const subtotal = CartStore.total();
  foot.innerHTML = `
    <div class="cart-subtotal"><span>Subtotal</span><span style="font-family:'Space Mono',monospace;">${fmt(subtotal)}</span></div>
    <div class="cart-total"><span>Total</span><span class="cart-total-amount">${fmt(subtotal)}</span></div>
    <button class="btn-checkout" onclick="closeCart(); navigate('checkout');" ${CartStore.items.length===0?'disabled':''}>Checkout</button>
  `;
}

function updateCartUI() {
  updateCartBadge();
  if (document.getElementById('cartDrawer').classList.contains('open')) {
    renderCartItems();
  }
}

/* ============================================================
   MENU PAGE
   ============================================================ */
let activeCategory = 'All';

function renderMenu() {
  renderCategoryTabs();
  renderProducts();
}

function renderCategoryTabs() {
  const el = document.getElementById('categoryTabs');
  if (!el) return;
  el.innerHTML = CATEGORIES.map(cat => `
    <button class="menu-tab${cat===activeCategory?' active':''}" 
            onclick="setCategory('${cat}')" 
            role="tab" 
            aria-selected="${cat===activeCategory}">${cat}</button>
  `).join('');
}

function setCategory(cat) {
  activeCategory = cat;
  renderCategoryTabs();
  renderProducts();
}

function renderProducts() {
  const el = document.getElementById('productsGrid');
  if (!el) return;
  const filtered = activeCategory === 'All' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCategory);
  el.innerHTML = filtered.map((p, idx) => `
    <div class="product-card" style="--item-idx: ${idx};">
      <div class="product-img">
        ${coffeeIllustration(p)}
        <span class="product-img-badge">${escapeHtml(p.category)}</span>
      </div>
      <div class="product-info">
        <div class="product-header-row">
          <h3 class="product-name">${escapeHtml(p.name)}</h3>
          <span class="product-price">${fmt(p.price)}</span>
        </div>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        <div class="product-footer">
          <button class="btn-add" onclick="addToCartFromMenu('${p.id}', this)" aria-label="Add ${escapeHtml(p.name)} to order">
            <svg class="btn-add-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="btn-add-text">Add to Order</span>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function addToCartFromMenu(id, btn) {
  CartStore.add(id);
  const prod = PRODUCTS.find(p => p.id === id);
  if (prod) {
    showToast(`${prod.name} added to order`);
  }
  if (btn) {
    const textEl = btn.querySelector('.btn-add-text') || btn;
    const origText = textEl.textContent;
    btn.classList.add('added');
    textEl.textContent = 'Added';
    spawnCartFlyParticle(btn);
    setTimeout(() => {
      textEl.textContent = origText;
      btn.classList.remove('added');
    }, 1400);
  }
}

/* ============================================================
   ANIMATED & CLEAN SPECIALTY COFFEE ILLUSTRATION ENGINE
   ============================================================ */
function triggerCoffeeInteract(el, e) {
  if (e) e.stopPropagation();
  if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
    RetroAudio.playSelect();
  }
}

function coffeeIllustration(p) {
  const category = (typeof p === 'object' && p !== null) ? (p.category || 'Coffee') : (p || 'Coffee');
  const id = (typeof p === 'object' && p !== null) ? (p.id || '') : '';

  if (category === 'Espresso') {
    return `
      <div class="coffee-art-scene art-espresso" data-drink="${escapeHtml(id)}" onclick="triggerCoffeeInteract(this, event)" title="Click to interact">
        <svg class="coffee-svg" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g class="steam-group">
            <path class="steam-line steam-1" d="M50 26 C47 17, 54 11, 50 3" stroke="#d4a853" stroke-width="2" stroke-linecap="round"/>
            <path class="steam-line steam-2" d="M60 24 C64 15, 57 9, 61 2" stroke="#efc97c" stroke-width="2" stroke-linecap="round"/>
            <path class="steam-line steam-3" d="M70 25 C66 17, 72 10, 69 4" stroke="#c89862" stroke-width="1.8" stroke-linecap="round"/>
          </g>
          <ellipse cx="60" cy="74" rx="28" ry="4" fill="rgba(0,0,0,0.5)"/>
          <path d="M40 38 C40 58, 48 66, 60 66 C72 66, 80 58, 80 38 Z" fill="#211d19" stroke="#5c4d3d" stroke-width="2"/>
          <path d="M80 43 C89 43, 91 53, 79 57" fill="none" stroke="#5c4d3d" stroke-width="2.5" stroke-linecap="round"/>
          <ellipse cx="60" cy="38" rx="20" ry="5.5" fill="#181512" stroke="#5c4d3d" stroke-width="1.5"/>
          <ellipse cx="60" cy="38" rx="16" ry="4" fill="#c88636"/>
          <ellipse cx="58" cy="38" rx="10" ry="2.2" fill="#efc97c" opacity="0.75"/>
          <circle cx="53" cy="38" r="1.5" fill="#fff" opacity="0.6"/>
        </svg>
      </div>
    `;
  }

  if (category === 'Iced') {
    return `
      <div class="coffee-art-scene art-iced" data-drink="${escapeHtml(id)}" onclick="triggerCoffeeInteract(this, event)" title="Click to interact">
        <svg class="coffee-svg" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="60" cy="76" rx="22" ry="4" fill="rgba(0,0,0,0.5)"/>
          <line x1="72" y1="12" x2="57" y2="66" stroke="#d4a853" stroke-width="2.8" stroke-linecap="round"/>
          <path d="M44 26 L50 72 C50 73.5, 52 74, 54 74 L66 74 C68 74, 70 73.5, 70 72 L76 26 Z" fill="rgba(33, 29, 25, 0.9)" stroke="#5c4d3d" stroke-width="2"/>
          <path d="M46 38 L50 72 C50 73.5, 52 74, 54 74 L66 74 C68 74, 70 73.5, 70 72 L74 38 Z" fill="#542e12"/>
          <path d="M46 38 L48 54 L72 54 L74 38 Z" fill="#cf9f6c" opacity="0.85"/>
          <rect x="52" y="42" width="12" height="12" rx="2.5" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.75)" stroke-width="1.3" transform="rotate(10 57 47)" class="ice-minimal ice-cube-1"/>
          <rect x="58" y="52" width="11" height="11" rx="2.5" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.65)" stroke-width="1.3" transform="rotate(-12 63 57)" class="ice-minimal ice-cube-2"/>
          <circle cx="50" cy="46" r="1.2" fill="#fff" opacity="0.7"/>
          <circle cx="70" cy="58" r="1.2" fill="#fff" opacity="0.7"/>
          <ellipse cx="60" cy="26" rx="16" ry="3.5" fill="none" stroke="#5c4d3d" stroke-width="1.5"/>
        </svg>
      </div>
    `;
  }

  if (category === 'Non Coffee') {
    const isMatcha = id === 'mch';
    return `
      <div class="coffee-art-scene ${isMatcha ? 'art-matcha' : 'art-choco'}" data-drink="${escapeHtml(id)}" onclick="triggerCoffeeInteract(this, event)" title="Click to interact">
        <svg class="coffee-svg" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g class="steam-group">
            <path class="steam-line steam-1" d="M52 24 C49 15, 55 9, 51 2" stroke="${isMatcha ? '#86efac' : '#d4a853'}" stroke-width="2" stroke-linecap="round"/>
            <path class="steam-line steam-2" d="M62 22 C66 14, 60 7, 63 1" stroke="${isMatcha ? '#4ade80' : '#c88636'}" stroke-width="2" stroke-linecap="round"/>
            <path class="steam-line steam-3" d="M71 23 C68 15, 73 9, 70 3" stroke="${isMatcha ? '#a7f3d0' : '#efc97c'}" stroke-width="1.8" stroke-linecap="round"/>
          </g>
          <ellipse cx="60" cy="74" rx="28" ry="4" fill="rgba(0,0,0,0.5)"/>
          <path d="M36 34 C36 58, 46 66, 60 66 C74 66, 84 58, 84 34 Z" fill="${isMatcha ? '#1b261d' : '#261b17'}" stroke="${isMatcha ? '#38533c' : '#4f352c'}" stroke-width="2"/>
          <ellipse cx="60" cy="34" rx="24" ry="6" fill="${isMatcha ? '#2e5b38' : '#3d251d'}" stroke="${isMatcha ? '#4ade80' : '#8a5338'}" stroke-width="1.5"/>
          ${isMatcha ? `
            <ellipse cx="60" cy="34" rx="18" ry="4" fill="#3f784d"/>
            <circle cx="56" cy="34" r="3" fill="#86efac" opacity="0.85"/>
            <circle cx="64" cy="35" r="2.2" fill="#a7f3d0" opacity="0.75"/>
            <circle cx="60" cy="33" r="1.5" fill="#fff" opacity="0.6"/>
          ` : `
            <ellipse cx="60" cy="34" rx="18" ry="4" fill="#593424"/>
            <circle cx="57" cy="34" r="2.5" fill="#d97706" opacity="0.75"/>
            <circle cx="63" cy="34" r="1.8" fill="#f59e0b" opacity="0.65"/>
            <circle cx="60" cy="33" r="1.2" fill="#fff" opacity="0.6"/>
          `}
        </svg>
      </div>
    `;
  }

  if (category === 'Signature') {
    const isColdBrew = id === 'sgb';
    return `
      <div class="coffee-art-scene art-signature" data-drink="${escapeHtml(id)}" onclick="triggerCoffeeInteract(this, event)" title="Click to interact">
        <svg class="coffee-svg" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="60" cy="76" rx="22" ry="4" fill="rgba(0,0,0,0.5)"/>
          <path d="M42 24 L48 72 C49 73.5, 51 74, 53 74 L67 74 C69 74, 71 73.5, 72 72 L78 24 Z" fill="#211d19" stroke="#d4a853" stroke-width="2"/>
          <path d="M44 34 L48 72 C49 73.5, 51 74, 53 74 L67 74 C69 74, 71 73.5, 72 72 L76 34 Z" fill="#4d2b14"/>
          ${isColdBrew ? `
            <circle cx="44" cy="24" r="9" fill="none" stroke="#eab308" stroke-width="2.2"/>
            <circle cx="44" cy="24" r="5" fill="#fde047" opacity="0.85"/>
          ` : `
            <path d="M60 40 L61 44 L65 45 L61 46 L60 50 L59 46 L55 45 L59 44 Z" fill="#efc97c" class="sig-star"/>
          `}
          <circle cx="56" cy="62" r="1.6" fill="#efc97c" class="fizz-dot f1"/>
          <circle cx="64" cy="54" r="1.4" fill="#fff" class="fizz-dot f2"/>
          <circle cx="58" cy="46" r="1.5" fill="#efc97c" class="fizz-dot f3"/>
          <ellipse cx="60" cy="24" rx="18" ry="4" fill="none" stroke="#d4a853" stroke-width="1.8"/>
        </svg>
      </div>
    `;
  }

  // Default: Coffee / Latte / Cappuccino / Flat White
  return `
    <div class="coffee-art-scene art-latte" data-drink="${escapeHtml(id)}" onclick="triggerCoffeeInteract(this, event)" title="Click to interact">
      <svg class="coffee-svg" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g class="steam-group">
          <path class="steam-line steam-1" d="M50 24 C47 15, 53 9, 50 2" stroke="#d4a853" stroke-width="2" stroke-linecap="round"/>
          <path class="steam-line steam-2" d="M61 22 C65 13, 58 7, 62 1" stroke="#efc97c" stroke-width="2" stroke-linecap="round"/>
          <path class="steam-line steam-3" d="M71 23 C68 15, 73 9, 70 3" stroke="#c89862" stroke-width="1.8" stroke-linecap="round"/>
        </g>
        <ellipse cx="60" cy="74" rx="30" ry="4.5" fill="rgba(0,0,0,0.5)"/>
        <path d="M36 34 C36 58, 46 66, 60 66 C74 66, 84 58, 84 34 Z" fill="#211d19" stroke="#5c4d3d" stroke-width="2"/>
        <path d="M84 40 C94 40, 96 52, 82 56" fill="none" stroke="#5c4d3d" stroke-width="2.5" stroke-linecap="round"/>
        <ellipse cx="60" cy="34" rx="24" ry="6" fill="#f5efe6" stroke="#5c4d3d" stroke-width="1.5"/>
        <ellipse cx="60" cy="34" rx="20" ry="4.5" fill="#deb887"/>
        <path d="M60 33 C57 30, 55 33, 60 36 C65 33, 63 30, 60 33 Z" fill="#9c6d3b"/>
        <circle cx="54" cy="34" r="1.2" fill="#fff" opacity="0.6"/>
      </svg>
    </div>
  `;
}

/* ============================================================
   HOME — FEATURED & PREVIEWS
   ============================================================ */
function renderFeaturedDrinks() {
  const el = document.getElementById('featuredDrinksGrid');
  if (!el) return;
  const featured = [PRODUCTS[0], PRODUCTS[3], PRODUCTS[7]];
  el.innerHTML = featured.map((p, idx) => `
    <div class="drink-card-home" onclick="navigate('coffee')" style="--item-idx: ${idx};">
      <div class="drink-thumb">
        ${coffeeIllustration(p)}
        <span class="drink-thumb-label">${escapeHtml(p.category)}</span>
      </div>
      <div class="drink-info">
        <div class="drink-header-row">
          <div class="drink-name-sm">${escapeHtml(p.name)}</div>
          <div class="drink-price-sm">${fmt(p.price)}</div>
        </div>
        <div class="drink-desc-sm">${escapeHtml(p.description)}</div>
      </div>
    </div>
  `).join('');
}

function renderGamesPreview() {
  const el = document.getElementById('gamesPreviewGrid');
  if (!el) return;
  const preview = GAMES.slice(0, 5);
  el.innerHTML = preview.map(g => `
    <div class="game-preview-card" onclick="navigate('arcade')" tabindex="0" role="button" aria-label="Play ${g.title}">
      <div class="game-icon">${gameIconText(g.id)}</div>
      <div class="game-preview-title">${g.title}</div>
      <div class="game-preview-sub">${g.category}</div>
    </div>
  `).join('');
}

function gameIconText(id) {
  const icons = {
    snake: 'SN\nAKE', tetris: 'TT\nRS', pong: 'PN\nNG', breakout: 'BRK\nOUT',
    spaceinv: 'SP\nINV', minesweep: 'MN\nSWP', flappy: 'FLP\nBRD', memory: 'MM\nRY',
    g2048: '20\n48', tictactoe: 'TIC\nTAC'
  };
  return (icons[id] || 'GAME').split('\n').join('<br>');
}

/* ============================================================
   CHECKOUT
   ============================================================ */
let orderType = 'dine-in';

function selectOrderType(type) {
  orderType = type;
  document.getElementById('typedinein')?.classList.toggle('selected', type==='dine-in');
  document.getElementById('typetakeaway')?.classList.toggle('selected', type==='takeaway');
  const tg = document.getElementById('tableGroup');
  if (tg) tg.style.display = type==='dine-in' ? 'block' : 'none';
}

function renderCheckout() {
  const el = document.getElementById('checkoutSummary');
  if (!el) return;
  if (CartStore.items.length === 0) {
    el.innerHTML = `<div class="order-summary-head">Your Order</div><div style="padding:1.5rem;color:var(--text-3);font-size:0.875rem;">No items in cart.</div>`;
    return;
  }
  const profile = UserProfileStore.get();
  if (profile && profile.name) {
    const custInput = document.getElementById('customerName');
    if (custInput && !custInput.value) custInput.value = profile.name;
  }

  el.innerHTML = `
    <div class="order-summary-head">Order Summary</div>
    <div class="order-summary-items">
      ${CartStore.items.map(i => `
        <div class="summary-item">
          <span class="summary-item-name">${i.name}</span>
          <div class="summary-item-right">
            <span class="summary-item-qty">x${i.qty}</span>
            <span class="summary-item-price">${fmt(i.price * i.qty)}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="order-summary-foot">
      <div class="summary-total-row">
        <span>Total</span>
        <span class="summary-total-amount">${fmt(CartStore.total())}</span>
      </div>
    </div>
  `;
}

/* ============================================================
   QRIS PAYMENT GATEWAY CONTROLLER & ORDER LOGIC
   ============================================================ */
let pendingQrisOrder = null;
let qrisCountdownInterval = null;
let qrisTimeRemaining = 900; // 15 menit
let currentQrisInvoice = '';
let currentQrisRrn = '';

function placeOrder() {
  let name = document.getElementById('customerName')?.value?.trim();
  const profile = UserProfileStore.get();
  if (!name && profile && profile.name) {
    name = profile.name;
    const custInput = document.getElementById('customerName');
    if (custInput) custInput.value = name;
  }
  const table = document.getElementById('tableNumber')?.value?.trim();
  const notes = document.getElementById('orderNotes')?.value?.trim();

  if (!name) { 
    showToast('Silakan masukkan nama pemesan', 'error'); 
    document.getElementById('customerName')?.focus(); 
    return; 
  }
  if (orderType === 'dine-in' && !table) { 
    showToast('Silakan masukkan nomor meja Anda', 'error'); 
    document.getElementById('tableNumber')?.focus(); 
    return; 
  }
  if (CartStore.items.length === 0) { 
    showToast('Keranjang pesanan masih kosong', 'error'); 
    return; 
  }

  // Simpan rincian data pending order untuk gateway pembayaran
  pendingQrisOrder = {
    customer: name,
    type: orderType,
    table: orderType === 'dine-in' ? table : null,
    notes: notes || '',
    items: [...CartStore.items],
    total: CartStore.total()
  };

  openQrisGateway();
}

function openQrisGateway() {
  if (!pendingQrisOrder) return;

  const modal = document.getElementById('qrisPaymentModal');
  if (!modal) return;

  // Generate referensi invoice dan RRN transaksi unik
  const now = new Date();
  const dateStr = now.getFullYear().toString() + 
    String(now.getMonth() + 1).padStart(2, '0') + 
    String(now.getDate()).padStart(2, '0');
  const randCode = Math.floor(1000 + Math.random() * 9000);
  currentQrisInvoice = `INV-${dateStr}-${randCode}`;
  currentQrisRrn = '9827' + Math.floor(10000000 + Math.random() * 90000000);

  // Set teks invoice dan nominal pada tampilan gateway
  const invEl = document.getElementById('qrisInvoiceRef');
  if (invEl) invEl.textContent = currentQrisInvoice;

  const amtEl = document.getElementById('qrisAmountDisplay');
  if (amtEl) amtEl.textContent = fmt(pendingQrisOrder.total);

  // Reset tampilan modal ke state pending
  const pendingView = document.getElementById('qrisPendingView');
  const successView = document.getElementById('qrisSuccessView');
  if (pendingView) pendingView.style.display = 'block';
  if (successView) successView.style.display = 'none';

  // Reset tombol dan status pill
  const btnSim = document.getElementById('btnSimulateSuccess');
  if (btnSim) {
    btnSim.disabled = false;
    btnSim.innerHTML = `<span>▶ Simulasi Bayar Berhasil (Demo)</span>`;
  }
  const btnChk = document.getElementById('btnCheckStatus');
  if (btnChk) {
    btnChk.disabled = false;
    btnChk.innerHTML = `<span>↻ Cek Status Transaksi</span>`;
  }
  const statusTxt = document.getElementById('qrisStatusText');
  if (statusTxt) statusTxt.textContent = 'Menunggu pembayaran terdeteksi...';

  // Mulai timer countdown (15 menit = 900 detik)
  startQrisCountdown(900);

  // Suara efek klik
  if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
    RetroAudio.playSelect();
  }

  // Tampilkan modal gateway
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeQrisGateway() {
  const modal = document.getElementById('qrisPaymentModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  if (qrisCountdownInterval) {
    clearInterval(qrisCountdownInterval);
    qrisCountdownInterval = null;
  }
}

function handleQrisOverlayClick(e) {
  if (e.target && e.target.id === 'qrisPaymentModal') {
    closeQrisGateway();
  }
}

function startQrisCountdown(seconds) {
  if (qrisCountdownInterval) clearInterval(qrisCountdownInterval);
  qrisTimeRemaining = seconds;
  updateQrisCountdownUI();

  qrisCountdownInterval = setInterval(() => {
    qrisTimeRemaining--;
    if (qrisTimeRemaining <= 0) {
      clearInterval(qrisCountdownInterval);
      qrisCountdownInterval = null;
      const countEl = document.getElementById('qrisCountdown');
      if (countEl) countEl.textContent = '00:00 (Kedaluwarsa)';
      const statusTxt = document.getElementById('qrisStatusText');
      if (statusTxt) statusTxt.textContent = 'Waktu pembayaran telah habis. Silakan buat pesanan baru.';
      showToast('Waktu pembayaran QRIS telah habis', 'error');
    } else {
      updateQrisCountdownUI();
    }
  }, 1000);
}

function updateQrisCountdownUI() {
  const countEl = document.getElementById('qrisCountdown');
  if (!countEl) return;
  const m = Math.floor(qrisTimeRemaining / 60);
  const s = qrisTimeRemaining % 60;
  countEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toggleQrisAccordion() {
  const content = document.getElementById('qrisAccordionContent');
  const arrow = document.getElementById('qrisAccordionArrow');
  if (!content) return;
  const isOpen = content.classList.toggle('open');
  if (arrow) arrow.innerHTML = isOpen ? '&#9652;' : '&#9662;';
}

function simulateQrisPayment() {
  if (!pendingQrisOrder) return;

  const btnSim = document.getElementById('btnSimulateSuccess');
  const btnChk = document.getElementById('btnCheckStatus');
  const statusTxt = document.getElementById('qrisStatusText');

  if (btnSim) {
    btnSim.disabled = true;
    btnSim.innerHTML = `<span class="auth-btn-spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; margin-right:6px;"></span><span>Memverifikasi QRIS...</span>`;
  }
  if (btnChk) btnChk.disabled = true;
  if (statusTxt) statusTxt.textContent = 'Memvalidasi pembayaran via Bank Indonesia / QRIS...';

  // Hentikan countdown
  if (qrisCountdownInterval) {
    clearInterval(qrisCountdownInterval);
    qrisCountdownInterval = null;
  }

  // Simulasi verifikasi instan real-time (850ms)
  setTimeout(() => {
    // Bunyikan audio jingle kemenangan
    if (typeof RetroAudio !== 'undefined' && RetroAudio.playWin) {
      RetroAudio.playWin();
    }

    // Isi rincian data sukses modal
    const rrnEl = document.getElementById('qrisSuccessRrn');
    if (rrnEl) rrnEl.textContent = currentQrisRrn;

    const totEl = document.getElementById('qrisSuccessTotal');
    if (totEl) totEl.textContent = fmt(pendingQrisOrder.total);

    const timeEl = document.getElementById('qrisSuccessTime');
    if (timeEl) {
      const d = new Date();
      timeEl.textContent = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')} WIB`;
    }

    // Tampilkan view sukses di dalam modal
    const pendingView = document.getElementById('qrisPendingView');
    const successView = document.getElementById('qrisSuccessView');
    if (pendingView) pendingView.style.display = 'none';
    if (successView) successView.style.display = 'flex';

    // Setelah 1.8 detik, simpan order dan alihkan ke halaman order-success
    setTimeout(() => {
      finalizeQrisOrder();
    }, 1800);
  }, 850);
}

function checkQrisPaymentStatus() {
  const btnChk = document.getElementById('btnCheckStatus');
  const statusTxt = document.getElementById('qrisStatusText');

  if (btnChk) {
    btnChk.disabled = true;
    btnChk.innerHTML = `<span class="auth-btn-spinner" style="width:13px; height:13px; border-width:2px; display:inline-block; margin-right:6px;"></span><span>Mengecek mutasi perbankan...</span>`;
  }
  if (statusTxt) statusTxt.textContent = 'Menghubungkan ke switcher QRIS nasional...';

  setTimeout(() => {
    simulateQrisPayment();
  }, 650);
}

function finalizeQrisOrder() {
  if (!pendingQrisOrder) return;

  const orderData = {
    ...pendingQrisOrder,
    paymentMethod: 'QRIS',
    paymentStatus: 'PAID',
    qrisRef: currentQrisInvoice,
    qrisRrn: currentQrisRrn,
    paidAt: new Date().toISOString()
  };

  const order = OrderStore.create(orderData);

  // Sinkronkan otomatis ke Cloud Firestore jika aktif
  if (typeof FirestoreDB !== 'undefined') {
    FirestoreDB.addOrder(order).catch(err => console.warn('Firestore sync note:', err));
  }

  // Bersihkan keranjang dan pending state
  CartStore.clear();
  pendingQrisOrder = null;

  // Tutup gateway modal
  closeQrisGateway();

  // Tampilkan nota pesanan dan arahkan
  renderOrderSuccess(order);
  navigate('order-success');
}

function renderOrderSuccess(order) {
  const el = document.getElementById('orderSuccessContent');
  if (!el || !order) return;
  launchCoffeeCelebrationConfetti();

  const isCompleted = ['selesai', 'completed', 'ready'].includes(order.status);
  const statuses = [
    { key: 'wait', label: 'Menunggu (Wait)', isDone: isCompleted, isActive: !isCompleted },
    { key: 'selesai', label: 'Selesai', isDone: isCompleted, isActive: isCompleted }
  ];

  const qrisInvoice = order.qrisRef || ('INV-' + order.id);
  const qrisRrn = order.qrisRrn || '982736192847';
  const orderDate = order.paidAt ? new Date(order.paidAt) : (order.createdAt ? new Date(order.createdAt) : new Date());
  const dateFormatted = `${orderDate.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })} ${String(orderDate.getHours()).padStart(2,'0')}:${String(orderDate.getMinutes()).padStart(2,'0')} WIB`;

  el.innerHTML = `
    <div class="order-success-header">
      <div class="order-number-display">${order.id}</div>
      <h1>${isCompleted ? 'PESANAN SELESAI' : 'PESANAN DITERIMA &amp; LUNAS'}</h1>
      <p>${isCompleted ? 'Pesanan kopi Anda telah siap! Silakan ambil di counter kasir.' : 'Pembayaran QRIS berhasil diverifikasi. Pesanan Anda telah diteruskan ke antrean barista.'}</p>
    </div>
    <div class="status-bar">
      ${statuses.map(s => `
        <div class="status-step ${s.isDone ? 'done' : ''} ${s.isActive ? 'active' : ''}">
          <div class="status-dot">${s.isDone ? '&#10003;' : ''}</div>
          <div class="status-name">${s.label}</div>
        </div>
      `).join('')}
    </div>
    <div class="order-details-card">
      <div class="order-details-head">
        <span>Rincian Pesanan &amp; Pembayaran</span>
        <span class="eta-badge" style="background:rgba(34,197,94,0.15); color:#4ade80; border:1px solid rgba(34,197,94,0.3); font-weight:700;">[QRIS LUNAS]</span>
      </div>
      <div class="order-meta">
        <div class="order-meta-item">
          <div class="order-meta-label">Customer</div>
          <div class="order-meta-value">${escapeHtml(order.customer)}</div>
        </div>
        <div class="order-meta-item">
          <div class="order-meta-label">Order Type</div>
          <div class="order-meta-value">${order.type === 'dine-in' ? 'Dine In' : 'Takeaway'}</div>
        </div>
        ${order.table ? `
        <div class="order-meta-item">
          <div class="order-meta-label">Table</div>
          <div class="order-meta-value">${escapeHtml(order.table)}</div>
        </div>` : ''}
        <div class="order-meta-item">
          <div class="order-meta-label">Metode Pembayaran</div>
          <div class="order-meta-value" style="color:var(--amber); font-weight:700;">QRIS Dinamis</div>
        </div>
        <div class="order-meta-item">
          <div class="order-meta-label">No. Invoice</div>
          <div class="order-meta-value" style="font-family:'Space Mono',monospace; font-size:0.8rem;">${qrisInvoice}</div>
        </div>
        <div class="order-meta-item">
          <div class="order-meta-label">RRN Transaksi</div>
          <div class="order-meta-value" style="font-family:'Space Mono',monospace; font-size:0.8rem; color:var(--text-2);">${qrisRrn}</div>
        </div>
        <div class="order-meta-item">
          <div class="order-meta-label">Waktu Transaksi</div>
          <div class="order-meta-value" style="font-size:0.8rem;">${dateFormatted}</div>
        </div>
        ${order.notes ? `
        <div class="order-meta-item" style="grid-column:1/-1;">
          <div class="order-meta-label">Notes</div>
          <div class="order-meta-value">${escapeHtml(order.notes)}</div>
        </div>` : ''}
      </div>
      <div class="order-items-list">
        ${order.items.map(i => `
          <div class="order-detail-item">
            <span>${escapeHtml(i.name)} <span style="color:var(--text-3)">x${i.qty}</span></span>
            <span style="font-family:'Space Mono',monospace; color:var(--amber); font-size:0.85rem;">${fmt(i.price*i.qty)}</span>
          </div>
        `).join('')}
      </div>
      <div class="order-detail-total">
        <span>Total Bayar (Lunas)</span>
        <span class="order-detail-total-amount">${fmt(order.total)}</span>
      </div>
    </div>
    <div class="success-actions">
      <button class="btn-secondary" style="flex:1;" onclick="navigate('arcade')">Play While Waiting</button>
      <button class="btn-primary" style="flex:1;" onclick="navigate('coffee')">Order More</button>
    </div>
  `;
}



let toastTimeout;
function showToast(msg, type='') {
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.className='toast show '+(type||'');
  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>el.classList.remove('show'), 2500);
}

/* ============================================================
   MOBILE MENU
   ============================================================ */
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('hamburgerBtn');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  if (btn) {
    btn.classList.toggle('is-active', isOpen);
    btn.setAttribute('aria-expanded', isOpen);
  }
}
function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  const btn = document.getElementById('hamburgerBtn');
  if (menu) menu.classList.remove('open');
  if (btn) {
    btn.classList.remove('is-active');
    btn.setAttribute('aria-expanded', 'false');
  }
}

/* ============================================================
   KEYBOARD NAVIGATION (tabs as buttons)
   ============================================================ */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.getAttribute('role') === 'button') {
    e.target.click();
  }
});



/* ============================================================
    DISPLAY SCREEN FUNCTIONS
    ============================================================ */
let displayUpdateInterval = null;
let runningTextTimeout = null;
let runningTextIsTemporary = false;

// Perbarui teks berjalan (running text) berdasarkan pesanan yang sudah selesai
function updateRunningTextMarquee() {
  const el = document.getElementById('runningText');
  if (!el || runningTextIsTemporary) return;

  const completedOrders = (OrderStore.history || []).filter(o => ['selesai', 'completed', 'ready'].includes(o.status));
  if (completedOrders.length > 0) {
    const listNames = completedOrders.slice().reverse().map(o => `Pesanan kopi atas nama ${o.customer} selesai`).join('   ---   ');
    el.textContent = `${listNames}   ---   Silakan ambil pesanan Anda di counter kasir`;
  } else {
    el.textContent = 'Selamat datang di INSERT COFFEE - Pesanan yang telah selesai akan ditampilkan di sini';
  }
}

function renderDisplay() {
  const inProgEl = document.getElementById('queueInProgress');
  const readyEl = document.getElementById('queueReady');
  if (!inProgEl || !readyEl) return;
  
  const inProgress = (OrderStore.history || []).filter(o => ['wait', 'received', 'preparing'].includes(o.status));
  const ready = (OrderStore.history || []).filter(o => ['selesai', 'completed', 'ready'].includes(o.status));
  
  inProgEl.innerHTML = inProgress.length
    ? inProgress.slice().reverse().map(o => `
        <div class="queue-item status-wait">
          <div class="name">${escapeHtml(o.customer)}</div>
          <div class="items">${(o.items || []).map(i => `${i.qty}x ${escapeHtml(i.name)}`).join(', ')}</div>
          <span class="queue-status">Menunggu</span>
        </div>
      `).join('')
    : '<div class="queue-item empty">Tidak ada antrean pesanan</div>';

  readyEl.innerHTML = ready.length
    ? ready.slice().reverse().map(o => `
        <div class="queue-item status-selesai">
          <div class="name">${escapeHtml(o.customer)}</div>
          <div class="items">${(o.items || []).map(i => `${i.qty}x ${escapeHtml(i.name)}`).join(', ')}</div>
          <span class="queue-status">Selesai</span>
        </div>
      `).join('')
    : '<div class="queue-item empty">Belum ada pesanan selesai</div>';

  updateRunningTextMarquee();
}

function getStatusLabel(status) {
  const labels = {
    'wait': 'Menunggu',
    'received': 'Menunggu',
    'preparing': 'Menunggu',
    'ready': 'Selesai',
    'completed': 'Selesai',
    'selesai': 'Selesai'
  };
  return labels[status] || 'Menunggu';
}

function startDisplayAutoUpdate() {
  if (displayUpdateInterval) clearInterval(displayUpdateInterval);
  displayUpdateInterval = setInterval(() => {
    if (currentPage === 'display') {
      renderDisplay();
    }
  }, 2500);
}

function stopDisplayAutoUpdate() {
  if (displayUpdateInterval) {
    clearInterval(displayUpdateInterval);
    displayUpdateInterval = null;
  }
}

function updateDisplayClock() {
  const el = document.getElementById('displayClock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
setInterval(updateDisplayClock, 1000);

// Panggil dan tampilkan pesanan yang selesai di running text dan suara
function announceCompletedOrder(customerName) {
  const el = document.getElementById('runningText');
  if (el) {
    el.textContent = `Pesanan kopi atas nama ${customerName} selesai - Silakan ambil di kasir`;
    runningTextIsTemporary = true;
    clearTimeout(runningTextTimeout);
    runningTextTimeout = setTimeout(() => {
      runningTextIsTemporary = false;
      updateRunningTextMarquee();
    }, 8000);
  }
  playCompletedOrder(customerName);
}

// Kompatibilitas dengan pemanggil lama
function announceOrder(customerName) {
  announceCompletedOrder(customerName);
}

function playCompletedOrder(customerName) {
  const text = `Pesanan kopi atas nama ${customerName} selesai`;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'id-ID';
      utter.rate = 0.95;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }
  } catch (e) {}
}



/* ============================================================
   INIT
   ============================================================ */
CartStore.init();
OrderStore.init();
HSStore.init();
initUserProfile();
renderFeaturedDrinks();
renderGamesPreview();
renderMenu();
renderArcade();
updateCartBadge();
init3DAmbientCanvas();
init3DTilt();
initHero3DParallax();
initScrollReveal();
if (typeof Leaderboard !== 'undefined' && typeof Leaderboard.initSummary === 'function') {
  Leaderboard.initSummary();
}

// Cross-page Hash Router & Deep Linking
function handleInitialRoute() {
  const hash = (window.location.hash || '').replace(/^#/, '').trim();
  if (!hash) return;
  if (hash === 'cart') {
    setTimeout(() => openCart(), 150);
    return;
  }
  const validPages = ['coffee', 'arcade', 'about', 'display', 'checkout'];
  if (validPages.includes(hash)) {
    navigate(hash);
  } else if (hash === 'leaderboard') {
    navigate('leaderboard');
  }
}
window.addEventListener('hashchange', handleInitialRoute);
handleInitialRoute();



function updateOrderStatus(orderId, newStatus) {
  const order = OrderStore.history.find(o => o.id === orderId);
  if (!order) return;
  order.status = newStatus;
  Storage.set('ic_orders', OrderStore.history);
  if (OrderStore.current && OrderStore.current.id === orderId) OrderStore.current.status = newStatus;
  showToast(`Status pesanan ${orderId}: ${getStatusLabel(newStatus)}`, 'success');
  if (currentPage === 'order-success' && OrderStore.current && OrderStore.current.id === orderId) renderOrderSuccess(OrderStore.current);
  if (currentPage === 'display') renderDisplay();
  if (['selesai', 'completed', 'ready'].includes(newStatus)) {
    announceCompletedOrder(order.customer);
  }

  // Sync update ke Firestore
  if (typeof FirestoreDB !== 'undefined') {
    FirestoreDB.updateOrderStatus(orderId, newStatus);
  }
}

// Inisialisasi Sinkronisasi Realtime Firestore untuk Pelanggan & Display
if (typeof FirestoreDB !== 'undefined') {
  // Sinkronisasi Katalog Menu dari Firestore
  FirestoreDB.listenToProducts((products) => {
    if (products && products.length > 0) {
      PRODUCTS = products;
      if (currentPage === 'coffee') renderProducts();
      if (currentPage === 'home') renderFeaturedDrinks();
    }
  });

  // Sinkronisasi Pesanan dari Firestore untuk Antrean Display & Order Tracking
  FirestoreDB.listenToOrders((orders) => {
    if (orders && orders.length > 0) {
      OrderStore.history = orders;
      if (currentPage === 'display') renderDisplay();
      if (currentPage === 'order-success' && OrderStore.current) {
        const live = orders.find(o => o.id === OrderStore.current.id);
        if (live && live.status !== OrderStore.current.status) {
          OrderStore.current.status = live.status;
          renderOrderSuccess(OrderStore.current);
        }
      }
    }
  });
}

