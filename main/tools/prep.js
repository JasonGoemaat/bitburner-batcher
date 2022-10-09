import { getOptions, showUsage, getCustomFormulas } from '/lib'

const defaultOptions = [
  ['--host'       , '', '--host <hostname> - use specified host'],
  ['--help'       , null, '--help - display this help'],
  ['+targets', 'omega-net', 'target server(s) separated by commas']
]

/** @param {NS} ns */
export async function main(ns) {
  const { options, args } = getOptions(ns, defaultOptions)
  if (options.help) { showUsage(ns, defaultOptions); return }
  const targets = options.targets
  if (!targets) {
    showUsage(ns, defaultOptions);
    ns.tprint('ERROR: You must specify the target(s)')
    return
  }
  ns.tprint('targets: ' + targets)
  let host = options.host && options.host.length > 0 ? options.host : ns.getHostname()
  let targetList = targets.split(',')
  const hacking = getCustomFormulas()

  const weakenScript = '/remote/prep-weaken.js'
  const growScript = '/remote/prep-grow.js'
  if (host !== ns.getHostname()) {
    await ns.scp(weakenScript, host)
    await ns.scp(growScript, host)
  }

  for (let i = 0; i < targetList.length; i++) {
    const target = targetList[i]
    ns.tprint(`INFO: prep target: ${target}`)
    ns.print(`INFO: prep target: ${target}`)


    let server = ns.getServer(target)
    while (server.hackDifficulty > server.minDifficulty || server.moneyAvailable < server.moneyMax) {
      let hostServer = ns.getServer(host)
      let availableRam = hostServer.maxRam - hostServer.ramUsed
      let availableThreads = Math.trunc(availableRam / Math.max(ns.getScriptRam(weakenScript), ns.getScriptRam(growScript)))
  
      if (availableThreads === 0) {
        ns.print(`WARNING: No threads available on ${host}, sleeping 10 seconds`)
        await ns.sleep(10000)
        server = ns.getServer(target)
        continue
      }
      let player = ns.getPlayer()
      let weakenTime = hacking.weakenTime(server, player)
      let growTime = hacking.weakenTime(server, player)
      let growPercent = hacking.growPercent(server, 1, player, 1) - 1
      let requiredGrowThreads = Math.ceil(((server.moneyMax - server.moneyAvailable) / (server.moneyAvailable || player.skills.hacking + 1)) / growPercent)
      let requiredWeakenThreads = Math.ceil((server.hackDifficulty - server.minDifficulty) / 0.050)
      ns.print(`\x1b[38;5;13m${server.hostname}: \x1b[38;5;219mGrows needed: ${requiredGrowThreads}, Weakens needed: ${requiredWeakenThreads}, Available: ${availableThreads}`)
      const now = new Date(new Date().valueOf()).toLocaleTimeString()
      const finish = new Date(new Date().valueOf() + weakenTime + 500).toLocaleTimeString()
      if (requiredWeakenThreads > availableThreads) {
        ns.exec(weakenScript, host, availableThreads, target, now, finish)
        ns.print(`weakening only for ${ns.nFormat(weakenTime / 1000, '0.0')} seconds`)
        ns.print(`cycle will complete at ${finish}`)
        await ns.sleep(500 + weakenTime)
      } else {
        let extraThreads = availableThreads - requiredWeakenThreads
        let possibleGrowThreads = Math.floor(extraThreads / 13.5 * 12.5) // 12.5 per weaken and need 1 weaken to handle
        let growThreads = Math.min(possibleGrowThreads, requiredGrowThreads)
        let weakenThreads = requiredWeakenThreads + Math.ceil(growThreads / 12.5)
        ns.print(`using ${growThreads} grows and ${weakenThreads} weakens`)
        if (growThreads > 0) {
          ns.exec(growScript, host, growThreads, target, now, finish)
          ns.print(`growing x ${growThreads} in ${ns.nFormat(growTime / 1000, '0.0')} seconds`)
        }
        ns.exec(weakenScript, host, weakenThreads, target, now, finish)
        ns.print(`weakening x ${weakenThreads} in ${ns.nFormat(weakenTime / 1000, '0.0')} seconds`)
        ns.print(`cycle will complete at ${finish}`)
        
        if (weakenThreads < requiredWeakenThreads || growThreads < requiredGrowThreads) {
          await ns.sleep(500 + weakenTime)
        } else {
          ns.print(`INFO: Done with ${target}`)
          break // next server
        }
      }
      server = ns.getServer(target)
    }
  }
}
