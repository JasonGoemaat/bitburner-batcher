/*
Test solving for weakens
*/

const ADD_LEVELS = 30

import { getCustomFormulas, createTable } from "/lib.js"

let ns

/** @param {NS} ns2 */
export async function main(ns2) {
  ns = ns2
  /** @type {HackingFormulas} */
  const hacking = getCustomFormulas()
  const player = ns.getPlayer()
  player.skills.hacking = 881
  let prepped = ns.getServer('rho-construction')
  prepped.hackDifficulty = prepped.minDifficulty
  prepped.moneyAvailable = prepped.moneyMax
  let cores = 3

  let results = []
  let results2 = []
  let hacked = {...prepped}
  let availableRam = 32750

  for (let wt = 1; wt <= 100; wt++) {
    let hackPercent = hacking.hackPercent(prepped, player)
    let growPercentFn = (ht) => {
      hacked.hackDifficulty = hacked.minDifficulty + ht * 0.002
      hacked.moneyAvailable = hacked.moneyMax - (ht * hackPercent)
      return hacking.growPercent(hacked, 1, player, cores)
    }

    let { hackThreads, growThreads } = solveForWeakens(wt, hackPercent, growPercentFn)

    if (wt && hackThreads && growThreads) {
      let hp = hackThreads * hackPercent
      let hm = hp * prepped.moneyMax
      hacked.moneyAvailable = hacked.moneyMax - hm
      hacked.hackDifficulty = hacked.minDifficulty + hackThreads * 0.002
      let gp = hacking.growPercent(hacked, growThreads, player, cores) - 1
      let gm = hacked.moneyAvailable * gp
      let rH = hackThreads * 1.7
      let rG = growThreads * 1.75
      let rW = wt * 1.75
      let ramUsed = rH + rG * 4 + rW * 5

      let activeHacks = Math.trunc(availableRam / ramUsed)
      let batchDelay = hacking.hackTime(prepped, player) / activeHacks
      let profit = Math.trunc(3600000/batchDelay) * hm * hacking.hackChance(prepped, player)

      results.push({
        wt, ht: hackThreads, gt: growThreads,
        hp, gp, hm, gm,
        ramUsed, activeHacks, batchDelay, profit,
        rH, rG, rW
      })

      let up = {...player}
      up.skills = {...player.skills, hacking: player.skills.hacking + ADD_LEVELS}
      let uBatchDelay = hacking.hackTime(prepped, up) / activeHacks
      let uhp = hackThreads * hacking.hackPercent(prepped, up)
      let uhm = prepped.moneyMax * uhp
      hacked.moneyAvailable = hacked.moneyMax - uhm
      let ugp = hacking.growPercent(hacked, growThreads, up, cores) - 1
      let ugm = hacked.moneyAvailable * ugp
      let uProfit = Math.trunc(3600000/batchDelay) * uhm * hacking.hackChance(prepped, up)

      results2.push({
        wt, ht: hackThreads, gt: growThreads,
        hp: uhp, gp: ugp, hm: uhm, gm: ugm,
        ramUsed, activeHacks, batchDelay: uBatchDelay, profit: uProfit,
        rH, rG, rW
      })
    }
  }

  let rows = createTable(results.map(x => {
    try {
      return {
        wt: x.wt, ht: x.ht, gt: x.gt,
        hp: ns.nFormat(x.hp, "0.00%"),
        gp: ns.nFormat(x.gp, "0.00%"),
        hm: ns.nFormat(x.hm, "$0.00a"),
        gm: ns.nFormat(x.gm, "$0.00a"),
        ram: ns.nFormat(x.ramUsed, "0,000") + 'gb',
        active: ns.nFormat(x.activeHacks, '0'),
        delay: ns.nFormat(x.batchDelay, '0'),
        '$/hr': ns.nFormat(x.profit, '$0.00a'),
        rH: ns.nFormat(x.rH, "0,000.0"),
        rG: ns.nFormat(x.rG, "0,000.0"),
        rW: ns.nFormat(x.rW, "0,000.0"),
      }
    } catch (err) {
      ns.tprint(err)
      return { ht: 'ERR', hp: 'ERR', gp1: 'ERR', hm: 'ERR', nt: 'ERR', 'n$': 'ERR', calct: 'ERR', 'calc$': 'ERR'}
    }
  }))
  ns.tprint(`results @lvl ${player.skills.hacking}:\n` + rows.join('\n') + '\n')

  let rows2 = createTable(results2.map(x => {
    try {
      return {
        wt: x.wt, ht: x.ht, gt: x.gt,
        hp: ns.nFormat(x.hp, "0.00%"),
        gp: ns.nFormat(x.gp, "0.00%"),
        hm: ns.nFormat(x.hm, "$0.00a"),
        gm: ns.nFormat(x.gm, "$0.00a"),
        ram: ns.nFormat(x.ramUsed, "0,000") + 'gb',
        active: ns.nFormat(x.activeHacks, '0'),
        delay: ns.nFormat(x.batchDelay, '0'),
        '$/hr': ns.nFormat(x.profit, '$0.00a'),
        rH: ns.nFormat(x.rH, "0,000.0"),
        rG: ns.nFormat(x.rG, "0,000.0"),
        rW: ns.nFormat(x.rW, "0,000.0"),
      }
    } catch (err) {
      ns.tprint(err)
      return { ht: 'ERR', hp: 'ERR', gp1: 'ERR', hm: 'ERR', nt: 'ERR', 'n$': 'ERR', calct: 'ERR', 'calc$': 'ERR'}
    }
  }))
  ns.tprint(`results @lvl ${player.skills.hacking + ADD_LEVELS}:\n` + rows2.join('\n') + '\n')
}

function solveGrow(base, money_lo, money_hi) {
  if (money_lo >= money_hi) { return 0; } // invalid
  const needFactor = 1 + (money_hi - money_lo) / money_lo
  const needThreads = Math.log(needFactor)/Math.log(base)
  return Math.ceil(needThreads)
}

/**
 * @param {number} weakenThreads - The number of weaken threads to optimize for
 * @param {number} hackPercent - The percent hacked with one thread, adjust with fudge factor for hackChance if desired
 * @param {function} growPercentFn - function taking hack threads and returning grow percent (i.e. 1.0025) for 1 grow thread
 * @return {Object} Object with hackThreads and growThreads properties
 */
 function solveForWeakens(weakenThreads, hackPercent, growPercentFn) {
  let minH = 1, maxH = weakenThreads * 24
  let validH = 0, validG = 0
  //ns.tprint(`Solving for weakens ${weakenThreads}, ${hackPercent}, ${growPercentFn}`)

  while (minH <= maxH) {
    let midH = (minH + maxH) >> 1
    let growPercent = growPercentFn(midH)
    let G = solveGrow(growPercent, 1e9*(1-(midH * hackPercent)), 1e9)
    // ns.tprint(`${minH}-${midH}-${maxH}: ` + JSON.stringify({ G, growPercent }))
    if (G * 0.004 + midH * 0.002 > weakenThreads * 0.050) { maxH = midH - 1; continue }
    validH = midH
    validG = G
    minH = midH + 1
  }

  return { hackThreads: validH, growThreads: validG }
}