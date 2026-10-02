'use strict';

/* ============================================================
   GAMES — ARCADE HUB, GAME ENGINE & RETRO MINIGAME ENGINES
   ============================================================ */
/* ============================================================
   ARCADE PAGE
   ============================================================ */
let showingHS = false;

function renderArcade() {
  const el = document.getElementById('arcadeGrid');
  if (!el) return;
  el.innerHTML = GAMES.map(g => {
    const hs = HSStore.getBest(g.id);
    return `
    <div class="game-card" onclick="openGame('${g.id}')" tabindex="0" role="button" aria-label="Play ${g.title}">
      <div class="game-card-icon">${gameIconText(g.id)}</div>
      <div class="game-card-info">
        <div class="game-card-title">${g.title}</div>
        <div class="game-card-desc">${g.desc}</div>
        <div class="game-card-meta">
          ${g.controls.slice(0,1).map(c => `<div class="game-meta-item"><strong>Controls</strong>${c[0]}</div>`).join('')}
          <div class="game-meta-item"><strong>Category</strong>${g.category}</div>
        </div>
        ${hs > 0 ? `<div class="game-card-hs">Best: <span>${hs.toLocaleString()}</span></div>` : ''}
        <div style="margin-top:0.75rem;"><button class="btn-play" onclick="event.stopPropagation(); openGame('${g.id}')">Play</button></div>
      </div>
    </div>
    `;
  }).join('');
  init3DTilt();

  if (showingHS) {
    if (typeof renderLeaderboardView === 'function') renderLeaderboardView();
  } else {
    const p = document.getElementById('highScoresPanel');
    if (p) p.innerHTML = '';
  }
}

/* ============================================================
   ARCADE LEADERBOARD (Per Game & Keseluruhan + 5s Rate Limiter)
   ============================================================ */
let lbCurrentTab = 'overall'; // 'overall' | 'game'
let lbSelectedGame = 'snake';
let lbCooldownSeconds = 0;
let lbCooldownInterval = null;

function toggleHighScores() {
  showingHS = !showingHS;
  const panel = document.getElementById('highScoresPanel');
  if (!panel) return;
  if (showingHS) {
    renderLeaderboardView();
    // Sinkronkan data dari Firestore saat dibuka
    syncLeaderboardWithRateLimit(false);
  } else {
    panel.innerHTML = '';
  }
}

function switchLeaderboardTab(tab) {
  lbCurrentTab = tab;
  renderLeaderboardView();
}

function switchLeaderboardGame(gameId) {
  lbSelectedGame = gameId;
  renderLeaderboardView();
}

async function syncLeaderboardWithRateLimit(force = true) {
  if (lbCooldownSeconds > 0) {
    showToast(`Tunggu ${lbCooldownSeconds} detik untuk sinkronisasi berikutnya (Rate Limit)`, 'warning');
    return;
  }

  const refreshBtn = document.getElementById('lbRefreshBtn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `<span>Menyinkronkan...</span>`;
  }

  try {
    let res = null;
    if (typeof FirestoreDB !== 'undefined' && typeof FirestoreDB.getLeaderboardData === 'function') {
      res = await FirestoreDB.getLeaderboardData(force);
    }

    startLeaderboardCooldown(5); // 5 detik rate limit sesuai instruksi

    if (showingHS) renderLeaderboardView();
    if (res) {
      showToast(res.fromCache ? 'Data papan skor termutakhir (cache sinkron).' : 'Papan skor berhasil disinkronkan dari Cloud Firestore!', 'success');
    }
  } catch (err) {
    console.warn('Leaderboard sync error:', err);
    startLeaderboardCooldown(5);
    if (showingHS) renderLeaderboardView();
  }
}

function startLeaderboardCooldown(seconds) {
  lbCooldownSeconds = Math.max(lbCooldownSeconds, seconds);
  const btn = document.getElementById('lbRefreshBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>Tunggu (${lbCooldownSeconds}s)</span>`;
  }

  if (lbCooldownInterval) clearInterval(lbCooldownInterval);
  lbCooldownInterval = setInterval(() => {
    lbCooldownSeconds--;
    const currentBtn = document.getElementById('lbRefreshBtn');
    if (lbCooldownSeconds <= 0) {
      clearInterval(lbCooldownInterval);
      lbCooldownInterval = null;
      lbCooldownSeconds = 0;
      if (currentBtn) {
        currentBtn.disabled = false;
        currentBtn.innerHTML = `<span>Refresh Papan Skor</span>`;
      }
    } else if (currentBtn) {
      currentBtn.innerHTML = `<span>Tunggu (${lbCooldownSeconds}s)</span>`;
    }
  }, 1000);
}

function renderLeaderboardView() {
  const el = document.getElementById('highScoresPanel');
  if (!el) return;

  const currentProfile = UserProfileStore.get();
  const currentUserName = currentProfile ? currentProfile.name.toLowerCase() : '';

  // Ambil data cache
  let allEntries = [];
  try {
    allEntries = JSON.parse(localStorage.getItem('ic_leaderboard_cache') || '[]');
  } catch (e) {
    allEntries = [];
  }

  // Jika cache kosong, buat fallback dari HSStore lokal
  if (allEntries.length === 0 && typeof HSStore !== 'undefined') {
    Object.keys(HSStore.scores || {}).forEach(gId => {
      const list = HSStore.scores[gId] || [];
      const gObj = GAMES.find(g => g.id === gId);
      list.forEach(item => {
        allEntries.push({
          gameId: gId,
          gameTitle: gObj ? gObj.title : gId.toUpperCase(),
          playerName: item.name || 'Pemain',
          score: item.score,
          arcadePoints: typeof FirestoreDB !== 'undefined' ? FirestoreDB.calculateArcadePoints(gId, item.score) : item.score * 10,
          createdAt: new Date(item.date || Date.now()).toISOString()
        });
      });
    });
  }

  const isConnected = typeof isFirebaseActive !== 'undefined' && isFirebaseActive;

  let podiumHtml = '';
  let contentHtml = '';

  const gameIconsMap = {
    snake: '▶', tetris: '■', pong: '●', breakout: '▤',
    spaceinv: '▲', minesweep: '◆', flappy: '▼',
    memory: '◇', g2048: '◈', tictactoe: '✕'
  };

  if (lbCurrentTab === 'overall') {
    // === TAB 1: NOMINASI KESELURUHAN (MASTER ARCADE / HALL OF FAME) ===
    const playerAggregates = {};
    allEntries.forEach(entry => {
      const pName = (entry.playerName || 'Pemain').trim();
      const pKey = pName.toLowerCase();
      if (!playerAggregates[pKey]) {
        playerAggregates[pKey] = {
          name: pName,
          totalArcadePoints: 0,
          games: {},
          lastActive: entry.createdAt
        };
      }
      const p = playerAggregates[pKey];
      if (!p.games[entry.gameId] || entry.score > p.games[entry.gameId].score) {
        p.games[entry.gameId] = {
          score: entry.score,
          points: entry.arcadePoints
        };
      }
      if (new Date(entry.createdAt) > new Date(p.lastActive)) {
        p.lastActive = entry.createdAt;
      }
    });

    const overallList = Object.values(playerAggregates).map(p => {
      let totalPts = 0;
      let gameCount = 0;
      Object.values(p.games).forEach(g => {
        totalPts += g.points || 0;
        gameCount++;
      });
      return {
        name: p.name,
        totalPoints: totalPts,
        gamesPlayed: gameCount,
        lastActive: p.lastActive
      };
    });

    overallList.sort((a, b) => b.totalPoints - a.totalPoints);
    const topOverall = overallList;

    // Podium untuk Top 3
    if (topOverall.length >= 2) {
      const rank1 = topOverall[0];
      const rank2 = topOverall[1];
      const rank3 = topOverall.length >= 3 ? topOverall[2] : null;

      podiumHtml = `
        <div class="lb-podium-grid">
          <!-- Rank 2: Silver -->
          <div class="lb-podium-card rank-2">
            <span class="podium-rank-tag">#2 RANK 2</span>
            <div class="podium-avatar-wrap"><span>2</span></div>
            <div class="podium-player-name">${escapeHtml(rank2.name)}</div>
            <div class="podium-score">${rank2.totalPoints.toLocaleString()} <span style="font-size:0.75rem;">EXP</span></div>
            <div class="podium-sub">${rank2.gamesPlayed} Minigame Dimainkan</div>
          </div>

          <!-- Rank 1: Gold Crown -->
          <div class="lb-podium-card rank-1">
            <div class="podium-crown-icon">★</div>
            <span class="podium-rank-tag">#1 JUARA UMUM</span>
            <div class="podium-avatar-wrap"><span>1</span></div>
            <div class="podium-player-name" style="font-size:1.15rem; color:var(--amber);">${escapeHtml(rank1.name)}</div>
            <div class="podium-score" style="font-size:1.35rem;">${rank1.totalPoints.toLocaleString()} <span style="font-size:0.8rem;">EXP</span></div>
            <div class="podium-sub">${rank1.gamesPlayed} Minigame Dimainkan</div>
          </div>

          <!-- Rank 3: Bronze -->
          ${rank3 ? `
            <div class="lb-podium-card rank-3">
              <span class="podium-rank-tag">#3 RANK 3</span>
              <div class="podium-avatar-wrap"><span>3</span></div>
              <div class="podium-player-name">${escapeHtml(rank3.name)}</div>
              <div class="podium-score">${rank3.totalPoints.toLocaleString()} <span style="font-size:0.75rem;">EXP</span></div>
              <div class="podium-sub">${rank3.gamesPlayed} Minigame Dimainkan</div>
            </div>
          ` : `
            <div class="lb-podium-card rank-3" style="opacity:0.5;">
              <span class="podium-rank-tag">#3 RANK 3</span>
              <div class="podium-avatar-wrap"><span>-</span></div>
              <div class="podium-player-name">Belum Terisi</div>
              <div class="podium-score">0 EXP</div>
            </div>
          `}
        </div>
      `;
    }

    contentHtml = `
      ${podiumHtml}

      <div class="lb-table-wrap">
        <table class="lb-table">
          <thead>
            <tr>
              <th style="width:60px;">Rank</th>
              <th>Pemain / Gamer Tag</th>
              <th>Total Poin Arcade (EXP)</th>
              <th>Game Dimainkan</th>
              <th style="text-align:right;">Terakhir Main</th>
            </tr>
          </thead>
          <tbody>
            ${topOverall.length === 0 ? `
              <tr>
                <td colspan="5" class="lb-empty-state">
                  Belum ada rekor permainan. Mainkan minigame arcade dan jadilah juara pertama!
                </td>
              </tr>
            ` : topOverall.map((p, idx) => {
              const isSelf = currentUserName && p.name.toLowerCase() === currentUserName;
              const rankIcons = ['#1', '#2', '#3'];
              const rankBadge = idx < 3 ? rankIcons[idx] : `#${idx + 1}`;
              const rankClass = idx === 0 ? 'lb-rank-1' : idx === 1 ? 'lb-rank-2' : idx === 2 ? 'lb-rank-3' : '';
              const dateStr = p.lastActive ? new Date(p.lastActive).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-';

              return `
                <tr style="${isSelf ? 'background:rgba(212,168,83,0.08);' : ''}">
                  <td><span class="lb-rank-badge ${rankClass}">${rankBadge}</span></td>
                  <td>
                    <div class="lb-player-cell">
                      <div class="lb-player-avatar-thumb">★</div>
                      <span>${escapeHtml(p.name)}</span>
                      ${isSelf ? '<span class="lb-player-tag-self">Anda</span>' : ''}
                    </div>
                  </td>
                  <td><span class="lb-exp-val">${p.totalPoints.toLocaleString()} EXP</span></td>
                  <td><span style="font-family:'Space Mono',monospace; color:var(--text-2);">${p.gamesPlayed} Game</span></td>
                  <td style="text-align:right;"><span class="lb-date-text">${dateStr}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    // === TAB 2: NOMINASI PER GAME ===
    const gameEntries = allEntries.filter(e => e.gameId === lbSelectedGame);
    
    const bestPerPlayer = {};
    gameEntries.forEach(e => {
      const key = e.playerName.toLowerCase();
      if (!bestPerPlayer[key] || e.score > bestPerPlayer[key].score) {
        bestPerPlayer[key] = e;
      }
    });

    const sortedGameList = Object.values(bestPerPlayer).sort((a, b) => b.score - a.score);
    const activeGameObj = GAMES.find(g => g.id === lbSelectedGame);

    if (sortedGameList.length >= 2) {
      const r1 = sortedGameList[0];
      const r2 = sortedGameList[1];
      const r3 = sortedGameList.length >= 3 ? sortedGameList[2] : null;

      podiumHtml = `
        <div class="lb-podium-grid">
          <div class="lb-podium-card rank-2">
            <span class="podium-rank-tag">#2 RANK 2</span>
            <div class="podium-avatar-wrap"><span>2</span></div>
            <div class="podium-player-name">${escapeHtml(r2.playerName)}</div>
            <div class="podium-score">${r2.score.toLocaleString()}</div>
            <div class="podium-sub">+${r2.arcadePoints || 0} EXP</div>
          </div>

          <div class="lb-podium-card rank-1">
            <div class="podium-crown-icon">★</div>
            <span class="podium-rank-tag">#1 JUARA ${activeGameObj?.title || 'GAME'}</span>
            <div class="podium-avatar-wrap"><span>1</span></div>
            <div class="podium-player-name" style="font-size:1.15rem; color:var(--amber);">${escapeHtml(r1.playerName)}</div>
            <div class="podium-score" style="font-size:1.35rem;">${r1.score.toLocaleString()}</div>
            <div class="podium-sub">+${r1.arcadePoints || 0} EXP</div>
          </div>

          ${r3 ? `
            <div class="lb-podium-card rank-3">
              <span class="podium-rank-tag">#3 RANK 3</span>
              <div class="podium-avatar-wrap"><span>3</span></div>
              <div class="podium-player-name">${escapeHtml(r3.playerName)}</div>
              <div class="podium-score">${r3.score.toLocaleString()}</div>
              <div class="podium-sub">+${r3.arcadePoints || 0} EXP</div>
            </div>
          ` : `
            <div class="lb-podium-card rank-3" style="opacity:0.5;">
              <span class="podium-rank-tag">#3 RANK 3</span>
              <div class="podium-avatar-wrap"><span>-</span></div>
              <div class="podium-player-name">Belum Terisi</div>
              <div class="podium-score">0</div>
            </div>
          `}
        </div>
      `;
    }

    contentHtml = `
      <!-- Interactive Game Selector Pills -->
      <div class="lb-game-select-bar">
        ${GAMES.map(g => `
          <button class="lb-game-pill ${g.id === lbSelectedGame ? 'active' : ''}" onclick="switchLeaderboardGame('${g.id}')">
            <span>${gameIconsMap[g.id] || '★'}</span>
            <span>${g.title}</span>
          </button>
        `).join('')}
      </div>

      ${podiumHtml}

      <div class="lb-table-wrap">
        <table class="lb-table">
          <thead>
            <tr>
              <th style="width:60px;">Rank</th>
              <th>Pemain</th>
              <th>Skor Tertinggi (${activeGameObj?.title || 'Game'})</th>
              <th>Poin Arcade</th>
              <th style="text-align:right;">Waktu Rekor</th>
            </tr>
          </thead>
          <tbody>
            ${sortedGameList.length === 0 ? `
              <tr>
                <td colspan="5" class="lb-empty-state">
                  Belum ada rekor untuk minigame <strong>${activeGameObj?.title || lbSelectedGame}</strong>. Mainkan sekarang!
                </td>
              </tr>
            ` : sortedGameList.map((item, idx) => {
              const isSelf = currentUserName && item.playerName.toLowerCase() === currentUserName;
              const rankIcons = ['#1', '#2', '#3'];
              const rankBadge = idx < 3 ? rankIcons[idx] : `#${idx + 1}`;
              const rankClass = idx === 0 ? 'lb-rank-1' : idx === 1 ? 'lb-rank-2' : idx === 2 ? 'lb-rank-3' : '';
              const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) : '-';

              return `
                <tr style="${isSelf ? 'background:rgba(212,168,83,0.08);' : ''}">
                  <td><span class="lb-rank-badge ${rankClass}">${rankBadge}</span></td>
                  <td>
                    <div class="lb-player-cell">
                      <div class="lb-player-avatar-thumb">★</div>
                      <span>${escapeHtml(item.playerName)}</span>
                      ${isSelf ? '<span class="lb-player-tag-self">Anda</span>' : ''}
                    </div>
                  </td>
                  <td><span class="lb-score-val">${item.score.toLocaleString()}</span></td>
                  <td><span class="lb-exp-val">+${item.arcadePoints || 0} EXP</span></td>
                  <td style="text-align:right;"><span class="lb-date-text">${dateStr}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="leaderboard-wrapper">
      <div class="lb-header">
        <div class="lb-title-group">
          <h3>★ PAPAN SKOR ARCADE (LEADERBOARD)</h3>
          <p class="lb-subtitle">Nominasi pemain terbaik dan juara bertahan di INSERT COFFEE</p>
        </div>
        <div class="lb-actions-bar">
          <span class="lb-status-pill">
            <span class="status-indicator ${isConnected ? 'online' : 'warning'}" style="width:6px;height:6px;"></span>
            <span>${isConnected ? 'Cloud Firestore Aktif' : 'Mode Offline Lokal'}</span>
          </span>
          <button class="lb-refresh-btn" id="lbRefreshBtn" onclick="syncLeaderboardWithRateLimit(true)" ${lbCooldownSeconds > 0 ? 'disabled' : ''}>
            <span>${lbCooldownSeconds > 0 ? `Tunggu (${lbCooldownSeconds}s)` : 'Refresh Papan Skor'}</span>
          </button>
        </div>
      </div>

      <!-- Main Interactive Tabs: Overall vs Per Game -->
      <div class="lb-tabs">
        <button class="lb-tab-btn ${lbCurrentTab === 'overall' ? 'active' : ''}" onclick="switchLeaderboardTab('overall')">
          <span>★</span>
          <span>Nominasi Keseluruhan (Hall of Fame)</span>
        </button>
        <button class="lb-tab-btn ${lbCurrentTab === 'game' ? 'active' : ''}" onclick="switchLeaderboardTab('game')">
          <span>◆</span>
          <span>Nominasi Per Minigame</span>
        </button>
      </div>

      ${contentHtml}

      <div style="margin-top:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; font-size:0.78rem; color:var(--text-3); border-top:1px solid var(--border); padding-top:1rem;">
        <div>
          Pemain aktif: <strong style="color:var(--amber);">${currentProfile ? escapeHtml(currentProfile.name) : 'Tamu'}</strong>
          <a href="playerloginpage.html?return=arcade" style="color:var(--amber); text-decoration:underline; cursor:pointer; margin-left:0.5rem; font-weight:600;">[Kelola Profil / Ganti Akun]</a>
        </div>
        <div>
          <span>Sinkronisasi dibatasi 1x tiap 5 detik (Rate Limit)</span>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   GAME ENGINE
   ============================================================ */
function openGame(gameId) {
  const gameData = GAMES.find(g => g.id === gameId);
  if (!gameData) return;

  if (!isPlayerLoggedIn()) {
    openPlayerAuthModal('game', gameId);
    return;
  }

  navigate('game');
  document.getElementById('gamePlayName').textContent = gameData.title;
  document.getElementById('gameDesc').textContent = gameData.desc;

  // Controls
  const cg = document.getElementById('controlsGrid');
  if (cg) {
    cg.innerHTML = gameData.controls.map(c => `
      <div class="control-row">
        <span class="key-badge">${c[0]}</span>
        <span class="control-action">${c[1]}</span>
      </div>
    `).join('');
  }

  // Scores
  document.getElementById('gameScoreDisplay').textContent = '0';
  document.getElementById('gameHsDisplay').textContent = HSStore.getBest(gameId).toLocaleString();

  // Canvas sizing
  const canvas = document.getElementById('gameCanvas');
  const isMobile = window.innerWidth <= 900;
  const cw = isMobile ? Math.min(window.innerWidth - 48, 400) : 480;
  const ch = isMobile ? Math.min(cw, 400) : 480;
  canvas.width = cw;
  canvas.height = ch;

  // Show start overlay
  showGameMsg('PRESS START', gameData.title, 'Start');

  // Initialize game
  if (currentGame) { currentGame.destroy?.(); currentGame = null; }

  const gameEngines = {
    snake: SnakeGame, tetris: TetrisGame, pong: PongGame,
    breakout: BreakoutGame, spaceinv: SpaceInvadersGame,
    minesweep: MinesweeperGame, flappy: FlappyGame,
    memory: MemoryGame, g2048: Game2048, tictactoe: TicTacToeGame,
    spacewar: SpaceWarGame, coffeemario: CoffeeMarioGame,
  };

  const GameClass = gameEngines[gameId];
  if (GameClass) {
    currentGame = new GameClass(canvas, gameId, onScoreUpdate, onGameOver);
    currentGame.init?.();
  }

  // Mobile controls
  setupMobileControls(gameId);
}

function onScoreUpdate(score) {
  const el = document.getElementById('gameScoreDisplay');
  if (el) el.textContent = score.toLocaleString();
}

function onGameOver(score, gameId) {
  score = Math.max(0, Math.round(Number(score) || 0));
  const profile = UserProfileStore.get();
  const playerName = (profile && profile.name) ? profile.name : 'Pemain Tamu';
  const playerPin = profile ? profile.pin : '';
  const gameData = GAMES.find(g => g.id === gameId);
  const gameTitle = gameData ? gameData.title : (gameId ? String(gameId).toUpperCase() : 'ARCADE');

  HSStore.add(gameId, score, playerName);
  const hs = HSStore.getBest(gameId);
  const hsEl = document.getElementById('gameHsDisplay');
  if (hsEl) hsEl.textContent = hs.toLocaleString();

  // Otomatis langsung kirim berapapun skornya ke Firebase Leaderboard
  if (typeof FirestoreDB !== 'undefined' && typeof FirestoreDB.submitLeaderboardScore === 'function') {
    FirestoreDB.submitLeaderboardScore(gameId, gameTitle, playerName, score, playerPin).then(res => {
      if (res && res.success) {
        showToast(`★ Skor ${score.toLocaleString()} (${gameTitle}) berhasil masuk Leaderboard!`, 'success');
        if (typeof RetroAudio !== 'undefined') RetroAudio.playWin();
        if (typeof Leaderboard !== 'undefined' && typeof Leaderboard.refresh === 'function') {
          Leaderboard.refresh();
        }
      }
    });
  }
  showGameMsg('GAME OVER', 'Score: ' + score.toLocaleString(), 'Restart');
  document.getElementById('startGameBtn').onclick = restartCurrentGame;
}

function showGameMsg(title, sub, btnText) {
  const overlay = document.getElementById('gameMsgOverlay');
  const t = document.getElementById('gameMsgTitle');
  const s = document.getElementById('gameMsgSub');
  const b = document.getElementById('startGameBtn');
  if (overlay) overlay.style.display = 'flex';
  if (t) t.textContent = title;
  if (s) s.textContent = sub;
  if (b) b.textContent = btnText;
}

function hideGameMsg() {
  const overlay = document.getElementById('gameMsgOverlay');
  if (overlay) overlay.style.display = 'none';
}

function startCurrentGame() {
  hideGameMsg();
  document.getElementById('startGameBtn').onclick = startCurrentGame;
  currentGame?.start?.();
  document.getElementById('pauseBtn').textContent = 'Pause';
}

function pauseCurrentGame() {
  const btn = document.getElementById('pauseBtn');
  if (!currentGame) return;
  if (currentGame.paused) {
    currentGame.resume?.();
    btn.textContent = 'Pause';
  } else {
    currentGame.pause?.();
    btn.textContent = 'Resume';
  }
}

function restartCurrentGame() {
  hideGameMsg();
  document.getElementById('startGameBtn').onclick = startCurrentGame;
  document.getElementById('pauseBtn').textContent = 'Pause';
  document.getElementById('gameScoreDisplay').textContent = '0';
  currentGame?.restart?.();
}

/* ============================================================
   RETRO PHYSICAL ARCADE CONTROLLER DISPATCHER (TOUCH & MOUSE)
   ============================================================ */
const ctrlRepeatTimers = {};

function ctrlDown(el, code, keyChar, repeatable = true) {
  if (el) el.classList.add('is-pressed');

  // Haptic feedback (getaran fisik tombol)
  if (window.navigator && window.navigator.vibrate) {
    try { window.navigator.vibrate(15); } catch(e) {}
  }

  // Audio efek tactile klik mekanis retro
  if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
    RetroAudio.playSelect();
  }

  // Bersihkan interval sebelumnya jika ada
  if (ctrlRepeatTimers[code]) {
    clearTimeout(ctrlRepeatTimers[code].timeout);
    clearInterval(ctrlRepeatTimers[code].interval);
    delete ctrlRepeatTimers[code];
  }

  // Kirim event keydown pertama kali
  sendKey(code, keyChar);

  // Jika tombol berulang saat ditekan terus (hold-to-repeat)
  if (repeatable) {
    const t = setTimeout(() => {
      const i = setInterval(() => {
        sendKey(code, keyChar);
      }, 70);
      ctrlRepeatTimers[code] = { timeout: null, interval: i };
    }, 200);
    ctrlRepeatTimers[code] = { timeout: t, interval: null };
  }
}

function ctrlUp(el, code, keyChar) {
  if (el) el.classList.remove('is-pressed');

  if (ctrlRepeatTimers[code]) {
    if (ctrlRepeatTimers[code].timeout) clearTimeout(ctrlRepeatTimers[code].timeout);
    if (ctrlRepeatTimers[code].interval) clearInterval(ctrlRepeatTimers[code].interval);
    delete ctrlRepeatTimers[code];
  }

  releaseKey(code, keyChar);
}

function sendKey(code, keyChar) {
  const k = keyChar || (code === 'Space' ? ' ' : (code === 'KeyZ' ? 'z' : (code === 'KeyX' ? 'x' : code)));
  const ev = new KeyboardEvent('keydown', {
    code: code,
    key: k,
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(ev);
}

function releaseKey(code, keyChar) {
  const k = keyChar || (code === 'Space' ? ' ' : (code === 'KeyZ' ? 'z' : (code === 'KeyX' ? 'x' : code)));
  const ev = new KeyboardEvent('keyup', {
    code: code,
    key: k,
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(ev);
}

function toggleMinesweeperFlagMode(mode) {
  if (currentGame && currentGame.id === 'minesweep') {
    currentGame.flagMode = (mode === 'flag');
    const btnReveal = document.getElementById('msBtnReveal');
    const btnFlag = document.getElementById('msBtnFlag');
    if (btnReveal) btnReveal.classList.toggle('active', mode === 'reveal');
    if (btnFlag) btnFlag.classList.toggle('active', mode === 'flag');
    if (window.navigator && window.navigator.vibrate) {
      try { window.navigator.vibrate(20); } catch(e) {}
    }
    if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
      RetroAudio.playSelect();
    }
  }
}

let arcadePadCollapsed = false;

function toggleArcadePadDeck() {
  arcadePadCollapsed = !arcadePadCollapsed;
  const deck = document.getElementById('arcadePadDeck');
  const btn = document.getElementById('btnToggleArcadePad');
  if (deck) {
    deck.style.display = arcadePadCollapsed ? 'none' : (deck.classList.contains('minesweeper-toggle-bar') ? 'flex' : 'flex');
  }
  if (btn) btn.textContent = arcadePadCollapsed ? 'TAMPILKAN' : 'SEMBUNYIKAN';
}

function setupMobileControls(gameId) {
  const el = document.getElementById('mobileDpad');
  if (!el) return;

  // Selalu tampilkan kontrol fisik agar dapat dimainkan di HP, Tablet, maupun PC
  el.style.display = 'flex';
  el.classList.add('is-visible');

  // Header Bar Gamepad Otentik
  const headerHtml = `
    <div class="arcade-pad-brand">
      <div class="arcade-pad-title">
        <span class="arcade-pad-led"></span>
        <span>KONTROL FISIK &bull; ${gameId ? gameId.toUpperCase() : 'GAME'}</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="arcade-pad-hint">HAPTIC &bull; REPEAT</span>
        <button type="button" class="arcade-pad-toggle-btn" id="btnToggleArcadePad" onclick="toggleArcadePadDeck()" title="Sembunyikan/Tampilkan Gamepad">
          ${arcadePadCollapsed ? 'TAMPILKAN' : 'SEMBUNYIKAN'}
        </button>
      </div>
    </div>
  `;

  const deckStyle = arcadePadCollapsed ? 'display:none;' : '';

  // 1. TETRIS
  if (gameId === 'tetris') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="${deckStyle}">
        <div class="pad-cluster-left">
          <div class="phys-dpad-horizontal">
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowLeft', 'ArrowLeft', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowLeft', 'ArrowLeft'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    onpointerleave="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    aria-label="Geser Kiri">&#9664;</button>
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowDown', 'ArrowDown', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowDown', 'ArrowDown'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                    onpointerleave="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                    aria-label="Turunkan Cepat">&#9660;</button>
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowRight', 'ArrowRight', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowRight', 'ArrowRight'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    onpointerleave="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    aria-label="Geser Kanan">&#9654;</button>
          </div>
        </div>
        <div class="pad-cluster-right" style="gap:8px;">
          <button type="button" class="phys-btn phys-action-btn btn-action-gold" 
                  onpointerdown="ctrlDown(this, 'ArrowUp', 'ArrowUp', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'ArrowUp', 'ArrowUp'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                  onpointerleave="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                  aria-label="Putar Balok">
            <span style="font-size:1.1rem;">↻</span>
            <span class="phys-btn-badge">PUTAR</span>
          </button>
          <button type="button" class="phys-btn phys-action-btn btn-action-red" 
                  onpointerdown="ctrlDown(this, 'Space', ' ', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'Space', ' '); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'Space', ' ');"
                  onpointerleave="ctrlUp(this, 'Space', ' ');"
                  aria-label="Jatuhkan Langsung">
            <span style="font-size:1.1rem;">▼</span>
            <span class="phys-btn-badge">DROP</span>
          </button>
        </div>
      </div>
    `;
  }
  // 2. SNAKE & 2048
  else if (gameId === 'snake' || gameId === 'g2048') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="justify-content:center; ${deckStyle}">
        <div class="phys-dpad-grid">
          <div class="phys-dpad-empty"></div>
          <button type="button" class="phys-btn phys-dpad-key" 
                  onpointerdown="ctrlDown(this, 'ArrowUp', 'ArrowUp', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'ArrowUp', 'ArrowUp'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                  onpointerleave="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                  aria-label="Atas">&#9650;</button>
          <div class="phys-dpad-empty"></div>

          <button type="button" class="phys-btn phys-dpad-key" 
                  onpointerdown="ctrlDown(this, 'ArrowLeft', 'ArrowLeft', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'ArrowLeft', 'ArrowLeft'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                  onpointerleave="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                  aria-label="Kiri">&#9664;</button>
          <div class="phys-dpad-center">★</div>
          <button type="button" class="phys-btn phys-dpad-key" 
                  onpointerdown="ctrlDown(this, 'ArrowRight', 'ArrowRight', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'ArrowRight', 'ArrowRight'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                  onpointerleave="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                  aria-label="Kanan">&#9654;</button>

          <div class="phys-dpad-empty"></div>
          <button type="button" class="phys-btn phys-dpad-key" 
                  onpointerdown="ctrlDown(this, 'ArrowDown', 'ArrowDown', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'ArrowDown', 'ArrowDown'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                  onpointerleave="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                  aria-label="Bawah">&#9660;</button>
          <div class="phys-dpad-empty"></div>
        </div>
      </div>
    `;
  }
  // 3. PONG
  else if (gameId === 'pong') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="justify-content:center; gap:1.5rem; ${deckStyle}">
        <div class="phys-dpad-vertical">
          <button type="button" class="phys-btn phys-dpad-key" 
                  onpointerdown="ctrlDown(this, 'ArrowUp', 'ArrowUp', true); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'ArrowUp', 'ArrowUp'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                  onpointerleave="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                  aria-label="Naik">&#9650; ATAS</button>
          <button type="button" class="phys-btn phys-dpad-key" 
                  onpointerdown="ctrlDown(this, 'ArrowDown', 'ArrowDown', true); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'ArrowDown', 'ArrowDown'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                  onpointerleave="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                  aria-label="Turun">&#9660; BAWAH</button>
        </div>
      </div>
    `;
  }
  // 4. BREAKOUT
  else if (gameId === 'breakout') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="${deckStyle}">
        <div class="pad-cluster-left">
          <div class="phys-dpad-horizontal">
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowLeft', 'ArrowLeft', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowLeft', 'ArrowLeft'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    onpointerleave="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    aria-label="Geser Kiri">&#9664;</button>
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowRight', 'ArrowRight', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowRight', 'ArrowRight'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    onpointerleave="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    aria-label="Geser Kanan">&#9654;</button>
          </div>
        </div>
        <div class="pad-cluster-right">
          <button type="button" class="phys-btn phys-action-btn btn-action-gold" style="min-width:96px;"
                  onpointerdown="ctrlDown(this, 'Space', ' ', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'Space', ' '); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'Space', ' ');"
                  onpointerleave="ctrlUp(this, 'Space', ' ');"
                  aria-label="Luncurkan Bola">
            <span style="font-size:1.15rem;">▲</span>
            <span class="phys-btn-badge">LAUNCH</span>
          </button>
        </div>
      </div>
    `;
  }
  // 5. SPACE INVADERS
  else if (gameId === 'spaceinv') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="${deckStyle}">
        <div class="pad-cluster-left">
          <div class="phys-dpad-horizontal">
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowLeft', 'ArrowLeft', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowLeft', 'ArrowLeft'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    onpointerleave="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    aria-label="Kiri">&#9664;</button>
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowRight', 'ArrowRight', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowRight', 'ArrowRight'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    onpointerleave="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    aria-label="Kanan">&#9654;</button>
          </div>
        </div>
        <div class="pad-cluster-right">
          <button type="button" class="phys-btn phys-action-btn btn-action-red" style="min-width:100px;"
                  onpointerdown="ctrlDown(this, 'Space', ' ', true); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'Space', ' '); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'Space', ' ');"
                  onpointerleave="ctrlUp(this, 'Space', ' ');"
                  aria-label="Tembak Laser">
            <span style="font-size:1.2rem;">●</span>
            <span class="phys-btn-badge">FIRE</span>
          </button>
        </div>
      </div>
    `;
  }
  // 6. FLAPPY
  else if (gameId === 'flappy') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="justify-content:center; ${deckStyle}">
        <button type="button" class="phys-btn phys-action-btn btn-action-gold phys-punch-btn" 
                onpointerdown="ctrlDown(this, 'Space', ' ', false); event.preventDefault();"
                onpointerup="ctrlUp(this, 'Space', ' '); event.preventDefault();"
                onpointercancel="ctrlUp(this, 'Space', ' ');"
                onpointerleave="ctrlUp(this, 'Space', ' ');"
                aria-label="Kepakkan Sayap">
          <span>▲</span>
          <span style="font-size:0.75rem; font-weight:800;">FLAP</span>
        </button>
      </div>
    `;
  }
  // 7. MINESWEEPER
  else if (gameId === 'minesweep') {
    el.innerHTML = `
      ${headerHtml}
      <div class="minesweeper-toggle-bar" id="arcadePadDeck" style="${deckStyle}">
        <button type="button" class="ms-toggle-pill active" id="msBtnReveal" onclick="toggleMinesweeperFlagMode('reveal')">
          <span>◆</span>
          <span>MODE GALI (REVEAL)</span>
        </button>
        <button type="button" class="ms-toggle-pill" id="msBtnFlag" onclick="toggleMinesweeperFlagMode('flag')">
          <span>▲</span>
          <span>MODE BENDERA (FLAG)</span>
        </button>
      </div>
    `;
  }
  // 8. SPACE WAR
  else if (gameId === 'spacewar') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="${deckStyle}">
        <div class="pad-cluster-left">
          <div class="phys-dpad-grid" style="grid-template-columns:repeat(3,40px); grid-template-rows:repeat(3,40px);">
            <div class="phys-dpad-empty"></div>
            <button type="button" class="phys-btn phys-dpad-key" style="width:40px;height:40px;font-size:1.1rem;"
                    onpointerdown="ctrlDown(this, 'ArrowUp', 'ArrowUp', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowUp', 'ArrowUp'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                    onpointerleave="ctrlUp(this, 'ArrowUp', 'ArrowUp');"
                    aria-label="Maju">&#9650;</button>
            <div class="phys-dpad-empty"></div>

            <button type="button" class="phys-btn phys-dpad-key" style="width:40px;height:40px;font-size:1.1rem;"
                    onpointerdown="ctrlDown(this, 'ArrowLeft', 'ArrowLeft', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowLeft', 'ArrowLeft'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    onpointerleave="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    aria-label="Kiri">&#9664;</button>
            <div class="phys-dpad-center" style="font-size:0.5rem;">▲</div>
            <button type="button" class="phys-btn phys-dpad-key" style="width:40px;height:40px;font-size:1.1rem;"
                    onpointerdown="ctrlDown(this, 'ArrowRight', 'ArrowRight', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowRight', 'ArrowRight'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    onpointerleave="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    aria-label="Kanan">&#9654;</button>

            <div class="phys-dpad-empty"></div>
            <button type="button" class="phys-btn phys-dpad-key" style="width:40px;height:40px;font-size:1.1rem;"
                    onpointerdown="ctrlDown(this, 'ArrowDown', 'ArrowDown', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowDown', 'ArrowDown'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                    onpointerleave="ctrlUp(this, 'ArrowDown', 'ArrowDown');"
                    aria-label="Mundur">&#9660;</button>
            <div class="phys-dpad-empty"></div>
          </div>
        </div>
        <div class="pad-cluster-right">
          <button type="button" class="phys-btn phys-action-btn btn-action-red" style="min-width:96px; height:56px;"
                  onpointerdown="ctrlDown(this, 'Space', ' ', true); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'Space', ' '); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'Space', ' ');"
                  onpointerleave="ctrlUp(this, 'Space', ' ');"
                  aria-label="Tembak Laser">
            <span style="font-size:1.25rem;">●</span>
            <span class="phys-btn-badge">LASER</span>
          </button>
        </div>
      </div>
    `;
  }
  // 9. COFFEE MARIO
  else if (gameId === 'coffeemario') {
    el.innerHTML = `
      ${headerHtml}
      <div class="arcade-pad-deck" id="arcadePadDeck" style="${deckStyle}">
        <div class="pad-cluster-left">
          <div class="phys-dpad-horizontal">
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowLeft', 'ArrowLeft', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowLeft', 'ArrowLeft'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    onpointerleave="ctrlUp(this, 'ArrowLeft', 'ArrowLeft');"
                    aria-label="Kiri">&#9664;</button>
            <button type="button" class="phys-btn phys-dpad-key" 
                    onpointerdown="ctrlDown(this, 'ArrowRight', 'ArrowRight', true); event.preventDefault();"
                    onpointerup="ctrlUp(this, 'ArrowRight', 'ArrowRight'); event.preventDefault();"
                    onpointercancel="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    onpointerleave="ctrlUp(this, 'ArrowRight', 'ArrowRight');"
                    aria-label="Kanan">&#9654;</button>
          </div>
        </div>
        <div class="pad-cluster-right" style="gap:6px;">
          <button type="button" class="phys-btn phys-action-btn btn-action-blue" style="min-width:44px; padding:0 0.55rem;"
                  onpointerdown="ctrlDown(this, 'KeyX', 'x', true); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'KeyX', 'x'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'KeyX', 'x');"
                  onpointerleave="ctrlUp(this, 'KeyX', 'x');"
                  aria-label="Lari / Dash">
            <span style="font-size:1rem;">»</span>
            <span class="phys-btn-badge">RUN</span>
          </button>
          <button type="button" class="phys-btn phys-action-btn btn-action-red" style="min-width:44px; padding:0 0.55rem;"
                  onpointerdown="ctrlDown(this, 'KeyZ', 'z', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'KeyZ', 'z'); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'KeyZ', 'z');"
                  onpointerleave="ctrlUp(this, 'KeyZ', 'z');"
                  aria-label="Tembak Uap Kopi">
            <span style="font-size:1rem;">✦</span>
            <span class="phys-btn-badge">STEAM</span>
          </button>
          <button type="button" class="phys-btn phys-action-btn btn-action-gold" style="min-width:52px; padding:0 0.65rem;"
                  onpointerdown="ctrlDown(this, 'Space', ' ', false); event.preventDefault();"
                  onpointerup="ctrlUp(this, 'Space', ' '); event.preventDefault();"
                  onpointercancel="ctrlUp(this, 'Space', ' ');"
                  onpointerleave="ctrlUp(this, 'Space', ' ');"
                  aria-label="Lompat">
            <span style="font-size:1rem;">▲</span>
            <span class="phys-btn-badge">JUMP</span>
          </button>
        </div>
      </div>
    `;
  }
  // 10. MEMORY & TIC TAC TOE
  else if (gameId === 'memory' || gameId === 'tictactoe') {
    el.innerHTML = `
      ${headerHtml}
      <div style="text-align:center; padding:0.5rem; font-size:0.75rem; color:var(--text-2);" id="arcadePadDeck" style="${deckStyle}">
        <span>Sentuh &amp; ketuk langsung pada kartu atau kotak di layar untuk bermain</span>
      </div>
    `;
  } else {
    el.innerHTML = '';
    el.style.display = 'none';
  }
}

/* ============================================================
   GAME: SNAKE
   ============================================================ */
class SnakeGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.id = id;
    this.onScore = onScore;
    this.onOver = onOver;
    this.paused = false;
    this.running = false;
    this.grid = 20;
    this.COLS = Math.floor(canvas.width / this.grid);
    this.ROWS = Math.floor(canvas.height / this.grid);
  }
  init() { this.reset(); this.draw(); }
  reset() {
    this.snake = [{x:Math.floor(this.COLS/2), y:Math.floor(this.ROWS/2)}];
    this.dir = {x:1, y:0};
    this.nextDir = {x:1, y:0};
    this.food = this.placeFood();
    this.score = 0;
    this.running = false;
    this.paused = false;
    this._keyHandler = (e) => this.handleKey(e);
    document.addEventListener('keydown', this._keyHandler);
  }
  placeFood() {
    let pos;
    do {
      pos = {x: Math.floor(Math.random()*this.COLS), y: Math.floor(Math.random()*this.ROWS)};
    } while (this.snake.some(s => s.x===pos.x && s.y===pos.y));
    return pos;
  }
  handleKey(e) {
    const map = {
      ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1}, ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
      w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0},
      W:{x:0,y:-1}, S:{x:0,y:1}, A:{x:-1,y:0}, D:{x:1,y:0},
    };
    const nd = map[e.key];
    if (nd && !(nd.x === -this.dir.x && nd.y === -this.dir.y)) {
      this.nextDir = nd;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault();
    }
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    clearTimeout(this._tickTimeout);
    if (this._animId) cancelAnimationFrame(this._animId);
    this.loop();
  }
  pause() {
    this.paused = true;
    this.running = false;
    clearTimeout(this._tickTimeout);
    if (this._animId) cancelAnimationFrame(this._animId);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    clearTimeout(this._tickTimeout);
    if (this._animId) cancelAnimationFrame(this._animId);
    this.loop();
  }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._keyHandler);
    clearTimeout(this._tickTimeout);
    if (this._animId) cancelAnimationFrame(this._animId);
  }
  loop() {
    if (!this.running) return;
    clearTimeout(this._tickTimeout);
    this._tickTimeout = setTimeout(() => {
      if (!this.running) return;
      this.update();
      this.draw();
      this._animId = requestAnimationFrame(() => this.loop());
    }, 145);
  }
  update() {
    this.dir = {...this.nextDir};
    const head = {x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y};
    if (head.x < 0 || head.x >= this.COLS || head.y < 0 || head.y >= this.ROWS ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.running = false;
      this.onOver(this.score, this.id);
      return;
    }
    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.onScore(this.score);
      this.food = this.placeFood();
    } else {
      this.snake.pop();
    }
  }
  draw() {
    const {ctx, canvas, grid} = this;
    ctx.fillStyle = '#100E0C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Grid dots
    ctx.fillStyle = '#1E1A16';
    for (let x = 0; x < this.COLS; x++) for (let y = 0; y < this.ROWS; y++) {
      ctx.fillRect(x*grid+grid/2-1, y*grid+grid/2-1, 2, 2);
    }
    // Food
    ctx.fillStyle = '#D4A853';
    ctx.fillRect(this.food.x*grid+2, this.food.y*grid+2, grid-4, grid-4);
    // Snake
    this.snake.forEach((seg, i) => {
      ctx.fillStyle = i===0 ? '#C49A68' : (i%2===0 ? '#7A5430' : '#5C4228');
      ctx.fillRect(seg.x*grid+1, seg.y*grid+1, grid-2, grid-2);
    });
  }
}

/* ============================================================
   GAME: TETRIS
   ============================================================ */
class TetrisGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.id = id;
    this.onScore = onScore;
    this.onOver = onOver;
    this.paused = false;
    this.running = false;
    this.COLS = 10; this.ROWS = 20;
    this.cell = Math.floor(Math.min(canvas.width/this.COLS, canvas.height/this.ROWS));
    this.offX = Math.floor((canvas.width - this.COLS*this.cell)/2);
    this.PIECES = [
      {shape:[[1,1,1,1]], color:'#D4A853'},
      {shape:[[1,0],[1,0],[1,1]], color:'#C49A68'},
      {shape:[[0,1],[0,1],[1,1]], color:'#9C7248'},
      {shape:[[0,1],[1,1],[1,0]], color:'#7A6EA0'},
      {shape:[[1,1],[0,1],[0,1]], color:'#5A4E7A'},
      {shape:[[1,1],[1,1]], color:'#4A7A5A'},
      {shape:[[1,0],[1,1],[0,1]], color:'#8A3A2A'},
    ];
  }
  init() { this.reset(); this.drawBoard(); }
  reset() {
    this.board = Array.from({length:this.ROWS}, () => Array(this.COLS).fill(0));
    this.score = 0;
    this.piece = null;
    this.running = false;
    this.paused = false;
    this._keyHandler = (e) => this.handleKey(e);
    document.addEventListener('keydown', this._keyHandler);
  }
  spawn() {
    const p = this.PIECES[Math.floor(Math.random()*this.PIECES.length)];
    this.piece = { shape: p.shape.map(r=>[...r]), color: p.color,
      x: Math.floor(this.COLS/2) - Math.floor(p.shape[0].length/2), y: 0 };
    if (this.collides(this.piece, 0, 0)) { this.running = false; this.onOver(this.score, this.id); }
  }
  collides(p, dx, dy, shape=null) {
    const s = shape || p.shape;
    for (let r=0; r<s.length; r++) for (let c=0; c<s[r].length; c++) {
      if (!s[r][c]) continue;
      const nx=p.x+c+dx, ny=p.y+r+dy;
      if (nx<0||nx>=this.COLS||ny>=this.ROWS||ny<0) return true;
      if (this.board[ny]?.[nx]) return true;
    }
    return false;
  }
  rotate() {
    const s = this.piece.shape;
    const rot = s[0].map((_,i) => s.map(r=>r[i]).reverse());
    if (!this.collides(this.piece, 0, 0, rot)) this.piece.shape = rot;
  }
  lock() {
    this.piece.shape.forEach((row, r) => row.forEach((v, c) => {
      if (v && this.piece.y+r >= 0) this.board[this.piece.y+r][this.piece.x+c] = this.piece.color;
    }));
    let cleared = 0;
    for (let r=this.ROWS-1; r>=0; r--) {
      if (this.board[r].every(v=>v)) { this.board.splice(r,1); this.board.unshift(Array(this.COLS).fill(0)); cleared++; r++; }
    }
    if (cleared > 0) { this.score += [0,100,300,500,800][cleared]; this.onScore(this.score); }
    this.spawn();
  }
  handleKey(e) {
    if (!this.running || !this.piece) return;
    const keys = { ArrowLeft:-1, a:-1, A:-1, ArrowRight:1, d:1, D:1 };
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { if (!this.collides(this.piece,-1,0)) this.piece.x--; }
    else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') { if (!this.collides(this.piece,1,0)) this.piece.x++; }
    else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') { if (!this.collides(this.piece,0,1)) this.piece.y++; else this.lock(); }
    else if (e.code === 'ArrowUp' || e.key === 'z' || e.key === 'Z') { this.rotate(); }
    else if (e.code === 'Space') {
      while (!this.collides(this.piece,0,1)) this.piece.y++;
      this.lock();
    }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    this.drawBoard();
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    clearTimeout(this._tick);
    this.spawn();
    this.loop();
  }
  pause() {
    this.paused = true;
    this.running = false;
    clearTimeout(this._tick);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    clearTimeout(this._tick);
    this.loop();
  }
  restart() { this.destroy(); this.reset(); this.drawBoard(); this.start(); }
  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._keyHandler);
    clearTimeout(this._tick);
  }
  loop() {
    if (!this.running) return;
    clearTimeout(this._tick);
    this._tick = setTimeout(() => {
      if (!this.running) return;
      if (this.piece) {
        if (!this.collides(this.piece,0,1)) this.piece.y++;
        else this.lock();
      }
      this.drawBoard();
      this.loop();
    }, 500);
  }
  drawBoard() {
    const {ctx, canvas, cell, offX} = this;
    ctx.fillStyle = '#100E0C';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1E1A16';
    ctx.lineWidth = 0.5;
    for (let r=0; r<this.ROWS; r++) for (let c=0; c<this.COLS; c++) {
      if (this.board[r][c]) {
        ctx.fillStyle = this.board[r][c];
        ctx.fillRect(offX+c*cell+1, r*cell+1, cell-2, cell-2);
      } else {
        ctx.strokeRect(offX+c*cell, r*cell, cell, cell);
      }
    }
    if (this.piece) {
      this.piece.shape.forEach((row, r) => row.forEach((v, c) => {
        if (v) {
          ctx.fillStyle = this.piece.color;
          ctx.fillRect(offX+(this.piece.x+c)*cell+1, (this.piece.y+r)*cell+1, cell-2, cell-2);
        }
      }));
    }
  }
}

/* ============================================================
   GAME: PONG
   ============================================================ */
class PongGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.id = id;
    this.onScore = onScore;
    this.onOver = onOver;
    this.paused = false;
    this.running = false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    const W = this.canvas.width, H = this.canvas.height;
    this.ph = H*0.18; this.pw = 10;
    this.p1 = {x:16, y:H/2-this.ph/2, dy:0, score:0};
    this.p2 = {x:W-26, y:H/2-this.ph/2, dy:0, score:0};
    this.ball = {x:W/2, y:H/2, dx:2.2*(Math.random()>0.5?1:-1), dy:2.2*(Math.random()>0.5?1:-1), r:7};
    this.running = false;
    this.paused = false;
    this._keyHandler = (e) => this.handleKey(e);
    this._keyUpHandler = (e) => this.handleKeyUp(e);
    document.addEventListener('keydown', this._keyHandler);
    document.addEventListener('keyup', this._keyUpHandler);
  }
  handleKey(e) {
    if (e.key==='w'||e.key==='W'||e.code==='KeyW'||e.key==='ArrowUp'||e.code==='ArrowUp') { this.p1.dy=-4; e.preventDefault?.(); }
    if (e.key==='s'||e.key==='S'||e.code==='KeyS'||e.key==='ArrowDown'||e.code==='ArrowDown') { this.p1.dy=4; e.preventDefault?.(); }
  }
  handleKeyUp(e) {
    if (['w','W','s','S','ArrowUp','ArrowDown'].includes(e.key) || ['KeyW','KeyS','ArrowUp','ArrowDown'].includes(e.code)) this.p1.dy=0;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  pause() {
    this.paused = true;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._keyHandler);
    document.removeEventListener('keyup', this._keyUpHandler);
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  loop(timestamp) {
    if (!this.running) return;
    if (!timestamp) timestamp = performance.now();
    if (!this._lastTime) this._lastTime = timestamp;
    let elapsed = timestamp - this._lastTime;
    this._lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;

    this._accumulator = (this._accumulator || 0) + elapsed;
    const STEP = 1000 / 60;
    let steps = 0;
    while (this._accumulator >= STEP && steps < 4) {
      this.update();
      this._accumulator -= STEP;
      steps++;
    }
    this.draw();
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  update() {
    const W=this.canvas.width, H=this.canvas.height;
    // Paddles
    this.p1.y = Math.max(0, Math.min(H-this.ph, this.p1.y+this.p1.dy));
    this.p2.y = Math.max(0, Math.min(H-this.ph, this.p2.y+this.p2.dy));
    // AI for p2
    const mid = this.p2.y + this.ph/2;
    if (mid < this.ball.y-10) this.p2.y += 2.4;
    else if (mid > this.ball.y+10) this.p2.y -= 2.4;
    // Ball
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;
    if (this.ball.y <= this.ball.r || this.ball.y >= H-this.ball.r) this.ball.dy *= -1;
    // Paddle collisions
    const hit = (p) => this.ball.x-this.ball.r < p.x+this.pw && this.ball.x+this.ball.r > p.x &&
                       this.ball.y > p.y && this.ball.y < p.y+this.ph;
    if (hit(this.p1)) { this.ball.dx = Math.abs(this.ball.dx)*1.02; this.ball.dy += this.p1.dy*0.18; }
    if (hit(this.p2)) { this.ball.dx = -Math.abs(this.ball.dx)*1.02; this.ball.dy += this.p2.dy*0.18; }
    // Score
    if (this.ball.x < 0) { this.p2.score++; this.resetBall(); this.onScore(this.p1.score*100); }
    if (this.ball.x > W) { this.p1.score++; this.resetBall(); this.onScore(this.p1.score*100); }
    if (this.p1.score>=7 || this.p2.score>=7) {
      this.running = false;
      this.onOver(this.p1.score*100, this.id);
    }
    this.ball.dy = Math.max(-5.5, Math.min(5.5, this.ball.dy));
  }
  resetBall() {
    this.ball.x = this.canvas.width/2; this.ball.y = this.canvas.height/2;
    this.ball.dx = 2.2*(Math.random()>0.5?1:-1); this.ball.dy = 2.2*(Math.random()>0.5?1:-1);
  }
  draw() {
    const {ctx, canvas} = this;
    const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,W,H);
    ctx.setLineDash([6,10]); ctx.strokeStyle='#2A2420'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#9C7248';
    ctx.fillRect(this.p1.x, this.p1.y, this.pw, this.ph);
    ctx.fillRect(this.p2.x, this.p2.y, this.pw, this.ph);
    ctx.fillStyle='#D4A853';
    ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#7A726A'; ctx.font='bold 20px Space Mono, monospace'; ctx.textAlign='center';
    ctx.fillText(this.p1.score, W/4, 36);
    ctx.fillText(this.p2.score, 3*W/4, 36);
  }
}

/* ============================================================
   GAME: BREAKOUT
   ============================================================ */
class BreakoutGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.id = id; this.onScore = onScore; this.onOver = onOver;
    this.paused = false; this.running = false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    const W=this.canvas.width, H=this.canvas.height;
    this.pw=W*0.18; this.ph=10; this.paddle={x:W/2-this.pw/2, y:H-36};
    this.ball={x:W/2, y:H-60, dx:2.2, dy:-3.0, r:8, launched:false};
    this.score=0; this.lives=3;
    this.bRows=4; this.bCols=8; this.bW=(W-40)/this.bCols; this.bH=20;
    this.bricks=[];
    const colors=['#D4A853','#9C7248','#7A6EA0','#4A7A5A'];
    for (let r=0; r<this.bRows; r++) for (let c=0; c<this.bCols; c++)
      this.bricks.push({x:20+c*this.bW, y:40+r*(this.bH+6), alive:true, color:colors[r]});
    this.running=false; this.paused=false;
    this._kh=(e)=>this.handleKey(e); this._ku=(e)=>this.handleKeyUp(e); this._mm=(e)=>this.handleMouse(e);
    this._tm=(e)=>{
      if (e.touches && e.touches[0]) {
        const rect = this.canvas.getBoundingClientRect();
        this.paddle.x = (e.touches[0].clientX - rect.left) * (this.canvas.width / rect.width) - this.pw/2;
        this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.pw, this.paddle.x));
        if (!this.ball.launched) this.ball.launched = true;
      }
    };
    document.addEventListener('keydown',this._kh);
    document.addEventListener('keyup',this._ku);
    this.canvas.addEventListener('mousemove',this._mm);
    this.canvas.addEventListener('touchmove',this._tm, { passive: true });
    this.canvas.addEventListener('touchstart',this._tm, { passive: true });
    this.pdx=0;
  }
  handleKey(e) {
    if (e.key==='ArrowLeft'||e.key==='a'||e.key==='A') { this.pdx=-4.2; e.preventDefault?.(); }
    if (e.key==='ArrowRight'||e.key==='d'||e.key==='D') { this.pdx=4.2; e.preventDefault?.(); }
    if (e.code==='Space') { this.ball.launched=true; e.preventDefault?.(); }
  }
  handleKeyUp(e) {
    if (['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)) this.pdx=0;
  }
  handleMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.paddle.x = (e.clientX - rect.left) - this.pw/2;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.ball.launched = false;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  pause() {
    this.paused = true;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._kh);
    document.removeEventListener('keyup', this._ku);
    this.canvas.removeEventListener('mousemove', this._mm);
    this.canvas.removeEventListener('touchmove', this._tm);
    this.canvas.removeEventListener('touchstart', this._tm);
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  loop(timestamp) {
    if (!this.running) return;
    if (!timestamp) timestamp = performance.now();
    if (!this._lastTime) this._lastTime = timestamp;
    let elapsed = timestamp - this._lastTime;
    this._lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;

    this._accumulator = (this._accumulator || 0) + elapsed;
    const STEP = 1000 / 60;
    let steps = 0;
    while (this._accumulator >= STEP && steps < 4) {
      this.update();
      this._accumulator -= STEP;
      steps++;
    }
    this.draw();
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  update() {
    const W=this.canvas.width, H=this.canvas.height;
    this.paddle.x=Math.max(0,Math.min(W-this.pw, this.paddle.x+this.pdx));
    if (!this.ball.launched) { this.ball.x=this.paddle.x+this.pw/2; return; }
    this.ball.x+=this.ball.dx; this.ball.y+=this.ball.dy;
    if (this.ball.x<=this.ball.r||this.ball.x>=W-this.ball.r) this.ball.dx*=-1;
    if (this.ball.y<=this.ball.r) this.ball.dy*=-1;
    if (this.ball.y>=H+20) {
      this.lives--;
      if (this.lives<=0) { this.running=false; this.onOver(this.score,this.id); return; }
      this.ball={...this.ball, x:this.paddle.x+this.pw/2, y:this.paddle.y-20, dx:2.2*(Math.random()>0.5?1:-1), dy:-3.0, launched:false};
    }
    if (this.ball.y+this.ball.r>=this.paddle.y && this.ball.y-this.ball.r<=this.paddle.y+this.ph &&
        this.ball.x>=this.paddle.x && this.ball.x<=this.paddle.x+this.pw) {
      this.ball.dy=-Math.abs(this.ball.dy);
      const hitPos=(this.ball.x-this.paddle.x)/this.pw;
      this.ball.dx=(hitPos-0.5)*5.5;
    }
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (this.ball.x+this.ball.r>b.x && this.ball.x-this.ball.r<b.x+this.bW &&
          this.ball.y+this.ball.r>b.y && this.ball.y-this.ball.r<b.y+this.bH) {
        b.alive=false; this.ball.dy*=-1; this.score+=10; this.onScore(this.score);
      }
    }
    if (this.bricks.every(b=>!b.alive)) { this.running=false; this.onOver(this.score,this.id); }
  }
  draw() {
    const {ctx,canvas}=this; const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,W,H);
    this.bricks.forEach(b=>{
      if (!b.alive) return;
      ctx.fillStyle=b.color; ctx.fillRect(b.x+1,b.y+1,this.bW-2,this.bH-2);
    });
    ctx.fillStyle='#9C7248'; ctx.fillRect(this.paddle.x,this.paddle.y,this.pw,this.ph);
    ctx.fillStyle='#EDE8E1'; ctx.beginPath(); ctx.arc(this.ball.x,this.ball.y,this.ball.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#7A726A'; ctx.font='12px Space Mono,monospace'; ctx.textAlign='left';
    ctx.fillText('Lives: '+this.lives, 10, 22);
  }
}

/* ============================================================
   GAME: SPACE INVADERS
   ============================================================ */
class SpaceInvadersGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.id=id; this.onScore=onScore; this.onOver=onOver;
    this.paused=false; this.running=false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    const W=this.canvas.width, H=this.canvas.height;
    this.player={x:W/2-18, y:H-50, w:36, h:20};
    this.bullets=[]; this.enemyBullets=[];
    this.score=0; this.lives=3;
    this.invaders=[];
    const cols=8, rows=4;
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++)
      this.invaders.push({x:40+c*48, y:40+r*40, alive:true, row:r});
    this.invDir=1; this.invSpeed=0.6; this.invTick=0;
    this.shootCooldown=0; this.enemyShootTimer=0;
    this.running=false; this.paused=false;
    this._kh=(e)=>this.handleKey(e); this._ku=(e)=>this.handleKeyUp(e);
    document.addEventListener('keydown',this._kh); document.addEventListener('keyup',this._ku);
    this.pdx=0;
  }
  handleKey(e) {
    if (e.key==='ArrowLeft'||e.key==='a'||e.key==='A') { this.pdx=-3.6; e.preventDefault?.(); }
    if (e.key==='ArrowRight'||e.key==='d'||e.key==='D') { this.pdx=3.6; e.preventDefault?.(); }
    if (e.code==='Space') { this.shoot(); e.preventDefault?.(); }
  }
  handleKeyUp(e) {
    if (['ArrowLeft','ArrowRight','a','d','A','D'].includes(e.key)) this.pdx=0;
  }
  shoot() {
    if (this.shootCooldown>0) return;
    this.bullets.push({x:this.player.x+18, y:this.player.y, dy:-6});
    this.shootCooldown=18;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  pause() {
    this.paused = true;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._kh);
    document.removeEventListener('keyup', this._ku);
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  loop(timestamp) {
    if (!this.running) return;
    if (!timestamp) timestamp = performance.now();
    if (!this._lastTime) this._lastTime = timestamp;
    let elapsed = timestamp - this._lastTime;
    this._lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;

    this._accumulator = (this._accumulator || 0) + elapsed;
    const STEP = 1000 / 60;
    let steps = 0;
    while (this._accumulator >= STEP && steps < 4) {
      this.update();
      this._accumulator -= STEP;
      steps++;
    }
    this.draw();
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  update() {
    const W=this.canvas.width, H=this.canvas.height;
    this.player.x=Math.max(0,Math.min(W-this.player.w, this.player.x+this.pdx));
    if (this.shootCooldown>0) this.shootCooldown--;
    this.bullets=this.bullets.filter(b=>{b.y+=b.dy; return b.y>0;});
    this.enemyBullets=this.enemyBullets.filter(b=>{b.y+=b.dy; return b.y<H;});
    // Move invaders
    this.invTick++;
    if (this.invTick>42) {
      this.invTick=0;
      const alive=this.invaders.filter(i=>i.alive);
      const maxX=Math.max(...alive.map(i=>i.x+32)), minX=Math.min(...alive.map(i=>i.x));
      if ((maxX>W-10&&this.invDir>0)||(minX<10&&this.invDir<0)) {
        this.invDir*=-1;
        this.invaders.forEach(i=>{if(i.alive)i.y+=16;});
      } else { this.invaders.forEach(i=>{if(i.alive)i.x+=this.invDir*16;}); }
    }
    // Enemy shoot
    this.enemyShootTimer++;
    if (this.enemyShootTimer>75) {
      this.enemyShootTimer=0;
      const alive=this.invaders.filter(i=>i.alive);
      if (alive.length) {
        const shooter=alive[Math.floor(Math.random()*alive.length)];
        this.enemyBullets.push({x:shooter.x+12, y:shooter.y+24, dy:2.8});
      }
    }
    // Bullet-invader collision
    for (const b of this.bullets) {
      for (const inv of this.invaders) {
        if (!inv.alive) continue;
        if (b.x>inv.x&&b.x<inv.x+28&&b.y>inv.y&&b.y<inv.y+24) {
          inv.alive=false; b.y=-999; this.score+=10*(4-inv.row); this.onScore(this.score);
        }
      }
    }
    // Enemy bullets hit player
    for (const b of this.enemyBullets) {
      if (b.x>this.player.x&&b.x<this.player.x+this.player.w&&b.y>this.player.y&&b.y<this.player.y+this.player.h) {
        b.y=H+1; this.lives--;
        if (this.lives<=0) { this.running=false; this.onOver(this.score,this.id); return; }
      }
    }
    // Check invader reached bottom or all killed
    if (this.invaders.filter(i=>i.alive).some(i=>i.y+24>this.player.y)) {
      this.running=false; this.onOver(this.score,this.id);
    }
    if (this.invaders.every(i=>!i.alive)) { this.running=false; this.onOver(this.score+500,this.id); }
  }
  draw() {
    const {ctx,canvas}=this; const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,W,H);
    this.invaders.forEach(inv=>{
      if (!inv.alive) return;
      const colors=['#D4A853','#C49A68','#9C7248','#7A6EA0'];
      ctx.fillStyle=colors[inv.row]||'#9C7248';
      ctx.fillRect(inv.x,inv.y,28,24);
      ctx.fillStyle='#100E0C';
      ctx.fillRect(inv.x+4,inv.y+4,6,6); ctx.fillRect(inv.x+18,inv.y+4,6,6);
      ctx.fillRect(inv.x+8,inv.y+14,12,4);
    });
    ctx.fillStyle='#C49A68';
    ctx.fillRect(this.player.x,this.player.y,this.player.w,this.player.h);
    ctx.fillStyle='#EFC97C';
    this.bullets.forEach(b=>ctx.fillRect(b.x-2,b.y,4,10));
    ctx.fillStyle='#8A3A2A';
    this.enemyBullets.forEach(b=>ctx.fillRect(b.x-2,b.y,4,10));
    ctx.fillStyle='#7A726A'; ctx.font='12px Space Mono,monospace'; ctx.textAlign='left';
    ctx.fillText('Lives: '+this.lives,10,22);
  }
}

/* ============================================================
   GAME: FLAPPY
   ============================================================ */
class FlappyGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.id=id; this.onScore=onScore; this.onOver=onOver;
    this.paused=false; this.running=false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    const W=this.canvas.width, H=this.canvas.height;
    this.bird={x:80, y:H/2, vy:0, r:12};
    this.pipes=[]; this.score=0; this.gravity=0.28; this.gap=H*0.36;
    this.pipeW=40; this.pipeSpeed=1.8; this.running=false; this.paused=false;
    this.spawnTimer=0;
    this._kh=(e)=>{
      if (e.code==='Space'||e.key===' ') { this.flap(); e.preventDefault?.(); }
      if (e.type==='click'||e.type==='touchstart') this.flap();
    };
    document.addEventListener('keydown',this._kh);
    this.canvas.addEventListener('click',this._kh);
  }
  flap() { if (this.running) this.bird.vy=-5.4; }
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  pause() {
    this.paused = true;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._kh);
    this.canvas.removeEventListener('click', this._kh);
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  loop(timestamp) {
    if (!this.running) return;
    if (!timestamp) timestamp = performance.now();
    if (!this._lastTime) this._lastTime = timestamp;
    let elapsed = timestamp - this._lastTime;
    this._lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;

    this._accumulator = (this._accumulator || 0) + elapsed;
    const STEP = 1000 / 60;
    let steps = 0;
    while (this._accumulator >= STEP && steps < 4) {
      this.update();
      this._accumulator -= STEP;
      steps++;
    }
    this.draw();
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  update() {
    const W=this.canvas.width, H=this.canvas.height;
    this.bird.vy+=this.gravity; this.bird.y+=this.bird.vy;
    if (this.bird.y+this.bird.r>H||this.bird.y-this.bird.r<0) { this.running=false; this.onOver(this.score,this.id); return; }
    this.spawnTimer++;
    if (this.spawnTimer>105) {
      this.spawnTimer=0;
      const top=60+Math.random()*(H-this.gap-100);
      this.pipes.push({x:W, top, bottom:top+this.gap, scored:false});
    }
    this.pipes=this.pipes.filter(p=>{
      p.x-=this.pipeSpeed;
      if (!p.scored && p.x+this.pipeW<this.bird.x) {
        p.scored=true; this.score++; this.onScore(this.score);
      }
      // Collision
      if (this.bird.x+this.bird.r>p.x && this.bird.x-this.bird.r<p.x+this.pipeW &&
          (this.bird.y-this.bird.r<p.top || this.bird.y+this.bird.r>p.bottom)) {
        this.running=false; this.onOver(this.score,this.id);
      }
      return p.x>-this.pipeW;
    });
  }
  draw() {
    const {ctx,canvas}=this; const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#2A2420';
    this.pipes.forEach(p=>{
      ctx.fillRect(p.x,0,this.pipeW,p.top);
      ctx.fillRect(p.x,p.bottom,this.pipeW,H-p.bottom);
      ctx.fillStyle='#3A3028';
      ctx.fillRect(p.x-4,p.top-14,this.pipeW+8,14);
      ctx.fillRect(p.x-4,p.bottom,this.pipeW+8,14);
      ctx.fillStyle='#2A2420';
    });
    ctx.fillStyle='#D4A853';
    ctx.beginPath(); ctx.arc(this.bird.x,this.bird.y,this.bird.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#100E0C';
    ctx.beginPath(); ctx.arc(this.bird.x+4,this.bird.y-3,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#C49A68'; ctx.font='bold 28px Space Mono,monospace'; ctx.textAlign='center';
    ctx.fillText(this.score, W/2, 44);
  }
}

/* ============================================================
   GAME: MINESWEEPER
   ============================================================ */
class MinesweeperGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.id=id; this.onScore=onScore; this.onOver=onOver;
    this.paused=false; this.running=false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    this.COLS=14; this.ROWS=14; this.MINES=25;
    this.cell=Math.floor(Math.min(this.canvas.width/this.COLS, this.canvas.height/this.ROWS));
    this.offX=Math.floor((this.canvas.width-this.COLS*this.cell)/2);
    this.offY=Math.floor((this.canvas.height-this.ROWS*this.cell)/2);
    this.board=[];
    for (let r=0; r<this.ROWS; r++) {
      this.board[r]=[];
      for (let c=0; c<this.COLS; c++) this.board[r][c]={mine:false,revealed:false,flagged:false,adj:0};
    }
    // Place mines
    let placed=0;
    while (placed<this.MINES) {
      const r=Math.floor(Math.random()*this.ROWS), c=Math.floor(Math.random()*this.COLS);
      if (!this.board[r][c].mine) { this.board[r][c].mine=true; placed++; }
    }
    // Adjacency
    for (let r=0; r<this.ROWS; r++) for (let c=0; c<this.COLS; c++) {
      if (this.board[r][c].mine) continue;
      let adj=0;
      for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<this.ROWS&&nc>=0&&nc<this.COLS&&this.board[nr][nc].mine) adj++;
      }
      this.board[r][c].adj=adj;
    }
    this.score=0; this.running=false; this.paused=false; this.gameOver=false;
    this.flagMode = false;
    this._click=(e)=>this.handleClick(e); this._rclick=(e)=>{e.preventDefault();this.handleRClick(e);};
    this.canvas.addEventListener('click',this._click);
    this.canvas.addEventListener('contextmenu',this._rclick);
  }
  getCell(e) {
    const rect=this.canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(this.canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(this.canvas.height/rect.height);
    const c=Math.floor((mx-this.offX)/this.cell), r=Math.floor((my-this.offY)/this.cell);
    if (c<0||c>=this.COLS||r<0||r>=this.ROWS) return null;
    return {r,c};
  }
  handleClick(e) {
    if (!this.running||this.gameOver) return;
    if (this.flagMode) {
      this.handleRClick(e);
      return;
    }
    const cell=this.getCell(e);
    if (!cell||this.board[cell.r][cell.c].flagged||this.board[cell.r][cell.c].revealed) return;
    if (this.board[cell.r][cell.c].mine) {
      this.gameOver=true; this.running=false;
      this.revealAll(); this.draw();
      this.onOver(this.score,this.id);
    } else { this.reveal(cell.r,cell.c); this.checkWin(); this.draw(); }
  }
  handleRClick(e) {
    if (!this.running||this.gameOver) return;
    const cell=this.getCell(e);
    if (!cell||this.board[cell.r][cell.c].revealed) return;
    this.board[cell.r][cell.c].flagged=!this.board[cell.r][cell.c].flagged;
    this.draw();
  }
  reveal(r,c) {
    if (r<0||r>=this.ROWS||c<0||c>=this.COLS) return;
    const cell=this.board[r][c];
    if (cell.revealed||cell.flagged||cell.mine) return;
    cell.revealed=true; this.score+=10; this.onScore(this.score);
    if (cell.adj===0) for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) this.reveal(r+dr,c+dc);
  }
  revealAll() {
    for (let r=0; r<this.ROWS; r++) for (let c=0; c<this.COLS; c++) this.board[r][c].revealed=true;
  }
  checkWin() {
    if (this.board.flat().filter(c=>!c.mine).every(c=>c.revealed)) {
      this.running=false; this.onOver(this.score+500,this.id);
    }
  }
  start() { this.running=true; this.draw(); }
  pause() { this.paused=true; }
  resume() { this.paused=false; }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() {
    this.running=false;
    this.canvas.removeEventListener('click',this._click);
    this.canvas.removeEventListener('contextmenu',this._rclick);
  }
  draw() {
    const {ctx,canvas}=this; const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,W,H);
    const adjColors=['','#C49A68','#4A7A5A','#8A3A2A','#5A4E7A','#9C7248','#4A7A5A','#EDE8E1','#7A726A'];
    for (let r=0; r<this.ROWS; r++) for (let c=0; c<this.COLS; c++) {
      const cell=this.board[r][c];
      const x=this.offX+c*this.cell, y=this.offY+r*this.cell;
      if (cell.revealed) {
        ctx.fillStyle=cell.mine?'#8A3A2A':'#1E1A16';
        ctx.fillRect(x+1,y+1,this.cell-2,this.cell-2);
        if (cell.mine) { ctx.fillStyle='#D4A853'; ctx.fillRect(x+this.cell/2-4,y+this.cell/2-4,8,8); }
        else if (cell.adj>0) {
          ctx.fillStyle=adjColors[cell.adj]||'#EDE8E1';
          ctx.font=`bold ${this.cell*0.55}px Space Mono,monospace`; ctx.textAlign='center';
          ctx.fillText(cell.adj, x+this.cell/2, y+this.cell*0.7);
        }
      } else {
        ctx.fillStyle='#2A2420'; ctx.fillRect(x+1,y+1,this.cell-2,this.cell-2);
        if (cell.flagged) { ctx.fillStyle='#D4A853'; ctx.font=`${this.cell*0.6}px sans-serif`; ctx.textAlign='center'; ctx.fillText('F',x+this.cell/2,y+this.cell*0.72); }
        ctx.strokeStyle='#3A3028'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,this.cell,this.cell);
      }
    }
  }
}

/* ============================================================
   GAME: MEMORY
   ============================================================ */
class MemoryGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.id=id; this.onScore=onScore; this.onOver=onOver;
    this.paused=false; this.running=false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    const symbols=['A','B','C','D','E','F','G','H'];
    const pairs=[...symbols,...symbols];
    for (let i=pairs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]];}
    this.COLS=4; this.ROWS=4;
    this.cell=Math.floor(Math.min(this.canvas.width*0.95/this.COLS, this.canvas.height*0.95/this.ROWS));
    this.offX=Math.floor((this.canvas.width-this.COLS*this.cell)/2);
    this.offY=Math.floor((this.canvas.height-this.ROWS*this.cell)/2);
    this.cards=pairs.map((s,i)=>({sym:s,r:Math.floor(i/this.COLS),c:i%this.COLS,flipped:false,matched:false}));
    this.flipped=[]; this.score=0; this.moves=0; this.blocking=false;
    this.running=false; this.paused=false;
    this._click=(e)=>this.handleClick(e);
    this.canvas.addEventListener('click',this._click);
  }
  handleClick(e) {
    if (!this.running||this.blocking) return;
    const rect=this.canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(this.canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(this.canvas.height/rect.height);
    const c=Math.floor((mx-this.offX)/this.cell), r=Math.floor((my-this.offY)/this.cell);
    const card=this.cards.find(cd=>cd.r===r&&cd.c===c);
    if (!card||card.flipped||card.matched) return;
    card.flipped=true; this.flipped.push(card);
    if (this.flipped.length===2) {
      this.moves++;
      if (this.flipped[0].sym===this.flipped[1].sym) {
        this.flipped[0].matched=this.flipped[1].matched=true;
        this.score+=100; this.onScore(this.score); this.flipped=[];
        if (this.cards.every(c=>c.matched)) { setTimeout(()=>{ this.running=false; this.onOver(this.score,this.id); },500); }
      } else {
        this.blocking=true;
        setTimeout(()=>{ this.flipped.forEach(c=>c.flipped=false); this.flipped=[]; this.blocking=false; this.draw(); },900);
      }
    }
    this.draw();
  }
  start() { this.running=true; this.draw(); }
  pause() { this.paused=true; }
  resume() { this.paused=false; }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() { this.running=false; this.canvas.removeEventListener('click',this._click); }
  draw() {
    const {ctx,canvas}=this;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const colors=['#9C7248','#7A6EA0','#4A7A5A','#D4A853','#8A3A2A','#C49A68','#5A4E7A','#4A7A5A'];
    const symIdx={'A':0,'B':1,'C':2,'D':3,'E':4,'F':5,'G':6,'H':7};
    this.cards.forEach(card=>{
      const x=this.offX+card.c*this.cell+4, y=this.offY+card.r*this.cell+4;
      const w=this.cell-8, h=this.cell-8;
      if (card.matched) {
        ctx.fillStyle=colors[symIdx[card.sym]]+'44';
        ctx.fillRect(x,y,w,h);
        ctx.fillStyle=colors[symIdx[card.sym]];
        ctx.font=`bold ${this.cell*0.45}px Space Grotesk,sans-serif`; ctx.textAlign='center';
        ctx.fillText(card.sym,x+w/2,y+h*0.68);
      } else if (card.flipped) {
        ctx.fillStyle='#2A2420'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle=colors[symIdx[card.sym]];
        ctx.font=`bold ${this.cell*0.5}px Space Grotesk,sans-serif`; ctx.textAlign='center';
        ctx.fillText(card.sym,x+w/2,y+h*0.68);
      } else {
        ctx.fillStyle='#1E1A16'; ctx.fillRect(x,y,w,h);
        ctx.fillStyle='#2A2420';
        ctx.fillRect(x+8,y+8,w-16,h-16);
      }
      ctx.strokeStyle='#3A3028'; ctx.lineWidth=1; ctx.strokeRect(x,y,w,h);
    });
  }
}

/* ============================================================
   GAME: 2048
   ============================================================ */
class Game2048 {
  constructor(canvas, id, onScore, onOver) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.id=id; this.onScore=onScore; this.onOver=onOver;
    this.paused=false; this.running=false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    this.SIZE=4;
    this.cell=Math.floor(Math.min(this.canvas.width, this.canvas.height)*0.9/this.SIZE);
    this.gap=6;
    this.offX=Math.floor((this.canvas.width-this.SIZE*(this.cell+this.gap)+this.gap)/2);
    this.offY=Math.floor((this.canvas.height-this.SIZE*(this.cell+this.gap)+this.gap)/2);
    this.board=Array.from({length:this.SIZE},()=>Array(this.SIZE).fill(0));
    this.score=0; this.running=false; this.paused=false;
    this.addTile(); this.addTile();
    this._kh=(e)=>this.handleKey(e);
    let touchStartX = 0, touchStartY = 0;
    this._ts = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    this._te = (e) => {
      if (!this.running || !e.changedTouches || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const absX = Math.abs(dx), absY = Math.abs(dy);
      if (Math.max(absX, absY) > 25) {
        if (absX > absY) {
          sendKey(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        } else {
          sendKey(dy > 0 ? 'ArrowDown' : 'ArrowUp');
        }
      }
    };
    document.addEventListener('keydown',this._kh);
    this.canvas.addEventListener('touchstart', this._ts, { passive: true });
    this.canvas.addEventListener('touchend', this._te, { passive: true });
  }
  addTile() {
    const empties=[];
    for (let r=0; r<this.SIZE; r++) for (let c=0; c<this.SIZE; c++) if (!this.board[r][c]) empties.push({r,c});
    if (!empties.length) return;
    const {r,c}=empties[Math.floor(Math.random()*empties.length)];
    this.board[r][c]=Math.random()<0.9?2:4;
  }
  handleKey(e) {
    if (!this.running) return;
    const dirs={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
    const d=dirs[e.code]||dirs[e.key];
    if (!d) return;
    e.preventDefault?.();
    if (this.move(d[0],d[1])) { this.addTile(); this.onScore(this.score); this.draw(); if (!this.hasMoves()) { this.running=false; this.onOver(this.score,this.id); } }
  }
  move(dr,dc) {
    let moved=false;
    const order=(n)=>dr>0||dc>0 ? [...Array(n).keys()].reverse() : [...Array(n).keys()];
    for (const r of order(this.SIZE)) for (const c of order(this.SIZE)) {
      if (!this.board[r][c]) continue;
      let nr=r, nc=c;
      while (true) {
        const nnr=nr+dr, nnc=nc+dc;
        if (nnr<0||nnr>=this.SIZE||nnc<0||nnc>=this.SIZE) break;
        if (this.board[nnr][nnc]===0) { nr=nnr; nc=nnc; }
        else if (this.board[nnr][nnc]===this.board[r][c]&&!this._merged?.[nnr]?.[nnc]) {
          nr=nnr; nc=nnc; break;
        } else break;
      }
      if (nr!==r||nc!==c) {
        if (this.board[nr][nc]===this.board[r][c]&&(nr!==r||nc!==c)&&this.board[r][c]) {
          if (!this._merged) this._merged=Array.from({length:this.SIZE},()=>Array(this.SIZE).fill(false));
          this.board[nr][nc]*=2; this.score+=this.board[nr][nc]; this.board[r][c]=0; this._merged[nr][nc]=true;
        } else { this.board[nr][nc]=this.board[r][c]; this.board[r][c]=0; }
        moved=true;
      }
    }
    this._merged=null; return moved;
  }
  hasMoves() {
    for (let r=0; r<this.SIZE; r++) for (let c=0; c<this.SIZE; c++) {
      if (!this.board[r][c]) return true;
      if (r+1<this.SIZE&&this.board[r][c]===this.board[r+1][c]) return true;
      if (c+1<this.SIZE&&this.board[r][c]===this.board[r][c+1]) return true;
    }
    return false;
  }
  start() { this.running=true; this.draw(); }
  pause() { this.paused=true; }
  resume() { this.paused=false; }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() { 
    this.running=false; 
    document.removeEventListener('keydown',this._kh);
    this.canvas.removeEventListener('touchstart', this._ts);
    this.canvas.removeEventListener('touchend', this._te);
  }
  draw() {
    const {ctx,canvas}=this; const W=canvas.width, H=canvas.height;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,W,H);
    const tileColors={0:'#1E1A16',2:'#3A3028',4:'#4A3822',8:'#6B4C2A',16:'#8A5C30',32:'#9C7248',64:'#B08A60',128:'#D4A853',256:'#E8BF6A',512:'#7A6EA0',1024:'#5A4E7A',2048:'#9B59B6'};
    for (let r=0; r<this.SIZE; r++) for (let c=0; c<this.SIZE; c++) {
      const v=this.board[r][c];
      const x=this.offX+c*(this.cell+this.gap), y=this.offY+r*(this.cell+this.gap);
      ctx.fillStyle=tileColors[v]||'#2A1A5A'; ctx.fillRect(x,y,this.cell,this.cell);
      if (v) {
        ctx.fillStyle=v>=8?'#EDE8E1':'#9A9088';
        const fs=v>=1024?this.cell*0.3:v>=128?this.cell*0.38:this.cell*0.44;
        ctx.font=`bold ${fs}px Space Grotesk,sans-serif`; ctx.textAlign='center';
        ctx.fillText(v,x+this.cell/2,y+this.cell*0.62);
      }
    }
  }
}

/* ============================================================
   GAME: TIC TAC TOE
   ============================================================ */
class TicTacToeGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d');
    this.id=id; this.onScore=onScore; this.onOver=onOver;
    this.paused=false; this.running=false;
  }
  init() { this.reset(); this.draw(); }
  reset() {
    this.board=Array(9).fill(null); this.turn='X'; this.winner=null; this.score=0;
    this.running=false; this.paused=false;
    this.cell=Math.floor(Math.min(this.canvas.width,this.canvas.height)*0.9/3);
    this.offX=Math.floor((this.canvas.width-this.cell*3)/2);
    this.offY=Math.floor((this.canvas.height-this.cell*3)/2);
    this._click=(e)=>this.handleClick(e);
    this.canvas.addEventListener('click',this._click);
  }
  handleClick(e) {
    if (!this.running||this.winner) return;
    const rect=this.canvas.getBoundingClientRect();
    const mx=(e.clientX-rect.left)*(this.canvas.width/rect.width);
    const my=(e.clientY-rect.top)*(this.canvas.height/rect.height);
    const c=Math.floor((mx-this.offX)/this.cell), r=Math.floor((my-this.offY)/this.cell);
    if (c<0||c>2||r<0||r>2) return;
    const idx=r*3+c;
    if (this.board[idx]) return;
    this.board[idx]='X';
    this.winner=this.checkWin();
    if (!this.winner && this.board.includes(null)) this.aiMove();
    this.winner=this.winner||this.checkWin();
    this.draw();
    if (this.winner) {
      this.running=false;
      if (this.winner==='X') { 
        RetroAudio.playWin();
        this.score+=100; 
        this.onScore(this.score); 
      } else {
        RetroAudio.playLose();
      }
      setTimeout(()=>this.onOver(this.score,this.id),800);
    } else if (!this.board.includes(null)) {
      this.running=false; 
      RetroAudio.playLose();
      setTimeout(()=>this.onOver(this.score,this.id),800);
    }
  }
  aiMove() {
    // Try to win, then block, then random
    const marks=['O','X'];
    for (const mark of marks) {
      for (let i=0; i<9; i++) {
        if (this.board[i]) continue;
        this.board[i]=mark;
        if (this.checkWin()===mark) { this.board[i]='O'; return; }
        this.board[i]=null;
      }
    }
    const empties=this.board.map((v,i)=>v?-1:i).filter(i=>i>=0);
    if (empties.length) this.board[empties[Math.floor(Math.random()*empties.length)]]='O';
  }
  checkWin() {
    const wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of wins) {
      if (this.board[a]&&this.board[a]===this.board[b]&&this.board[a]===this.board[c]) return this.board[a];
    }
    return null;
  }
  start() { this.running=true; this.draw(); }
  pause() { this.paused=true; }
  resume() { this.paused=false; }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }
  destroy() { this.running=false; this.canvas.removeEventListener('click',this._click); }
  draw() {
    const {ctx,canvas}=this; const {cell,offX,offY}=this;
    ctx.fillStyle='#100E0C'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#3A3028'; ctx.lineWidth=3;
    for (let i=1; i<3; i++) {
      ctx.beginPath(); ctx.moveTo(offX+i*cell,offY); ctx.lineTo(offX+i*cell,offY+3*cell); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(offX,offY+i*cell); ctx.lineTo(offX+3*cell,offY+i*cell); ctx.stroke();
    }
    this.board.forEach((v,i)=>{
      if (!v) return;
      const r=Math.floor(i/3), c=i%3;
      const cx=offX+c*cell+cell/2, cy=offY+r*cell+cell/2;
      const m=cell*0.3;
      if (v==='X') {
        ctx.strokeStyle='#D4A853'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.moveTo(cx-m,cy-m); ctx.lineTo(cx+m,cy+m); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx+m,cy-m); ctx.lineTo(cx-m,cy+m); ctx.stroke();
      } else {
        ctx.strokeStyle='#7A6EA0'; ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(cx,cy,m,0,Math.PI*2); ctx.stroke();
      }
    });
    if (this.winner) {
      ctx.fillStyle='rgba(10,8,6,0.5)';
      ctx.fillRect(offX,offY,3*cell,3*cell);
      ctx.fillStyle=this.winner==='X'?'#D4A853':'#7A6EA0';
      ctx.font=`bold ${cell*0.4}px Space Grotesk,sans-serif`; ctx.textAlign='center';
      ctx.fillText(this.winner==='X'?'YOU WIN':'AI WINS',offX+1.5*cell,offY+1.6*cell);
    }
  }
}

/* ============================================================
   GAME: SPACE WAR (VIBRANT RETRO COSMIC DEFENDER — FULL FX)
   ============================================================ */
class SpaceWarGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.id = id;
    this.onScore = onScore;
    this.onOver = onOver;
    this.running = false;
    this.paused = false;
  }

  init() {
    this.reset();
    this.draw();
  }

  reset() {
    const W = this.canvas.width;
    const H = this.canvas.height;

    this.ship = {
      x: W / 2,
      y: H - 80,
      w: 26,
      h: 30,
      vx: 0,
      vy: 0,
      speed: 3.4,
      tilt: 0,
      shield: 100,
      tripleShotTimer: 0,
      nukeTimer: 0,
      invulnerable: 80
    };

    this.keys = {};
    this.lasers = [];
    this.enemyLasers = [];
    this.asteroids = [];
    this.enemies = [];
    this.particles = [];
    this.shockwaves = [];
    this.popups = [];
    this.powerups = [];
    this.stars = [];
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.shootCooldown = 0;
    this.screenShake = 0;
    this.waveBannerTimer = 90;
    this.waveBannerText = 'WAVE 1: COSMIC DEFENSE';

    // 3-Layer Parallax Starfield
    for (let i = 0; i < 75; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 0.3 + Math.random() * 1.8,
        size: Math.random() < 0.25 ? 2.2 : (Math.random() < 0.5 ? 1.5 : 1),
        layer: Math.random() < 0.3 ? 3 : (Math.random() < 0.6 ? 2 : 1),
        color: Math.random() < 0.3 ? '#D4A853' : (Math.random() < 0.6 ? '#EDE8E1' : '#7A6D60'),
        twinkle: Math.random() * Math.PI * 2
      });
    }

    this._kd = (e) => {
      this.keys[e.code] = true;
      this.keys[e.key] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault?.();
      }
    };
    this._ku = (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    };
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup', this._ku);

    this.spawnWave();
  }

  spawnWave() {
    const W = this.canvas.width;
    this.waveBannerText = `WAVE ${this.wave}: ${this.wave % 3 === 0 ? 'ARMADA ASSAULT' : 'SPACE PATROL'}`;
    this.waveBannerTimer = 90;

    // Coffee Asteroids
    const count = 4 + Math.min(8, this.wave * 2);
    for (let i = 0; i < count; i++) {
      this.spawnAsteroid(30 + Math.random() * (W - 60), -50 - Math.random() * 240, 16 + Math.random() * 14, 2);
    }

    // Alien Raider Saucers
    const raiderCount = Math.min(6, 1 + this.wave);
    for (let i = 0; i < raiderCount; i++) {
      this.enemies.push({
        x: 45 + i * ((W - 90) / Math.max(1, raiderCount - 1)),
        y: -40 - i * 40,
        targetY: 55 + (i % 3) * 45,
        w: 30,
        h: 22,
        vx: (i % 2 === 0 ? 1 : -1) * (1.1 + this.wave * 0.1),
        hp: 2 + Math.floor(this.wave / 2),
        maxHp: 2 + Math.floor(this.wave / 2),
        phase: Math.random() * Math.PI * 2,
        shootTimer: 75 + Math.floor(Math.random() * 80)
      });
    }
  }

  spawnAsteroid(x, y, r, hp = 2) {
    // Generate organic polygonal vertices for rich retro asteroid look
    const numVerts = 8;
    const verts = [];
    for (let i = 0; i < numVerts; i++) {
      const angle = (Math.PI * 2 * i) / numVerts;
      const dist = r * (0.75 + Math.random() * 0.5);
      verts.push({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }

    this.asteroids.push({
      x, y, r, hp, verts,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 0.75 + Math.random() * 0.8 + this.wave * 0.06,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.035
    });
  }

  shoot() {
    if (this.shootCooldown > 0) return;
    const { x, y } = this.ship;

    if (this.ship.tripleShotTimer > 0) {
      this.lasers.push({ x: x - 10, y: y - 10, vx: -1.4, vy: -9, color: '#EFC97C', w: 3, h: 14 });
      this.lasers.push({ x: x, y: y - 14, vx: 0, vy: -9.5, color: '#D4A853', w: 4, h: 16 });
      this.lasers.push({ x: x + 10, y: y - 10, vx: 1.4, vy: -9, color: '#EFC97C', w: 3, h: 14 });
    } else {
      this.lasers.push({ x: x - 8, y: y - 10, vx: 0, vy: -9, color: '#D4A853', w: 3.5, h: 15 });
      this.lasers.push({ x: x + 8, y: y - 10, vx: 0, vy: -9, color: '#D4A853', w: 3.5, h: 15 });
    }

    // Muzzle flash sparks
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y - 12,
        vx: (Math.random() - 0.5) * 2,
        vy: -1.5 - Math.random() * 2,
        r: 1.5,
        color: '#FFF2D6',
        life: 8,
        maxLife: 8
      });
    }

    this.shootCooldown = 13;
    if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
      RetroAudio.playSelect();
    }
  }

  addShockwave(x, y, maxR = 40, color = '#D4A853') {
    this.shockwaves.push({ x, y, r: 4, maxR, color, alpha: 1.0 });
  }

  addPopup(x, y, text, color = '#D4A853') {
    this.popups.push({ x, y, text, color, life: 35, vy: -1.2 });
  }

  spawnExplosion(x, y, color = '#D4A853', count = 18, speedMult = 1) {
    this.addShockwave(x, y, 32 + count * 0.8, color);
    this.screenShake = Math.max(this.screenShake, Math.min(10, count * 0.35));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.2 + Math.random() * 4.2) * speedMult;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.5 + Math.random() * 2.8,
        life: 20 + Math.floor(Math.random() * 22),
        maxLife: 42,
        color
      });
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  pause() {
    this.paused = true;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }

  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup', this._ku);
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  loop(timestamp) {
    if (!this.running) return;
    if (!timestamp) timestamp = performance.now();
    if (!this._lastTime) this._lastTime = timestamp;
    let elapsed = timestamp - this._lastTime;
    this._lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;

    this._accumulator = (this._accumulator || 0) + elapsed;
    const STEP = 1000 / 60;
    let steps = 0;
    while (this._accumulator >= STEP && steps < 4) {
      this.update();
      this._accumulator -= STEP;
      steps++;
    }
    this.draw();
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }

  update() {
    const W = this.canvas.width;
    const H = this.canvas.height;

    if (this.screenShake > 0) this.screenShake *= 0.88;
    if (this.waveBannerTimer > 0) this.waveBannerTimer--;
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.ship.invulnerable > 0) this.ship.invulnerable--;
    if (this.ship.tripleShotTimer > 0) this.ship.tripleShotTimer--;

    // Starfield Movement
    this.stars.forEach(s => {
      s.y += s.speed;
      s.twinkle += 0.05;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    });

    // Player Steer & Thrust
    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['a']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.keys['d']) dx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['w']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS'] || this.keys['s']) dy += 1;

    // Smooth banking tilt
    const targetTilt = dx * 0.28;
    this.ship.tilt += (targetTilt - this.ship.tilt) * 0.2;

    this.ship.x += dx * this.ship.speed;
    this.ship.y += dy * this.ship.speed;
    this.ship.x = Math.max(18, Math.min(W - 18, this.ship.x));
    this.ship.y = Math.max(45, Math.min(H - 25, this.ship.y));

    // Dual Engine Flame & Smoke Particles
    const leftThrusterX = this.ship.x - 7;
    const rightThrusterX = this.ship.x + 7;
    const thrusterY = this.ship.y + 14;

    [leftThrusterX, rightThrusterX].forEach(tx => {
      // Core jet flame
      this.particles.push({
        x: tx + (Math.random() - 0.5) * 3,
        y: thrusterY,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 3.2 + Math.random() * 2.2,
        r: 2.2,
        life: 12,
        maxLife: 12,
        color: Math.random() < 0.4 ? '#FFF5DF' : '#EFC97C'
      });
      // Outer amber/smoke
      if (Math.random() < 0.45) {
        this.particles.push({
          x: tx + (Math.random() - 0.5) * 5,
          y: thrusterY + 4,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 2.0 + Math.random() * 1.8,
          r: 3.2,
          life: 18,
          maxLife: 18,
          color: '#D4A853'
        });
      }
    });

    if (this.keys['Space']) this.shoot();

    // Move Lasers
    this.lasers.forEach(l => { l.x += l.vx; l.y += l.vy; });
    this.lasers = this.lasers.filter(l => l.y > -20 && l.x > -20 && l.x < W + 20);

    this.enemyLasers.forEach(el => { el.x += el.vx; el.y += el.vy; });
    this.enemyLasers = this.enemyLasers.filter(el => el.y < H + 20);

    // Update Asteroids
    this.asteroids.forEach(a => {
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.rotSpeed;
      if (a.x < a.r || a.x > W - a.r) a.vx *= -1;
    });

    // Update Raider Saucers
    this.enemies.forEach(e => {
      e.phase += 0.04;
      if (e.y < e.targetY) e.y += 1.6;
      e.x += e.vx + Math.sin(e.phase) * 0.8;
      if (e.x < 30 || e.x > W - 30) e.vx *= -1;

      e.shootTimer--;
      if (e.shootTimer <= 0) {
        e.shootTimer = 60 + Math.floor(Math.random() * 65);
        this.enemyLasers.push({
          x: e.x,
          y: e.y + 12,
          vx: (Math.random() - 0.5) * 1.4,
          vy: 4.4,
          color: '#E06C58'
        });
      }
    });

    // Collision: Player Lasers vs Asteroids
    this.lasers.forEach(l => {
      this.asteroids.forEach(a => {
        if (a.hp > 0 && Math.hypot(l.x - a.x, l.y - a.y) < a.r + 6) {
          l.y = -999;
          a.hp--;
          this.spawnExplosion(l.x, l.y, '#9C7248', 8);

          if (a.hp <= 0) {
            this.score += a.r > 20 ? 50 : 25;
            this.onScore(this.score);
            this.addPopup(a.x, a.y, a.r > 20 ? '+50' : '+25', '#D4A853');
            this.spawnExplosion(a.x, a.y, '#D4A853', 22);

            // Split large asteroids into 2 mini bean chunks
            if (a.r > 20) {
              this.spawnAsteroid(a.x - 10, a.y, 11, 1);
              this.spawnAsteroid(a.x + 10, a.y, 11, 1);
            }
            if (Math.random() < 0.22) {
              this.powerups.push({ x: a.x, y: a.y, type: 'triple', vy: 1.6, rot: 0 });
            }
          }
        }
      });

      // Collision: Player Lasers vs Raider Enemies
      this.enemies.forEach(e => {
        if (e.hp > 0 && Math.abs(l.x - e.x) < e.w / 2 + 4 && Math.abs(l.y - e.y) < e.h / 2 + 6) {
          l.y = -999;
          e.hp--;
          this.spawnExplosion(l.x, l.y, '#E06C58', 10);

          if (e.hp <= 0) {
            this.score += 150;
            this.onScore(this.score);
            this.addPopup(e.x, e.y, '+150', '#EFC97C');
            this.spawnExplosion(e.x, e.y, '#D4A853', 28, 1.25);

            if (Math.random() < 0.45) {
              const types = ['triple', 'shield', 'nuke'];
              const chosen = types[Math.floor(Math.random() * types.length)];
              this.powerups.push({ x: e.x, y: e.y, type: chosen, vy: 1.6, rot: 0 });
            }
          }
        }
      });
    });

    this.asteroids = this.asteroids.filter(a => a.hp > 0 && a.y < H + 60);
    this.enemies = this.enemies.filter(e => e.hp > 0);

    // Update Powerups
    this.powerups.forEach(p => {
      p.y += p.vy;
      p.rot += 0.05;
      if (Math.hypot(p.x - this.ship.x, p.y - this.ship.y) < 28) {
        p.y = 9999;
        if (p.type === 'triple') {
          this.ship.tripleShotTimer = 480;
          this.addPopup(this.ship.x, this.ship.y - 20, 'TRIPLE LASER!', '#EFC97C');
        } else if (p.type === 'shield') {
          this.ship.shield = Math.min(100, this.ship.shield + 45);
          this.addPopup(this.ship.x, this.ship.y - 20, '+45% SHIELD', '#2ECC71');
        } else if (p.type === 'nuke') {
          // Screen Nuke!
          this.screenShake = 16;
          this.addShockwave(W / 2, H / 2, 280, '#FFF5DF');
          this.enemies.forEach(e => {
            e.hp = 0;
            this.spawnExplosion(e.x, e.y, '#D4A853', 25);
          });
          this.asteroids.forEach(a => {
            a.hp = 0;
            this.spawnExplosion(a.x, a.y, '#9C7248', 18);
          });
          this.score += 400;
          this.onScore(this.score);
          this.addPopup(this.ship.x, this.ship.y - 20, 'COSMIC NUKE +400!', '#FFF2D6');
        }

        if (typeof RetroAudio !== 'undefined' && RetroAudio.playWin) {
          RetroAudio.playWin();
        }
      }
    });
    this.powerups = this.powerups.filter(p => p.y < H + 25);

    // Collision: Enemy Lasers vs Ship
    this.enemyLasers.forEach(el => {
      if (this.ship.invulnerable <= 0 && Math.hypot(el.x - this.ship.x, el.y - this.ship.y) < 18) {
        el.y = 9999;
        this.takeDamage(22);
      }
    });

    // Collision: Asteroids vs Ship
    this.asteroids.forEach(a => {
      if (this.ship.invulnerable <= 0 && Math.hypot(a.x - this.ship.x, a.y - this.ship.y) < a.r + 12) {
        a.hp = 0;
        this.spawnExplosion(a.x, a.y, '#D4A853', 22);
        this.takeDamage(32);
      }
    });

    // Update Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    // Update Shockwaves
    this.shockwaves.forEach(sw => {
      sw.r += (sw.maxR - sw.r) * 0.18;
      sw.alpha = 1 - sw.r / sw.maxR;
    });
    this.shockwaves = this.shockwaves.filter(sw => sw.alpha > 0.05);

    // Update Popups
    this.popups.forEach(po => {
      po.y += po.vy;
      po.life--;
    });
    this.popups = this.popups.filter(po => po.life > 0);

    // Wave Progression Check
    if (this.asteroids.length === 0 && this.enemies.length === 0) {
      this.wave++;
      this.ship.shield = Math.min(100, this.ship.shield + 25);
      this.spawnWave();
    }
  }

  takeDamage(amount) {
    this.ship.shield -= amount;
    this.screenShake = 12;
    this.spawnExplosion(this.ship.x, this.ship.y, '#E06C58', 14);

    if (this.ship.shield <= 0) {
      this.lives--;
      this.spawnExplosion(this.ship.x, this.ship.y, '#D4A853', 35, 1.4);

      if (this.lives <= 0) {
        this.running = false;
        setTimeout(() => this.onOver(this.score, this.id), 800);
      } else {
        this.ship.shield = 100;
        this.ship.invulnerable = 90;
        this.ship.x = this.canvas.width / 2;
        this.ship.y = this.canvas.height - 80;
      }
    }
  }

  draw() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;

    ctx.save();

    // Screen Shake effect
    if (this.screenShake > 0.5) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // Space Void Background
    ctx.fillStyle = '#0A0806';
    ctx.fillRect(0, 0, W, H);

    // Nebula Glow
    const grad = ctx.createRadialGradient(W / 2, H * 0.4, 20, W / 2, H * 0.4, W * 0.85);
    grad.addColorStop(0, 'rgba(212, 168, 83, 0.08)');
    grad.addColorStop(0.5, 'rgba(122, 110, 160, 0.04)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Starfield with Twinkle
    this.stars.forEach(s => {
      const opacity = 0.5 + Math.sin(s.twinkle) * 0.5;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
      ctx.restore();
    });

    // Shockwaves
    this.shockwaves.forEach(sw => {
      ctx.save();
      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // Particle Sparks
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Powerups with Orbital Ring
    this.powerups.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      const color = p.type === 'triple' ? '#D4A853' : (p.type === 'shield' ? '#2ECC71' : '#E06C58');

      // Glow halo
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Core pill
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0A0806';
      ctx.font = 'bold 8px Space Mono,monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = p.type === 'triple' ? '3X' : (p.type === 'shield' ? 'SH' : 'BM');
      ctx.fillText(label, 0, 0);
      ctx.restore();
    });

    // Asteroids (Organic Coffee Rocks)
    this.asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);

      ctx.fillStyle = '#3F2C1E';
      ctx.strokeStyle = '#D4A853';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      a.verts.forEach((v, idx) => {
        if (idx === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Coffee Bean Crevice
      ctx.strokeStyle = '#1E140C';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, a.r * 0.55, -0.7, 0.7);
      ctx.stroke();
      ctx.restore();
    });

    // Raider Enemies (Saucers)
    this.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      // Energy Shield / Aura
      ctx.strokeStyle = 'rgba(224, 108, 88, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.w / 2 + 2, e.h / 2 + 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Hull
      ctx.fillStyle = '#E06C58';
      ctx.strokeStyle = '#D4A853';
      ctx.beginPath();
      ctx.ellipse(0, 0, e.w / 2, e.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cockpit Dome
      ctx.fillStyle = '#EDE8E1';
      ctx.beginPath();
      ctx.arc(0, -4, 6, Math.PI, 0);
      ctx.fill();

      // HP Bar for elite waves
      if (e.maxHp > 2) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-12, -e.h / 2 - 6, 24, 3);
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(-12, -e.h / 2 - 6, 24 * (e.hp / e.maxHp), 3);
      }
      ctx.restore();
    });

    // Enemy Lasers
    ctx.fillStyle = '#E06C58';
    this.enemyLasers.forEach(el => {
      ctx.fillRect(el.x - 2, el.y - 7, 4, 14);
    });

    // Player Lasers (Glowing Energy Bolts)
    this.lasers.forEach(l => {
      ctx.save();
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = l.color;
      ctx.fillRect(l.x - l.w / 2, l.y - l.h / 2, l.w, l.h);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(l.x - 1, l.y - l.h / 2 + 2, 2, l.h - 4);
      ctx.restore();
    });

    // Player Starfighter
    if (this.ship.invulnerable % 8 < 5) {
      const { x, y, w, h, tilt } = this.ship;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);

      // Starfighter Body
      ctx.fillStyle = '#EDE8E1';
      ctx.strokeStyle = '#D4A853';
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(w / 4, h / 3);
      ctx.lineTo(0, h / 2 - 3);
      ctx.lineTo(-w / 4, h / 3);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Cannons
      ctx.fillStyle = '#D4A853';
      ctx.fillRect(-w / 2 - 2, h / 4, 3, 8);
      ctx.fillRect(w / 2 - 1, h / 4, 3, 8);

      // Canopy Glass
      ctx.fillStyle = '#EFC97C';
      ctx.beginPath();
      ctx.ellipse(0, -3, 4, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shield Bubble
      if (this.ship.shield > 25) {
        ctx.strokeStyle = `rgba(212, 168, 83, ${Math.min(0.8, this.ship.shield / 120)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.95, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Floating Score Popups
    this.popups.forEach(po => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, po.life / 20);
      ctx.fillStyle = po.color;
      ctx.font = 'bold 12px Space Mono,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(po.text, po.x, po.y);
      ctx.restore();
    });

    // Top HUD Bar
    ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
    ctx.fillRect(0, 0, W, 32);
    ctx.strokeStyle = 'rgba(212, 168, 83, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, 32);

    ctx.fillStyle = '#D4A853';
    ctx.font = 'bold 11px Space Mono,monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`LIVES: ${'▲ '.repeat(Math.max(0, this.lives))}`, 14, 20);

    ctx.textAlign = 'center';
    ctx.fillText(`SHIELD: ${Math.max(0, Math.round(this.ship.shield))}%`, W / 2, 20);

    ctx.textAlign = 'right';
    ctx.fillText(`WAVE: ${this.wave}`, W - 14, 20);

    // Wave Intro Banner
    if (this.waveBannerTimer > 0) {
      ctx.save();
      const alpha = Math.min(1, this.waveBannerTimer / 25);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#D4A853';
      ctx.font = 'bold 20px Space Grotesk,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.waveBannerText, W / 2, H / 2 - 25);
      ctx.restore();
    }

    ctx.restore();
  }
}

/* ============================================================
   GAME: COFFEE MARIO (PARODI SUPER MARIO — 5 STAGES & FULL FX)
   ============================================================ */
class CoffeeMarioGame {
  constructor(canvas, id, onScore, onOver) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.id = id;
    this.onScore = onScore;
    this.onOver = onOver;
    this.running = false;
    this.paused = false;
  }

  init() {
    this.reset();
    this.draw();
  }

  reset() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.cameraX = 0;
    this.stageWidth = 2400;
    this.groundY = H - 50;

    this.mario = {
      x: 60,
      y: this.groundY - 32,
      w: 24,
      h: 32,
      vx: 0,
      vy: 0,
      speed: 2.6,
      runSpeed: 3.6,
      jumpPower: -9.2,
      grounded: true,
      facingRight: true,
      isSuper: false,
      invulnerable: 0,
      animTick: 0,
      isSkidding: false
    };

    this.keys = {};
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.stage = 1; // 1 to 5

    this.fireballs = [];
    this.particles = [];
    this.debris = [];
    this.popups = [];
    this.firebars = [];
    this.boss = null;
    this.stageBannerTimer = 90;

    this.buildCurrentStage();

    this._kd = (e) => {
      this.keys[e.code] = true;
      this.keys[e.key] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyF'].includes(e.code)) {
        e.preventDefault?.();
      }
      if (e.code === 'KeyZ' || e.code === 'KeyF') {
        this.shootFireball();
      }
    };
    this._ku = (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    };
    document.addEventListener('keydown', this._kd);
    document.addEventListener('keyup', this._ku);
  }

  // Define 5 Distinct Themed Stages
  buildCurrentStage() {
    const GY = this.groundY;
    this.blocks = [];
    this.pipes = [];
    this.enemies = [];
    this.beans = [];
    this.firebars = [];
    this.boss = null;
    this.stageBannerTimer = 85;

    // Stage Themes:
    // 1: Morning Roast Plains
    // 2: Dark Roast Caverns
    // 3: Steam Cloud Heights
    // 4: Cold Brew Glaciers
    // 5: Roastery Furnace (Boss Stage!)
    const stageNames = [
      'WORLD 1-1: MORNING PLAINS',
      'WORLD 1-2: ROAST CAVERNS',
      'WORLD 1-3: STEAM CLOUDS',
      'WORLD 1-4: COLD BREW GLACIER',
      'WORLD 1-5: ROASTERY FURNACE (BOSS)'
    ];
    this.stageTitle = stageNames[Math.min(4, this.stage - 1)];

    // Standard Flagpole for Stages 1 - 4
    if (this.stage < 5) {
      this.flagpole = { x: 2150, y: GY - 180, w: 10, h: 180 };
    } else {
      this.flagpole = null; // Stage 5 ends by defeating the King Cup Boss!
    }

    if (this.stage === 1) {
      // Stage 1: Classic Plains
      this.theme = {
        skyTop: '#1E1611', skyBot: '#140E0A',
        hillColor: '#2B1E15', groundColor: '#5C3E28',
        groundTopColor: '#C49A68', pipeColor: '#3E6B48',
        cloudColor: '#32251C', isSnow: false, isFurnace: false
      };
      this.groundSegments = [{ x1: 0, x2: 700 }, { x1: 780, x2: 1400 }, { x1: 1480, x2: 2400 }];
      [260, 520, 1020, 1300, 1720].forEach((px, i) => this.pipes.push({ x: px, y: GY - (38 + (i % 2) * 16), w: 34, h: 38 + (i % 2) * 16 }));

      this.addBlock(200, GY - 80, 'q', 'bean');
      this.addBlock(230, GY - 80, 'b');
      this.addBlock(260, GY - 80, 'q', 'super');
      this.addBlock(290, GY - 80, 'b');

      this.addBlock(600, GY - 85, 'q', 'bean');
      this.addBlock(630, GY - 130, 'q', 'bean');
      this.addBlock(880, GY - 80, 'b');
      this.addBlock(910, GY - 80, 'q', 'super');

      [340, 480, 680, 920, 1150, 1380, 1650, 1900].forEach(ex => this.spawnEnemy(ex, GY - 22, 'cup'));
    }
    else if (this.stage === 2) {
      // Stage 2: Dark Roast Caverns
      this.theme = {
        skyTop: '#0B0907', skyBot: '#14100C',
        hillColor: '#1A1410', groundColor: '#3E2A1D',
        groundTopColor: '#8C5D36', pipeColor: '#4A3B2C',
        cloudColor: '#1E1712', isSnow: false, isFurnace: false
      };
      this.groundSegments = [{ x1: 0, x2: 550 }, { x1: 650, x2: 1200 }, { x1: 1320, x2: 2400 }];
      [300, 720, 1050, 1450, 1800].forEach((px, i) => this.pipes.push({ x: px, y: GY - (40 + (i % 3) * 14), w: 34, h: 40 + (i % 3) * 14 }));

      // Floating underground bridges
      for (let bx = 380; bx < 480; bx += 28) this.addBlock(bx, GY - 75, 'b');
      this.addBlock(420, GY - 120, 'q', 'super');

      for (let bx = 760; bx < 860; bx += 28) this.addBlock(bx, GY - 90, 'b');
      this.addBlock(800, GY - 90, 'q', 'bean');

      [240, 400, 750, 900, 1100, 1380, 1600, 1880, 2020].forEach(ex => this.spawnEnemy(ex, GY - 22, 'slug'));
    }
    else if (this.stage === 3) {
      // Stage 3: Steam Cloud Heights
      this.theme = {
        skyTop: '#1E1A29', skyBot: '#13111C',
        hillColor: '#282338', groundColor: '#4A415C',
        groundTopColor: '#EDE8E1', pipeColor: '#6B5A8A',
        cloudColor: '#38324C', isSnow: false, isFurnace: false
      };
      this.groundSegments = [{ x1: 0, x2: 450 }, { x1: 580, x2: 1050 }, { x1: 1200, x2: 1650 }, { x1: 1800, x2: 2400 }];
      [220, 780, 1380, 1950].forEach((px, i) => this.pipes.push({ x: px, y: GY - (45 + (i % 2) * 15), w: 34, h: 45 + (i % 2) * 15 }));

      // Floating Bouncy Milk-Foam Cloud Platforms
      for (let bx = 480; bx <= 550; bx += 28) this.addBlock(bx, GY - 70, 'q', 'bean');
      for (let bx = 1080; bx <= 1160; bx += 28) this.addBlock(bx, GY - 80, 'b');
      this.addBlock(1120, GY - 130, 'q', 'super');

      [300, 650, 850, 1250, 1450, 1880, 2050].forEach(ex => this.spawnEnemy(ex, GY - 22, 'cup'));
    }
    else if (this.stage === 4) {
      // Stage 4: Cold Brew Glacier (Ice & Slippery)
      this.theme = {
        skyTop: '#0D1720', skyBot: '#080F16',
        hillColor: '#13212C', groundColor: '#213B4D',
        groundTopColor: '#A8D4EB', pipeColor: '#2D5974',
        cloudColor: '#1A2C3A', isSnow: true, isFurnace: false
      };
      this.groundSegments = [{ x1: 0, x2: 600 }, { x1: 720, x2: 1300 }, { x1: 1450, x2: 2400 }];
      [280, 850, 1180, 1620, 1920].forEach((px, i) => this.pipes.push({ x: px, y: GY - (42 + (i % 2) * 18), w: 34, h: 42 + (i % 2) * 18 }));

      for (let bx = 360; bx < 480; bx += 28) this.addBlock(bx, GY - 85, 'b');
      this.addBlock(400, GY - 85, 'q', 'super');

      for (let bx = 950; bx < 1080; bx += 28) this.addBlock(bx, GY - 85, 'b');
      this.addBlock(1010, GY - 130, 'q', 'bean');

      [320, 480, 780, 950, 1200, 1520, 1750, 2000].forEach(ex => this.spawnEnemy(ex, GY - 22, 'slug'));
    }
    else {
      // Stage 5: The Roastery Furnace (Boss Stage!)
      this.theme = {
        skyTop: '#250B05', skyBot: '#150502',
        hillColor: '#361109', groundColor: '#4A1C12',
        groundTopColor: '#E06C58', pipeColor: '#6B2C1F',
        cloudColor: '#2B0E07', isSnow: false, isFurnace: true
      };
      this.groundSegments = [{ x1: 0, x2: 500 }, { x1: 620, x2: 1200 }, { x1: 1320, x2: 2400 }];
      [240, 800, 1420].forEach((px, i) => this.pipes.push({ x: px, y: GY - 45, w: 34, h: 45 }));

      // Rotating Firebars!
      this.firebars.push({ x: 740, y: GY - 80, angle: 0, len: 4 });
      this.firebars.push({ x: 1050, y: GY - 90, angle: Math.PI / 2, len: 4 });
      this.firebars.push({ x: 1550, y: GY - 80, angle: Math.PI, len: 4 });

      for (let bx = 300; bx < 420; bx += 28) this.addBlock(bx, GY - 85, 'b');
      this.addBlock(360, GY - 85, 'q', 'super');

      for (let bx = 880; bx < 980; bx += 28) this.addBlock(bx, GY - 85, 'b');
      this.addBlock(930, GY - 85, 'q', 'super');

      // The Great King Espresso Boss!
      this.boss = {
        x: 2050,
        y: GY - 64,
        w: 52,
        h: 64,
        hp: 6,
        maxHp: 6,
        vx: -1.6,
        jumpTimer: 80,
        shootTimer: 60,
        defeated: false
      };
    }

    // Collectible Golden Beans
    for (let bx = 280; bx < 2050; bx += 120) {
      this.beans.push({ x: bx, y: GY - 60 - (bx % 3) * 22, collected: false, rot: Math.random() * Math.PI });
    }
  }

  addBlock(x, y, type, content = null) {
    this.blocks.push({ x, y, w: 26, h: 26, type, content, hit: false, bumpY: 0 });
  }

  spawnEnemy(x, y, type = 'cup') {
    this.enemies.push({
      x, y, w: 24, h: 24,
      vx: -0.92,
      type,
      alive: true,
      squashed: false,
      squashTimer: 0
    });
  }

  spawnDust(x, y, color = '#C49A68') {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: -0.5 - Math.random() * 1.5,
        r: 2,
        color,
        life: 14,
        maxLife: 14
      });
    }
  }

  shatterBrick(x, y) {
    // 4 flying brick fragments with parabolic arc
    [[-2, -5], [2, -5], [-3, -3], [3, -3]].forEach(([vx, vy]) => {
      this.debris.push({ x, y, vx, vy, rot: 0, rotV: vx * 0.1, life: 35 });
    });
    if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
      RetroAudio.playSelect();
    }
  }

  addPopup(x, y, text, color = '#D4A853') {
    this.popups.push({ x, y, text, color, life: 30, vy: -1.5 });
  }

  shootFireball() {
    if (!this.mario.isSuper) return;
    this.fireballs.push({
      x: this.mario.facingRight ? this.mario.x + this.mario.w + 4 : this.mario.x - 6,
      y: this.mario.y + this.mario.h / 2,
      vx: this.mario.facingRight ? 4.6 : -4.6,
      vy: 1.0,
      bounces: 3
    });
    if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
      RetroAudio.playSelect();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  pause() {
    this.paused = true;
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
  resume() {
    if (this.running) return;
    this.paused = false;
    this.running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }
  restart() { this.destroy(); this.reset(); this.draw(); this.start(); }

  destroy() {
    this.running = false;
    this.paused = false;
    document.removeEventListener('keydown', this._kd);
    document.removeEventListener('keyup', this._ku);
    if (this._raf) cancelAnimationFrame(this._raf);
  }

  loop(timestamp) {
    if (!this.running) return;
    if (!timestamp) timestamp = performance.now();
    if (!this._lastTime) this._lastTime = timestamp;
    let elapsed = timestamp - this._lastTime;
    this._lastTime = timestamp;
    if (elapsed > 100) elapsed = 100;

    this._accumulator = (this._accumulator || 0) + elapsed;
    const STEP = 1000 / 60;
    let steps = 0;
    while (this._accumulator >= STEP && steps < 4) {
      this.update();
      this._accumulator -= STEP;
      steps++;
    }
    this.draw();
    this._raf = requestAnimationFrame((t) => this.loop(t));
  }

  update() {
    const W = this.canvas.width;
    const GY = this.groundY;

    if (this.stageBannerTimer > 0) this.stageBannerTimer--;
    if (this.mario.invulnerable > 0) this.mario.invulnerable--;

    // Mario Running Controls
    let move = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.keys['a']) {
      move -= 1;
      this.mario.facingRight = false;
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.keys['d']) {
      move += 1;
      this.mario.facingRight = true;
    }

    if (move !== 0) {
      this.mario.animTick++;
      if (this.mario.grounded && Math.random() < 0.25) {
        this.spawnDust(this.mario.x + this.mario.w / 2, this.mario.y + this.mario.h);
      }
    } else {
      this.mario.animTick = 0;
    }

    // Run / Dash modifier if holding Shift or X
    const isRunning = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyX'] || this.keys['x']);
    const targetSpeed = (isRunning ? this.mario.runSpeed : this.mario.speed) * move;

    // Ice platform slipperiness in Stage 4 vs responsive classic momentum
    if (this.theme.isSnow) {
      this.mario.vx += (targetSpeed - this.mario.vx) * 0.08;
    } else {
      this.mario.vx += (targetSpeed - this.mario.vx) * 0.28;
      if (Math.abs(this.mario.vx) < 0.05 && move === 0) this.mario.vx = 0;
    }

    this.mario.x += this.mario.vx;
    this.mario.x = Math.max(0, Math.min(this.stageWidth - this.mario.w, this.mario.x));

    // Jump
    const jumpPressed = Boolean(this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['w']);
    if (jumpPressed && this.mario.grounded) {
      this.mario.vy = this.mario.jumpPower;
      this.mario.grounded = false;
      this.spawnDust(this.mario.x + this.mario.w / 2, this.mario.y + this.mario.h);
      if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
        RetroAudio.playSelect();
      }
    }
    // Variable jump height: release early to do a short hop
    if (!jumpPressed && this.mario.vy < -3.2) {
      this.mario.vy *= 0.85;
    }

    // Gravity
    this.mario.vy += 0.44;
    this.mario.y += this.mario.vy;

    // Check Ground Collisions
    let onFloor = false;
    this.groundSegments.forEach(seg => {
      if (this.mario.x + this.mario.w > seg.x1 && this.mario.x < seg.x2) {
        if (this.mario.y + this.mario.h >= GY && this.mario.y + this.mario.h <= GY + 14 && this.mario.vy >= 0) {
          this.mario.y = GY - this.mario.h;
          this.mario.vy = 0;
          this.mario.grounded = true;
          onFloor = true;
        }
      }
    });

    // Check Pipe Collisions
    this.pipes.forEach(p => {
      if (this.mario.x + this.mario.w > p.x && this.mario.x < p.x + p.w) {
        if (this.mario.y + this.mario.h >= p.y && this.mario.y + this.mario.h <= p.y + 12 && this.mario.vy >= 0) {
          this.mario.y = p.y - this.mario.h;
          this.mario.vy = 0;
          this.mario.grounded = true;
          onFloor = true;
        } else if (this.mario.y + this.mario.h > p.y + 6) {
          if (this.mario.vx > 0) this.mario.x = p.x - this.mario.w;
          else if (this.mario.vx < 0) this.mario.x = p.x + p.w;
        }
      }
    });

    // Check Block Collisions
    this.blocks.forEach(b => {
      if (b.bumpY < 0) b.bumpY += 1.6;

      const bx = b.x, by = b.y + b.bumpY;
      if (this.mario.x + this.mario.w > bx && this.mario.x < bx + b.w) {
        // Landing on top
        if (this.mario.y + this.mario.h >= by && this.mario.y + this.mario.h <= by + 12 && this.mario.vy >= 0) {
          this.mario.y = by - this.mario.h;
          this.mario.vy = 0;
          this.mario.grounded = true;
          onFloor = true;
        }
        // Hitting block from underneath
        else if (this.mario.y <= by + b.h && this.mario.y >= by + b.h - 12 && this.mario.vy < 0) {
          this.mario.y = by + b.h;
          this.mario.vy = 0;
          b.bumpY = -7;

          if (b.type === 'b') {
            // Shatter brick if super!
            if (this.mario.isSuper) {
              b.shattered = true;
              this.shatterBrick(b.x + 13, b.y + 13);
              this.score += 50;
              this.onScore(this.score);
            } else {
              if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
                RetroAudio.playSelect();
              }
            }
          } else if (b.type === 'q' && !b.hit) {
            b.hit = true;
            if (b.content === 'bean') {
              this.score += 50;
              this.coins++;
              this.onScore(this.score);
              this.addPopup(b.x + 13, b.y - 12, '+50', '#D4A853');
            } else if (b.content === 'super') {
              this.mario.isSuper = true;
              this.mario.h = 36;
              this.score += 200;
              this.onScore(this.score);
              this.addPopup(b.x + 13, b.y - 12, 'SUPER BARISTA!', '#EFC97C');
            }
            if (typeof RetroAudio !== 'undefined' && RetroAudio.playWin) {
              RetroAudio.playWin();
            }
          }
        }
      }
    });

    this.blocks = this.blocks.filter(b => !b.shattered);

    if (!onFloor && this.mario.y + this.mario.h < GY) {
      this.mario.grounded = false;
    }

    // Fall into bottomless pit
    if (this.mario.y > this.canvas.height + 40) {
      this.handleDeath();
      return;
    }

    // Collect Golden Beans
    this.beans.forEach(b => {
      b.rot += 0.08;
      if (!b.collected && Math.hypot(b.x - (this.mario.x + this.mario.w / 2), b.y - (this.mario.y + this.mario.h / 2)) < 22) {
        b.collected = true;
        this.score += 50;
        this.coins++;
        this.onScore(this.score);
        this.addPopup(b.x, b.y, '+50', '#D4A853');
        this.spawnDust(b.x, b.y, '#D4A853');
      }
    });

    // Fireballs
    this.fireballs.forEach(fb => {
      fb.x += fb.vx;
      fb.vy += 0.36;
      fb.y += fb.vy;
      if (fb.y >= GY - 6) {
        fb.y = GY - 6;
        fb.vy = -4.8;
        fb.bounces--;
      }

      // Collide with standard enemies
      this.enemies.forEach(e => {
        if (e.alive && Math.hypot(fb.x - e.x, fb.y - e.y) < 18) {
          e.alive = false;
          fb.bounces = 0;
          this.score += 150;
          this.onScore(this.score);
          this.addPopup(e.x, e.y, '+150', '#EFC97C');
          this.spawnDust(e.x, e.y, '#E06C58');
        }
      });

      // Collide with Boss
      if (this.boss && !this.boss.defeated && Math.hypot(fb.x - (this.boss.x + this.boss.w / 2), fb.y - (this.boss.y + this.boss.h / 2)) < 30) {
        fb.bounces = 0;
        this.boss.hp--;
        this.spawnDust(fb.x, fb.y, '#FFF2D6');
        if (this.boss.hp <= 0) {
          this.defeatBoss();
        }
      }
    });
    this.fireballs = this.fireballs.filter(fb => fb.bounces > 0 && fb.x > this.cameraX - 20 && fb.x < this.cameraX + W + 20);

    // Update Firebars in Stage 5
    this.firebars.forEach(fb => {
      fb.angle += 0.022;
      // Hit detection with Mario
      for (let i = 1; i <= fb.len; i++) {
        const fx = fb.x + Math.cos(fb.angle) * i * 14;
        const fy = fb.y + Math.sin(fb.angle) * i * 14;
        if (this.mario.invulnerable <= 0 && Math.hypot(fx - (this.mario.x + this.mario.w / 2), fy - (this.mario.y + this.mario.h / 2)) < 16) {
          this.handleHurt();
        }
      }
    });

    // Enemies movement & collision
    this.enemies.forEach(e => {
      if (e.squashed) {
        e.squashTimer--;
        return;
      }
      if (!e.alive) return;

      e.x += e.vx;
      this.pipes.forEach(p => {
        if (e.x + e.w > p.x && e.x < p.x + p.w) e.vx *= -1;
      });

      if (this.mario.x + this.mario.w > e.x && this.mario.x < e.x + e.w) {
        if (this.mario.y + this.mario.h >= e.y && this.mario.y + this.mario.h <= e.y + 12 && this.mario.vy > 0) {
          // Stomp enemy!
          e.squashed = true;
          e.squashTimer = 35;
          this.mario.vy = -7.2;
          this.score += 100;
          this.onScore(this.score);
          this.addPopup(e.x, e.y, '+100', '#D4A853');
          this.spawnDust(e.x, e.y, '#9C7248');
          if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
            RetroAudio.playSelect();
          }
        } else if (this.mario.y + this.mario.h > e.y + 6 && this.mario.invulnerable <= 0) {
          this.handleHurt();
        }
      }
    });
    this.enemies = this.enemies.filter(e => !e.squashed || e.squashTimer > 0);

    // Boss Behavior (Stage 5)
    if (this.boss && !this.boss.defeated) {
      this.boss.x += this.boss.vx;
      if (this.boss.x < 1920 || this.boss.x > 2180) this.boss.vx *= -1;

      // Jump & Fire Breath
      this.boss.shootTimer--;
      if (this.boss.shootTimer <= 0) {
        this.boss.shootTimer = 110;
        this.fireballs.push({
          x: this.boss.x - 10,
          y: this.boss.y + 20,
          vx: -3.8,
          vy: -1.0,
          bounces: 3
        });
      }

      // Mario jumping on Boss head
      if (this.mario.x + this.mario.w > this.boss.x && this.mario.x < this.boss.x + this.boss.w) {
        if (this.mario.y + this.mario.h >= this.boss.y && this.mario.y + this.mario.h <= this.boss.y + 16 && this.mario.vy > 0) {
          this.boss.hp--;
          this.mario.vy = -9.0;
          this.spawnDust(this.boss.x + this.boss.w / 2, this.boss.y, '#D4A853');
          this.addPopup(this.boss.x + 20, this.boss.y, `BOSS HP: ${this.boss.hp}`, '#E06C58');
          if (this.boss.hp <= 0) {
            this.defeatBoss();
          }
        } else if (this.mario.invulnerable <= 0) {
          this.handleHurt();
        }
      }
    }

    // Flagpole Goal Clear (Stages 1-4)
    if (this.flagpole && this.mario.x >= this.flagpole.x - 12) {
      this.score += 1000;
      this.onScore(this.score);
      this.addPopup(this.mario.x, this.mario.y - 20, 'STAGE CLEAR! +1000', '#2ECC71');
      if (typeof RetroAudio !== 'undefined' && RetroAudio.playWin) {
        RetroAudio.playWin();
      }

      this.stage++;
      this.mario.x = 60;
      this.mario.y = GY - this.mario.h;
      this.mario.vx = 0;
      this.mario.vy = 0;
      this.buildCurrentStage();
    }

    // Update Debris Particles
    this.debris.forEach(d => {
      d.x += d.vx;
      d.vy += 0.4;
      d.y += d.vy;
      d.rot += d.rotV;
      d.life--;
    });
    this.debris = this.debris.filter(d => d.life > 0);

    // Update Dust Particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });
    this.particles = this.particles.filter(p => p.life > 0);

    // Update Popups
    this.popups.forEach(po => {
      po.y += po.vy;
      po.life--;
    });
    this.popups = this.popups.filter(po => po.life > 0);

    // Camera follow Mario
    const targetCamX = this.mario.x - W * 0.35;
    this.cameraX = Math.max(0, Math.min(this.stageWidth - W, targetCamX));
  }

  defeatBoss() {
    this.boss.defeated = true;
    this.score += 3000;
    this.onScore(this.score);
    this.addPopup(this.boss.x, this.boss.y - 30, '★ BOSS DEFEATED! +3000', '#D4A853');
    if (typeof RetroAudio !== 'undefined' && RetroAudio.playWin) {
      RetroAudio.playWin();
    }

    setTimeout(() => {
      this.stageTitle = '★ COFFEE KINGDOM SAVED! YOU WIN!';
      this.stageBannerTimer = 180;
      setTimeout(() => this.onOver(this.score, this.id), 2500);
    }, 1200);
  }

  handleHurt() {
    if (this.mario.isSuper) {
      this.mario.isSuper = false;
      this.mario.h = 32;
      this.mario.invulnerable = 75;
      this.spawnDust(this.mario.x + this.mario.w / 2, this.mario.y + this.mario.h / 2, '#E06C58');
      if (typeof RetroAudio !== 'undefined' && RetroAudio.playSelect) {
        RetroAudio.playSelect();
      }
    } else {
      this.handleDeath();
    }
  }

  handleDeath() {
    this.lives--;
    this.spawnDust(this.mario.x, this.mario.y, '#E06C58');

    if (this.lives <= 0) {
      this.running = false;
      setTimeout(() => this.onOver(this.score, this.id), 800);
    } else {
      this.mario.x = Math.max(50, this.mario.x - 220);
      this.mario.y = this.groundY - 32;
      this.mario.vy = 0;
      this.mario.invulnerable = 90;
    }
  }

  draw() {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    const camX = this.cameraX;
    const GY = this.groundY;
    const th = this.theme;

    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, th.skyTop);
    skyGrad.addColorStop(1, th.skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Parallax Background Hills / Mountains
    ctx.save();
    ctx.fillStyle = th.hillColor;
    for (let hx = 100; hx < this.stageWidth; hx += 350) {
      ctx.beginPath();
      ctx.arc(hx - camX * 0.2, GY, 110, Math.PI, 0);
      ctx.fill();
    }

    // Clouds / Steam Drifts
    ctx.fillStyle = th.cloudColor;
    for (let cx = 80; cx < this.stageWidth; cx += 260) {
      ctx.beginPath();
      ctx.arc(cx - camX * 0.1, 65, 25, 0, Math.PI * 2);
      ctx.arc(cx + 26 - camX * 0.1, 60, 32, 0, Math.PI * 2);
      ctx.arc(cx + 52 - camX * 0.1, 65, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(-camX, 0);

    // Ground Blocks & Slabs
    ctx.fillStyle = th.groundColor;
    ctx.strokeStyle = th.groundTopColor;
    ctx.lineWidth = 2;
    this.groundSegments.forEach(seg => {
      ctx.fillRect(seg.x1, GY, seg.x2 - seg.x1, H - GY);
      // Top Grass / Froth / Ice trim
      ctx.fillStyle = th.groundTopColor;
      ctx.fillRect(seg.x1, GY, seg.x2 - seg.x1, 7);
      ctx.fillStyle = th.groundColor;
    });

    // Mystery & Brick Blocks
    this.blocks.forEach(b => {
      const by = b.y + b.bumpY;
      if (b.type === 'q') {
        ctx.fillStyle = b.hit ? '#3A2E24' : '#D4A853';
        ctx.fillRect(b.x, by, b.w, b.h);
        ctx.strokeStyle = '#16110B';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(b.x, by, b.w, b.h);
        ctx.fillStyle = b.hit ? '#6A584A' : '#140E0A';
        ctx.font = 'bold 15px Space Mono,monospace';
        ctx.textAlign = 'center';
        ctx.fillText(b.hit ? '•' : '?', b.x + b.w / 2, by + b.h * 0.72);
      } else {
        ctx.fillStyle = '#6D3F22';
        ctx.fillRect(b.x, by, b.w, b.h);
        ctx.strokeStyle = '#2A180D';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(b.x, by, b.w, b.h);
        // Brick cleft line
        ctx.beginPath();
        ctx.moveTo(b.x, by + b.h / 2);
        ctx.lineTo(b.x + b.w, by + b.h / 2);
        ctx.stroke();
      }
    });

    // Debris from smashed bricks
    this.debris.forEach(d => {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = '#7C4F2B';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    });

    // Pipes (Coffee Conduits)
    this.pipes.forEach(p => {
      ctx.fillStyle = th.pipeColor;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#141E15';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      // Pipe Top Collar
      ctx.fillRect(p.x - 3, p.y, p.w + 6, 13);
      ctx.strokeRect(p.x - 3, p.y, p.w + 6, 13);
    });

    // Rotating Firebars (Stage 5)
    this.firebars.forEach(fb => {
      ctx.fillStyle = '#110D08';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, 6, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 1; i <= fb.len; i++) {
        const fx = fb.x + Math.cos(fb.angle) * i * 14;
        const fy = fb.y + Math.sin(fb.angle) * i * 14;
        ctx.fillStyle = '#EFC97C';
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#E06C58';
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Floating Golden Beans
    this.beans.forEach(b => {
      if (b.collected) return;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = '#D4A853';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#261A0F';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    });

    // Fireballs
    ctx.fillStyle = '#EFC97C';
    this.fireballs.forEach(fb => {
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E06C58';
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Standard Enemies (Grumpy Cups & Slugs)
    this.enemies.forEach(e => {
      if (e.squashed) {
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(e.x, GY - 8, e.w, 8);
      } else {
        ctx.fillStyle = e.type === 'cup' ? '#C89862' : '#7A6EA0';
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.strokeStyle = '#2D1B0F';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(e.x, e.y, e.w, e.h);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 4, e.y + 5, 3, 5);
        ctx.fillRect(e.x + 14, e.y + 5, 3, 5);
      }
    });

    // Stage 5 Boss: King Espresso Cup!
    if (this.boss && !this.boss.defeated) {
      const b = this.boss;
      ctx.save();
      ctx.translate(b.x, b.y);

      // Huge Giant King Cup
      ctx.fillStyle = '#5A3D28';
      ctx.fillRect(0, 10, b.w, b.h - 10);
      ctx.strokeStyle = '#D4A853';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, 10, b.w, b.h - 10);

      // Golden Spiky Crown
      ctx.fillStyle = '#D4A853';
      ctx.beginPath();
      ctx.moveTo(4, 10);
      ctx.lineTo(12, -4);
      ctx.lineTo(26, 6);
      ctx.lineTo(40, -4);
      ctx.lineTo(48, 10);
      ctx.closePath();
      ctx.fill();

      // Fierce Red Glowing Eyes
      ctx.fillStyle = '#E06C58';
      ctx.fillRect(10, 24, 8, 8);
      ctx.fillRect(34, 24, 8, 8);

      // Boss HP Bar
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(-4, -18, b.w + 8, 7);
      ctx.fillStyle = '#E06C58';
      ctx.fillRect(-4, -18, (b.w + 8) * (b.hp / b.maxHp), 7);

      ctx.restore();
    }

    // Flagpole (Stages 1-4)
    if (this.flagpole) {
      ctx.fillStyle = '#EDE8E1';
      ctx.fillRect(this.flagpole.x, this.flagpole.y, this.flagpole.w, this.flagpole.h);
      ctx.fillStyle = '#D4A853';
      ctx.beginPath();
      ctx.moveTo(this.flagpole.x + this.flagpole.w, this.flagpole.y + 12);
      ctx.lineTo(this.flagpole.x + this.flagpole.w + 34, this.flagpole.y + 28);
      ctx.lineTo(this.flagpole.x + this.flagpole.w, this.flagpole.y + 44);
      ctx.fill();
    }

    // Dust Particles
    this.particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Barista Mario Character Sprite & Animation
    if (this.mario.invulnerable % 8 < 5) {
      const { x, y, w, h, isSuper, facingRight, animTick, grounded } = this.mario;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      if (!facingRight) ctx.scale(-1, 1);

      // Red Cap with Visor
      ctx.fillStyle = isSuper ? '#E06C58' : '#C0392B';
      ctx.fillRect(-w / 2, -h / 2, w, 8);
      ctx.fillRect(-w / 2 + 2, -h / 2 + 4, w + 4, 4);

      // Face
      ctx.fillStyle = '#F5D0A9';
      ctx.fillRect(-w / 2 + 2, -h / 2 + 8, w - 4, 10);

      // Mustache
      ctx.fillStyle = '#4A2A12';
      ctx.fillRect(0, -h / 2 + 13, 8, 4);

      // Barista Apron
      ctx.fillStyle = isSuper ? '#D4A853' : '#5C4033';
      ctx.fillRect(-w / 2 + 2, -h / 2 + 18, w - 4, h - 22);

      // Animated Legs / Boots
      ctx.fillStyle = '#2C1D11';
      if (!grounded) {
        // Jumping pose
        ctx.fillRect(-w / 2, h / 2 - 6, 8, 6);
        ctx.fillRect(w / 2 - 8, h / 2 - 4, 8, 4);
      } else if (animTick > 0) {
        // Scissor walking animation
        const step = Math.floor(animTick / 5) % 2;
        if (step === 0) {
          ctx.fillRect(-w / 2 - 2, h / 2 - 5, 9, 5);
          ctx.fillRect(w / 2 - 6, h / 2 - 3, 7, 3);
        } else {
          ctx.fillRect(-w / 2 + 2, h / 2 - 3, 7, 3);
          ctx.fillRect(w / 2 - 8, h / 2 - 5, 9, 5);
        }
      } else {
        // Idle boots
        ctx.fillRect(-w / 2, h / 2 - 4, 8, 4);
        ctx.fillRect(w / 2 - 8, h / 2 - 4, 8, 4);
      }

      ctx.restore();
    }

    // Popups
    this.popups.forEach(po => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, po.life / 18);
      ctx.fillStyle = po.color;
      ctx.font = 'bold 12px Space Mono,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(po.text, po.x, po.y);
      ctx.restore();
    });

    ctx.restore();

    // Top Fixed HUD
    ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
    ctx.fillRect(0, 0, W, 30);
    ctx.strokeStyle = 'rgba(212, 168, 83, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, 30);

    ctx.fillStyle = '#D4A853';
    ctx.font = 'bold 11px Space Mono,monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`BARISTA: ${'★ '.repeat(Math.max(0, this.lives))}`, 12, 19);

    ctx.textAlign = 'center';
    ctx.fillText(`BEANS: ${this.coins}`, W / 2, 19);

    ctx.textAlign = 'right';
    ctx.fillText(`STAGE: 1-${this.stage}`, W - 12, 19);

    // Stage Announcement Banner
    if (this.stageBannerTimer > 0) {
      ctx.save();
      const alpha = Math.min(1, this.stageBannerTimer / 25);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(10, 8, 6, 0.85)';
      ctx.fillRect(0, H / 2 - 35, W, 50);
      ctx.fillStyle = '#D4A853';
      ctx.font = 'bold 18px Space Grotesk,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.stageTitle, W / 2, H / 2 - 4);
      ctx.restore();
    }
  }
}

// Keep gamepad updated on screen resize / orientation change
window.addEventListener('resize', () => {
  if (currentGame && currentGame.id) {
    setupMobileControls(currentGame.id);
  }
});
