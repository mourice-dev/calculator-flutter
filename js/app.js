/* ═══════════════════════════════════════════════════
   XAUUSD Lot Size Calculator — Core Logic
   Gold pip value: 1 lot = 1 pip = $10
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Constants ──
  const PIP_VALUE_PER_LOT = 10; // $10 per pip per standard lot

  // ── State ──
  let currentMode = 'managed';
  let lastResult = null;
  let managedRiskIsPercent = false;

  // ── DOM References ──
  const $ = (id) => document.getElementById(id);
  const modeTabs = $('modeTabs');
  const results = $('results');
  const tradeCards = $('tradeCards');
  const toast = $('toast');

  // ── Core Math ──
  function calcLotSize(risk, slPips) {
    if (slPips <= 0 || risk <= 0) return 0;
    const exact = risk / (slPips * PIP_VALUE_PER_LOT);
    return Math.floor(exact * 100) / 100; // Always round DOWN
  }

  function calcActualRisk(lots, slPips) {
    return +(lots * slPips * PIP_VALUE_PER_LOT).toFixed(2);
  }

  function calcReward(lots, tpPips) {
    return +(lots * tpPips * PIP_VALUE_PER_LOT).toFixed(2);
  }

  function calcRR(risk, reward) {
    if (risk <= 0) return 0;
    return +(reward / risk).toFixed(2);
  }

  // ── Format Helpers ──
  function fmt$(v) { return '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fmtLot(v) { return v.toFixed(2); }
  function fmtRR(v) { return '1 : ' + v.toFixed(2); }

  // ── Toast ──
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ── Mode Switching ──
  modeTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.mode-tab');
    if (!tab) return;
    const mode = tab.dataset.mode;
    currentMode = mode;

    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
    $('panel-' + mode).classList.add('active');

    // Hide results when switching modes
    results.classList.remove('visible');
    lastResult = null;
  });

  // ══════════════════════════════════════
  //  MANAGED MODE (3 trades, scaled TPs)
  // ══════════════════════════════════════
  // ── Managed Mode: balance/% toggle ──
  $('m-risk-toggle').addEventListener('click', () => {
    managedRiskIsPercent = !managedRiskIsPercent;
    const toggle = $('m-risk-toggle');
    const unit = $('m-risk-unit');
    if (managedRiskIsPercent) {
      toggle.textContent = '$';
      toggle.style.background = 'var(--gold-dim)';
      toggle.style.color = 'var(--gold)';
      unit.textContent = '%';
      $('m-risk').placeholder = '1.00';
    } else {
      toggle.textContent = '%';
      toggle.style.background = '';
      toggle.style.color = '';
      unit.textContent = 'USD';
      $('m-risk').placeholder = '100.00';
    }
  });

  $('btn-calc-managed').addEventListener('click', () => {
    const balanceRaw = parseFloat($('m-balance').value);
    const riskRaw = parseFloat($('m-risk').value);
    const sl = parseFloat($('m-sl').value);
    const tp = parseFloat($('m-tp').value);

    let risk = riskRaw;
    if (managedRiskIsPercent) {
      if (!balanceRaw || balanceRaw <= 0) {
        showToast('Enter account balance for % risk');
        return;
      }
      risk = +(balanceRaw * (riskRaw / 100)).toFixed(2);
    }

    if (!riskRaw || !sl || !tp || riskRaw <= 0 || sl <= 0 || tp <= 0) {
      showToast('Please fill in all fields');
      return;
    }

    const lots = calcLotSize(risk, sl);
    if (lots <= 0) {
      showToast('Risk too small for this SL');
      return;
    }

    const actualRisk = calcActualRisk(lots, sl);

    // 3 trades with same lot size; TPs at 50%, 75%, 100%
    const tpLevels = [
      { label: 'Trade 1', pct: 0.50, tpPips: +(tp * 0.50).toFixed(1) },
      { label: 'Trade 2', pct: 0.75, tpPips: +(tp * 0.75).toFixed(1) },
      { label: 'Trade 3', pct: 1.00, tpPips: +(tp * 1.00).toFixed(1) },
    ];

    const trades = tpLevels.map(t => {
      const reward = calcReward(lots, t.tpPips);
      const rr = calcRR(actualRisk, reward);
      return {
        label: t.label,
        lots,
        slPips: sl,
        tpPips: t.tpPips,
        tpPct: Math.round(t.pct * 100),
        risk: actualRisk,
        reward,
        rr,
      };
    });

    const totalLots = +(lots * 3).toFixed(2);
    const totalRisk = +(actualRisk * 3).toFixed(2);
    const totalReward = +trades.reduce((s, t) => s + t.reward, 0).toFixed(2);
    const netProfit = +(totalReward - totalRisk).toFixed(2);
    const overallRR = calcRR(totalRisk, totalReward);

    lastResult = {
      mode: 'managed',
      trades,
      totalLots,
      totalRisk,
      totalReward,
      netProfit,
      tradeCount: 3,
      rr: overallRR,
    };

    renderManagedResults(trades, tp);
    renderPortfolio(lastResult);
    results.classList.add('visible');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function renderManagedResults(trades, fullTp) {
    tradeCards.innerHTML = trades.map(t => `
      <div class="trade-card">
        <div class="trade-card-header">
          <span class="trade-card-title">${t.label} · ${t.tpPct}% TP</span>
          <span class="trade-card-lot">${fmtLot(t.lots)} lots</span>
        </div>
        ${renderRRBar(t.risk, t.reward, t.rr)}
        <div class="trade-stats">
          <div class="trade-stat">
            <div class="trade-stat-label">Risk</div>
            <div class="trade-stat-value risk">${fmt$(t.risk)}</div>
          </div>
          <div class="trade-stat">
            <div class="trade-stat-label">Reward</div>
            <div class="trade-stat-value reward">${fmt$(t.reward)}</div>
          </div>
          <div class="trade-stat">
            <div class="trade-stat-label">SL Pips</div>
            <div class="trade-stat-value neutral">${t.slPips}</div>
          </div>
          <div class="trade-stat">
            <div class="trade-stat-label">TP Pips</div>
            <div class="trade-stat-value neutral">${t.tpPips}</div>
          </div>
          <div class="trade-stat" style="grid-column:1/-1">
            <div class="trade-stat-label">Pip Value</div>
            <div class="trade-stat-value neutral">${fmt$(t.lots * PIP_VALUE_PER_LOT)} <span style="font-size:0.72rem;color:var(--text-muted)">/ pip</span></div>
          </div>
        </div>
        <div class="tp-breakdown">
          <div class="tp-item">
            <div class="tp-item-label">TP1 (50%)</div>
            <div class="tp-item-pips">${(fullTp * 0.5).toFixed(1)} pips</div>
            <div class="tp-item-value">${fmt$(calcReward(t.lots, fullTp * 0.5))}</div>
          </div>
          <div class="tp-item">
            <div class="tp-item-label">TP2 (75%)</div>
            <div class="tp-item-pips">${(fullTp * 0.75).toFixed(1)} pips</div>
            <div class="tp-item-value">${fmt$(calcReward(t.lots, fullTp * 0.75))}</div>
          </div>
          <div class="tp-item">
            <div class="tp-item-label">TP3 (100%)</div>
            <div class="tp-item-pips">${fullTp.toFixed(1)} pips</div>
            <div class="tp-item-value">${fmt$(calcReward(t.lots, fullTp))}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ══════════════════════════════════════
  //  UNMANAGED MODE (N trades, same TP)
  // ══════════════════════════════════════
  const uCount = $('u-count');
  $('u-minus').addEventListener('click', () => {
    const v = parseInt(uCount.value) || 1;
    if (v > 1) uCount.value = v - 1;
  });
  $('u-plus').addEventListener('click', () => {
    const v = parseInt(uCount.value) || 1;
    if (v < 10) uCount.value = v + 1;
  });

  $('btn-calc-unmanaged').addEventListener('click', () => {
    const count = Math.min(10, Math.max(1, parseInt(uCount.value) || 1));
    const risk = parseFloat($('u-risk').value);
    const sl = parseFloat($('u-sl').value);
    const tp = parseFloat($('u-tp').value);

    if (!risk || !sl || !tp || risk <= 0 || sl <= 0 || tp <= 0) {
      showToast('Please fill in all fields');
      return;
    }

    const lots = calcLotSize(risk, sl);
    if (lots <= 0) {
      showToast('Risk too small for this SL');
      return;
    }

    const actualRisk = calcActualRisk(lots, sl);
    const reward = calcReward(lots, tp);
    const rr = calcRR(actualRisk, reward);

    const trades = [];
    for (let i = 0; i < count; i++) {
      trades.push({
        label: `Trade ${i + 1}`,
        lots, slPips: sl, tpPips: tp,
        risk: actualRisk, reward, rr,
      });
    }

    const totalLots = +(lots * count).toFixed(2);
    const totalRisk = +(actualRisk * count).toFixed(2);
    const totalReward = +(reward * count).toFixed(2);
    const netProfit = +(totalReward - totalRisk).toFixed(2);

    lastResult = {
      mode: 'unmanaged',
      trades,
      totalLots,
      totalRisk,
      totalReward,
      netProfit,
      tradeCount: count,
      rr,
    };

    renderUnmanagedResults(trades);
    renderPortfolio(lastResult);
    results.classList.add('visible');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function renderUnmanagedResults(trades) {
    tradeCards.innerHTML = trades.map(t => `
      <div class="trade-card">
        <div class="trade-card-header">
          <span class="trade-card-title">${t.label}</span>
          <span class="trade-card-lot">${fmtLot(t.lots)} lots</span>
        </div>
        ${renderRRBar(t.risk, t.reward, t.rr)}
        <div class="trade-stats">
          <div class="trade-stat">
            <div class="trade-stat-label">Risk</div>
            <div class="trade-stat-value risk">${fmt$(t.risk)}</div>
          </div>
          <div class="trade-stat">
            <div class="trade-stat-label">Reward</div>
            <div class="trade-stat-value reward">${fmt$(t.reward)}</div>
          </div>
          <div class="trade-stat">
            <div class="trade-stat-label">SL Pips</div>
            <div class="trade-stat-value neutral">${t.slPips}</div>
          </div>
          <div class="trade-stat">
            <div class="trade-stat-label">TP Pips</div>
            <div class="trade-stat-value neutral">${t.tpPips}</div>
          </div>
          <div class="trade-stat" style="grid-column:1/-1">
            <div class="trade-stat-label">Pip Value</div>
            <div class="trade-stat-value neutral">${fmt$(t.lots * PIP_VALUE_PER_LOT)} <span style="font-size:0.72rem;color:var(--text-muted)">/ pip</span></div>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ══════════════════════════════════════
  //  CUSTOM MODE (independent trades)
  // ══════════════════════════════════════
  let customTradeId = 0;

  function addCustomTrade() {
    customTradeId++;
    const id = customTradeId;
    const card = document.createElement('div');
    card.className = 'custom-trade-card';
    card.dataset.id = id;
    card.innerHTML = `
      <div class="custom-trade-header">
        <span>Trade ${id}</span>
        <button class="btn-remove-trade" data-remove="${id}">✕</button>
      </div>
      <div class="custom-inputs">
        <div class="custom-input-wrap">
          <label>Risk ($)</label>
          <input type="number" class="c-risk" placeholder="100" min="0" step="0.01">
        </div>
        <div class="custom-input-wrap">
          <label>SL (pips)</label>
          <input type="number" class="c-sl" placeholder="13" min="0" step="0.1">
        </div>
        <div class="custom-input-wrap">
          <label>TP (pips)</label>
          <input type="number" class="c-tp" placeholder="39" min="0" step="0.1">
        </div>
      </div>
    `;
    $('customTrades').appendChild(card);
    renumberCustomTrades();
  }

  function renumberCustomTrades() {
    const cards = $('customTrades').querySelectorAll('.custom-trade-card');
    cards.forEach((c, i) => {
      c.querySelector('.custom-trade-header span').textContent = `Trade ${i + 1}`;
    });
  }

  // Initialize with one trade
  addCustomTrade();

  $('btnAddTrade').addEventListener('click', () => {
    if ($('customTrades').children.length >= 10) {
      showToast('Maximum 10 trades');
      return;
    }
    addCustomTrade();
  });

  $('customTrades').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-trade');
    if (!btn) return;
    if ($('customTrades').children.length <= 1) {
      showToast('Need at least 1 trade');
      return;
    }
    const id = btn.dataset.remove;
    const card = $('customTrades').querySelector(`[data-id="${id}"]`);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateX(-20px)';
      card.style.transition = '0.25s ease';
      setTimeout(() => {
        card.remove();
        renumberCustomTrades();
      }, 250);
    }
  });

  $('btn-calc-custom').addEventListener('click', () => {
    const cards = $('customTrades').querySelectorAll('.custom-trade-card');
    const trades = [];
    let valid = true;

    cards.forEach((card, i) => {
      const risk = parseFloat(card.querySelector('.c-risk').value);
      const sl = parseFloat(card.querySelector('.c-sl').value);
      const tp = parseFloat(card.querySelector('.c-tp').value);

      if (!risk || !sl || !tp || risk <= 0 || sl <= 0 || tp <= 0) {
        valid = false;
        return;
      }

      const lots = calcLotSize(risk, sl);
      if (lots <= 0) {
        valid = false;
        return;
      }

      const actualRisk = calcActualRisk(lots, sl);
      const reward = calcReward(lots, tp);
      const rr = calcRR(actualRisk, reward);

      trades.push({
        label: `Trade ${i + 1}`,
        lots, slPips: sl, tpPips: tp,
        risk: actualRisk, reward, rr,
      });
    });

    if (!valid || trades.length === 0) {
      showToast('Please fill in all trade fields');
      return;
    }

    const totalLots = +trades.reduce((s, t) => s + t.lots, 0).toFixed(2);
    const totalRisk = +trades.reduce((s, t) => s + t.risk, 0).toFixed(2);
    const totalReward = +trades.reduce((s, t) => s + t.reward, 0).toFixed(2);
    const netProfit = +(totalReward - totalRisk).toFixed(2);
    const overallRR = calcRR(totalRisk, totalReward);

    lastResult = {
      mode: 'custom',
      trades,
      totalLots,
      totalRisk,
      totalReward,
      netProfit,
      tradeCount: trades.length,
      rr: overallRR,
    };

    renderUnmanagedResults(trades); // Same card layout as unmanaged
    renderPortfolio(lastResult);
    results.classList.add('visible');
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ══════════════════════════════════════
  //  SHARED RENDER HELPERS
  // ══════════════════════════════════════
  function renderRRBar(risk, reward, rr) {
    const total = risk + reward;
    const riskPct = total > 0 ? (risk / total * 100) : 50;
    const rewardPct = total > 0 ? (reward / total * 100) : 50;
    return `
      <div class="rr-bar-container">
        <div class="rr-label">
          <span>Risk : Reward</span>
          <strong>${fmtRR(rr)}</strong>
        </div>
        <div class="rr-bar">
          <div class="rr-bar-risk" style="width:${riskPct}%"></div>
          <div class="rr-bar-reward" style="width:${rewardPct}%"></div>
        </div>
      </div>
    `;
  }

  function renderPortfolio(data) {
    $('p-lots').textContent = fmtLot(data.totalLots);
    $('p-trades').textContent = data.tradeCount;
    $('p-risk').textContent = fmt$(data.totalRisk);
    $('p-reward').textContent = fmt$(data.totalReward);
    const netEl = $('p-net');
    netEl.textContent = fmt$(data.netProfit);
    netEl.style.color = data.netProfit >= 0 ? 'var(--green)' : 'var(--red)';
  }

  // ══════════════════════════════════════
  //  SAVE / RESET
  // ══════════════════════════════════════
  $('btnSave').addEventListener('click', () => {
    if (!lastResult) {
      showToast('Calculate first');
      return;
    }
    const history = JSON.parse(localStorage.getItem('xauusd_history') || '[]');
    const entry = {
      ...lastResult,
      date: new Date().toISOString(),
      id: Date.now(),
    };
    history.unshift(entry);
    localStorage.setItem('xauusd_history', JSON.stringify(history));
    showToast('✓ Saved to history');
  });

  $('btnReset').addEventListener('click', () => {
    results.classList.remove('visible');
    lastResult = null;

    // Clear all inputs based on current mode
    if (currentMode === 'managed') {
      $('m-balance').value = '';
      $('m-risk').value = '';
      $('m-sl').value = '';
      $('m-tp').value = '';
    } else if (currentMode === 'unmanaged') {
      $('u-count').value = 1;
      $('u-risk').value = '';
      $('u-sl').value = '';
      $('u-tp').value = '';
    } else {
      $('customTrades').innerHTML = '';
      customTradeId = 0;
      addCustomTrade();
    }

    showToast('Reset ✓');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── PWA Install Logic ──
  let deferredPrompt;
  const btnInstall = $('btnInstall');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall) btnInstall.style.display = 'flex';
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      btnInstall.style.display = 'none';
    });
  }

  window.addEventListener('appinstalled', () => {
    if (btnInstall) btnInstall.style.display = 'none';
  });

  // ── Keyboard shortcut: Enter to calculate ──
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const tag = document.activeElement.tagName;
    if (tag !== 'INPUT') return;
    const calcBtn = $('btn-calc-' + currentMode);
    if (calcBtn) calcBtn.click();
  });

})();
