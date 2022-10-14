/** @param {NS} ns */
export async function main(ns) {
  const host = 'grinder' // buy a 1pb server
  const target = 'n00dles'
  let server = ns.getServer(target)
  let player = ns.getPlayer()
  let hp = ns.formulas.hacking.hackPercent(server, player)
  let maxThreads = Math.ceil(1/hp)
  
  // assuming we hack 100%, we only need to grow() with 1 thread to $1
  // for the hack to possibly succeed and get full xp
  let growThreads = 1
  let weakenThreads = Math.ceil((maxThreads * 0.002 + growThreads * 0.004) / 0.050)
  ns.tprint(JSON.stringify({ hp, maxThreads, growThreads, weakenThreads, maxDiff: maxThreads * 0.002 }))
  let hackTime = ns.formulas.hacking.hackTime(server, player)
  let hacked = {...server, hackDifficulty: server.baseDifficulty + maxThreads * 0.002 + 1}
  let hackTime2 = ns.formulas.hacking.hackTime(hacked, player)
  ns.tprint(JSON.stringify({ hackTime, hackTime2, diff: hackTime2 - hackTime }))

  const growScript = '/remote/grow-loop.js'
  const hackScript = '/remote/hack-loop.js'
  const weakScript = '/remote/weak-loop.js'
  ns.rm(growScript, host)
  ns.rm(hackScript, host)
  ns.rm(weakScript, host)
  ns.scp([growScript, hackScript, weakScript], host)

  let schedule = []
  for (let id = 0; id < 8; id++) schedule.push({ id, script: growScript, threads: 1, offset: (id * hackTime / 8) })
  for (let id = 0; id < 16; id++) schedule.push({ id, script: weakScript, threads: 4, offset: (id * hackTime / 16) })
  schedule.sort((a, b) => a.offset - b.offset)

  ns.tprint(JSON.stringify(schedule, null, 2))

  ns.tprint('Schedule set, starting...')
  let start = new Date().valueOf()
  for (let i = 0; i < schedule.length; i++) {
    let ms = schedule[i].offset - (new Date().valueOf() - start)
    if (ms > 0) await ns.sleep(ms)
    ns.exec(schedule[i].script, host, schedule[i].threads, target, schedule[i].id)
  }

  ns.tprint('Starting waiting for schedule to start completing')
  await ns.sleep(hackTime * 4)

  ns.tprint('Starting hacks...')
  let hackThreads = (ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / 1.7
  ns.exec(hackScript, host, hackThreads, target, 0)
}
