// assuming 'huge' will be the host, usage:
// analyze a server:
//    run tools/batcher-ports.js huge rho-construction analyze
// analyze all servers:
//    run tools/batcher-ports.js huge all analyze
// run for a specific server:
//    run tools/batcher-ports.js huge rho-construction
// pick best server and run:
//    run tools/batcher-ports.js huge rho-construction
// run for a secondary server on another host ('huge-0') and using different ports (default 8 and 9)
//    run tools/batcher-ports.js huge rho-construction run 6 7

// tweakable settings
const extraWeakenFactor = 1.30
const extraGrowFactor = 1.1

import { getCustomFormulas, createTable } from './lib'

/** @type {HackingFormulas} */
const hacking = getCustomFormulas()
const locations = {
  grow: '/remote/grow-ports.js',
  hack: '/remote/hack-ports.js',
  weaken: '/remote/weaken-ports.js',
}

/** @param {NS} ns */
export async function main(ns) {
  if (ns.args.length < 2) {
    const lines = [
      `Usage: run ${ns.getScriptName()} <host> <target> [command] [growPort] [hackPort]`,
      `  <host>    - scripting host with lots of ram`,
      `  <target>  - target computer, or 'all' which will pick`,
      `  command - optional, defaults to 'run'`,
      `      run     - default if not specified, runs batcher`,
      `      analyze - analyze server(s) and report as a table`,
      `  growPort - port to use for grows, default 8`,
      `  hackPort - port to use for hacks, default 9`,
    ]
    ns.tprint('\n' + lines.join('\n'))
    return
  }

  ns.disableLog('ALL')

  let [host, target, command, growPort, hackPort] = ns.args
  ns.tprint(JSON.stringify({host, target, command, growPort, hackPort}))
  growPort = growPort || 8
  hackPort = hackPort || 9

  let hostServer = ns.getServer(host)
  let ram = (command === 'analyze') ? hostServer.maxRam : hostServer.maxRam - hostServer.ramUsed // use all ram when anlyzing only
  let cores = hostServer.cpuCores

  const calculations = (target === 'all' ? analyzeAllServers(ns, ram, cores) : [analyzeServer(ns, ram, target, cores)])
  calculations.sort((a, b) => (b.profitPerHour || 0) - (a.profitPerHour || 0)) // highest profit first
  
  // if analyzing, report as a table and return
  if (command === 'analyze') {
    report(ns, calculations)
    return
  }

  //--------------------------------------------------------------------------------
  // Actually do the scheduling
  //--------------------------------------------------------------------------------
  await createScriptsAndCopyToHost(ns, host === ns.getHostname() ? null : host)

  let use = calculations[0]
  
  target = use.hostname

  let threadCounts = {
    weaken: use.weakenThreads,
    grow: use.growThreads,
    hack: use.hackThreads
  }

  let commands = []
  
  // schedule weakens
  let weakenFinishes = []
  for (let t = use.startWeakens; t < use.weakenTime; t += use.delayWeakens) {
    commands.push({ t, script: 'weaken'});
    weakenFinishes.push(t + use.weakenTime)
  }

  // hacks will take place (delayWeakens/2) before the first and every other weaken
  for (let i = 0; i < use.hackTime / use.delayHacks; i++) {
    let t = Math.trunc(weakenFinishes[i * 2] - (use.delayWeakens / 2)) - use.hackTime
    commands.push({ t, script: 'hack' })
  }

  // hacks will take place (delayWeakens/2) before the second and every other weaken
  for (let i = 0; i < use.growTime / use.delayGrows; i++) {
    let t = Math.trunc(weakenFinishes[i * 2 + 1] - (use.delayWeakens / 2)) - use.growTime
    commands.push({ t, script: 'grow' })
  }

  commands.sort((a, b) => a.t - b.t) // sort by time to execute

  ns.tail()
  await ns.sleep(10)
  ns.moveTail(300, 200)
  ns.resizeTail(1600,500)
  report(ns, [use], true)

  let actualCounts = commands.reduce((p, c) => {
    p[c.script]++
    return p
  }, { weaken: 0, grow: 0, hack: 0 })
  
  const scriptRams = { weaken: 1.75, grow: 1.75, hack: 1.7}
  let countsRows = ['weaken', 'grow', 'hack'].map(x => ({
    script: x,
    commands: actualCounts[x],
    threads: threadCounts[x],
    totalThreads: actualCounts[x] * threadCounts[x],
    ram: actualCounts[x] * threadCounts[x] * scriptRams[x]
  }))
  let totals = countsRows.reduce((p, c) => {
    p.commands += c.commands
    p.threads += c.threads
    p.totalThreads += c.totalThreads
    p.ram += c.ram
    return p
  }, { script: 'total', commands: 0, threads: 0, totalThreads: 0, ram: 0 })

  let countsTable = createTable(countsRows.concat([totals]).map(x => {
    return { ...x, ram: ns.nFormat(x.ram, '0,000.0') + 'GB' }
  }), { align: { script: 'left' } })
  ns.print('Counts:\n' + countsTable.join('\n') + '\n')
  let readyTime = new Date(new Date().valueOf() + use.weakenTime).toLocaleTimeString()
  ns.print(`Scheduling ${commands.length} scripts over ${ns.nFormat(use.weakenTime / 1000, '0.0')} seconds (active ${readyTime})`)
  const start = new Date().valueOf()
  while (commands.length > 0) {
    const { t, script } = commands.shift()
    let ms = t - (new Date().valueOf() - start)
    if (ms > 0) await ns.sleep(ms)
    let pid = ns.exec(locations[script], host, threadCounts[script], target, new Date().valueOf(), hackPort, growPort)
    if (!pid) {
      ns.tprint(`ERROR!  Could not execute ${script}`)
      ns.tprint(`exec args:` + JSON.stringify([locations[script], host, threadCounts[script], target, new Date().valueOf(), hackPort, growPort], null))
      return
    }
  }

  const activeStart = new Date().valueOf()
  let LOG_DELAY = 60000
  let next = Math.ceil((activeStart - start) / 60000) * 60000
  let logs = []
  while (true) {
    let time = new Date().valueOf()
    let ms = next - time
    if (ms > 0) await ns.sleep(ms)
    time = new Date().valueOf()
    let income = ns.getScriptIncome(ns.getScriptName(), ns.getHostname(), ...ns.args) || 0
    // income is per minute I think
    let activeIncome = income * ((time - activeStart) / 60000)
    let activeHour = activeIncome * 60
    let expectedHour = activeIncome * (60 - (use.weakenTime / 60000))
    logs.unshift({
      start, activeStart,
      totalTime: time - start, activeTime: time - activeStart,
      activeIncome, activeHour, expectedHour
    })
    await ns.sleep(100)
    let table = createTable(logs.map(x => ({
      target: target,
      time: x.time ? ns.nFormat(x.time / 1000, '00:00:00') : 'ERR',
      income: x.income ? ns.nFormat(x.income, '$0.00a') : 'ERR',
      active: x.active ? ns.nFormat(x.active / 1000, '00:00:00') : 'ERR',
      '$/m': x.activeIncome ? ns.nFormat(x.activeIncome, '$0.00a') : 'ERR',
      '$/h': x.activeHour ? ns.nFormat(x.activeHour, '$0.00a') : 'ERR',
      'grader': x.expectedHour ? ns.nFormat(x.expectedHour, '$0.00a') : 'ERR',
    })))
    ns.clearLog()
    ns.print(table.join('\n'))
    next += LOG_DELAY
  }
}

/**
 * @param {NS} ns
 * @param {string} hostname
 */
async function createScriptsAndCopyToHost(ns, hostname) {
  let growScript = `/** @param {NS} ns */
  export async function main(ns) {
    let [target, id, hackPort, growPort] = ns.args
    const handleHack = ns.getPortHandle(hackPort)
    const handleGrow = ns.getPortHandle(growPort)
    ns.disableLog('sleep')
  
    while (true) {
      let result = await ns.grow(target)
      ns.clearLog()
      ns.print('Result: ' + ns.nFormat(result || 0, '$0.0a'))

      handleHack.clear() // pending weakens are no longer valid
      handleGrow.clear() // pending weakens are no longer valid
      while (handleGrow.empty()) await ns.sleep(10) // wait for a weaken on the grow port
      handleGrow.clear() // consume weaken on the grow port and execute
    }
  }`
  let hackScript = `/** @param {NS} ns */
  export async function main(ns) {
    let [target, id, hackPort, growPort] = ns.args
    const handleHack = ns.getPortHandle(hackPort)
    const handleGrow = ns.getPortHandle(growPort)
    ns.disableLog('sleep')
  
    while (true) {
      let result = await ns.hack(target)
      ns.clearLog()
      ns.print('Result: ' + ns.nFormat(result || 0, '$0.0a'))

      handleHack.clear() // pending weakens are no longer valid
      handleGrow.clear() // pending weakens are no longer valid
      while (handleHack.empty()) await ns.sleep(10) // wait for a weaken on the hack port
      handleHack.clear() // consume weaken on the hack port
    }
  }`
  let weakenScript = `/** @param {NS} ns */
  export async function main(ns) {
    let [target, id, hackPort, growPort] = ns.args
    const handleHack = ns.getPortHandle(hackPort)
    const handleGrow = ns.getPortHandle(growPort)
  
    while (true) {
      await ns.weaken(target)
      if (handleGrow.empty()) {
        // prefer giving our weaken to a grow
        handleGrow.write(id)
      } else if (handleHack.empty()) {
        // there is already a weaken waiting for the grow, add one for a hack as well
        handleHack.write(id)
      }
      ns.clearLog()
    }
  }`
  ns.write(locations.grow, growScript,'w')
  ns.write(locations.hack, hackScript,'w')
  ns.write(locations.weaken, weakenScript,'w')
  
  // if running on a remote host, remove and fresh-copy files
  if (hostname) {
    ns.rm(locations.grow, hostname)
    ns.rm(locations.hack, hostname)
    ns.rm(locations.weaken, hostname)
    await ns.scp(locations.grow, hostname)
    await ns.scp(locations.hack, hostname)
    await ns.scp(locations.weaken, hostname)
  }
}

function report(ns, list, useLog = false) {
  let sorted = [...list]
  // ns.tprint(`reporting on ${sorted.length} results:\n` + sorted.map(x => x.hostname).join('\n'))

  let results = sorted.filter(x => x.profitPerHour).map(x => ({
    hostname: x.hostname,
    profit: x.profitPerHour ? ns.nFormat(x.profitPerHour, '$0,000.0a') : 'ERR',
    'diff': x.minDifficulty ? ns.nFormat(x.minDifficulty, '0') : 'ERR',
    'wtime': x.weakenTime ? ns.nFormat(x.weakenTime/1000, '0') + 's' : 'ERR',
    'wdel': x.delayWeakens ? ns.nFormat(x.delayWeakens, '0') : 'ERR',
    'gdel': x.delayGrows ? ns.nFormat(x.delayGrows, '0') : 'ERR',
    'hdel': x.delayHacks ? ns.nFormat(x.delayHacks, '0') : 'ERR',
    'w': x.weakenThreads ? ns.nFormat(x.weakenThreads, '0') : 'ERR',
    'g': x.growThreads ? ns.nFormat(x.growThreads, '0') : 'ERR',
    'h': x.hackThreads ? ns.nFormat(x.hackThreads, '0') : 'ERR',
    'max $': x.moneyMax ? ns.nFormat(x.moneyMax, '$0.0a') : 'ERR',
    'hack$': x.successfulHackMoney ? ns.nFormat(x.successfulHackMoney, '$0.0a') : 'ERR',
    'hack%': x.hackPercent ? ns.nFormat(x.hackPercent, '0.00%') : 'ERR',
    'grow%': x.growPercent ? ns.nFormat(x.growPercent, '0.00%') : 'ERR',
    '#': x.hackScriptsPerHackTime ? ns.nFormat(x.hackScriptsPerHackTime, '0') : 'ERR',
    'ram': x.calculatedRam ? ns.nFormat(x.calculatedRam, '0,000.0') : 'ERR',
    //'usable': x.usableRam ? ns.nFormat(x.usableRam, '0,000.0') : 'ERROR'
  }))

  if (results.length <= 0) {
    ns.tprint('ERROR!  Cannot find any servers with valid results')
    return
  }

  let table = createTable(results, {
    align: { hostname: 'left', diff: 'center' }
  })

  if (useLog) {
    ns.print(`Using:\n` + table.join('\n') + '\n')
  } else {
    ns.tprint(`results:\n` + table.join('\n'))
  }
}

function analyzeServer(ns, ram, hostname, cores = 1) {
  let player = ns.getPlayer()
  try {
    let server = ns.getServer(hostname)
    let values = calculateForServer(ns, server, player, ram, cores)
    if (values) {
      return values
    } 
    return { hostname } // ERROR
  } catch (err) {
    ns.tprint(`ERROR!  ${err} with ${hostname}`)
    return { hostname } 
  }
}

function analyzeAllServers(ns, ram, cores) {
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
  list = list.filter(x => !x.purchasedByPlayer && x.hostname !== 'home' && x.moneyMax > 0 && x.requiredHackingSkill < player.skills.hacking && x.hasAdminRights)
  // list = list.slice(0, 2)
  ns.tprint(`INFO: Calculating for ${list.length} servers`)
  let results = list.map(x => analyzeServer(ns, ram, x.hostname, cores)).filter(x => x)
  ns.tprint(`INFO: Have ${results.length} results`)
  return results
}

/**
 * Calculate profits and best values to use for a given server,
 * player, and available ram.
 * 
 * @param {Server} server
 * @param {Player} player
 * @param {number} ram - gb available
 */
function calculateForServer(ns, server, player, ram, cores = 1) {
  let prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
  let last = null
  for (let i = 1; i < 1000; i++) {
    // ns.tprint(`calculating for ${i} weaken threads`)
    let calculated = calculateForWeakenThreads(ns, server, player, ram, i, cores)
    if (!calculated) break;
    last = calculated
    
    // target first option with delay betweek weakens of 80ms or more
    if (calculated && calculated.delayWeakens >= 80) return calculated
  }
  ns.tprint(`could not find valid with delayWeakens >= 80 for ${server.hostname}`)
  return last
}

/**
 * Calculate optimal 'batch' parameters for a server and player
 * given the number of weaken threads.  This will optimize hack
 * threads.
 * 
 * @param {Server} server
 * @param {Player} player
 * @param {number} ram - gb available
 * @param {number} weakenThreads
 */
function calculateForWeakenThreads(ns, server, player, ram, weakenThreads = 1, cores = 1) {
  // this assumes for a given number of weakens that the number of grow threads
  // is the limiting factor
  let HP = hacking.hackPercent(server, player)
  let GP = hacking.growPercent(server, 1, player, cores) - 1
  let growThreads = Math.trunc(weakenThreads * 12.5)
  let growPercent = GP * growThreads
  
  // if grow percent is .25, hack percent can be at most .20, i.e. 100*0.20 = 80
  // and 80*1.25 = 100.  So g$ = h$ equates to:
  //  hack percent is 0.20, remaining percent is 0.80, grow percent is hack percent / remaining percent or 0.25
  //  hack percent is 0.50, remaining percent is 0.50, grow percent is hack percent / remaining percent or 1.00
  //  hack percent is 0.10, remaining percent is 0.90, grow percent is hack percent / remaining percent or .11111
  //  so starting with grow percent, hp = gp * (1-hp))
  //     or gp = hp/(1-hp)
  //  Starting with gp, rp is 1/(1+gp), and hp is 1-rp, so hp is 1-(1/(1+gp))
  let possibleHackPercent = 1-(1/(1+growPercent))
  let hackThreads = Math.trunc(possibleHackPercent / HP)
  let hackPercent = hackThreads * hacking.hackPercent(server, player)
  if (weakenThreads * 25 < hackThreads) { // too many hack threads?!?  upside-down server growth
    // use gp = hp/(1-hp)
    hackThreads = weakenThreads * 25
    hackPercent = hackThreads  * hacking.hackPercent(server, player)
    growThreads = Math.ceil(hackPercent / GP)
    growPercent = GP * growThreads
  }

  if (weakenThreads * 25 < hackThreads || Math.trunc(weakenThreads * 12.5) > growThreads) {
    // ERROR!   I don't think this should happen, but whatever
    // ns.tprint(`Could not find a thread count for ${server.hostname}!`)
    return null
  }

  let weakenTime = hacking.weakenTime(server, player)
  let growTime = hacking.growTime(server, player)
  let hackTime = hacking.hackTime(server, player)
  let hackChance = hacking.hackChance(server, player)
  let hackExp = hacking.hackExp(server, player)

  let ramUseForOneBatchPerHackTime = 
      hackThreads * 1.7 +
      growThreads * 4 * 1.75 * extraGrowFactor + // running 4x as many grows
      weakenThreads * 5 * 1.75 * extraWeakenFactor + // running 5x as many as hacks plus fudge factor
      weakenThreads * 4 * extraGrowFactor * 5/4 * 1.75 * extraWeakenFactor // running for eactra 4*extraGrowFactor grows and taking 5/4 the time

  let hackScriptsPerHackTime = Math.trunc(ram / ramUseForOneBatchPerHackTime)
  let growScriptsPerGrowTime = hackScriptsPerHackTime * 4 * extraGrowFactor
  let weakenScriptsPerWeakenTime = (hackScriptsPerHackTime * 5 + growScriptsPerGrowTime * 5/4) * extraWeakenFactor

  let successfulHackMoney = hackPercent * server.moneyMax
  let expectedHackMoney = successfulHackMoney * hackChance
  let profitPerHour = expectedHackMoney * hackScriptsPerHackTime * 3600000 / hackTime
  let expectedExpForHacksPerHackScript = hackExp * (hackChance + ((1-hackChance)/4)) * hackThreads
  let expectedExpForGrowsPerGrowScript = hackExp * growThreads
  let expectedExpForWeakensPerWeakenScript = hackExp * weakenThreads
  let expPerHour = (expectedExpForHacksPerHackScript * hackScriptsPerHackTime * 3600000 / hackTime) +
      (expectedExpForGrowsPerGrowScript * growScriptsPerGrowTime * 3600000 / growTime) +
      (expectedExpForWeakensPerWeakenScript * weakenScriptsPerWeakenTime * 3600000 / weakenTime);

  // now detailed instructions for ramping up
  let startHacks = weakenTime * 4/5
  let delayHacks = hackTime / hackScriptsPerHackTime
  let startGrows = weakenTime * 1/5
  let delayGrows = growTime / growScriptsPerGrowTime
  let startWeakens = 0
  let delayWeakens = weakenTime / weakenScriptsPerWeakenTime

  let calculatedRam = Math.trunc(hackTime / delayHacks) * 1.7 * hackThreads +
    Math.trunc(growTime / delayGrows) * 1.75 * growThreads +
    Math.trunc(weakenTime / delayWeakens) * 1.75 * weakenThreads 
  
  return {
    profitPerHour, weakenTime, growTime, hackTime,
    weakenThreads, hackThreads, growThreads,
    startHacks, delayHacks, startGrows, delayGrows, startWeakens, delayWeakens,
    successfulHackMoney, expectedHackMoney, extraWeakenFactor, extraGrowFactor,
    hackChance, hackExp, expPerHour,
    hostname: server.hostname,
    moneyMax: server.moneyMax,
    minDifficulty: server.minDifficulty,
    requiredHackingSkill: server.requiredHackingSkill,
    hackPercent, growPercent, hackScriptsPerHackTime,
    calculatedRam, usableRam: ram
  }
}
