/**
 * 全站共用：路徑前綴、導航注入、數學工具
 */
(function () {
  'use strict';

  const MODULES = [
    { id: 'bell_curve', file: 'bell_curve.html', label: '鐘形曲線' },
    { id: 'coin', file: 'coin.html', label: '二項分配' },
    { id: 'sicbo', file: 'sicbo.html', label: '固定平注' },
    { id: 'sicbo2', file: 'sicbo2.html', label: '馬丁格爾' },
    { id: 'sicbo3', file: 'sicbo3.html', label: '骰寶體驗' },
  ];

  const inModules = /\/modules\//.test(location.pathname) ||
    location.pathname.endsWith('/modules') ||
    document.querySelector('body[data-depth="module"]');

  const prefix = inModules ? '../' : '';
  const currentPage = location.pathname.split('/').pop() || 'index.html';

  function injectNav() {
    const nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.innerHTML =
      `<a href="${prefix}index.html" class="nav-brand">🎲 機率教學</a>` +
      MODULES.map((m) => {
        const active = currentPage === m.file ? ' active' : '';
        return `<a href="${prefix}modules/${m.file}" class="${active.trim()}">${m.label}</a>`;
      }).join('');
    document.body.prepend(nav);
  }

  /** BigInt 組合數 C(n,k) */
  function combBigInt(n, k) {
    if (k < 0 || k > n) return 0n;
    if (k === 0 || k === n) return 1n;
    if (k > n - k) k = n - k;
    let result = 1n;
    for (let i = 0; i < k; i++) {
      result = (result * BigInt(n - i)) / BigInt(i + 1);
    }
    return result;
  }

  /** BigInt → K/M/B 或科學記號 */
  function formatBigInt(val) {
    const s = val.toString();
    const len = s.length;
    if (len <= 6) return s;
    const suffixes = [
      [9, 'M', 6],
      [6, 'K', 3],
    ];
    for (const [threshold, suffix, div] of suffixes) {
      if (len <= threshold) {
        const whole = s.slice(0, len - div);
        const frac = s.slice(len - div, len - div + 1);
        return whole + (frac !== '0' ? '.' + frac : '') + suffix;
      }
    }
    const exp = len - 1;
    return s[0] + '.' + s.slice(1, 4) + 'e' + exp;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function pct(n, digits = 2) {
    return (n * 100).toFixed(digits) + '%';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNav);
  } else {
    injectNav();
  }

  window.AppUtils = { prefix, inModules, combBigInt, formatBigInt, clamp, pct, MODULES };
})();
