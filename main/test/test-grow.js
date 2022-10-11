/*
For testing difficulty changes on hack/grow using rho-construction and level 900
player as a base
*/

import { getCustomFormulas, createTable } from "/lib.js"

/** @param {NS} ns */
export async function main(ns) {
  const hacking = getCustomFormulas()
  const player = ns.getPlayer()
  player.skills.hacking = 900
  let baseServer = ns.getServer('rho-construction')
  baseServer.hackDifficulty = baseServer.minDifficulty
  baseServer.moneyAvailable = baseServer.moneyMax
  let results = []
  let gp1 = hacking.growPercent(baseServer, 1, player, 1)
  for (let i = 1; i < 100; i++) {
    const halfServer = { ...baseServer, moneyAvailable: baseServer.moneyMax / 2 }
    let gp = hacking.growPercent(halfServer, i, player, 1) - 1
    results.push({
      gt: i, gp, calc: Math.pow(gp1, i) - 1
    })
  }
  let rows = createTable(results.map(x => ({
    gt: ns.nFormat(x.gt, "0,000"),
    gp: ns.nFormat(x.gp, "0.0000000"),
    calc: ns.nFormat(x.calc, "0.0000000"),
  })))
  ns.tprint('results:\n' + rows.join('\n'))
}