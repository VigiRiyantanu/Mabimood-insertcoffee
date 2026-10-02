/**
 * ============================================================
 * INSERT COFFEE — FIREBASE & FIRESTORE INTEGRATION
 * ============================================================
 * Modul konfigurasi dan service untuk Firebase Authentication & Cloud Firestore.
 */

'use strict';

// Konfigurasi Firebase bawaan proyek insert-coffe
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDzDI9TJArnT4c6XyaFySbBgrvOVHxPokM",
  authDomain: "insert-coffe.firebaseapp.com",
  projectId: "insert-coffe",
  storageBucket: "insert-coffe.firebasestorage.app",
  messagingSenderId: "212320159295",
  appId: "1:212320159295:web:bd83ce998ac7cf28149a8a",
  measurementId: "G-RX11WQZ69W"
};

// State internal
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let isFirebaseActive = false;
let firebaseStatusInfo = {
  status: 'unconfigured', // 'connected' | 'unconfigured' | 'error'
  message: 'Firebase belum aktif.'
};

/* ============================================================
   LOCAL STORAGE SAFE HELPERS (Anti-Crash)
   ============================================================ */
function getLocalOrdersSafe() {
  try {
    const raw = localStorage.getItem('ic_orders');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice().reverse() : [];
  } catch (e) {
    return [];
  }
}

function saveLocalOrderSafe(orderData) {
  try {
    const raw = localStorage.getItem('ic_orders');
    const orders = raw ? JSON.parse(raw) : [];
    const exists = orders.some(o => o.id === orderData.id);
    if (!exists) {
      orders.push(orderData);
      localStorage.setItem('ic_orders', JSON.stringify(orders));
    }
    if (typeof OrderStore !== 'undefined' && OrderStore.history) {
      const inMem = OrderStore.history.some(o => o.id === orderData.id);
      if (!inMem) OrderStore.history.push(orderData);
    }
  } catch (e) {
    console.warn('saveLocalOrderSafe note:', e);
  }
}

function updateLocalOrderStatusSafe(orderId, newStatus) {
  try {
    const raw = localStorage.getItem('ic_orders');
    const orders = raw ? JSON.parse(raw) : [];
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      localStorage.setItem('ic_orders', JSON.stringify(orders));
    }
    if (typeof OrderStore !== 'undefined' && OrderStore.history) {
      const inMem = OrderStore.history.find(o => o.id === orderId);
      if (inMem) inMem.status = newStatus;
    }
  } catch (e) {
    console.warn('updateLocalOrderStatusSafe note:', e);
  }
}

function deleteLocalOrderSafe(orderId) {
  try {
    const raw = localStorage.getItem('ic_orders');
    const orders = raw ? JSON.parse(raw) : [];
    const filtered = orders.filter(o => o.id !== orderId);
    localStorage.setItem('ic_orders', JSON.stringify(filtered));
    if (typeof OrderStore !== 'undefined' && OrderStore.history) {
      OrderStore.history = OrderStore.history.filter(o => o.id !== orderId);
    }
  } catch (e) {
    console.warn('deleteLocalOrderSafe note:', e);
  }
}

// Ambil konfigurasi (dari localStorage atau default)
function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem('ic_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.apiKey !== 'YOUR_API_KEY') {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved firebase config:', e);
  }

  if (DEFAULT_FIREBASE_CONFIG.apiKey && DEFAULT_FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
    return DEFAULT_FIREBASE_CONFIG;
  }

  return null;
}

// Inisialisasi Firebase
function initFirebase() {
  const config = getActiveFirebaseConfig();

  if (!config) {
    isFirebaseActive = false;
    firebaseStatusInfo = {
      status: 'unconfigured',
      message: 'Firebase belum disetel. Sistem berjalan dalam Mode Demo Lokal.'
    };
    return false;
  }

  if (typeof firebase === 'undefined') {
    isFirebaseActive = false;
    firebaseStatusInfo = {
      status: 'error',
      message: 'Script Firebase SDK tidak ditemukan atau terblokir.'
    };
    return false;
  }

  try {
    // Hindari inisialisasi ganda
    if (!firebase.apps || !firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }

    if (typeof firebase.auth === 'function') {
      firebaseAuth = firebase.auth();
    }
    if (typeof firebase.firestore === 'function') {
      firestoreDb = firebase.firestore();
    }

    isFirebaseActive = true;
    firebaseStatusInfo = {
      status: 'connected',
      projectId: config.projectId,
      message: `Terhubung ke Cloud Firestore (${config.projectId})`
    };
    console.log('[Firebase] Initialized successfully for project:', config.projectId);
    return true;
  } catch (err) {
    console.error('Firebase init error:', err);
    isFirebaseActive = false;
    firebaseStatusInfo = {
      status: 'error',
      message: 'Gagal inisialisasi Firebase: ' + (err.message || err)
    };
    return false;
  }
}

/* ============================================================
   ADMIN AUTHENTICATION SERVICE (Tahan Error & Fallback)
   ============================================================ */
const AdminAuth = {
  isLoggedIn() {
    const session = this.getSession();
    return !!session;
  },

  getSession() {
    try {
      const s = localStorage.getItem('ic_admin_session');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },

  setSession(userObj) {
    try {
      localStorage.setItem('ic_admin_session', JSON.stringify({
        uid: userObj.uid || 'admin-local-uid',
        email: userObj.email || 'admin@insertcoffee.id',
        name: userObj.displayName || 'Administrator',
        role: 'admin',
        loginTime: new Date().toISOString(),
        authType: userObj.authType || (isFirebaseActive ? 'firebase' : 'local')
      }));
    } catch (e) {}
  },

  clearSession() {
    try {
      localStorage.removeItem('ic_admin_session');
    } catch (e) {}
  },

  // Login handler tahan error
  async login(email, password) {
    email = (email || '').trim();
    password = (password || '').trim();

    if (!email || !password) {
      throw new Error('Email dan password wajib diisi.');
    }

    const isDefaultAdmin = (email.toLowerCase() === 'admin@insertcoffee.id' && password === 'admin123');

    // 1. Coba login lewat Firebase Auth jika aktif
    if (isFirebaseActive && firebaseAuth) {
      try {
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        this.setSession({ ...user, authType: 'firebase' });
        return { success: true, user, authType: 'firebase' };
      } catch (fbErr) {
        console.warn('Firebase Auth note:', fbErr.code || fbErr.message);

        // Jika kredensial default admin@insertcoffee.id / admin123, jangan kunci admin di luar!
        // Berikan akses langsung via Local Fallback
        if (isDefaultAdmin) {
          const fallbackUser = {
            uid: 'admin-local-fallback',
            email: 'admin@insertcoffee.id',
            displayName: 'Administrator (Local Mode)',
            authType: 'local_fallback'
          };
          this.setSession(fallbackUser);
          return { success: true, user: fallbackUser, authType: 'local_fallback' };
        }

        // Pesan error ramah pengguna jika bukan kredensial default
        let msg = fbErr.message || 'Login gagal';
        if (fbErr.code === 'auth/operation-not-allowed') {
          msg = 'Email/Password sign-in belum diaktifkan di Firebase Console.';
        } else if (fbErr.code === 'auth/invalid-credential' || fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/wrong-password') {
          msg = 'Email atau kata sandi tidak valid. Silakan periksa kembali.';
        }
        throw new Error(msg);
      }
    }

    // 2. Mode Fallback Lokal (jika Firebase offline/tidak aktif)
    if (isDefaultAdmin) {
      const mockUser = {
        uid: 'admin-local-' + Date.now(),
        email: 'admin@insertcoffee.id',
        displayName: 'Administrator',
        authType: 'local'
      };
      this.setSession(mockUser);
      return { success: true, user: mockUser, authType: 'local' };
    } else {
      throw new Error('Email atau kata sandi admin tidak valid.');
    }
  },

  async logout() {
    if (isFirebaseActive && firebaseAuth) {
      try {
        await firebaseAuth.signOut();
      } catch (e) {}
    }
    this.clearSession();
    return true;
  }
};

/* ============================================================
   FIRESTORE DATABASE SERVICE (Tahan Error)
   ============================================================ */
const FirestoreDB = {
  _unsubscribeOrders: null,
  _unsubscribeProducts: null,

  // --- ORDERS COLLECTION (Sinkron dengan koleksi 'order' di Firestore Console) ---
  listenToOrders(onUpdateCallback) {
    if (this._unsubscribeOrders) {
      try { this._unsubscribeOrders(); } catch(e) {}
      this._unsubscribeOrders = null;
    }

    if (isFirebaseActive && firestoreDb) {
      try {
        // Mendengarkan koleksi 'order'
        this._unsubscribeOrders = firestoreDb.collection('order')
          .limit(100)
          .onSnapshot(
            (snapshot) => {
              const orders = [];
              snapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
              });
              // Urutkan pesanan terbaru di paling atas berdasarkan waktu
              orders.sort((a, b) => {
                const timeA = new Date(a.createdAt || a.timestamp || 0).getTime();
                const timeB = new Date(b.createdAt || b.timestamp || 0).getTime();
                return timeB - timeA;
              });
              onUpdateCallback(orders, 'firestore');
            },
            (err) => {
              console.warn('Firestore order onSnapshot notice (menggunakan data lokal):', err.message || err);
              const localOrders = getLocalOrdersSafe();
              onUpdateCallback(localOrders, 'local');
            }
          );
        return;
      } catch (e) {
        console.warn('Error attaching firestore order listener:', e);
      }
    }

    // Local mode listener fallback
    const localOrders = getLocalOrdersSafe();
    onUpdateCallback(localOrders, 'local');
  },

  // Simpan pesanan baru ke koleksi 'order'
  async addOrder(orderData) {
    saveLocalOrderSafe(orderData);

    if (isFirebaseActive && firestoreDb) {
      try {
        await firestoreDb.collection('order').doc(orderData.id).set({
          ...orderData,
          updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
        });
        console.log('[Firestore] Order synced to Firestore collection order:', orderData.id);
        return { success: true, id: orderData.id, source: 'firestore' };
      } catch (err) {
        console.warn('Firestore addOrder note (tersimpan di lokal):', err.message || err);
        return { success: true, id: orderData.id, source: 'local_fallback', error: err.message };
      }
    }

    return { success: true, id: orderData.id, source: 'local' };
  },

  // Update status pesanan di koleksi 'order'
  async updateOrderStatus(orderId, newStatus) {
    updateLocalOrderStatusSafe(orderId, newStatus);

    if (isFirebaseActive && firestoreDb) {
      try {
        await firestoreDb.collection('order').doc(orderId).update({
          status: newStatus,
          updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
        });
        return { success: true, orderId, newStatus, source: 'firestore' };
      } catch (err) {
        console.warn('Firestore updateOrderStatus note (terupdate di lokal):', err.message || err);
      }
    }

    return { success: true, orderId, newStatus, source: 'local' };
  },

  // Hapus pesanan di koleksi 'order'
  async deleteOrder(orderId) {
    deleteLocalOrderSafe(orderId);

    if (isFirebaseActive && firestoreDb) {
      try {
        await firestoreDb.collection('order').doc(orderId).delete();
        return { success: true, orderId };
      } catch (err) {
        console.warn('Firestore deleteOrder note:', err.message || err);
      }
    }

    return { success: true, orderId };
  },

  // --- PRODUCTS COLLECTION ---
  listenToProducts(onUpdateCallback) {
    if (this._unsubscribeProducts) {
      try { this._unsubscribeProducts(); } catch(e) {}
      this._unsubscribeProducts = null;
    }

    if (isFirebaseActive && firestoreDb) {
      try {
        this._unsubscribeProducts = firestoreDb.collection('products')
          .onSnapshot(
            (snapshot) => {
              if (snapshot.empty) {
                onUpdateCallback(null, 'empty');
                return;
              }
              const products = [];
              snapshot.forEach((doc) => {
                products.push({ id: doc.id, ...doc.data() });
              });
              onUpdateCallback(products, 'firestore');
            },
            (err) => {
              console.warn('Firestore products notice (menggunakan menu bawaan):', err.message || err);
              onUpdateCallback(null, 'local');
            }
          );
        return;
      } catch (e) {
        console.warn('Error attaching firestore products listener:', e);
      }
    }

    onUpdateCallback(null, 'local');
  },

  async saveProduct(product) {
    const prodId = product.id || ('prod_' + Date.now());
    const prodData = {
      id: prodId,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      description: product.description || '',
      available: product.available !== false
    };

    if (isFirebaseActive && firestoreDb) {
      try {
        await firestoreDb.collection('products').doc(prodId).set(prodData, { merge: true });
        return { success: true, product: prodData, source: 'firestore' };
      } catch (err) {
        console.warn('Firestore saveProduct note:', err.message || err);
        return { success: true, product: prodData, source: 'local' };
      }
    }

    return { success: true, product: prodData, source: 'local' };
  },

  async deleteProduct(productId) {
    if (isFirebaseActive && firestoreDb) {
      try {
        await firestoreDb.collection('products').doc(productId).delete();
        return { success: true, productId, source: 'firestore' };
      } catch (err) {
        console.warn('Firestore deleteProduct note:', err.message || err);
      }
    }

    return { success: true, productId, source: 'local' };
  },

  async seedDefaultProducts(defaultProductsList) {
    if (!isFirebaseActive || !firestoreDb) {
      throw new Error('Firebase belum aktif atau belum terhubung.');
    }

    const batch = firestoreDb.batch();
    defaultProductsList.forEach(prod => {
      const docRef = firestoreDb.collection('products').doc(prod.id);
      batch.set(docRef, {
        id: prod.id,
        name: prod.name,
        category: prod.category,
        price: prod.price,
        description: prod.description,
        available: prod.available !== false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
    return { success: true, count: defaultProductsList.length };
  },

  /* ============================================================
     LEADERBOARD SERVICE (Real-time Firestore + 5s Rate Limiter)
     ============================================================ */
  _lastLeaderboardFetch: 0,
  _cachedLeaderboard: [],

  // Konversi skor tiap game ke poin arcade terstandarisasi
  calculateArcadePoints(gameId, score) {
    score = Number(score) || 0;
    switch (gameId) {
      case 'flappy':    return score * 50;  // 10 tiang = 500 poin
      case 'snake':     return score * 10;  // 50 apel = 500 poin
      case 'pong':      return score * 100; // 5 gol = 500 poin
      case 'tetris':    return Math.floor(score / 2);
      case 'breakout':  return Math.floor(score / 5);
      case 'spaceinv':  return Math.floor(score / 5);
      case 'g2048':     return Math.floor(score / 10);
      case 'minesweep': return score * 50;
      case 'memory':    return score * 30;
      case 'tictactoe': return score * 50;
      default:          return score;
    }
  },

  // Simpan skor baru ke Cloud Firestore (/leaderboard) — berapapun poinnya langsung masuk!
  async submitLeaderboardScore(gameId, gameTitle, playerName, score, simplePin = '') {
    score = Math.max(0, Math.round(Number(score) || 0));
    const cleanName = String(playerName || 'Pemain Tamu').trim().substring(0, 16);
    if (!cleanName) return { success: false, message: 'Nama tidak valid' };

    const arcadePoints = this.calculateArcadePoints(gameId, score);
    const newEntry = {
      id: 'lb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      gameId: String(gameId || 'arcade').toLowerCase(),
      gameTitle: gameTitle || String(gameId || 'ARCADE').toUpperCase(),
      playerName: cleanName,
      score: score,
      arcadePoints: arcadePoints,
      pin: simplePin ? String(simplePin).trim() : '',
      createdAt: new Date().toISOString()
    };

    // 1. Simpan selalu ke Local Storage sebagai cadangan offline
    try {
      const local = JSON.parse(localStorage.getItem('ic_leaderboard_cache') || '[]');
      local.unshift(newEntry);
      localStorage.setItem('ic_leaderboard_cache', JSON.stringify(local.slice(0, 200)));
      this._cachedLeaderboard = local;
      this._lastLeaderboardFetch = 0; // Hapus cooldown agar update langsung muncul
    } catch (e) {}

    // 2. Simpan ke Cloud Firestore jika aktif
    if (isFirebaseActive && firestoreDb) {
      try {
        const docRef = await firestoreDb.collection('leaderboard').add({
          gameId: newEntry.gameId,
          gameTitle: newEntry.gameTitle,
          playerName: newEntry.playerName,
          score: newEntry.score,
          arcadePoints: newEntry.arcadePoints,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newEntry.id = docRef.id;
        this._lastLeaderboardFetch = 0;
        return { success: true, id: docRef.id, source: 'firestore', entry: newEntry };
      } catch (err) {
        console.warn('Firestore submitLeaderboardScore error:', err);
      }
    }

    return { success: true, id: newEntry.id, source: 'local', entry: newEntry };
  },

  // Mengambil data leaderboard dengan Rate Limiting 5 Detik
  async getLeaderboardData(forceRefresh = false) {
    const now = Date.now();
    const elapsed = now - this._lastLeaderboardFetch;
    const cooldownRemaining = Math.max(0, 5000 - elapsed);

    // Ambil cache lokal jika memori kosong
    if (this._cachedLeaderboard.length === 0) {
      try {
        this._cachedLeaderboard = JSON.parse(localStorage.getItem('ic_leaderboard_cache') || '[]');
      } catch (e) {
        this._cachedLeaderboard = [];
      }
    }

    // Jika belum lewat 5 detik dan tidak dipaksa, gunakan cache (Rate Limit Protection)
    if (!forceRefresh && cooldownRemaining > 0 && this._cachedLeaderboard.length > 0) {
      return {
        success: true,
        items: this._cachedLeaderboard,
        fromCache: true,
        cooldownSeconds: Math.ceil(cooldownRemaining / 1000)
      };
    }

    // Ambil dari Cloud Firestore
    if (isFirebaseActive && firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection('leaderboard')
          .limit(300)
          .get();

        const items = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const pName = String(data.playerName || data.gamertag || data.player || data.name || '').trim();
          const pScore = Number(data.score ?? data.points ?? data.arcadePoints ?? 0);
          
          // Accept any valid score >= 0
          if (!pName || isNaN(pScore) || pScore < 0) return;

          let dateStr = '';
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            dateStr = data.createdAt.toDate().toISOString();
          } else if (data.createdAt) {
            dateStr = String(data.createdAt);
          } else {
            dateStr = new Date().toISOString();
          }

          items.push({
            id: doc.id,
            gameId: (data.gameId || '').toLowerCase(),
            gameTitle: data.gameTitle || (data.gameId || '').toUpperCase(),
            playerName: pName,
            gamertag: pName,
            score: pScore,
            arcadePoints: Number(data.arcadePoints) || this.calculateArcadePoints(data.gameId, pScore),
            createdAt: dateStr
          });
        });

        // Sort descending by score
        items.sort((a, b) => b.score - a.score);

        this._cachedLeaderboard = items;
        this._lastLeaderboardFetch = Date.now();
        try {
          localStorage.setItem('ic_leaderboard_cache', JSON.stringify(items));
        } catch (e) {}

        return {
          success: true,
          items: items,
          fromCache: false,
          cooldownSeconds: 0
        };
      } catch (err) {
        console.warn('Firestore fetch leaderboard failed:', err);
      }
    }

    // Fallback lokal jika Firestore offline
    this._lastLeaderboardFetch = Date.now();
    return {
      success: true,
      items: this._cachedLeaderboard,
      fromCache: true,
      cooldownSeconds: 0
    };
  },

  // Real-time listener untuk Leaderboard
  _unsubscribeLeaderboard: null,
  listenToLeaderboard(callback) {
    if (this._unsubscribeLeaderboard) {
      try { this._unsubscribeLeaderboard(); } catch (e) {}
      this._unsubscribeLeaderboard = null;
    }

    if (isFirebaseActive && firestoreDb) {
      try {
        this._unsubscribeLeaderboard = firestoreDb.collection('leaderboard')
          .limit(100)
          .onSnapshot(snapshot => {
            const items = [];
            snapshot.forEach(doc => {
              const pName = String(data.playerName || data.gamertag || data.player || data.name || '').trim();
              const pScore = Number(data.score ?? data.points ?? data.arcadePoints ?? 0);
              if (!pName || isNaN(pScore) || pScore < 0) return;

              let dateStr = '';
              if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                dateStr = data.createdAt.toDate().toISOString();
              } else if (data.createdAt) {
                dateStr = String(data.createdAt);
              } else {
                dateStr = new Date().toISOString();
              }

              items.push({
                id: doc.id,
                gameId: (data.gameId || '').toLowerCase(),
                gameTitle: data.gameTitle || (data.gameId || '').toUpperCase(),
                playerName: pName,
                gamertag: pName,
                score: pScore,
                arcadePoints: Number(data.arcadePoints) || this.calculateArcadePoints(data.gameId, pScore),
                createdAt: dateStr
              });
            });

            items.sort((a, b) => b.score - a.score);
            this._cachedLeaderboard = items;
            try { localStorage.setItem('ic_leaderboard_cache', JSON.stringify(items)); } catch(e) {}
            if (typeof callback === 'function') callback(items, 'firestore');
          }, err => {
            console.warn('Firestore leaderboard real-time listener note:', err);
            if (typeof callback === 'function') callback(this._cachedLeaderboard, 'error');
          });
        return;
      } catch (err) {
        console.warn('listenToLeaderboard setup note:', err);
      }
    }

    // Offline fallback
    if (typeof callback === 'function') {
      const cached = JSON.parse(localStorage.getItem('ic_leaderboard_cache') || '[]');
      callback(cached, 'local');
    }
  },

  async testConnection() {
    if (!isFirebaseActive || !firestoreDb) {
      return { success: false, message: 'Firebase belum terhubung. Periksa konfigurasi API Key dan Project ID Anda.' };
    }

    try {
      const testDocRef = firestoreDb.collection('_health_check').doc('ping');
      await testDocRef.set({ timestamp: Date.now(), agent: 'Insert Coffee Admin' });
      await testDocRef.delete();
      return { success: true, message: 'Koneksi ke Cloud Firestore berhasil dan memiliki izin Read/Write!' };
    } catch (err) {
      return { success: false, message: 'Gagal terhubung ke Firestore: ' + (err.message || err) };
    }
  },

  saveConfig(newConfig) {
    try {
      localStorage.setItem('ic_firebase_config', JSON.stringify(newConfig));
      return initFirebase();
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  resetConfig() {
    try {
      localStorage.removeItem('ic_firebase_config');
      return initFirebase();
    } catch (e) {
      return false;
    }
  }
};

// Inisialisasi otomatis
initFirebase();
