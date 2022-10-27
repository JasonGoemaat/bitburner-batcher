// args: <host> <target> [reserveGb]
// host is the computer the scripts will run on
// target is the computer the scripts will target
// reserveGb is optional and will reserve this much memory on the server

import { getCustomFormulas } from "/lib"

const hacking = getCustomFormulas()

/** @param {NS} ns */
export async function main(ns) {

  let [host, target, reserveGb] = ns.args
  reserveGb = Math.max(0, reserveGb || 0)
  host = host || 'grinder' // buy a 1pb server
  target = target || 'n00dles'
  let server = ns.getServer(target)
  let player = ns.getPlayer()
  let hp = hacking.hackPercent(server, player)
  let maxThreads = Math.ceil(1/hp)
  let pids = []
  
  // assuming we hack 100%, we only need to grow() with 1 thread to $1
  // for the hack to possibly succeed and get full xp
  let growThreads = 1
  let weakenThreads = Math.ceil((maxThreads * 0.002 + growThreads * 0.004) / 0.050)
  ns.print(JSON.stringify({ hp, maxThreads, growThreads, weakenThreads, maxDiff: maxThreads * 0.002 }))
  let hackTime = hacking.hackTime(server, player)
  let hacked = {...server, hackDifficulty: server.baseDifficulty + maxThreads * 0.002 + 1}
  let hackTime2 = hacking.hackTime(hacked, player)
  ns.print(JSON.stringify({ hackTime, hackTime2, diff: hackTime2 - hackTime }))
  globalThis['hello'] = 'world'
  const growScript = '/remote/grow-loop.js'
  const hackScript = '/remote/hack-loop.js'
  const weakScript = '/remote/weak-loop.js'
    if (host !== ns.getHostname()) {
    ns.rm(growScript, host)
    ns.rm(hackScript, host)
    ns.rm(weakScript, host)
    ns.scp([growScript, hackScript, weakScript], host)
  }

  // kill active scripts on host
  let killPids = ns.ps(host).filter(x => x.filename.indexOf('-loop') >= 0).map(x => x.pid)
  for (let i = 0; i < killPids.length; i++) {
    ns.kill(killPids[i], host)
    await ns.sleep(50)
  }
  if (killPids.length) ns.tprint(`INFO: grind - killed ${killPids.length} scripts on ${host}`)

  let schedule = []
  for (let id = 0; id < 8; id++) schedule.push({ id, script: growScript, threads: 1, offset: (id * hackTime * 3.2 / 8) })
  for (let id = 0; id < 16; id++) schedule.push({ id, script: weakScript, threads: 4, offset: (id * hackTime * 4 / 16) })
  schedule.sort((a, b) => a.offset - b.offset)

  // ns.tprint(JSON.stringify(schedule, null, 2))

  let finish = new Date(new Date().valueOf() + hackTime * 4)
  ns.print(`Schedule set, starting...  Complete in ${ns.nFormat(hackTime * 4 / 1000, '0,000.0')} sec at ${finish.toLocaleTimeString()}`)

  let start = new Date().valueOf()
  for (let i = 0; i < schedule.length; i++) {
    let ms = schedule[i].offset - (new Date().valueOf() - start)
    if (ms > 0) await ns.sleep(ms)
    pids.push(ns.exec(schedule[i].script, host, schedule[i].threads, target, schedule[i].id))
  }

  finish = new Date(new Date().valueOf() + hackTime)
  ns.print(`Starting hacks...  First complete in ${ns.nFormat(hackTime / 1000, '0,000.0')} sec at ${finish.toLocaleTimeString()}`)
  if (host === 'home') reserveGb = 65536
  let hackThreads = (ns.getServerMaxRam(host) - ns.getServerUsedRam(host) - reserveGb) / 1.7
  if (hackThreads > 0) pids.push(ns.exec(hackScript, host, hackThreads, target, 0))
  await ns.sleep(hackTime + 1000)
  
  // DEBUG: This doesn't work, it thinks tprint is a concurrent call to a netscript functino
  // when sleep is running
  // ns.atExit(() => {
  //   ns.tprint(`test-grind ${target} on ${host} - killing processes`)
  //   pids.forEach(pid => ns.kill(pid, host))
  //   ns.tprint(`test-grind ${target} on ${host} - DONE`)
  // })
  while (true) {
    let xpGain = ns.getScriptExpGain(hackScript, host, target, 0)
    ns.print(`${new Date().toLocaleTimeString()}: ${ns.nFormat(xpGain || 0, '0.000a')}`)
    await ns.sleep(60000) // report every minute
  }
}
