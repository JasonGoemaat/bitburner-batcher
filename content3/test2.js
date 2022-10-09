/** @param {NS} ns */
export async function main(ns) {
  const CORES = 3 // emulate home on benchmark save
  let [target, hackingSkill, ram] = ns.args // can pass target, player's hacking skill level, and ram to use

  /**
   * Calculate maximum theoretical profit allowing for fractional threads.
   * 
   * @param {number} ht - Hack Time (ms)
   * @param {number} hp - Hack Percent (actually fraction, i.e. 0.03 means hack 3% max money with one thread)
   * @param {number} gp - Grow Percent (actually growth, i.e. 1.002 means 0.2% growth per thread)
   * @param {number} mm - Max Money
   * @param {number} hc - Hack Chance (fraction)
   * @param {number} gb - Available Ram (gb)
   * @param {number} hexp - hackExp (per thread, should be for grow, weaken, successful hack, 1/4 for unsuccessful hack)
   */
  const theory2 = (ht, hp, gp, mm, hc, ram, hexp) => {
    const hackThreadRam = 1.7
    const growThreadRam = 1.75
    const weakenThreadRam = 1.75

    const growThreads = 25 // perfect for 2 weaken threads
    const growPercent = 25 * (gp - 1)
    const maxHackPercent = 1-(1 / (1+growPercent)) // max hacking we can support with 25 grows
    const hackThreads = Math.max(Math.trunc(maxHackPercent / hp), 1) // actual hack threads so that 25 grows will always be good
    const hackPercent = hackThreads * hp
    const weakenThreads = 2 // perfect for 25 grows, overkill for hacks, I wonder how much more time added to first weaken call if split in 2?

    const hackMoney = mm * hackPercent
    const remainingMoney = mm - hackMoney
    const growMoney = remainingMoney * growPercent

    // schedule will be hack, weak, grow, weak
    const totalThreads = hackThreads + weakenThreads + growThreads + weakenThreads
    const hackGbms = hackThreads * hackThreadRam * ht
    const growGbms = growThreads * growThreadRam * ht * 4 // grow threads take 4 times as long as a hack thread
    const weakenGbms = weakenThreads * 2 * weakenThreadRam * ht * 5 // 2 sets of weaken threads taking 5 times as long as a hack
    const batchGbms = hackGbms + growGbms + weakenGbms
    const gbms = ram * 3600000
    const batches = Math.trunc(gbms / batchGbms)
    const profit = batches * hackMoney * hc

    const totalHacks = hackThreads * batches
    const totalGrows = growThreads * batches
    const totalWeakens = weakenThreads * 2 * batches
    const totalExpThreads = totalHacks * (hc + (1-hc)/4) + totalGrows + totalWeakens
    const hackExp = hexp * totalExpThreads
    const delayBetweenWeakens = 3600000 / batches / 2
    return { profit, batches, hackThreads, growThreads, weakenThreads, delayBetweenWeakens, hackExp, hackPercent, growPercent, hackMoney, growMoney }
  }

  target = target || 'rho-construction'
  const server = ns.getServer(target)
  const prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
  const player = ns.getPlayer()
  player.skills.hacking = hackingSkill || player.skills.hacking
  const ht = ns.formulas.hacking.hackTime(prepped, player)
  const hp = ns.formulas.hacking.hackPercent(prepped, player)
  const gp = ns.formulas.hacking.growPercent(prepped, 1, player, CORES)
  const mm = prepped.moneyMax
  const hc = ns.formulas.hacking.hackChance(prepped, player)
  ram = ram || 32 * 1024 // 32 TB on home in benchmark
  ram = ram + 1740 * 1.75 // add ram on other servers used for weakens
  const hexp = ns.formulas.hacking.hackExp(server, player)

  const { profit, batches, hackThreads, growThreads, weakenThreads, delayBetweenWeakens, hackExp, hackPercent, growPercent, hackMoney, growMoney } = theory2(ht, hp, gp, mm, hc, ram, hexp)
  ns.tprint(`Ram             : ${ram}gb with hack chance ${ns.nFormat(hc, "0.00%")}`)
  const oldLevel = player.skills.hacking
  const newLevel = ns.formulas.skills.calculateSkill(player.exp.hacking + hackExp, player.mults.hacking)
  ns.tprint(`Gain hacking exp: ${ns.nFormat(hackExp, "0.00a")} - Level: ${oldLevel} => ${newLevel}`)
  ns.tprint(`Profit          : ${ns.nFormat(profit, "$0.00a")} per hour`)
  ns.tprint(`Profit (warmup) : ${ns.nFormat(profit * (3600000 - (ht*5)) / 3600000, "$0.00a")}`)
  ns.tprint(`hackThreads  : ${hackThreads}`)
  ns.tprint(`growThreads  : ${growThreads}`)
  ns.tprint(`weakenThreads: ${weakenThreads}`)
  ns.tprint(`batches: ${batches}`)
  ns.tprint(`delay  : ${ns.nFormat(delayBetweenWeakens, "0.00")}`)
  ns.tprint(`hack%  : ${ns.nFormat(hackPercent, "0.00%")}`)
  ns.tprint(`grow%  : ${ns.nFormat(growPercent, "0.00%")}`)
  ns.tprint(`hack$  : ${ns.nFormat(hackMoney, "$0.00a")}`)
  ns.tprint(`grow$  : ${ns.nFormat(growMoney, "$0.00a")}`)
  ns.tprint(`server$: ${ns.nFormat(prepped.moneyMax, "$0.00a")}`)

  const worst = {...prepped, hackDifficulty: prepped.minDifficulty + 25 * 0.004, moneyAvailable: prepped.moneyMax - hackMoney}
  const htWorst = ns.formulas.hacking.hackTime(worst, player)
  ns.tprint(`hackms : ${ns.nFormat(ht, "0,000.0")} ms`)
  ns.tprint(`worstms: ${ns.nFormat(htWorst, "0,000.0")} ms`)

  const afterHack = {...server, 
    hackDifficulty: server.minDifficulty + hackThreads * 0.002,
    moneyAvailable: server.moneyMax - hackMoney }
  const adjGrowPercent = (ns.formulas.hacking.growPercent(afterHack, 1, player, CORES) - 1) * growThreads
  const adjGrowMoney = afterHack.moneyAvailable * adjGrowPercent
  ns.tprint(`adjusted grow%  : ${ns.nFormat(adjGrowPercent, "0.00%")}`)
  ns.tprint(`adjusted grow$  : ${ns.nFormat(adjGrowMoney, "$0.00a")}`)
}
