(function () {
  'use strict';

  const input = document.getElementById('coin-count');
  const chart = document.getElementById('bell-chart');
  const btn = document.getElementById('btn-draw');

  function draw() {
    const n = AppUtils.clamp(parseInt(input.value, 10) || 1, 1, 100);
    input.value = n;

    const values = [];
    let maxVal = 0n;
    for (let k = 0; k <= n; k++) {
      const c = AppUtils.combBigInt(n, k);
      values.push({ k, count: c });
      if (c > maxVal) maxVal = c;
    }

    chart.classList.toggle('dense-mode', n > 20);
    chart.innerHTML = '';

    const maxLog = Math.log(Number(maxVal) + 1);

    values.forEach(({ k, count }) => {
      const wrap = document.createElement('div');
      wrap.className = 'bell-bar-wrap';

      const stack = document.createElement('div');
      stack.className = 'bell-bar-stack';

      const countEl = document.createElement('div');
      countEl.className = 'bar-count';
      countEl.textContent = AppUtils.formatBigInt(count);

      const bar = document.createElement('div');
      bar.className = 'bell-bar';
      const logH = Math.log(Number(count) + 1) / maxLog;
      bar.style.height = Math.max(2, logH * 180) + 'px';
      bar.title = `k=${k}: C(${n},${k}) = ${count.toString()}`;

      const label = document.createElement('div');
      label.className = 'bar-label';
      label.textContent = k;

      stack.appendChild(countEl);
      stack.appendChild(bar);
      wrap.appendChild(stack);
      wrap.appendChild(label);
      chart.appendChild(wrap);
    });
  }

  btn.addEventListener('click', draw);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') draw(); });
  draw();
})();
