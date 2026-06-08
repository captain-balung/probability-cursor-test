/**
 * 骰寶核心引擎 — 擲骰、賠率、模擬
 */
(function () {
  'use strict';

  const STAGE_INTERVAL_MS = 300;
  const STAGE_COUNT = 10;

  /** 拉斯維加斯 Mirage 版賠率表 */
  const PAYOUTS = {
    big: 1, small: 1,
    single: [1, 2, 3],
    domino: 5,
    pair: 10,
    anyTriple: 30,
    specificTriple: 180,
    total: {
      4: 60, 17: 60,
      5: 30, 16: 30,
      6: 18, 15: 18,
      7: 12, 14: 12,
      8: 8, 13: 8,
      9: 6, 10: 6, 11: 6, 12: 6,
    },
  };

  const DOMINO_PAIRS = [];
  for (let a = 1; a <= 6; a++) {
    for (let b = a + 1; b <= 6; b++) {
      DOMINO_PAIRS.push([a, b]);
    }
  }

  function rollDice() {
    return [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
  }

  function getTotal(dice) {
    return dice[0] + dice[1] + dice[2];
  }

  function isTriple(dice) {
    return dice[0] === dice[1] && dice[1] === dice[2];
  }

  function countFace(dice, face) {
    return dice.filter((d) => d === face).length;
  }

  function isBig(dice) {
    if (isTriple(dice)) return false;
    const t = getTotal(dice);
    return t >= 11 && t <= 17;
  }

  function isSmall(dice) {
    if (isTriple(dice)) return false;
    const t = getTotal(dice);
    return t >= 4 && t <= 10;
  }

  /** 大/小單局：'win' | 'lose' | 'triple' */
  function playBigSmall(betSide, dice) {
    if (isTriple(dice)) return 'triple';
    if (betSide === 'big') return isBig(dice) ? 'win' : 'lose';
    return isSmall(dice) ? 'win' : 'lose';
  }

  /**
   * 結算 F 模組下注
   * bets: [{ type, ...params, amount }]
   */
  function settleBets(bets, dice) {
    let totalWin = 0;
    const total = getTotal(dice);
    const triple = isTriple(dice);

    for (const bet of bets) {
      const amt = bet.amount;
      if (amt <= 0) continue;
      let payout = 0;

      switch (bet.type) {
        case 'big':
          if (!triple && isBig(dice)) payout = amt * (1 + PAYOUTS.big);
          break;
        case 'small':
          if (!triple && isSmall(dice)) payout = amt * (1 + PAYOUTS.small);
          break;
        case 'single': {
          const cnt = countFace(dice, bet.face);
          if (cnt >= 1 && cnt <= 3) payout = amt * (1 + PAYOUTS.single[cnt - 1]);
          break;
        }
        case 'domino': {
          const [a, b] = bet.pair;
          if (dice.includes(a) && dice.includes(b)) payout = amt * (1 + PAYOUTS.domino);
          break;
        }
        case 'pair':
          if (countFace(dice, bet.face) >= 2) payout = amt * (1 + PAYOUTS.pair);
          break;
        case 'anyTriple':
          if (triple) payout = amt * (1 + PAYOUTS.anyTriple);
          break;
        case 'specificTriple':
          if (triple && dice[0] === bet.face) payout = amt * (1 + PAYOUTS.specificTriple);
          break;
        case 'total': {
          const odds = PAYOUTS.total[bet.sum];
          if (!triple && total === bet.sum && odds) payout = amt * (1 + odds);
          break;
        }
      }
      totalWin += payout;
    }
    return totalWin;
  }

  /** 固定平注模擬 — 一次算完 */
  function simulateFixed(initial, betAmount, rounds, betSide = 'big') {
    let balance = initial;
    const history = [{ round: 0, balance: initial }];
    let tripleCount = 0;
    let played = 0;

    for (let i = 1; i <= rounds && balance > 0; i++) {
      const stake = Math.min(betAmount, balance);
      const dice = rollDice();
      const result = playBigSmall(betSide, dice);
      played = i;
      if (result === 'triple') {
        tripleCount++;
        balance -= stake;
      } else if (result === 'win') {
        balance += stake;
      } else {
        balance -= stake;
      }
      history.push({ round: i, balance });
    }
    return {
      history,
      tripleCount,
      played,
      finalBalance: balance,
      profit: balance - initial,
      bankrupt: balance <= 0,
    };
  }

  /** 馬丁格爾模擬 — 一次算完 */
  function simulateMartingale(initial, baseBet, tableLimit, rounds, betSide = 'big') {
    let balance = initial;
    let nextBet = baseBet;
    let strategyFails = 0;
    let tripleCount = 0;
    let played = 0;
    const history = [{ round: 0, balance: initial }];

    for (let i = 1; i <= rounds && balance > 0; i++) {
      let stake = nextBet;
      if (stake > tableLimit) {
        strategyFails++;
        stake = tableLimit;
      }
      stake = Math.min(stake, balance);
      const dice = rollDice();
      const result = playBigSmall(betSide, dice);
      played = i;

      if (result === 'win') {
        balance += stake;
        nextBet = baseBet;
      } else {
        if (result === 'triple') tripleCount++;
        balance -= stake;
        const doubled = nextBet * 2;
        if (doubled > tableLimit) {
          strategyFails++;
          nextBet = tableLimit;
        } else {
          nextBet = doubled;
        }
      }
      history.push({ round: i, balance });
    }
    return {
      history,
      tripleCount,
      strategyFails,
      played,
      finalBalance: balance,
      profit: balance - initial,
      bankrupt: balance <= 0,
    };
  }

  /** 將結果分 10 段播放 */
  function playStages(history, onStage, onComplete) {
    const total = history.length - 1;
    if (total <= 0) {
      onComplete && onComplete();
      return;
    }
    const stageSize = Math.ceil(total / STAGE_COUNT);
    let stage = 0;

    function next() {
      if (stage >= STAGE_COUNT) {
        onStage(history);
        onComplete && onComplete();
        return;
      }
      const endIdx = Math.min((stage + 1) * stageSize, history.length - 1);
      const partial = history.slice(0, endIdx + 1);
      onStage(partial, stage);
      stage++;
      setTimeout(next, STAGE_INTERVAL_MS);
    }
    next();
  }

  window.SicBoEngine = {
    PAYOUTS,
    DOMINO_PAIRS,
    STAGE_INTERVAL_MS,
    STAGE_COUNT,
    rollDice,
    getTotal,
    isTriple,
    countFace,
    isBig,
    isSmall,
    playBigSmall,
    settleBets,
    simulateFixed,
    simulateMartingale,
    playStages,
  };
})();
