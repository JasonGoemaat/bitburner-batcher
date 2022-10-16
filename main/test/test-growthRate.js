/*
For testing difficulty changes on hack/grow using rho-construction and level 900
player as a base
*/

import { getCustomFormulas, createTable } from "/lib.js"

/** @param {NS} ns */
export async function main(ns) {
  const hacking = getCustomFormulas()
  const player = ns.getPlayer()
  player.skills.hacking = 200
  player.skills.hacking = 900
  let baseServer = ns.getServer('rho-construction')
  baseServer.hackDifficulty = baseServer.minDifficulty
  baseServer.moneyAvailable = baseServer.moneyMax
  let results = []
  let gp1 = hacking.growPercent(baseServer, 1, player, 1)
  for (let i = 5; i <= 100; i += 5) {
    const halfServer = { ...baseServer, moneyAvailable: baseServer.moneyMax / 2, serverGrowth: i }
    let gp = hacking.growPercent(halfServer, i, player, 1) - 1
    results.push({
     i, gp
    })
  }
  let rows = createTable(results.map(x => ({
    serverGrowth: x.i,
    growPercent: ns.nFormat(x.gp, "0.00000%"),
  })))
  ns.tprint('results:\n' + rows.join('\n'))
}