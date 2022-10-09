/** @param {NS} ns */
export async function main(ns) {
  let [target] = ns.args
  target = target || 'rho-construction'
  const server = ns.getServer(target)
  const player = ns.getPlayer()
  const prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
  const hackTime = ns.formulas.hacking.hackTime(server, player)
  const hackChance = ns.formulas.hacking.hackChance(server, player)
  const hackPercent = ns.formulas.hacking.hackPercent(server, player)
  const hackMoney = hackPercent * prepped.moneyMax
  const growTime = ns.formulas.hacking.growTime(server, player)
  const growPercent = ns.formulas.hacking.growPercent(server, 1, player, 1)
  const growPercent3Core = ns.formulas.hacking.growPercent(server, 1, player, 3)
  const weakenTime = ns.formulas.hacking.weakenTime(server, player)

  const obj = {prepped, hackTime, hackChance, hackPercent, hackMoney, growTime, growPercent, growPercent3Core, weakenTime}
  ns.tprint('Info:\n' + JSON.stringify(obj, null, 2))
}
