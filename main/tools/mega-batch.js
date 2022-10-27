/*
MEGA Hack

At super high skill levels with lots of augs, hacking with batches becomes impossible.
At hacking level 325,000 for instance and most augs for example I can weaken megacorp
in 43 milliseconds, way under the time for a single batch using my batcher-hgw.  There
is no way to even schedule ahead, might as well start all three.  And 1 hack thread
steals 81.6% and needs 8 grow threads and 1 weaken thread only.

So this will create three 'zombies' and double the grow threads and weaken threads
needed and call all three commands at once.

- Thanks @Zoekeeper on discord for the idea

*/

import { createTable, getCustomFormulas } from "/lib"

let myGetServer = null

/** @type {HackingFormulas} */
const hacking = getCustomFormulas()

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')

  /* -------------------- Options -------------------- */
  myGetServer = name => ns.getServer(name)
  if (ns.args[0] === '--help' || ns.args[0] === '-h' || ns.args.length === 0) {
    const lines = [
      `Usage: run ${ns.getScriptName()} <target> [-- host host] [--port port] [--gb gb] [--reserve gb] [--level lvl] [--skip #]`,
      `  target  - optional, defaults to 'all'`,
      `  host    - host for H/G/W scripts, defaults to current server`,
      `  gb      - limit ram usage to gb`,
      `  reserve - reserve ram on host`,
      `  level   - act as if player were this level for analyze (ignored for run)`,
      `  skip    - if target is 'all', skip this many options`,
    ]
    ns.tprint('WARN:\n' + lines.join('\n'))
    if (ns.args.length > 0) return // continue if no args passed, exit if '--help' or '-h' was used
  }

  let args = [...ns.args]
  let options = {}
  const stripOption = (optionName, defaultValue) => {
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === '--' + optionName) { options[optionName] = args[i + 1]; args = args.slice(0, i).concat(args.slice(i + 2)); return options[optionName] }
    }
    options[optionName] = defaultValue
    return defaultValue
  }
  let host = stripOption('host', ns.getHostname())
  let target = stripOption('target', 'all')
  let gb = stripOption('gb', 0)
  let reserve = stripOption('reserve', 0)
  let level = stripOption('level', 0)
  let skip = stripOption('skip', 0)

  // get host information
  let hostServer = ns.getServer(host)
  let ram = hostServer.maxRam - reserve
  if (gb) ram = gb
  let cores = hostServer.cpuCores
  /* -------------------- Options -------------------- */

  // perform calculations and analyze server(s)
  let calculations = (target === 'all' || (!target)) ? analyzeAllServers(ns, ram, cores, level) : [analyzeServer(ns, ram, target, cores, level)]

  //ns.tprint('calculations: ' + JSON.stringify(calculations))
  calculations.sort((a, b) => (b.profit || 0) - (a.profit || 0)) // highest profit first
  if (options.skip) calculations = calculations.slice(options.skip)

  // // if analyzing, report as a table and return
  // ns.tprint(`INFO: host ${host}, ram ${ns.nFormat(ram, '0,000')} gb, cores ${cores}`);
  // report(ns, calculations)

  let pid = ns.getRunningScript().pid
  let mega = eval('window.mega = window.mega || {}')
  let me = mega[pid] || {}
  mega[pid] = me

  let use = (target === 'all') ? calculations[skip || 0] : calculations.find(x => x.hostname === target)
  if (!use) {
    ns.tprint(`ERROR: Cannot find results for target ${target} and skip ${skip}`)
    return
  }
  let { ht, gt, wt } = use
  gt = Math.ceil(gt) * 8
  wt = Math.ceil(wt) * 16
  target = use.hostname

  let hPid = createZombie(ns, pid, target, 'hack', ht)
  let gPid = createZombie(ns, pid, target, 'grow', gt)
  let wPid = createZombie(ns, pid, target, 'weaken', wt)
  
  // clean-up at exit and resolve child promises so they exit
  ns.atExit(() => {
    if (me.hack) me.hack.quit()
    if (me.grow) me.grow.quit()
    if (me.weaken) me.weaken.quit()
  })

  ns.print('Waiting for scripts to start')
  while (!(me.hack && me.grow && me.weaken)) {
    await ns.sleep(100)
  }
  ns.print('Starting hack loop')

  let start = performance.now()
  let nextReport = start + 1000
  let totalHacked = 0
  let totalHacks = 0
  while (true) {
    let hackPromise = me.hack.hack(target)
    me.grow.grow(target)
    await me.weaken.weaken(target)
    let hacked = await hackPromise
    totalHacks++
    totalHacked += hacked
    let now = performance.now()
    if (now > nextReport) {
      nextReport = now + 1000
      let totalTime = now - start
      let hours = totalTime / (3600 * 1000)
      let profit = totalHacked / hours
      let cycleTime = (now - start) / totalHacks
      ns.clearLog()
      ns.print(`${target}: ${ns.nFormat(totalHacks, '0,000.000a')} hacks, cycle time ${ns.nFormat(cycleTime, '0,000.000')} ms, $${ns.nFormat(totalHacked, '0,000a')} hacked, $${ns.nFormat(profit, '0,000a')}/hour`)
    }
  }
}

/**
 * Create a zombie and return the pid
 * 
 * @param {NS} ns - host ns object
 * @param {number} hostPid - pid of host script, used for assigning global object
 * @param {string} command - one of 'hack', 'grow', 'weaken'
 * @param {number} threads - number of threads to run the script for
 */
function createZombie(ns, hostPid, target, command, threads) {
  let code = `/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')
  if (false) ns.${command}('n00dles') // for ram calculation
  let [hostPid, target, command, threads] = ns.args
  let mega = eval('window.mega = window.mega || {}')
  mega[hostPid][command] = ns
  await new Promise(resolve => ns.quit = resolve)
}`
  const scriptFile = `/var/tmp/mega-${command}.js`
  ns.write(scriptFile, code, 'w')
  let pid = ns.run(scriptFile, threads, hostPid, target, command, threads)
  return pid
}

function analyzeServer(ns, ram, hostname, cores = 1, level = 0) {
  let player = ns.getPlayer()
  try {
    let server = myGetServer(hostname)
    let values = calculate(server, player, ram, cores, 0, 200, ns, level)
    if (values) {
      return values
    } else {
      ns.tprint(`analyzeServer failed for ${hostname}`)
    }
    return { hostname } // ERROR
  } catch (err) {
    ns.tprint(`ERROR!  ${err} with ${hostname}`)
    ns.tprint(`INFO:   ${err.stack}`)
    console.log(err)
    return { hostname }
  }
}

function analyzeAllServers(ns, ram, cores, level = 0) {
  const player = ns.getPlayer()
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
  /** @type {Server[]} */
  let list = Object.values(servers)
  if (level) player.skills.hacking = level
  list = list.filter(x => !x.purchasedByPlayer && x.hostname !== 'home' && x.moneyMax > 0 && x.requiredHackingSkill < player.skills.hacking && x.hasAdminRights)
  ns.tprint(`INFO: Calculating for ${list.length} servers`)
  let results = list.map(x => analyzeServer(ns, ram, x.hostname, cores, level)).filter(x => x)
  ns.tprint(`INFO: Have ${results.length} results`)
  return results
}

function report(ns, list, useLog = false) {
  let sorted = [...list]
  sorted.sort((a, b) => (b.profit || 0) - (a.profit || 0))

  let results = sorted.filter(x => x.profit).map(x => {
    try {
      let colorStr = ''
      if (!x.isPrepped) colorStr = '\x1b[38;5;196m'
      //   return { hostname: server.hostname, profit, ht, gt, wt, hp, gp, tRam, hm, gbs }
      return {
        hostname: colorStr + x.hostname,
        profit: x.profit ? ns.nFormat(x.profit, '$0,000.00a') : 'ERR',
        'wTime': x.wTime ? ns.nFormat(x.wTime / 1000, '0.000') + 's' : 'ERR',
        'ram': x.ram ? ns.nFormat(x.ram, '0,000') : 'ERR',
        'h/g/w': `${x.ht}/${ns.nFormat(x.gt, '0.000')}/${ns.nFormat(x.wt, '0.000')}`,
        'hack$': x.hm ? ns.nFormat(x.hm, '$0.0a') : 'ERR',
        'hack%': x.hp ? ns.nFormat(x.hp, '0.0%') : 'ERR',
        'chance': x.hc ? ns.nFormat(x.hc, '0.0%') : 'ERR',
      }
    } catch (err) {
      ns.tprint("FORMAT ERROR: " + err)
      return null
    }
  })
  results = results.filter(x => x) // throw away errors

  if (results.length <= 0) {
    ns.tprint('ERROR!  Cannot find any servers with valid results')
    ns.exit()
  }

  let table = createTable(results, {
    align: { hostname: 'left' }
  })

  if (useLog) {
    ns.print(`Using:\n` + table.join('\n') + '\n')
  } else {
    ns.tprint(`results:\n` + table.join('\n'))
  }
}

/**
 * Calculate results for a server and specified player
 * 
 * @param {Server} server
 * @param {Player} player
 * @param {number} ram - gb available
 * @param {number} cores - cores (default 1)
 * @param {number} wt - weaken threads, if not passed will find based on delay > 200ms
 * @param {number} minDelay - look for configurations with at least this delay, default 200ms
 * @param {NS} ns
 */
function calculate(server, player, ram, cores = 1, wt = 0, minDelay = 150, ns, level = 0) {
  if (level) player = { ...player, skills: { ...player.skills, hacking: level } }
  let hlvl = player.skills.hacking

  // percent hacking with one thread
  let prepped = { ...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax }
  let hTime = hacking.hackTime(prepped, player)
  let gTime = hacking.growTime(prepped, player)
  let wTime = hacking.weakenTime(prepped, player)

  // theoretical best is 1 hack thread and fractional grow and weaken threads
  let ht = 1
  let hp = hacking.hackPercent(prepped, player)
  let hackedServer = {...prepped, moneyAvailable: Math.max(prepped.moneyMax * (1-hp), 0), hackDifficulty: prepped.minDifficulty + 0.002}
  let gp = hacking.growPercent(hackedServer, 1, player, cores)
  let gt = solveGrow(gp, hackedServer.moneyAvailable, prepped.moneyMax)
  let grownServer = {...prepped, hackDifficulty: hackedServer.hackDifficulty + gt * 0.004}
  wt = (grownServer.hackDifficulty - grownServer.minDifficulty) / 0.050
  let hc = hacking.hackChance(prepped, player)

  // ram use takes into account that there are 4x as many weakens and 3.2x as many grows as hacks running at the same time
  let hRam = ht * 1.7 // 1.7gb for a hack thread
  let gRam = gt * 1.75 * 3.2 // 1.75gb for a grow thread, 3.2 times as many as hacks
  let wRam = wt * 1.75 * 4 // 1.75gb for a grow thread, 4 times as many as hacks
  let tRam = hRam + gRam + wRam // total ram in use at one time for one batch over hackTime
  let hm = hackedServer.moneyMax - hackedServer.moneyAvailable // $ hacked
  let gbs = (hRam + gRam + wRam) * (hTime / 1000) // one 'batch' takes up this many gb for hTime in seconds
  let gbsAvailable = 3600 * ram // this many gigabyte-seconds available on this host in an hour
  let profit = (gbsAvailable / gbs) * hm * hc // total available gbs / batch gbs is how many batches per hour times hack money in one batch, hack chance
  return { hostname: server.hostname, profit, ht, gt, wt, hp, gp, tRam, hm, hc, gbs, hTime, gTime, wTime, ram }
}

/**
 * @param {number} growPercent - Grow multiplier for 1 thread (i.e. 1.0025)
 * @param {number} money - Current money
 * @param {number} moneyMax - Desired money after grows
 */
 function solveGrow(growPercent, money, moneyMax) {
  if (money >= moneyMax) { return 0; }

  let threads = 1000;
  let prev = threads;
  for (let i = 0; i < 30; ++i) {
    let factor = moneyMax / Math.min(money + threads, moneyMax - 1);
    threads = Math.log(factor) / Math.log(growPercent);
    if (Math.ceil(threads) == Math.ceil(prev)) { break; }
    prev = threads;
  }

  return Math.ceil(Math.max(threads, prev, 0));
}

/**
 * @param {NS} ns
 * @param {string | Server} hostname
 */
function calcPrep(ns, server, cores = 1) {
  if (typeof (server) === 'string') server = ns.getServer(server)
  let player = ns.getPlayer()
  let gp = hacking.growPercent(server, 1, player, cores)
  let gt = Math.ceil(solveGrow(gp, server.moneyAvailable, server.moneyMax))
  let wt = Math.ceil((server.hackDifficulty - server.minDifficulty) / 0.050)
  let totalWt = Math.ceil(wt + gt * 0.004 / 0.050)
  let totalT = totalWt + gt
  return { gt, wt, totalWt, totalT, gp }
}
