import { getOptions, showUsage, getCustomFormulas } from '/lib'

const hacking = getCustomFormulas()

const defaultOptions = [
  ['--host'       ,''   , '--host <hostname> - use specified host'],
  ['--help'       , null, '--help - display this help'],
  ['--ignore'     ,''   , '--ignore server1,server2,server3'],
  ['+targets'     ,''   , 'target server(s) separated by commas'],
  ['--cont'       , null, '--cont - continue prepping'],
  ['--reserve'    , 0   , '--reserve <gb> - reserve mem on host'],
]

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')

  const { options, args } = getOptions(ns, defaultOptions)
  if (options.help) { showUsage(ns, defaultOptions); return }
  
  let ignored = {}
  let ignore = options.ignore
  ns.tprint('Ignore: ' + ignore)
  if (options.ignore) ignore.split(',').forEach(s => ignored[s] = true)

  /** @type {string[]} */
  let targetList = []
  let continuePrepping = options.cont
  if (options.targets && options.targets.length > 0) {
    ns.tprint('using targets option: ' + options.targets)
    targetList = options.targets.split(',')
    continuePrepping = true
  } else {
    ns.tprint('finding servers...')
    const servers = {}
    const scanServer = (hostname) => {
      const server = ns.getServer(hostname)
      servers[hostname] = server
      server.connections = ns.scan(hostname)
      server.connections.forEach(name => {
        if (!servers[name]) scanServer(name)
      })
    }
    scanServer('home')

    targetList = Object.entries(servers).map(x => x[1])
    ns.tprint(`${targetList.length} initial targets`)
    targetList = targetList.filter(x => x.hasAdminRights)
    ns.tprint(`${targetList.length} have admin rights`)
    targetList = targetList.filter(x => x.moneyMax > 100)
    ns.tprint(`${targetList.length} have money`)
    targetList = targetList.filter(x => !x.purchasedByPlayer)
    ns.tprint(`${targetList.length} aren't purchased by player`)
    
    targetList = targetList.filter(x => !ignored[x.hostname])
    ns.tprint(`${targetList.length} aren't ignored`)
    
    targetList = targetList.filter(x => x.hackDifficulty > x.minDifficulty || x.moneyAvailable < x.moneyMax)
    ns.tprint(`${targetList.length} need help`)
    
    targetList = targetList.map(x => x.hostname)
    targetList.sort((a, b) => a.hackDifficulty - b.hackDifficulty)
  }

  ns.tprint('targets: ' + targetList.join(', '))

  let host = options.host && options.host.length > 0 ? options.host : ns.getHostname()
  const hacking = getCustomFormulas()

  let reserve = options.reserve
  if (reserve) { ns.tprint(`Reserving ${reserve} on ${host}`)}

  const weakenScript = '/remote/prep-weaken.js'
  const growScript = '/remote/prep-grow.js'
  if (host !== ns.getHostname()) {
    ns.tprint(`Copying scripts to ${host}`)
    await ns.scp(weakenScript, host)
    await ns.scp(growScript, host)
  }

  let isFinished = false
  let runningScripts = {}
  while(true) {
    let player = ns.getPlayer()

    Object.entries(runningScripts).forEach(x => {
      if (x[1]) {
        let hostname = x[0]
        if (x[1].weak2 && !ns.isRunning(x[1].weak2)) delete x[1].weak2
        if (x[1].weak && !ns.isRunning(x[1].weak)) delete x[1].weak
        if (x[1].grow && !ns.isRunning(x[1].grow)) delete x[1].grow
        if (!(x[1].weak2 || x[1].weak || x[1].grow) && !continuePrepping) delete runningScripts[hostname]
      }
    })

    let hostServer = ns.getServer(host)
    let availableRam = (hostServer.maxRam - reserve) - hostServer.ramUsed
    let availableThreads = Math.trunc(availableRam / 1.75)

    let addedWeak = {}
    let targets = targetList.map(name => ns.getServer(name))

    if (targets.length === 0 && Object.keys(runningScripts).length === 0) {
      ns.tprint('WARNING: We have finished prepping!')
      break;
    }
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      if (target.hackDifficulty === target.minDifficulty && target.moneyAvailable === target.moneyMax) {
        if (!continuePrepping) {
          ns.tprint(`INFO: FINISHED prepping \x1b[38;5;207m${target.hostname}`)
          targets = targets.slice(0, i).concat(targets.slice(i + 1))
          targetList = targetList.slice(0, i).concat(targetList.slice(i + 1))
          i--
        }
      }
    }
    
    // start by adding weakens to all servers we can
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      let { weak, grow, weak2 } = runningScripts[target.hostname] || {}
      if (!(weak || grow || weak2)) {
        let weakenTime = hacking.weakenTime(target, player)
        let wt = Math.min(Math.ceil((target.hackDifficulty - target.minDifficulty) / 0.050), availableThreads)
        const now = new Date(new Date().valueOf()).toLocaleTimeString()
        const finish = new Date(new Date().valueOf() + weakenTime + 500).toLocaleTimeString()
        if (wt) {
          let pid = ns.exec(weakenScript, host, wt, target.hostname, now, finish, wt, 'weak')
          ns.print(`${finish} - weak ${target.hostname}: ${wt} in ${ns.nFormat(weakenTime / 1000, '0,000')} seconds`)
          availableThreads -= wt
          addedWeak[target.hostname] = wt
          runningScripts[target.hostname] = Object.assign({}, runningScripts[target.hostname], { weak: pid })
        }
      }
    }
    
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i]
      let { weak, grow, weak2 } = runningScripts[target.hostname] || {}
      if (!(grow || weak2) && (!weak || addedWeak[target.hostname])) {
        let weakenTime = hacking.weakenTime(target, player)
        let growTime = hacking.growTime(target, player)
        let growPercent = hacking.growPercent(target, 1, player, hostServer.cpuCores)
        let gt = solveGrow(growPercent, target.moneyAvailable, target.moneyMax)
        gt = Math.min(gt, Math.ceil(availableThreads / 13.5) * 12)
        let wt = Math.ceil(gt * 0.004 / 0.050)
        if (gt) {
          const now = new Date(new Date().valueOf()).toLocaleTimeString()
          let finish = new Date(new Date().valueOf() + growTime).toLocaleTimeString()
          let pidG = ns.exec(growScript, host, gt, target.hostname, now, finish, gt, 'grow')
          ns.print(`${finish} - grow ${target.hostname}: ${gt} in ${ns.nFormat(growTime / 1000, '0,000')} seconds`)
          availableThreads -= gt
          runningScripts[target.hostname] = Object.assign({}, runningScripts[target.hostname], { grow: pidG })

          finish = new Date(new Date().valueOf() + weakenTime).toLocaleTimeString()
          let pidW = ns.exec(weakenScript, host, wt, target.hostname, now, finish, wt, 'weak2')
          ns.print(`${finish} - weak ${target.hostname}: ${wt} in ${ns.nFormat(weakenTime / 1000, '0,000')} seconds`)
          availableThreads -= wt
          runningScripts[target.hostname] = Object.assign({}, runningScripts[target.hostname], { weak2: pidW })
        }
      }
    }

    await ns.sleep(1000)
  }
}

function solveGrow(growPercent, money, moneyMax) {
  if (money >= moneyMax) { return 0; } // invalid
  const needFactor = 1 + (moneyMax - money) / money
  const needThreads = Math.log(needFactor)/Math.log(growPercent)
  return Math.ceil(needThreads)
}

/*
nectar-net         │ ADMIN │  16GB │  16GB │  $68.8m │ 100% │    7 │  7.0 │       │   20 │
│ hong-fang-tea      │ ADMIN │  16GB │  16GB │  $75.0m │ 100% │    5 │  5.0 │       │   30 │
│ harakiri-sushi  
*/

class Target {
  constructor(ns, hostname) {
    /** @type {Server} */
    this.server = ns.getServer(hostname)
    this.origina
  }

  calc(ns, player) {
    /** @type {Server} */
    let s = ns.getServer(this.server.hostname)
  }
}