/** @param {NS} ns */
export async function main(ns) {
  const [target] = ns.args
  const minDifficulty = ns.getServerMinSecurityLevel(target)
  const moneyMax = ns.getServerMaxMoney(target)
  const hackPercent = ns.hackAnalyze(target)
  const growThreadsPerHack = ns.growthAnalyze(target, 1 + hackPercent)
  const values = { minDifficulty, moneyMax, hackPercent, growThreadsPerHack }
  ns.tprint(JSON.stringify(values, null, 2))
}