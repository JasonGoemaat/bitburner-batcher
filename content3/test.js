/** @param {NS} ns */
export async function main(ns) {
  const CORES = 3 // emulate home on benchmark save
  const [hackingSkill] = ns.args // can pass player's hacking skill level

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
  const theory = (ht, hp, gp, mm, hc, ram, hexp) => {
    const hackThreadRam = 1.7
    const growThreadRam = 1.75
    const weakenThreadRam = 1.75

    const hackThreads = 1
    const hackMoney = mm * hackThreads * hp
    const remainingMoney = mm - hackMoney
    const percentNeeded = hackMoney / remainingMoney
    const growThreads = percentNeeded / (gp - 1)
    
    const instantaneousHackThreads = hackThreads
    
    // for each hack we need growThreads grow threads, and they run 4x the time
    const instantaneousGrowThreads = hackThreads * growThreads * 4

    // for each grow thread running, we need 0.004 / 0.050 weaken threads, and they take 5/4 the time
    const instantaneousGrowWeakenThreads = instantaneousGrowThreads * 0.004 / 0.050 * 5 / 4

    // for each hack thread running, we need 0.002 / 0.050 weaken threads, and they take 5x the time
    const instantaneousHackWeakenThreads = instantaneousHackThreads * 0.002 / 0.050 * 5

    const instantaneousRam = instantaneousHackThreads * hackThreadRam
      + instantaneousGrowThreads * growThreadRam
      + (instantaneousGrowWeakenThreads + instantaneousHackWeakenThreads) * weakenThreadRam

    // instantaneousRam used over a period of  ht (hackTime) gives us how much is used by 1 hack thread over 1 hack time
    // calculate hacks per gbms
    const hacksPerGbms = 1 / (instantaneousRam * ht)

    // The instantaneous calculations are based on ht (hackTime), so they will take
    // instantaneousRam used for ht to produce hackMoney over the long run considering
    // we need to spread out the hacks, weakens, and grows.  So we take the given ram
    // divided by instantaneousRam to get how much we can produce in ht (hackTime) for
    // that much ram.  The units for the resulting humber are money/(gbms)
    const profitPerGbms = (hackMoney * hc) / (instantaneousRam * ht)

    // our final results will be in profit / hour given the passed ram
    const gbms = ram * 3600000
    const profit = profitPerGbms * gbms

    const totalHacks = hacksPerGbms * gbms
    const totalExpThreads = totalHacks * (hc + (1-hc)/4) // 1/4 the exp for failed hacks
      + (totalHacks) + (totalHacks * growThreads) // full xp for grow threads
      + totalHacks * 0.002 / 0.050 // full xp for weakens needed for hack
      + totalHacks * growThreads * 0.004 / 0.050 // full xp for weakens needed for grows
    const hackExp = hexp * totalExpThreads
    return { profit, growThreads, hackExp }
  }

  const target = 'rho-construction'
  const server = ns.getServer(target)
  const prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
  const player = ns.getPlayer()
  player.skills.hacking = hackingSkill || player.skills.hacking
  const ht = ns.formulas.hacking.hackTime(prepped, player)
  const hp = ns.formulas.hacking.hackPercent(prepped, player)
  const gp = ns.formulas.hacking.growPercent(prepped, 1, player, CORES)
  const mm = prepped.moneyMax
  const hc = ns.formulas.hacking.hackChance(prepped, player)
  let ram = 32 * 1024 // 32 TB on home in benchmark
  ram = ram + 1740 * 1.75 // add ram on other servers used for weakens
  const hexp = ns.formulas.hacking.hackExp(server, player)
  const { profit, growThreads, hackExp } = theory(ht, hp, gp, mm, hc, ram, hexp)
  ns.tprint(`Ram             : ${ram}gb with hack chance ${ns.nFormat(hc, "0.00%")}`)
  const htps = ht / 3600
  ns.tprint(`Hack Threads    : ${ns.nFormat(ht, "0,000.0")} (${ns.nFormat(htps, "0,000")} per second)`)
  const oldLevel = player.skills.hacking
  const newLevel = ns.formulas.skills.calculateSkill(player.exp.hacking + hackExp, player.mults.hacking)
  ns.tprint(`Gain hacking exp: ${ns.nFormat(hackExp, "0.00a")} - Level: ${oldLevel} => ${newLevel}`)
  ns.tprint(`Profit          : ${ns.nFormat(profit, "$0.00a")} per hour with ${ns.nFormat(growThreads, "0.000")} grow threads/hack`)
  ns.tprint(`Profit (warmup) : ${ns.nFormat(profit * (3600000 - (ht*5)) / 3600000, "$0.00a")}`)
}