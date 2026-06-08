(function () {
  'use strict';

  const isMartingale = document.body.dataset.mode === 'martingale';

  const els = {
    initial: document.getElementById('initial'),
    bet: document.getElementById('bet'),
    rounds: document.getElementById('rounds'),
    tableLimit: document.getElementById('table-limit'),
    side: document.getElementById('bet-side'),
    btn: document.getElementById('btn-run'),
    statRounds: document.getElementById('stat-rounds'),
    statTriple: document.getElementById('stat-triple'),
    statProfit: document.getElementById('stat-profit'),
    statFails: document.getElementById('stat-fails'),
    status: document.getElementById('sim-status'),
  };

  let running = false;

  function setStats(result, partial) {
    const h = partial || result.history;
    const last = h[h.length - 1];
    const initial = parseInt(els.initial.value, 10);
    els.statRounds.textContent = last.round;
    els.statTriple.textContent = result.tripleCount;
    const profit = last.balance - initial;
    els.statProfit.textContent = (profit >= 0 ? '+' : '') + profit;
    els.statProfit.className = 'stat-value ' + (profit >= 0 ? 'positive' : 'negative');
    if (els.statFails) els.statFails.textContent = result.strategyFails || 0;
  }

  function run() {
    if (running) return;
    const initial = AppUtils.clamp(parseInt(els.initial.value, 10) || 1000, 1, 999999);
    const bet = AppUtils.clamp(parseInt(els.bet.value, 10) || 10, 1, initial);
    const rounds = AppUtils.clamp(parseInt(els.rounds.value, 10) || 100, 1, 1000);
    const side = els.side.value;

    els.initial.value = initial;
    els.bet.value = bet;
    els.rounds.value = rounds;

    running = true;
    els.btn.disabled = true;
    els.status.textContent = '模擬中…';

    const result = isMartingale
      ? SicBoEngine.simulateMartingale(
          initial, bet,
          AppUtils.clamp(parseInt(els.tableLimit.value, 10) || 500, bet, 999999),
          rounds, side)
      : SicBoEngine.simulateFixed(initial, bet, rounds, side);

    SicBoSim.initChart('chart');
    SicBoSim.updateChart([result.history[0]], initial);
    setStats(result, [result.history[0]]);

    SicBoEngine.playStages(
      result.history,
      (partial) => {
        SicBoSim.updateChart(partial, initial);
        setStats(result, partial);
      },
      () => {
        running = false;
        els.btn.disabled = false;
        els.status.textContent = result.bankrupt
          ? '已破產，模擬結束'
          : `模擬完成（共 ${result.played} 局）`;
      }
    );
  }

  els.btn.addEventListener('click', run);
  SicBoSim.initChart('chart');
})();
