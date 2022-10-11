/*
For testing difficulty changes on hack/grow using rho-construction and level 900
player as a base
*/

import { getCustomFormulas, createTable } from "/lib.js"

/** @param {NS} ns */
export async function main(ns) {
  const hacking = getCustomFormulas()
  const player = ns.getPlayer()
  let baseServer = ns.getServer('rho-construction')
  baseServer.hackDifficulty = baseServer.minDifficulty
  baseServer.moneyAvailable = baseServer.moneyMax
  let results = []
  const HACK_THREADS = 12
  const GROW_THREADS = 27
  let baseLevel = player.skills.hacking
  for (let i = 0; i < 40; i++) {
    player.skills.hacking = baseLevel + i
    const prepped = { ...baseServer }
    let hp = hacking.hackPercent(prepped, player) * HACK_THREADS
    let hc = hacking.hackChance(prepped, player)
    let hm = prepped.moneyMax * hp
    const hacked = { ...prepped, hackDifficulty: prepped.minDifficulty + HACK_THREADS * 0.002, moneyAvailable: prepped.moneyMax - hm }
    let gp = hacking.growPercent(hacked, GROW_THREADS, player, 1) - 1
    let gm = hacked.moneyAvailable * gp
    results.push({
      level: player.skills.hacking,
      hp, hm, gp, gm, hc
    })
  }
  let rows = createTable(results.map(x => ({
    level: x.level,
    hp: ns.nFormat(x.hp, "0.0000%"),
    hm: ns.nFormat(x.hm, "$0.0a"),
    gp: ns.nFormat(x.gp, "0.0000%"),
    gm: ns.nFormat(x.gm, "$0.0a"),
    hc: ns.nFormat(x.hc, "0.0000%"),
  })))
  ns.tprint('results:\n' + rows.join('\n'))
}