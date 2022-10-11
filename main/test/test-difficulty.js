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
  for (let i = baseServer.minDifficulty; i < 100; i++) {
    const server = { ...baseServer, hackDifficulty: i }
    const halfServer = { ...server, moneyAvailable: server.moneyMax / 2 }
    let ht = hacking.hackTime(server, player)
    let hp = hacking.hackPercent(server, player)
    let gp = hacking.growPercent(halfServer, 1, player, 1) - 1
    let gp10 = hacking.growPercent(halfServer, 10, player, 1) - 1
    let gp100 = hacking.growPercent(halfServer, 100, player, 1) - 1
    let gp1000 = hacking.growPercent(halfServer, 1000, player, 1) - 1
    let gp10000 = hacking.growPercent(halfServer, 10000, player, 1) - 1
    results.push({
      diff: i, ht, hp, gp, gp10, gp100, gp1000, gp10000
    })
  }
  let rows = createTable(results.map(x => ({
    ht: ns.nFormat(x.ht / 1000, "0,000.0") + 's',
    hp: ns.nFormat(x.hp, "0.0000%"),
    gp: ns.nFormat(x.gp, "0.0000%"),
    gp10: ns.nFormat(x.gp10, "0.0000%"),
    gp100: ns.nFormat(x.gp100, "0.0000%"),
    gp1000: ns.nFormat(x.gp1000, "0.0000%"),
    gp10000: ns.nFormat(x.gp10000, "0.0000%"),
  })))
  ns.tprint('results:\n' + rows.join('\n'))
}