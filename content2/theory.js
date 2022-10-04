/** @param {NS} ns */
export async function main(ns) {
  let [target, levels, batchDuration] = ns.args
  target = target || 'rho-construction'
  levels = levels || 0
  batchDuration = batchDuration || 0 // time between hacks
  let ram = ns.getServerMaxRam('home') - ns.getScriptRam('batcher-clean.js')
  
  const server = ns.getServer(target)
  const player = ns.getPlayer()
  if (levels) player.skills.hacking += levels
  const prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
  const hackTime = ns.formulas.hacking.hackTime(server, player)
  const hackChance = ns.formulas.hacking.hackChance(server, player)
  const hackPercent = ns.formulas.hacking.hackPercent(server, player)
  const hackMoney = hackPercent * prepped.moneyMax
  const growTime = ns.formulas.hacking.growTime(server, player)
  const growPercent = ns.formulas.hacking.growPercent(server, 1, player, 1)
  const growPercent3Core = ns.formulas.hacking.growPercent(server, 1, player, 3)
  const weakenTime = ns.formulas.hacking.weakenTime(server, player)

  // const obj = {prepped, hackTime, hackChance, hackPercent, hackMoney, growTime, growPercent, growPercent3Core, weakenTime}
  // ns.tprint('Info:\n' + JSON.stringify(obj, null, 2))

  // we can run this many threads on other servers without using home ram,
  // what I calculated taking into account there will be some unused ram on
  // each server
  const extraWeakenThreads = 1740
  const hackScriptRam = ns.getScriptRam('/remote/hack2.js')
  const growScriptRam = ns.getScriptRam('/remote/grow2.js')
  const weakScriptRam = ns.getScriptRam('/remote/weak2.js')

  // Calculate optimal usage after warm-up.  This means we have the same
  // number of scripts running at one time.

  const hacks = 12

  // For each hack thread, there will be 8 grow threads running at the same
  // time.  Each hack requires 2 grow, and grow take 4x the time
  var hackGrowRatio = 8

  // when 12 hacks finish, we finish and restart 24 grows that will be used
  // with different hacks in the future, and there are 72 grows for pending
  // future hacks that have already been started
  const grows = hacks * hackGrowRatio // 96

  // For each 12 hack thread, there will be 5 weaken threads running at the same
  // time.  Each hack requires 1 weaken (1/2 actually) and weakens take 5x time
  const hackWeakRatio = 12*1/5
  const weakHacks = hacks / hackWeakRatio // 5

  // for each 12 grow thread there will be 5/4 weaken threads out there since
  // 1 weak handles 12 grow and weaks take 5/4 the time.  As each 12 grow
  // finish, one weaken will finish and restart, and there will be another
  // 5.4 out there for future grows
  var growWeakRatio = 12*5/4
  const weakGrows = Math.ceil(grows / growWeakRatio)

  const weaks = weakHacks + weakGrows
  const batchRam = hacks * hackScriptRam + grows * growScriptRam + weaks * weakScriptRam
  
  // how many active batches can be running at the same time, taking into account
  // we can run weaken on other servers
  const activeBatches = (ram + extraWeakenThreads * weakScriptRam) / batchRam
  const realActiveBatches = Math.trunc(activeBatches) // can't have partial batch?

  // the active batches form a cycle that lasts hackTime seconds, during which
  // time we will finish realActiveBatches
  const cycleLength = hackTime + activeBatches + batchDuration
  const cycleIncome = realActiveBatches * hacks * hackMoney * hackChance
  const activeTime = (3600000 - weakenTime) // after warm-up
  const activeIncome = activeTime / cycleLength * cycleIncome
  
  const futureTime = 3600000
  const futureIncome = futureTime / cycleLength * cycleIncome
  ns.tprint(`Server ${target}, Player Level ${player.skills.hacking}`)
  ns.tprint(`Theoretical active income in 1 hour after warm-up: ${ns.nFormat(activeIncome, "$0.000a")}`)
  ns.tprint(`Theoretical active income after first hour       : ${ns.nFormat(futureIncome, "$0.000a")}`)
}
