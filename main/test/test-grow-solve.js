/*
Test grow percent - multiplicitive vs. powers, using 5% hack
*/

import { getCustomFormulas, createTable } from "/lib.js"


/** @param {NS} ns */
export async function main(ns) {
  /** @type {HackingFormulas} */
  const hacking = getCustomFormulas()
  const player = ns.getPlayer()
  player.skills.hacking = 881
  let baseServer = ns.getServer('rho-construction')
  baseServer.hackDifficulty = baseServer.minDifficulty
  baseServer.moneyAvailable = baseServer.moneyMax
  let moneyMax = baseServer.moneyMax
  let cores = 3

  let results = []
  for (let ht = 10; ht < 260; ht += 10) {
    let hackPercent = hacking.hackPercent(baseServer, player)
    let hp = hackPercent * ht
    let hm = hp * moneyMax
    let remaining = moneyMax - hm
    let hacked = {...baseServer, moneyAvailable: remaining, hackDifficulty: baseServer.hackDifficulty + 0.002 * ht}
    let gp1 = hacking.growPercent(hacked, 1, player, cores) - 1

    // let naivePercentNeeded = hm / remaining
    let naivePercentNeeded = hm / remaining
    let naiveThreads = Math.floor(naivePercentNeeded / gp1)
    let naiveMoney = remaining * (hacking.growPercent(hacked, naiveThreads, player, cores) - 1)

    let calcPercentNeeded = (hm - naiveThreads - 1) / remaining
    //let calcPercentNeeded = hp
    let calcNeededMoney = remaining * (1 + calcPercentNeeded)
    let calcThreads = hacking.numCycleForGrowth(hacked, 1 + calcPercentNeeded, player, cores)
    let calcMoney = remaining * (hacking.growPercent(hacked, calcThreads, player, cores) - 1)

    let newPercentNeeded = (hm - naiveThreads - 1) / remaining
    let newCalcThreads = Math.log(1 + newPercentNeeded)/Math.log(1 + gp1)
    let newThreads = Math.ceil(newCalcThreads)
    let newMoney = remaining * (hacking.growPercent(hacked, newThreads, player, cores) - 1)
    let newMinus = newThreads - 1
    let newMinus$ = remaining * (hacking.growPercent(hacked, newMinus, player, cores) - 1)
    let newPlus = newThreads + 1
    let newPlus$ = remaining * (hacking.growPercent(hacked, newPlus, player, cores) - 1)

    let sgThreads = solveGrow(gp1 + 1, remaining, moneyMax)
    let sg$ = remaining * (hacking.growPercent(hacked, sgThreads, player, cores) - 1)

    let nsgThreads = newSolveGrow(gp1, remaining, moneyMax)
    let nsg$ = remaining * (hacking.growPercent(hacked, nsgThreads, player, cores) - 1)

    results.push({
      ht, hp, hm, gp1,
      naiveThreads, naiveMoney,
      calcThreads, calcMoney, calcNeededMoney,
      newCalcThreads, newThreads, newMoney,
      newMinus, newMinus$, newPlus, newPlus$,
      sgThreads, sg$, nsgThreads, nsg$,
    })
  }

  let rows = createTable(results.map(x => {
    try {
      return {
        ht: ns.nFormat(x.ht, "0,000"),
        hp: ns.nFormat(x.hp, "0.0000%"),
        // gp1: ns.nFormat(x.gp1, "0.0000%"),
        'hm': ns.nFormat(x.hm, "$0.00a"),
        // nt: ns.nFormat(x.naiveThreads, "0,000.00"),
        // 'n$': ns.nFormat(x.naiveMoney, "$0.00a"),
        // calct: ns.nFormat(x.calcThreads, "0,000.00"),
        // 'calc$': ns.nFormat(x.calcMoney, "$0.00a"),
        // newct: ns.nFormat(x.newCalcThreads, "0,000.00"),
        newt: ns.nFormat(x.newThreads, "0,000.00"),
        '-1t $': ns.nFormat(x.newMinus$, "$0.00a"),
        'new$': ns.nFormat(x.newMoney, "$0.00a"),
        '+1t $': ns.nFormat(x.newPlus$, "$0.00a"),
        sgt: ns.nFormat(x.sgThreads, "0,000"),
        sg$: ns.nFormat(x.sg$, "$0.00a"),
        nsgt: ns.nFormat(x.nsgThreads, "0,000"),
        nsg$: ns.nFormat(x.nsg$, "$0.00a"),
      }
    } catch (err) {
      ns.tprint(err)
      return { ht: 'ERR', hp: 'ERR', gp1: 'ERR', hm: 'ERR', nt: 'ERR', 'n$': 'ERR', calct: 'ERR', 'calc$': 'ERR'}
    }
  }))
  ns.tprint('results:\n' + rows.join('\n'))
}

// Solve for number of growth threads required to get from money_lo to money_hi
// base is ns.formulas.hacking.growPercent(serverObject, 1, playerObject, cores)
function solveGrow(base, money_lo, money_hi) {
  if (money_lo >= money_hi) { return 0; }

  let threads = 1000;
  let prev = threads;
  for (let i = 0; i < 30; ++i) {
      let factor = money_hi / Math.min(money_lo + threads, money_hi - 1);
      threads = Math.log(factor) / Math.log(base);
      if (Math.ceil(threads) == Math.ceil(prev)) { break; }
      prev = threads;
  }

  return Math.ceil(Math.max(threads, prev, 0));
}

function newSolveGrow(base, money_lo, money_hi) {
  if (money_lo >= money_hi) { return 0; } // invalid
  const needFactor = 1 + (money_hi - money_lo) / money_lo
  const needThreads = Math.log(needFactor)/Math.log(base)
  return Math.ceil(needThreads)
}