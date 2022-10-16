// This is a 'stupid' way to do it, but this script will spawn H, G, and W
// threads to fill up a server.  Hacks will decrease their thread usage to
// stay below their starting level.  Each grow can account for a hack, but
// there will be 8 times as many.  Each weaken can handle the max of a grow
// or hack, and there will be 3 for each hack and 3 for each grow.

// unlike most scripts this is set to run on the same server, this is so that
// it can write to /var/hack-threads.txt so the hack scripts can read it and
// adjust how many threads they use for their hacks

import { getCustomFormulas } from "/lib"

const hacking = getCustomFormulas()

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')
  let [target] = ns.args
  target = target || 'n00dles'
  /** @type {Server} */
  let hostS = ns.getServer(ns.getHostname())
  let server = ns.getServer(target)
  let player = ns.getPlayer()
  let prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyAvailable}
  let hackPercent = hacking.hackPercent(prepped, player)
  let ht = Math.ceil(0.4 / hackPercent)
  let hp = hackPercent * ht
  if (ht < 2) {
    ns.tprint(`Unable to comply, hackPercent is too high: ${hackPercent}`)
    return
  }
  let hTime = hacking.hackTime(prepped, player)
  let rm = prepped.moneyMax * (1-ht*hp*2)
  let growPercent = hacking.growPercent(prepped, 1, player, hostS.cpuCores)
  let gt = Math.ceil(solveGrow(growPercent, rm, prepped.moneyMax) / 2)
  let wt = Math.max(gt * 0.008, ht * 0.002)
  let growsPerHack = 6.4
  let weakensPerHack = 2 * 4 + 6.4 * 2 * 4/3.2 // 2 for each hack, 2 for each grow, *4 and *4/3.2 for times
  let batchRam = ht * 1.7 + gt * growsPerHack * 1.75 + wt * weakensPerHack * 1.75
  let usableRam = hostS.maxRam - hostS.ramUsed
  let hackCount = Math.floor(usableRam / batchRam)
  let batchDuration = Math.ceil(Math.max(hTime / hackCount, 500))
  hackCount = Math.floor(hTime / batchDuration)
  let growCount = Math.ceil(hackCount * growsPerHack)
  let weakCount = Math.ceil(hackCount * weakensPerHack)
  let growStart = (hTime * 0.8) + 100
  let growDelay = (hTime * 3.2) / growCount
  let hackStart = (hTime * 3) + 200
  let hackDelay = hTime / hackCount
  let weakDelay = (hTime * 4) / weakCount
  ns.write('/var/hack-threads.txt', JSON.stringify(ht), 'w')
  

  let pids = []
  let scripts = createWorkerScripts(ns)

  
  let schedule = []
  for (let id = 0; id < weakCount; id++) schedule.push({ id, script: scripts.weak, threads: wt, offset: id * weakDelay })
  for (let id = 0; id < growCount; id++) schedule.push({ id, script: scripts.grow, threads: gt, offset: growStart + id * growDelay })
  for (let id = 0; id < hackCount; id++) schedule.push({ id, script: scripts.hack, threads: ht, offset: hackStart + id * hackDelay })
  schedule.sort((a, b) => a.offset - b.offset)

  // ns.tprint(JSON.stringify(schedule, null, 2))

  let finish = new Date(new Date().valueOf() + hTime * 4)
  ns.print(`Schedule set, starting...  Complete in ${ns.nFormat(hTime * 4 / 1000, '0,000.0')} sec at ${finish.toLocaleTimeString()}`)

  let start = new Date().valueOf()
  for (let i = 0; i < schedule.length; i++) {
    let ms = schedule[i].offset - (new Date().valueOf() - start)
    if (ms > 0) await ns.sleep(ms)
    pids.push(ns.exec(schedule[i].script, host, schedule[i].threads, target, schedule[i].id))
  }

  while (true) {
    player = ns.getPlayer()
    hackPercent = hacking.hackPercent(prepped, player)
    let newHp =  hackPercent * ht
    if (newHp > (hp * 1.03)) {
      ht = h1 - 1
      ns.write('/var/hack-threads.txt', JSON.stringify(ht), 'w')
    }
    await ns.sleep(5000)
  }
}

/** @param {NS} ns */
function createWorkerScripts(ns) {
  const scripts = {
    hack: '/var/hack-stupid.js',
    grow: '/var/grow-stupid.js',
    weak: '/var/weak-stupid.js',
  }

  ns.write(scripts.hack, `/** @param {NS} ns */
  export async function main(ns) {
    let [target, id] = ns.args
    while (true) {
      let threads = JSON.parse(ns.read('/var/hack-threads.txt'))
      await ns.hack(target, { threads })
    }  
  }
  `, 'w')

  ns.write(scripts.grow, `export async function main(ns) { let [target, id] = ns.args; while (true) await ns.grow(target) }`, 'w')

  ns.write(scripts.weak, `export async function main(ns) { let [target, id] = ns.args; while (true) await ns.weaken(target) }`, 'w')

  return scripts
}

// Solve for number of growth threads required to get from money_lo to money_hi
// base is ns.formulas.hacking.growPercent(serverObject, 1, playerObject, cores)
function solveGrow(base, money_lo, money_hi) {
  if (money_lo >= money_hi) { return 0; }

  let threads = 1000;
  let prev = threads;
  for (let i = 0; i < 30; ++i) {
      let factor = money_hi / Math.min(money_lo + threads, money_hi - 1);
      threads = Math.log(factor) / Math.log(base);
      if (Math.ceil(threads) == Math.ceil(prev)) { break; }
      prev = threads;
  }

  return Math.ceil(Math.max(threads, prev, 0));
}