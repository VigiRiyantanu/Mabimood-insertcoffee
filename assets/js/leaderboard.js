/**
 * ============================================================
 * INSERT COFFEE — LEADERBOARD MODULE
 * ============================================================
 * Single Source of Truth for Leaderboard data & rendering.
 * All data is fetched directly from Cloud Firestore (or offline fallback).
 * ZERO mock / dummy players.
 */

'use strict';

const Leaderboard = (() => {
  let cachedRanking = null;
  let isListening = false;
  let summarySubscribers = new Set();
  let pageSubscribers = new Set();

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatScore(score) {
    const num = Number(score) || 0;
    return num.toLocaleString('en-US');
  }

  // Get current logged-in user profile
  function getCurrentUser() {
    try {
      if (typeof UserProfileStore !== 'undefined' && typeof UserProfileStore.get === 'function') {
        const p = UserProfileStore.get();
        if (p && p.name) return p;
      }
      const raw = localStorage.getItem('ic_user_profile');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // Aggregate players from raw Firebase entries
  function computeRankings(rawEntries) {
    if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
      return [];
    }

    const playerMap = new Map();

    rawEntries.forEach(entry => {
      const gamertag = String(entry.playerName || entry.gamertag || entry.player || '').trim();
      const score = Number(entry.score ?? entry.points ?? entry.arcadePoints ?? 0);
      if (!gamertag || isNaN(score) || score < 0) return;

      const key = gamertag.toLowerCase();
      if (!playerMap.has(key)) {
        playerMap.set(key, {
          gamertag: gamertag,
          score: 0,
          bestGame: entry.gameTitle || entry.gameId || 'Arcade',
          bestGameScore: 0,
          games: {}
        });
      }

      const p = playerMap.get(key);
      const gId = (entry.gameId || 'game').toLowerCase();
      if (p.games[gId] === undefined || score > p.games[gId]) {
        p.games[gId] = score;
      }
      if (score >= p.bestGameScore) {
        p.bestGameScore = score;
        p.bestGame = entry.gameTitle || entry.gameId || 'Arcade';
      }
    });

    const ranking = [];
    playerMap.forEach(p => {
      // Total score across played games
      let total = 0;
      Object.values(p.games).forEach(s => { total += s; });
      ranking.push({
        gamertag: p.gamertag,
        score: total,
        bestGame: p.bestGame || 'Arcade'
      });
    });

    // Sort descending strictly by score
    ranking.sort((a, b) => b.score - a.score);

    // Assign rank 1, 2, 3...
    ranking.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return ranking;
  }

  // Fetch from Firebase Firestore with fallback to REST API if SDK isn't ready
  async function fetchFirebaseData() {
    // 1. Try FirestoreDB if available
    if (typeof FirestoreDB !== 'undefined' && typeof FirestoreDB.getLeaderboardData === 'function') {
      try {
        const res = await FirestoreDB.getLeaderboardData(true);
        if (res && Array.isArray(res.items)) {
          return { status: 'success', items: res.items };
        }
      } catch (err) {
        console.warn('FirestoreDB.getLeaderboardData error:', err);
      }
    }

    // 2. Direct REST API to Firestore
    try {
      const resp = await fetch('https://firestore.googleapis.com/v1/projects/insert-coffe/databases/(default)/documents/leaderboard');
      if (resp.ok) {
        const data = await resp.json();
        const docs = data.documents || [];
        const items = [];
        docs.forEach(doc => {
          const f = doc.fields || {};
          const pName = f.playerName?.stringValue || f.gamertag?.stringValue || f.player?.stringValue || f.name?.stringValue || '';
          const pScore = Number(f.score?.integerValue || f.score?.doubleValue || f.points?.integerValue || f.arcadePoints?.integerValue || 0);
          const gId = f.gameId?.stringValue || '';
          const gTitle = f.gameTitle?.stringValue || gId.toUpperCase();
          if (pName && !isNaN(pScore) && pScore >= 0) {
            items.push({
              id: doc.name,
              playerName: pName,
              gamertag: pName,
              score: pScore,
              gameId: gId,
              gameTitle: gTitle,
              createdAt: doc.createTime || new Date().toISOString()
            });
          }
        });
        return { status: 'success', items };
      }
    } catch (e) {
      console.warn('Firestore REST fetch error:', e);
    }

    // 3. Fallback to LocalStorage cache
    try {
      const raw = localStorage.getItem('ic_leaderboard_cache');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { status: 'success', items: parsed };
        }
      }
    } catch (e) {}

    return { status: 'empty', items: [] };
  }

  // Initialize real-time listener if Firestore is active
  function initRealtimeListener() {
    if (isListening) return;
    if (typeof FirestoreDB !== 'undefined' && typeof FirestoreDB.listenToLeaderboard === 'function') {
      isListening = true;
      FirestoreDB.listenToLeaderboard((items) => {
        cachedRanking = computeRankings(items);
        renderSummaryUI(cachedRanking, 'success');
        renderPageUI(cachedRanking, 'success');
      });
    }
  }

  // Load and render data
  async function loadAndRender() {
    initRealtimeListener();

    renderSummaryUI([], 'loading');
    renderPageUI([], 'loading');

    try {
      const result = await fetchFirebaseData();
      if (result.status === 'success') {
        const ranking = computeRankings(result.items);
        cachedRanking = ranking;
        const state = ranking.length === 0 ? 'empty' : 'success';
        renderSummaryUI(ranking, state);
        renderPageUI(ranking, state);
      } else if (result.status === 'empty') {
        renderSummaryUI([], 'empty');
        renderPageUI([], 'empty');
      } else {
        renderSummaryUI([], 'error');
        renderPageUI([], 'error');
      }
    } catch (err) {
      console.error('Leaderboard load error:', err);
      renderSummaryUI([], 'error');
      renderPageUI([], 'error');
    }
  }

  function getRankBadgeHtml(rankNum) {
    const formatted = rankNum < 10 ? '0' + rankNum : String(rankNum);
    if (rankNum === 1) {
      return `<div class="rank-badge rank-1"><span class="crown-icon">★</span><span class="num">${formatted}</span></div>`;
    } else if (rankNum === 2) {
      return `<div class="rank-badge rank-2"><span class="num">${formatted}</span></div>`;
    } else if (rankNum === 3) {
      return `<div class="rank-badge rank-3"><span class="num">${formatted}</span></div>`;
    }
    return `<div class="rank-badge rank-other"><span class="num">${formatted}</span></div>`;
  }

  /* ============================================================
     RENDER: LANDING PAGE SUMMARY
     ============================================================ */
  function renderSummaryUI(ranking, state) {
    const listEl = document.getElementById('landingLeaderboardList');
    const playerRankEl = document.getElementById('landingPlayerRank');
    const summaryBadge = document.getElementById('summaryCountBadge');
    if (!listEl) return;

    if (summaryBadge) {
      if (state === 'loading') {
        summaryBadge.textContent = 'SYNCING...';
      } else if (Array.isArray(ranking)) {
        summaryBadge.textContent = ranking.length > 0 ? `${ranking.length} Champions` : 'Arcade Standings';
      }
    }

    if (state === 'loading') {
      listEl.innerHTML = `<div class="lb-state-msg">Loading leaderboard...</div>`;
      if (playerRankEl) playerRankEl.style.display = 'none';
      return;
    }

    if (state === 'error') {
      listEl.innerHTML = `<div class="lb-state-msg">Unable to load leaderboard.</div>`;
      if (playerRankEl) playerRankEl.style.display = 'none';
      return;
    }

    if (state === 'empty' || !ranking || ranking.length === 0) {
      listEl.innerHTML = `<div class="lb-state-msg">No players yet.</div>`;
      if (playerRankEl) playerRankEl.style.display = 'none';
      return;
    }

    // Top 5 players for landing page
    const topPlayers = ranking.slice(0, 5);
    const currentUser = getCurrentUser();
    const currentName = currentUser ? currentUser.name.toLowerCase() : null;

    let html = `
      <table class="leaderboard-table" role="table">
        <thead>
          <tr>
            <th class="th-rank">RANK</th>
            <th class="th-gamertag">GAMERTAG</th>
            <th class="th-score">SCORE</th>
          </tr>
        </thead>
        <tbody>
    `;

    topPlayers.forEach((player) => {
      const rankNum = player.rank;
      const isSelf = currentName && player.gamertag.toLowerCase() === currentName;
      const rankClass = rankNum === 1 ? 'rank-1' : rankNum === 2 ? 'rank-2' : rankNum === 3 ? 'rank-3' : 'rank-other';
      const initial = (player.gamertag[0] || 'P').toUpperCase();

      html += `
        <tr class="lb-table-row ${rankClass} ${isSelf ? 'is-current-user' : ''}">
          <td class="td-rank">
            ${getRankBadgeHtml(rankNum)}
          </td>
          <td class="td-gamertag">
            <div class="player-cell">
              <div class="player-avatar-mini ${rankClass}">${initial}</div>
              <div class="player-details">
                <div class="player-name-line">
                  <span class="gamertag-text" title="${escapeHtml(player.gamertag)}">${escapeHtml(player.gamertag)}</span>
                  ${isSelf ? '<span class="tag-self">YOU</span>' : ''}
                </div>
                <span class="player-game-tag">${escapeHtml(player.bestGame)}</span>
              </div>
            </div>
          </td>
          <td class="td-score">
            <div class="score-cell">
              <span class="score-number">${formatScore(player.score)}</span>
              <span class="score-pts">PTS</span>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    listEl.innerHTML = html;

    // Current player ranking if logged in
    if (playerRankEl) {
      if (currentUser && currentName) {
        const found = ranking.find(p => p.gamertag.toLowerCase() === currentName);
        if (found) {
          playerRankEl.style.display = 'flex';
          playerRankEl.className = 'player-rank-bar is-active';
          playerRankEl.innerHTML = `
            <div class="user-rank-badge">
              <span class="badge-num">#${found.rank}</span>
            </div>
            <div class="user-rank-info">
              <div class="user-rank-header">
                <span class="user-rank-label">Your Current Standing</span>
                <span class="user-rank-name">${escapeHtml(currentUser.name)}</span>
              </div>
              <span class="user-rank-game">Top Game: ${escapeHtml(found.bestGame)}</span>
            </div>
            <div class="user-rank-score-wrap">
              <span class="user-score-val">${formatScore(found.score)}</span>
              <span class="user-score-unit">PTS</span>
            </div>
          `;
        } else {
          playerRankEl.style.display = 'none';
        }
      } else {
        playerRankEl.style.display = 'none';
      }
    }
  }

  /* ============================================================
     RENDER: DEDICATED LEADERBOARD PAGE (/leaderboard)
     ============================================================ */
  function renderPageUI(ranking, state) {
    const tableBody = document.getElementById('pageLeaderboardBody');
    const playerRankEl = document.getElementById('pagePlayerRank');
    const countBadge = document.getElementById('playerCountBadge');
    if (!tableBody) return;

    if (countBadge) {
      if (state === 'loading') {
        countBadge.textContent = 'SYNCING...';
      } else if (Array.isArray(ranking)) {
        countBadge.textContent = ranking.length > 0 ? `${ranking.length} PLAYERS RANKED` : '0 PLAYERS';
      }
    }

    if (state === 'loading') {
      tableBody.innerHTML = `<tr><td colspan="3" class="lb-state-msg">Loading leaderboard...</td></tr>`;
      if (playerRankEl) playerRankEl.style.display = 'none';
      return;
    }

    if (state === 'error') {
      tableBody.innerHTML = `<tr><td colspan="3" class="lb-state-msg">Unable to load leaderboard.</td></tr>`;
      if (playerRankEl) playerRankEl.style.display = 'none';
      return;
    }

    if (state === 'empty' || !ranking || ranking.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3" class="lb-state-msg">No players yet.</td></tr>`;
      if (playerRankEl) playerRankEl.style.display = 'none';
      return;
    }

    const currentUser = getCurrentUser();
    const currentName = currentUser ? currentUser.name.toLowerCase() : null;

    let html = '';
    ranking.forEach(player => {
      const rankNum = player.rank;
      const isSelf = currentName && player.gamertag.toLowerCase() === currentName;
      const rankClass = rankNum === 1 ? 'rank-1' : rankNum === 2 ? 'rank-2' : rankNum === 3 ? 'rank-3' : 'rank-other';
      const initial = (player.gamertag[0] || 'P').toUpperCase();

      html += `
        <tr class="lb-table-row ${rankClass} ${isSelf ? 'is-current-user' : ''}">
          <td class="td-rank">
            ${getRankBadgeHtml(rankNum)}
          </td>
          <td class="td-gamertag">
            <div class="player-cell">
              <div class="player-avatar-mini ${rankClass}">${initial}</div>
              <div class="player-details">
                <div class="player-name-line">
                  <span class="gamertag-text">${escapeHtml(player.gamertag)}</span>
                  ${isSelf ? '<span class="tag-self">YOU</span>' : ''}
                </div>
                <span class="player-game-tag">${escapeHtml(player.bestGame)}</span>
              </div>
            </div>
          </td>
          <td class="td-score">
            <div class="score-cell">
              <span class="score-number">${formatScore(player.score)}</span>
              <span class="score-pts">PTS</span>
            </div>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;

    // Current player rank banner if logged in
    if (playerRankEl) {
      if (currentUser && currentName) {
        const found = ranking.find(p => p.gamertag.toLowerCase() === currentName);
        if (found) {
          playerRankEl.style.display = 'flex';
          playerRankEl.className = 'player-rank-bar is-active';
          playerRankEl.innerHTML = `
            <div class="user-rank-badge">
              <span class="badge-num">#${found.rank}</span>
            </div>
            <div class="user-rank-info">
              <div class="user-rank-header">
                <span class="user-rank-label">Your Current Standing</span>
                <span class="user-rank-name">${escapeHtml(currentUser.name)}</span>
              </div>
              <span class="user-rank-game">Top Game: ${escapeHtml(found.bestGame)}</span>
            </div>
            <div class="user-rank-score-wrap">
              <span class="user-score-val">${formatScore(found.score)}</span>
              <span class="user-score-unit">PTS</span>
            </div>
            <a href="index.html#arcade" class="btn-rank-action" title="Mainkan game arcade">Play Arcade &rarr;</a>
          `;
        } else {
          // Logged in but has no score yet (no fake data!)
          playerRankEl.style.display = 'flex';
          playerRankEl.className = 'player-rank-bar unranked';
          playerRankEl.innerHTML = `
            <div class="user-rank-badge unranked">
              <span class="badge-num">--</span>
            </div>
            <div class="user-rank-info">
              <div class="user-rank-header">
                <span class="user-rank-label">Player: ${escapeHtml(currentUser.name)}</span>
              </div>
              <span class="user-rank-sub">Belum ada skor tercatat. Mainkan salah satu game di Arcade untuk masuk Leaderboard!</span>
            </div>
            <a href="index.html#arcade" class="btn-rank-action">Play Arcade &rarr;</a>
          `;
        }
      } else {
        playerRankEl.style.display = 'none';
      }
    }
  }

  // Refresh with smooth button spin animation
  function refresh() {
    const btn = document.querySelector('.btn-refresh-lb');
    if (btn) {
      btn.classList.add('is-refreshing');
      setTimeout(() => btn.classList.remove('is-refreshing'), 700);
    }
    loadAndRender();
  }

  // Auto init
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadAndRender);
    } else {
      loadAndRender();
    }
  }

  return {
    loadAndRender,
    refresh,
    computeRankings,
    getCurrentUser,
    formatScore
  };
})();

// Attach globally
if (typeof window !== 'undefined') {
  window.Leaderboard = Leaderboard;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Leaderboard;
}
