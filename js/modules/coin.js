(function () {
  'use strict';

  const input = document.getElementById('coin-count');
  const list = document.getElementById('coin-list');
  const badge = document.getElementById('mode-badge');
  const btn = document.getElementById('btn-analyze');

  function generateCombos(n) {
    const results = [];
    const total = 1 << n;
    for (let i = 0; i < total; i++) {
      let s = '';
      for (let j = n - 1; j >= 0; j--) {
        s += (i >> j) & 1 ? 'H' : 'T';
      }
      results.push(s);
    }
    return results;
  }

  function renderCard(k, count, total, combos) {
    const prob = count / total;
    const card = document.createElement('div');
    card.className = 'coin-card';
    card.innerHTML =
      `<div class="coin-card-header">
        <span class="heads-count">正面 ${k} 次</span>
        <span class="prob">${AppUtils.pct(prob)}（${count} / ${total}）</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${prob * 100}%"></div></div>` +
      (combos ? `<div class="coin-combos">${combos.join('、')}</div>` : '');
    return card;
  }

  function analyze() {
    const n = AppUtils.clamp(parseInt(input.value, 10) || 1, 1, 100);
    input.value = n;
    list.innerHTML = '';

    if (n <= 10) {
      badge.textContent = '模式：窮舉列舉（n ≤ 10）';
      const combos = generateCombos(n);
      const groups = {};
      combos.forEach((c) => {
        const h = (c.match(/H/g) || []).length;
        if (!groups[h]) groups[h] = [];
        groups[h].push(c);
      });
      const total = combos.length;
      for (let k = 0; k <= n; k++) {
        list.appendChild(renderCard(k, (groups[k] || []).length, total, groups[k]));
      }
    } else {
      badge.textContent = '模式：組合數公式（n > 10）';
      const totalBig = 1n << BigInt(n);
      for (let k = 0; k <= n; k++) {
        const countBig = AppUtils.combBigInt(n, k);
        const card = document.createElement('div');
        card.className = 'coin-card';
        const scale = 10000n;
        const pctVal = countBig * scale / totalBig;
        const pctStr = (Number(pctVal) / 100).toFixed(2) + '%';
        const barW = Number(countBig * 10000n / totalBig) / 100;
        card.innerHTML =
          `<div class="coin-card-header">
            <span class="heads-count">正面 ${k} 次</span>
            <span class="prob">${pctStr}（C(${n},${k}) / 2^${n}）</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${barW}%"></div></div>`;
        list.appendChild(card);
      }
    }
  }

  btn.addEventListener('click', analyze);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') analyze(); });
  analyze();
})();
