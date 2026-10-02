/**
 * ============================================================
 * INSERT COFFEE — ADMIN PANEL & ORDER MONITORING CONTROLLER
 * ============================================================
 * Mengatur antarmuka Login Admin, Monitoring Pesanan Masuk Real-time,
 * Pemberian Status Minuman, Manajemen Menu, dan Konfigurasi Firestore.
 * Catatan: Bersih tanpa emoji sesuai instruksi.
 */

'use strict';

// State Admin
const AdminState = {
  currentTab: 'orders', // 'orders' | 'products' | 'config'
  orderFilter: 'all',   // 'all' | 'received' | 'preparing' | 'ready' | 'completed'
  ordersList: [],
  productsList: [],
  previousOrderIds: new Set(),
  editingProductId: null
};

// Inisialisasi controller admin saat dokumen siap
document.addEventListener('DOMContentLoaded', () => {
  initAdminEventListeners();
});

/* ============================================================
   ADMIN EVENT LISTENERS
   ============================================================ */
function initAdminEventListeners() {
  // Form Login Admin
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLogin);
  }

  // Setup tab switcher di Admin Panel
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      switchAdminTab(tab);
    });
  });

  // Setup Firebase config form
  const fbConfigForm = document.getElementById('firebaseConfigForm');
  if (fbConfigForm) {
    fbConfigForm.addEventListener('submit', handleSaveFirebaseConfig);
  }

  // Setup Product Modal Form
  const productForm = document.getElementById('adminProductForm');
  if (productForm) {
    productForm.addEventListener('submit', handleSaveProduct);
  }
}

/* ============================================================
   ADMIN LOGIN LOGIC
   ============================================================ */
async function handleAdminLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const submitBtn = document.getElementById('adminLoginBtn');
  const errorAlert = document.getElementById('adminLoginError');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Reset alert
  if (errorAlert) {
    errorAlert.style.display = 'none';
    errorAlert.textContent = '';
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="admin-spinner"></span> Memverifikasi...`;
  }

  try {
    const result = await AdminAuth.login(email, password);
    showToast('Login berhasil. Selamat datang di Portal Admin.', 'success');
    
    // Redirect ke Admin Panel
    setTimeout(() => {
      navigate('admin-panel');
      renderAdminPanel();
    }, 400);
  } catch (err) {
    console.error('Login error:', err);
    if (errorAlert) {
      errorAlert.textContent = err.message || 'Gagal login. Periksa email dan password Anda.';
      errorAlert.style.display = 'block';
    }
    showToast(err.message || 'Login gagal', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Masuk ke Admin Portal`;
    }
  }
}

function handleAdminLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari Admin Portal?')) {
    AdminAuth.logout().then(() => {
      showToast('Anda telah logout dari Admin Portal');
      navigate('admin-login');
      updateAdminLoginView();
    });
  }
}

// Cek status saat membuka halaman login
function updateAdminLoginView() {
  const session = AdminAuth.getSession();
  const alreadyLoggedBox = document.getElementById('adminAlreadyLoggedIn');
  const loginFormBox = document.getElementById('adminLoginFormBox');
  const statusBadge = document.getElementById('adminLoginFirebaseStatus');

  if (statusBadge) {
    if (isFirebaseActive) {
      statusBadge.innerHTML = `<span class="status-indicator online"></span> Firebase Auth Aktif`;
      statusBadge.className = 'admin-status-pill online';
    } else {
      statusBadge.innerHTML = `<span class="status-indicator online"></span> Mode Terproteksi`;
      statusBadge.className = 'admin-status-pill online';
    }
  }

  if (session && alreadyLoggedBox && loginFormBox) {
    alreadyLoggedBox.style.display = 'block';
    loginFormBox.style.display = 'none';
    const emailEl = document.getElementById('adminLoggedInEmail');
    if (emailEl) emailEl.textContent = session.email;
  } else if (alreadyLoggedBox && loginFormBox) {
    alreadyLoggedBox.style.display = 'none';
    loginFormBox.style.display = 'block';
  }
}

/* ============================================================
   ADMIN PANEL RENDERING & TAB MANAGEMENT
   ============================================================ */
function renderAdminPanel() {
  const session = AdminAuth.getSession();
  if (!session) {
    showToast('Akses ditolak. Silakan login terlebih dahulu.', 'warning');
    navigate('admin-login');
    return;
  }

  // Update header info
  const userEmailEl = document.getElementById('adminUserEmail');
  if (userEmailEl) userEmailEl.textContent = session.email;

  const connectionPill = document.getElementById('adminConnectionStatus');
  if (connectionPill) {
    if (isFirebaseActive) {
      connectionPill.innerHTML = `<span class="status-indicator online"></span> Cloud Firestore (${firebaseStatusInfo.projectId || 'Aktif'})`;
      connectionPill.className = 'admin-status-pill online';
      connectionPill.title = 'Terhubung ke Cloud Firestore';
    } else {
      connectionPill.innerHTML = `<span class="status-indicator warning"></span> Mode Lokal (Offline)`;
      connectionPill.className = 'admin-status-pill warning';
      connectionPill.title = 'Buka tab Konfigurasi Database untuk menghubungkan cloud database';
    }
  }

  // Jalankan listener data Firestore/Local
  setupAdminListeners();

  // Muat tab aktif
  switchAdminTab(AdminState.currentTab);
}

function switchAdminTab(tabName) {
  AdminState.currentTab = tabName;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  document.querySelectorAll('.admin-tab-content').forEach(content => {
    content.classList.toggle('active', content.getAttribute('data-tab-content') === tabName);
  });

  if (tabName === 'orders') {
    renderAdminOrders();
  } else if (tabName === 'products') {
    renderAdminProducts();
  } else if (tabName === 'config') {
    renderFirebaseConfigTab();
  } else if (tabName === 'leaderboard') {
    renderAdminLeaderboard();
  }
}

/* ============================================================
   REAL-TIME FIRESTORE LISTENERS FOR ADMIN
   ============================================================ */
let adminListenersAttached = false;

function setupAdminListeners() {
  if (adminListenersAttached) return;
  adminListenersAttached = true;

  // 1. Listen Orders (Real-time dari Firestore)
  FirestoreDB.listenToOrders((orders, source) => {
    AdminState.ordersList = orders;

    // Cek pesanan baru untuk memainkan notifikasi suara
    if (orders.length > 0) {
      const newOrders = orders.filter(o => !AdminState.previousOrderIds.has(o.id));
      if (AdminState.previousOrderIds.size > 0 && newOrders.length > 0) {
        if (typeof RetroAudio !== 'undefined') RetroAudio.playWin();
        showToast(`Pesanan baru masuk: ${newOrders[0].customer} (${newOrders[0].id})`, 'success');
      }
      AdminState.previousOrderIds = new Set(orders.map(o => o.id));
    }

    // Update global OrderStore history
    if (typeof OrderStore !== 'undefined') {
      OrderStore.history = orders;
    }

    // Refresh UI jika admin panel sedang terbuka
    if (currentPage === 'admin-panel' && AdminState.currentTab === 'orders') {
      renderAdminOrders();
    }
    // Refresh display screen jika sedang di display
    if (currentPage === 'display') {
      renderDisplay();
    }
  });

  // 2. Listen Products (Real-time dari Firestore)
  FirestoreDB.listenToProducts((products, source) => {
    if (products && products.length > 0) {
      AdminState.productsList = products;
      if (typeof PRODUCTS !== 'undefined') {
        PRODUCTS = products;
        if (currentPage === 'coffee') renderProducts();
        if (currentPage === 'home') renderFeaturedDrinks();
      }
    } else {
      AdminState.productsList = typeof PRODUCTS !== 'undefined' ? PRODUCTS : [];
    }

    if (currentPage === 'admin-panel' && AdminState.currentTab === 'products') {
      renderAdminProducts();
    }
  });
}

/* ============================================================
   TAB 1: MONITORING PESANAN & STATUS MINUMAN
   ============================================================ */
function setOrderFilter(filter) {
  AdminState.orderFilter = filter;
  document.querySelectorAll('.admin-filter-pill').forEach(pill => {
    pill.classList.toggle('active', pill.getAttribute('data-filter') === filter);
  });
  renderAdminOrders();
}

function renderAdminOrders() {
  const container = document.getElementById('adminOrdersList');
  if (!container) return;

  const orders = AdminState.ordersList || [];
  
  // Hitung Metrik
  const totalOrders = orders.length;
  const waitOrders = orders.filter(o => ['wait', 'received', 'preparing'].includes(o.status)).length;
  const completedOrders = orders.filter(o => ['selesai', 'completed', 'ready'].includes(o.status)).length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const statTotal = document.getElementById('statTotalOrders');
  const statWait = document.getElementById('statWaitOrders');
  const statCompleted = document.getElementById('statCompletedOrders');
  const statRevenue = document.getElementById('statTotalRevenue');

  if (statTotal) statTotal.textContent = totalOrders;
  if (statWait) statWait.textContent = waitOrders;
  if (statCompleted) statCompleted.textContent = completedOrders;
  if (statRevenue) statRevenue.textContent = fmt(totalRevenue);

  // Filter orders
  let filtered = orders;
  if (AdminState.orderFilter === 'wait') {
    filtered = orders.filter(o => ['wait', 'received', 'preparing'].includes(o.status));
  } else if (AdminState.orderFilter === 'selesai') {
    filtered = orders.filter(o => ['selesai', 'completed', 'ready'].includes(o.status));
  }

  // Update order count badge di tab Kasir
  const badge = document.getElementById('adminLiveOrdersCount');
  if (badge) {
    badge.textContent = waitOrders > 0 ? waitOrders : '';
    badge.style.display = waitOrders > 0 ? 'inline-block' : 'none';
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="admin-empty-state">
        <div class="empty-tag">[KOSONG]</div>
        <h3>Tidak Ada Pesanan ${AdminState.orderFilter === 'wait' ? 'Menunggu' : AdminState.orderFilter === 'selesai' ? 'Selesai' : ''}</h3>
        <p>Pesanan yang dibuat oleh pelanggan dari menu akan muncul di sini secara real-time untuk diproses oleh kasir.</p>
        <button class="btn-secondary" onclick="navigate('coffee')" style="margin-top:1rem;">Buka Menu Pelanggan</button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(order => {
    const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
    const isDineIn = order.type === 'dine-in';
    const isSelesai = ['selesai', 'completed', 'ready'].includes(order.status);

    return `
      <div class="admin-order-card status-${isSelesai ? 'selesai' : 'wait'}">
        <div class="admin-order-header">
          <div class="order-id-block">
            <span class="order-code">${order.id}</span>
            <span class="order-dot">•</span>
            <span class="order-time">${timeStr} WIB</span>
            <span class="order-type-badge ${isDineIn ? 'dinein' : 'takeaway'}">
              ${isDineIn ? `Dine-In • Meja ${order.table || '-'}` : 'Takeaway'}
            </span>
          </div>
          <span class="admin-order-status-badge status-${isSelesai ? 'selesai' : 'wait'}">
            ${isSelesai ? 'Selesai' : 'Menunggu (Wait)'}
          </span>
        </div>

        <div class="admin-order-body">
          <div class="customer-info-line">
            <span class="customer-label">Nama Pemesan:</span>
            <strong class="customer-name">${escapeHtml(order.customer)}</strong>
          </div>

          <div class="order-items-breakdown">
            ${(order.items || []).map(i => `
              <div class="order-item-row">
                <span class="item-qty">${i.qty}x</span>
                <span class="item-name">${escapeHtml(i.name)}</span>
                <span class="item-subtotal">${fmt(i.price * i.qty)}</span>
              </div>
            `).join('')}
          </div>

          ${order.notes ? `
            <div class="order-notes-box">
              <span class="notes-label">Catatan:</span>
              <span>${escapeHtml(order.notes)}</span>
            </div>
          ` : ''}

          <div class="order-total-row">
            <span>Total Pembayaran</span>
            <span class="order-total-amount">${fmt(order.total || 0)}</span>
          </div>
        </div>

        <!-- Tombol Aksi Kasir: Selesaikan Pesanan atau Panggil ke Display -->
        <div class="cashier-actions-bar">
          ${!isSelesai ? `
            <button class="btn-cashier-complete" onclick="completeOrderAction('${order.id}')" title="Klik untuk selesaikan pesanan dan tampilkan di Display">
              <span>Selesaikan Pesanan</span>
            </button>
            <div class="cashier-sub-actions">
              <button class="btn-admin-delete" title="Hapus Pesanan" onclick="deleteOrderPrompt('${order.id}')">
                <span>Hapus</span>
              </button>
            </div>
          ` : `
            <div class="cashier-completed-actions">
              <button class="btn-cashier-recall" onclick="recallOrderAction('${order.id}')" title="Panggil ulang pemesan dan tampilkan di Display">
                <span>Panggil ke Display</span>
              </button>
              <button class="btn-cashier-revert" onclick="revertOrderToWaitAction('${order.id}')" title="Kembalikan status pesanan ke Menunggu">
                <span>Kembalikan ke Menunggu</span>
              </button>
              <button class="btn-admin-delete" title="Hapus Pesanan" onclick="deleteOrderPrompt('${order.id}')">
                <span>Hapus</span>
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }).join('');
}

// Aksi Kasir: Selesaikan Pesanan (Wait -> Selesai)
async function completeOrderAction(orderId) {
  const order = AdminState.ordersList.find(o => o.id === orderId);
  const customerName = order ? order.customer : '';

  try {
    await FirestoreDB.updateOrderStatus(orderId, 'selesai');
    if (typeof RetroAudio !== 'undefined') RetroAudio.playWin();

    if (customerName) {
      if (typeof announceCompletedOrder === 'function') {
        announceCompletedOrder(customerName);
      }
      showToast(`Pesanan atas nama ${customerName} telah selesai dan ditampilkan di Display!`, 'success');
    } else {
      showToast(`Pesanan ${orderId} selesai!`, 'success');
    }

    renderAdminOrders();
  } catch (err) {
    showToast('Gagal mengubah status: ' + err.message, 'error');
  }
}

// Aksi Kasir: Panggil Ulang ke Display
function recallOrderAction(orderId) {
  const order = AdminState.ordersList.find(o => o.id === orderId);
  if (!order) return;
  if (typeof RetroAudio !== 'undefined') RetroAudio.playWin();
  if (typeof announceCompletedOrder === 'function') {
    announceCompletedOrder(order.customer);
  }
  showToast(`Memanggil pesanan atas nama ${order.customer} ke Display`, 'success');
}

// Aksi Kasir: Kembalikan Status ke Menunggu (Wait)
async function revertOrderToWaitAction(orderId) {
  try {
    await FirestoreDB.updateOrderStatus(orderId, 'wait');
    if (typeof RetroAudio !== 'undefined') RetroAudio.playSelect();
    showToast(`Pesanan ${orderId} dikembalikan ke status Menunggu`);
    renderAdminOrders();
  } catch (err) {
    showToast('Gagal mengubah status: ' + err.message, 'error');
  }
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    await FirestoreDB.updateOrderStatus(orderId, newStatus);
    showToast(`Status pesanan ${orderId} diubah ke ${getStatusLabel(newStatus)}`, 'success');

    if (['selesai', 'ready', 'completed'].includes(newStatus)) {
      if (typeof RetroAudio !== 'undefined') RetroAudio.playWin();
      const order = AdminState.ordersList.find(o => o.id === orderId);
      if (order && typeof announceCompletedOrder === 'function') {
        announceCompletedOrder(order.customer);
      }
    } else {
      if (typeof RetroAudio !== 'undefined') RetroAudio.playSelect();
    }

    renderAdminOrders();
  } catch (err) {
    showToast('Gagal mengubah status: ' + err.message, 'error');
  }
}

async function deleteOrderPrompt(orderId) {
  if (confirm(`Yakin ingin menghapus pesanan ${orderId}? Tindakan ini tidak dapat dibatalkan.`)) {
    try {
      await FirestoreDB.deleteOrder(orderId);
      showToast(`Pesanan ${orderId} berhasil dihapus.`);
      renderAdminOrders();
    } catch (err) {
      showToast('Gagal menghapus pesanan: ' + err.message, 'error');
    }
  }
}

/* ============================================================
   TAB 2: MENU & PRODUCT MANAGEMENT
   ============================================================ */
function renderAdminProducts() {
  const tableBody = document.getElementById('adminProductsTableBody');
  if (!tableBody) return;

  const products = (AdminState.productsList && AdminState.productsList.length > 0)
    ? AdminState.productsList
    : (typeof PRODUCTS !== 'undefined' ? PRODUCTS : []);

  if (products.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:2rem; color:var(--text-3);">
          Belum ada produk. Klik "Tambah Menu Baru" atau "Unggah Menu Bawaan".
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = products.map((prod, idx) => {
    const isAvail = prod.available !== false;
    return `
      <tr class="${isAvail ? '' : 'product-row-unavailable'}">
        <td style="font-family:'Space Mono',monospace; color:var(--text-3);">${idx + 1}</td>
        <td>
          <div class="prod-cell-main">
            <strong>${escapeHtml(prod.name)}</strong>
            <span class="prod-desc-snippet">${escapeHtml(prod.description || '')}</span>
          </div>
        </td>
        <td><span class="category-pill">${prod.category}</span></td>
        <td style="font-family:'Space Mono',monospace; font-weight:600; color:var(--amber);">${fmt(prod.price)}</td>
        <td>
          <button class="admin-stock-toggle ${isAvail ? 'available' : 'outofstock'}" onclick="toggleProductAvailability('${prod.id}')" title="Klik untuk ubah status ketersediaan">
            ${isAvail ? 'Tersedia' : 'Habis'}
          </button>
        </td>
        <td>
          <div class="prod-actions-row">
            <button class="btn-edit-prod" onclick="openEditProductModal('${prod.id}')" title="Edit Menu">
              Edit
            </button>
            <button class="btn-delete-prod" onclick="deleteProductPrompt('${prod.id}')" title="Hapus Menu">
              Hapus
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddProductModal() {
  AdminState.editingProductId = null;
  const modal = document.getElementById('adminProductModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('adminProductForm');

  if (form) form.reset();
  if (title) title.textContent = 'Tambah Menu Baru';
  document.getElementById('prodAvailable').checked = true;

  if (modal) modal.classList.add('active');
}

function openEditProductModal(productId) {
  const products = AdminState.productsList.length > 0 ? AdminState.productsList : PRODUCTS;
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  AdminState.editingProductId = productId;
  const modal = document.getElementById('adminProductModal');
  const title = document.getElementById('productModalTitle');

  if (title) title.textContent = 'Edit Menu: ' + prod.name;
  document.getElementById('prodName').value = prod.name || '';
  document.getElementById('prodCategory').value = prod.category || 'Coffee';
  document.getElementById('prodPrice').value = prod.price || '';
  document.getElementById('prodDescription').value = prod.description || '';
  document.getElementById('prodAvailable').checked = prod.available !== false;

  if (modal) modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('adminProductModal');
  if (modal) modal.classList.remove('active');
  AdminState.editingProductId = null;
}

async function handleSaveProduct(e) {
  e.preventDefault();
  const name = document.getElementById('prodName').value.trim();
  const category = document.getElementById('prodCategory').value;
  const price = parseInt(document.getElementById('prodPrice').value, 10);
  const description = document.getElementById('prodDescription').value.trim();
  const available = document.getElementById('prodAvailable').checked;

  if (!name || isNaN(price) || price <= 0) {
    showToast('Nama dan harga produk wajib diisi dengan benar.', 'error');
    return;
  }

  const id = AdminState.editingProductId || ('prod_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10) + '_' + Date.now().toString().slice(-4));

  const productData = { id, name, category, price, description, available };

  try {
    await FirestoreDB.saveProduct(productData);

    const list = AdminState.productsList;
    const existingIndex = list.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = productData;
    } else {
      list.push(productData);
    }

    if (typeof PRODUCTS !== 'undefined') {
      const idx = PRODUCTS.findIndex(p => p.id === id);
      if (idx >= 0) PRODUCTS[idx] = productData;
      else PRODUCTS.push(productData);
    }

    closeProductModal();
    showToast(`Produk "${name}" berhasil disimpan!`, 'success');
    renderAdminProducts();
  } catch (err) {
    showToast('Gagal menyimpan produk: ' + err.message, 'error');
  }
}

async function toggleProductAvailability(productId) {
  const products = AdminState.productsList.length > 0 ? AdminState.productsList : PRODUCTS;
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  prod.available = !prod.available;
  try {
    await FirestoreDB.saveProduct(prod);
    showToast(`Status "${prod.name}" diubah jadi ${prod.available ? 'Tersedia' : 'Habis'}`);
    renderAdminProducts();
    if (currentPage === 'coffee') renderProducts();
  } catch (err) {
    showToast('Gagal update status: ' + err.message, 'error');
  }
}

async function deleteProductPrompt(productId) {
  const products = AdminState.productsList.length > 0 ? AdminState.productsList : PRODUCTS;
  const prod = products.find(p => p.id === productId);
  const name = prod ? prod.name : productId;

  if (confirm(`Yakin ingin menghapus menu "${name}"?`)) {
    try {
      await FirestoreDB.deleteProduct(productId);
      AdminState.productsList = AdminState.productsList.filter(p => p.id !== productId);
      if (typeof PRODUCTS !== 'undefined') {
        PRODUCTS = PRODUCTS.filter(p => p.id !== productId);
      }
      showToast(`Menu "${name}" dihapus.`);
      renderAdminProducts();
      if (currentPage === 'coffee') renderProducts();
    } catch (err) {
      showToast('Gagal menghapus produk: ' + err.message, 'error');
    }
  }
}

async function seedDefaultProductsPrompt() {
  if (typeof PRODUCTS === 'undefined' || PRODUCTS.length === 0) {
    showToast('Data default produk tidak ditemukan.', 'error');
    return;
  }

  if (!isFirebaseActive) {
    showToast('Hubungkan Firebase terlebih dahulu di tab Konfigurasi Database.', 'error');
    return;
  }

  if (confirm(`Apakah Anda ingin mengunggah ${PRODUCTS.length} menu bawaan ke Cloud Firestore?`)) {
    const btn = document.getElementById('btnSeedProducts');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="admin-spinner"></span> Mengunggah...`;
    }

    try {
      await FirestoreDB.seedDefaultProducts(PRODUCTS);
      showToast(`Berhasil mengunggah ${PRODUCTS.length} menu ke Firestore!`, 'success');
      renderAdminProducts();
    } catch (err) {
      showToast('Gagal seeding: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `Unggah Menu Default ke Firestore`;
      }
    }
  }
}

/* ============================================================
   TAB 3: FIREBASE & FIRESTORE CONFIGURATION
   ============================================================ */
function renderFirebaseConfigTab() {
  const currentConfig = getActiveFirebaseConfig() || DEFAULT_FIREBASE_CONFIG;

  const apiKeyInput = document.getElementById('fbApiKey');
  const authDomainInput = document.getElementById('fbAuthDomain');
  const projectIdInput = document.getElementById('fbProjectId');
  const storageBucketInput = document.getElementById('fbStorageBucket');
  const messagingSenderIdInput = document.getElementById('fbMessagingSenderId');
  const appIdInput = document.getElementById('fbAppId');

  if (apiKeyInput) apiKeyInput.value = currentConfig.apiKey === 'YOUR_API_KEY' ? '' : currentConfig.apiKey;
  if (authDomainInput) authDomainInput.value = currentConfig.authDomain?.includes('YOUR_PROJECT_ID') ? '' : currentConfig.authDomain;
  if (projectIdInput) projectIdInput.value = currentConfig.projectId === 'YOUR_PROJECT_ID' ? '' : currentConfig.projectId;
  if (storageBucketInput) storageBucketInput.value = currentConfig.storageBucket?.includes('YOUR_PROJECT_ID') ? '' : currentConfig.storageBucket;
  if (messagingSenderIdInput) messagingSenderIdInput.value = currentConfig.messagingSenderId === 'YOUR_MESSAGING_SENDER_ID' ? '' : currentConfig.messagingSenderId;
  if (appIdInput) appIdInput.value = currentConfig.appId === 'YOUR_APP_ID' ? '' : currentConfig.appId;

  updateFirebaseStatusBox();
}

function updateFirebaseStatusBox() {
  const statusBox = document.getElementById('firebaseConfigStatusBox');
  if (!statusBox) return;

  if (isFirebaseActive) {
    statusBox.className = 'firebase-status-box success';
    statusBox.innerHTML = `
      <div class="status-box-header">
        <span class="status-indicator online"></span>
        <strong>Cloud Firestore Terhubung</strong>
      </div>
      <p>Project ID: <code>${firebaseStatusInfo.projectId}</code>. Semua pesanan dan katalog produk tersinkronisasi secara otomatis.</p>
    `;
  } else {
    statusBox.className = 'firebase-status-box warning';
    statusBox.innerHTML = `
      <div class="status-box-header">
        <span class="status-indicator warning"></span>
        <strong>Mode Demo Lokal Aktif</strong>
      </div>
      <p>Firebase belum terhubung. Aplikasi saat ini menggunakan penyimpanan lokal (LocalStorage). Masukkan konfigurasi Firebase Web App Anda di bawah untuk mengaktifkan sinkronisasi cloud real-time.</p>
    `;
  }
}

function handleSaveFirebaseConfig(e) {
  e.preventDefault();
  const config = {
    apiKey: document.getElementById('fbApiKey').value.trim(),
    authDomain: document.getElementById('fbAuthDomain').value.trim(),
    projectId: document.getElementById('fbProjectId').value.trim(),
    storageBucket: document.getElementById('fbStorageBucket').value.trim(),
    messagingSenderId: document.getElementById('fbMessagingSenderId').value.trim(),
    appId: document.getElementById('fbAppId').value.trim()
  };

  if (!config.apiKey || !config.projectId) {
    showToast('API Key dan Project ID wajib diisi!', 'error');
    return;
  }

  const success = FirestoreDB.saveConfig(config);
  if (success) {
    showToast('Konfigurasi Firebase berhasil disimpan dan diinisialisasi!', 'success');
    renderAdminPanel();
    updateFirebaseStatusBox();
    adminListenersAttached = false;
    setupAdminListeners();
  } else {
    showToast('Gagal menginisialisasi Firebase dengan konfigurasi tersebut.', 'error');
    updateFirebaseStatusBox();
  }
}

async function testFirestoreConnection() {
  const btn = document.getElementById('btnTestFirestore');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="admin-spinner"></span> Menguji Koneksi...`;
  }

  const result = await FirestoreDB.testConnection();
  if (result.success) {
    showToast(result.message, 'success');
  } else {
    showToast(result.message, 'error');
  }

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `Uji Koneksi Firestore`;
  }
}

function resetFirebaseConfigPrompt() {
  if (confirm('Yakin ingin mereset konfigurasi Firebase ke nilai default?')) {
    FirestoreDB.resetConfig();
    showToast('Konfigurasi Firebase telah direset ke mode lokal.');
    renderFirebaseConfigTab();
    renderAdminPanel();
  }
}

/* ============================================================
   TAB 4: LEADERBOARD MANAGEMENT (ADMIN VIEW)
   ============================================================ */
let adminLbFilterGame = 'all';

async function renderAdminLeaderboard(forceRefresh = false) {
  const container = document.getElementById('adminLeaderboardTableBody');
  if (!container) return;

  container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-3);"><span class="admin-spinner"></span> Memuat data leaderboard...</td></tr>`;

  try {
    let res = { items: [] };
    if (typeof FirestoreDB !== 'undefined' && typeof FirestoreDB.getLeaderboardData === 'function') {
      res = await FirestoreDB.getLeaderboardData(forceRefresh);
    }

    const items = res.items || [];
    let filtered = items;
    if (adminLbFilterGame !== 'all') {
      filtered = items.filter(i => (i.gameId || '').toLowerCase() === adminLbFilterGame.toLowerCase());
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-3);">
            Belum ada data rekor skor yang tercatat di Firestore untuk filter ini.
          </td>
        </tr>
      `;
      return;
    }

    container.innerHTML = filtered.map((item, idx) => {
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID', { dateStyle:'short', timeStyle:'short' }) : '-';
      return `
        <tr>
          <td style="font-family:'Space Mono',monospace; color:var(--text-3);">${idx + 1}</td>
          <td><strong>${escapeHtml(item.playerName)}</strong></td>
          <td><span class="category-pill">${escapeHtml(item.gameTitle || item.gameId)}</span></td>
          <td style="font-family:'Space Mono',monospace; font-weight:700; color:var(--amber);">${Number(item.score).toLocaleString()}</td>
          <td style="font-family:'Space Mono',monospace; color:#86efac; font-weight:600;">+${Number(item.arcadePoints || 0).toLocaleString()} EXP</td>
          <td style="font-family:'Space Mono',monospace; font-size:0.78rem; color:var(--text-3);">${dateStr}</td>
          <td style="text-align:right;">
            <button class="btn-delete-prod" onclick="deleteLeaderboardScorePrompt('${item.id}', '${escapeHtml(item.playerName)}')">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error rendering admin leaderboard:', err);
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--red); padding:1.5rem;">Gagal memuat: ${err.message}</td></tr>`;
  }
}

function setAdminLeaderboardFilter(gameId) {
  adminLbFilterGame = gameId;
  document.querySelectorAll('.admin-lb-filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-filter') === gameId);
  });
  renderAdminLeaderboard(false);
}

async function deleteLeaderboardScorePrompt(docId, playerName) {
  if (confirm(`Yakin ingin menghapus rekor skor pemain "${playerName}" (${docId}) dari Leaderboard?`)) {
    try {
      if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && firestoreDb) {
        await firestoreDb.collection('leaderboard').doc(docId).delete();
      }
      // Hapus dari cache lokal juga
      const local = JSON.parse(localStorage.getItem('ic_leaderboard_cache') || '[]');
      const filtered = local.filter(i => i.id !== docId);
      localStorage.setItem('ic_leaderboard_cache', JSON.stringify(filtered));
      if (FirestoreDB._cachedLeaderboard) FirestoreDB._cachedLeaderboard = filtered;

      showToast(`Rekor skor ${playerName} berhasil dihapus.`);
      renderAdminLeaderboard(true);
    } catch (err) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  }
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
