(function () {
  'use strict';

  const bankrollEl = document.getElementById('bankroll');
  const bankrollInput = document.getElementById('bankroll-input');
  const chipInput = document.getElementById('chip-value');
  const btnStart = document.getElementById('btn-start');
  const btnRoll = document.getElementById('btn-roll');
  const btnClear = document.getElementById('btn-clear');
  const btnReset = document.getElementById('btn-reset');
  const resultMsg = document.getElementById('result-msg');
  const tableEl = document.getElementById('bet-table');

  let diceEls = [];
  let bankroll = 0;
  let selectedChip = 10;
  let activeBets = new Map();
  let gameStarted = false;
  let rolling = false;

  function fmt(n) { return n.toLocaleString('zh-TW'); }

  function betKey(bet) {
    if (bet.type === 'domino') return `domino-${bet.pair[0]}-${bet.pair[1]}`;
    if (bet.type === 'total') return `total-${bet.sum}`;
    if (bet.type === 'single' || bet.type === 'pair' || bet.type === 'specificTriple')
      return `${bet.type}-${bet.face}`;
    return bet.type;
  }

  function cell(bet, cls, inner) {
    return `<div class="bet-cell ${cls}" data-bet='${JSON.stringify(bet)}'>${inner}</div>`;
  }

  function buildTable() {
    const totals = [
      [4, 60], [5, 30], [6, 18], [7, 12], [8, 8], [9, 6], [10, 6],
      [11, 6], [12, 6], [13, 8], [14, 12], [15, 18], [16, 30], [17, 60],
    ];

    let html = '<div class="felt-layout">';

    /* 第一列：小 | 骰子 | 大 */
    html += `<div class="felt-row felt-row-top">
      ${cell({ type: 'small' }, 'felt-bs', '小<span class="bet-odds">4–10 · 1:1</span>')}
      <div class="felt-dice-zone">
        <div class="dice-display">
          <div class="die" id="die1">?</div>
          <div class="die" id="die2">?</div>
          <div class="die" id="die3">?</div>
        </div>
      </div>
      ${cell({ type: 'big' }, 'felt-bs', '大<span class="bet-odds">11–17 · 1:1</span>')}
    </div>`;

    /* 總和 4–17 橫列 */
    html += '<div class="felt-section-label">總 和</div><div class="felt-row felt-row-totals">';
    totals.forEach(([sum, odds]) => {
      html += cell(
        { type: 'total', sum },
        'felt-total',
        `<span class="bet-sum">${sum}</span><span class="bet-odds">${odds}:1</span>`
      );
    });
    html += '</div>';

    /* 單點 1–6 */
    html += '<div class="felt-section-label">單 點</div><div class="felt-row felt-row-singles">';
    for (let f = 1; f <= 6; f++) {
      html += cell(
        { type: 'single', face: f },
        'felt-single',
        `<span class="die-face">${f}</span><span class="bet-odds">1/2/3:1</span>`
      );
    }
    html += '</div>';

    /* 左：豹子+對子 | 右：Domino */
    html += '<div class="felt-main">';

    html += '<div class="felt-left-col">';
    html += '<div class="felt-section-label">豹 子</div><div class="felt-triples">';
    html += cell({ type: 'anyTriple' }, 'felt-triple-any', '全圍<span class="bet-odds">30:1</span>');
    for (let f = 1; f <= 6; f++) {
      html += cell(
        { type: 'specificTriple', face: f },
        'felt-triple-spec',
        `${f}${f}${f}<span class="bet-odds">180:1</span>`
      );
    }
    html += '</div>';

    html += '<div class="felt-section-label">對 子</div><div class="felt-pairs">';
    for (let f = 1; f <= 6; f++) {
      html += cell(
        { type: 'pair', face: f },
        'felt-pair',
        `對${f}<span class="bet-odds">10:1</span>`
      );
    }
    html += '</div></div>';

    html += '<div class="felt-right-col">';
    html += '<div class="felt-section-label">兩 點 組 合</div><div class="felt-domino">';
    SicBoEngine.DOMINO_PAIRS.forEach(([a, b]) => {
      html += cell(
        { type: 'domino', pair: [a, b] },
        'felt-domino',
        `${a} · ${b}<span class="bet-odds">5:1</span>`
      );
    });
    html += '</div></div>';

    html += '</div></div>';

    tableEl.innerHTML = html;
    diceEls = [
      document.getElementById('die1'),
      document.getElementById('die2'),
      document.getElementById('die3'),
    ];

    tableEl.querySelectorAll('.bet-cell').forEach((c) => {
      c.addEventListener('click', () => onBetCell(c));
    });
  }

  function onBetCell(cell) {
    if (!gameStarted || rolling) return;
    const bet = JSON.parse(cell.dataset.bet);
    const key = betKey(bet);
    const stake = selectedChip;
    if (stake > bankroll) {
      resultMsg.textContent = '本金不足！';
      resultMsg.className = 'result-msg lose';
      return;
    }
    const existing = activeBets.get(key);
    if (existing) {
      existing.amount += stake;
    } else {
      activeBets.set(key, { ...bet, amount: stake, el: cell });
    }
    bankroll -= stake;
    bankrollEl.textContent = fmt(bankroll);
    cell.classList.add('active');
    updateStakeDisplay(cell, activeBets.get(key).amount);
  }

  function updateStakeDisplay(cell, amount) {
    let stakeEl = cell.querySelector('.bet-stake');
    if (!stakeEl) {
      stakeEl = document.createElement('span');
      stakeEl.className = 'bet-stake';
      cell.appendChild(stakeEl);
    }
    stakeEl.textContent = '$' + amount;
  }

  function clearBets() {
    if (rolling) return;
    activeBets.forEach((bet) => {
      bankroll += bet.amount;
      bet.el.classList.remove('active');
      const s = bet.el.querySelector('.bet-stake');
      if (s) s.remove();
    });
    activeBets.clear();
    bankrollEl.textContent = fmt(bankroll);
    resultMsg.textContent = '';
  }

  function startGame() {
    const val = AppUtils.clamp(parseInt(bankrollInput.value, 10) || 1000, 100, 999999);
    bankroll = val;
    bankrollInput.value = val;
    gameStarted = true;
    activeBets.clear();
    tableEl.querySelectorAll('.bet-cell').forEach((c) => {
      c.classList.remove('active');
      const s = c.querySelector('.bet-stake');
      if (s) s.remove();
    });
    bankrollEl.textContent = fmt(bankroll);
    btnRoll.disabled = false;
    btnClear.disabled = false;
    resultMsg.textContent = '請選擇籌碼並點擊注區下注';
    resultMsg.className = 'result-msg';
  }

  function resetGame() {
    gameStarted = false;
    rolling = false;
    activeBets.clear();
    bankroll = 0;
    bankrollEl.textContent = '—';
    btnRoll.disabled = true;
    btnClear.disabled = true;
    resultMsg.textContent = '請設定本金後開始遊戲';
    resultMsg.className = 'result-msg';
    diceEls.forEach((d) => { if (d) { d.textContent = '?'; d.classList.remove('rolling'); } });
    tableEl.querySelectorAll('.bet-cell').forEach((c) => {
      c.classList.remove('active');
      const s = c.querySelector('.bet-stake');
      if (s) s.remove();
    });
  }

  function roll() {
    if (!gameStarted || rolling || activeBets.size === 0) {
      if (activeBets.size === 0) resultMsg.textContent = '請先下注';
      return;
    }
    rolling = true;
    btnRoll.disabled = true;
    resultMsg.textContent = '擲骰中…';

    const totalStake = [...activeBets.values()].reduce((s, b) => s + b.amount, 0);
    let ticks = 0;
    const anim = setInterval(() => {
      diceEls.forEach((d) => {
        d.textContent = Math.floor(Math.random() * 6) + 1;
        d.classList.add('rolling');
      });
      ticks++;
      if (ticks >= 12) {
        clearInterval(anim);
        finishRoll(totalStake);
      }
    }, 90);
  }

  function finishRoll(totalStake) {
    const dice = SicBoEngine.rollDice();
    diceEls.forEach((d, i) => {
      d.textContent = dice[i];
      d.classList.remove('rolling');
    });

    const bets = [...activeBets.values()];
    const winnings = SicBoEngine.settleBets(bets, dice);
    const net = winnings - totalStake;
    bankroll += winnings;

    activeBets.forEach((bet) => {
      bet.el.classList.remove('active');
      const s = bet.el.querySelector('.bet-stake');
      if (s) s.remove();
    });
    activeBets.clear();

    const total = SicBoEngine.getTotal(dice);
    const triple = SicBoEngine.isTriple(dice);
    let msg = `🎲 ${dice.join(' + ')} = ${total}`;
    if (triple) msg += '（豹子）';
    msg += '｜';
    if (net > 0) {
      msg += `贏 ${fmt(net)}！`;
      resultMsg.className = 'result-msg win';
    } else if (net === 0) {
      msg += '平手';
      resultMsg.className = 'result-msg';
    } else {
      msg += `輸 ${fmt(-net)}`;
      resultMsg.className = 'result-msg lose';
    }
    resultMsg.textContent = msg;
    bankrollEl.textContent = fmt(bankroll);

    rolling = false;
    if (bankroll <= 0) {
      resultMsg.textContent = '破產了！請重新開始';
      resultMsg.className = 'result-msg lose';
      gameStarted = false;
      btnRoll.disabled = true;
    } else {
      btnRoll.disabled = false;
    }
  }

  document.querySelectorAll('.chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedChip = parseInt(btn.dataset.chip, 10);
      chipInput.value = selectedChip;
    });
  });

  chipInput.addEventListener('change', () => {
    selectedChip = AppUtils.clamp(parseInt(chipInput.value, 10) || 10, 1, bankroll || 9999);
    chipInput.value = selectedChip;
  });

  btnStart.addEventListener('click', startGame);
  btnRoll.addEventListener('click', roll);
  btnClear.addEventListener('click', clearBets);
  btnReset.addEventListener('click', resetGame);

  buildTable();
  resetGame();
})();
