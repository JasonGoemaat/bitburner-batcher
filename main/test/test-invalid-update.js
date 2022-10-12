import { createTable, getCustomFormulas } from "/lib"

const hacking = getCustomFormulas()

/** @param {NS} ns */
export async function main(ns) {
  let args = [{"contracts":[],"cpuCores":1,"ftpPortOpen":true,"hasAdminRights":true,"hostname":"johnson-ortho","httpPortOpen":false,"ip":"26.4.0.7","isConnectedTo":false,"maxRam":0,"messages":[],"organizationName":"Johnson Orthopedics","programs":[],"ramUsed":0,"runningScripts":[],"scripts":[],"serversOnNetwork":[],"smtpPortOpen":false,"sqlPortOpen":false,"sshPortOpen":true,"textFiles":[],"purchasedByPlayer":false,"backdoorInstalled":false,"baseDifficulty":38,"hackDifficulty":13,"minDifficulty":13,"moneyAvailable":1867054000,"moneyMax":1867054000,"numOpenPortsRequired":2,"openPortCount":2,"requiredHackingSkill":300,"serverGrowth":35},{"hp":{"current":24,"max":24},"skills":{"hacking":417,"strength":142,"defense":142,"dexterity":144,"agility":144,"charisma":66,"intelligence":0},"exp":{"hacking":236450733.15157992,"strength":44413.11200000646,"defense":44413.11200000646,"dexterity":46909.11200000646,"agility":46909.11200000646,"charisma":3559.024000005613,"intelligence":0},"mults":{"hacking_chance":1,"hacking_speed":1,"hacking_money":1,"hacking_grow":1,"hacking":1,"strength":1,"defense":1,"dexterity":1,"agility":1,"charisma":1,"hacking_exp":1,"strength_exp":1,"defense_exp":1,"dexterity_exp":1,"agility_exp":1,"charisma_exp":1,"company_rep":1,"faction_rep":1,"crime_money":1,"crime_success":1,"hacknet_node_money":1,"hacknet_node_purchase_cost":1,"hacknet_node_ram_cost":1,"hacknet_node_core_cost":1,"hacknet_node_level_cost":1,"work_money":1,"bladeburner_max_stamina":1,"bladeburner_stamina_gain":1,"bladeburner_analysis":1,"bladeburner_success_chance":1},"numPeopleKilled":0,"money":5291107649900.712,"city":"Sector-12","location":"Alpha Enterprises","bitNodeN":1,"totalPlaytime":293905600,"playtimeSinceLastAug":293905600,"playtimeSinceLastBitnode":293905600,"jobs":{"Joe's Guns":"Employee"},"factions":["Aevum","Sector-12","Slum Snakes","Netburners","CyberSec"],"tor":true,"inBladeburner":false,"hasCorporation":false,"entropy":0},1048576,1,28,200,ns]
  let c = calculateHGW(...args)
  if (!c) {
    ns.tprint(`cannot calculate! ${JSON.stringify(c)}`)
  } else {
    ns.tprint('calculate worked!')
    ns.tprint('INFO:' + JSON.stringify(c, null, 2))
  }
}

/**
 * @typedef Worker
 * @type {object}
 * @property {number} id - ID - Time when exec() was called - set by worker script from argument
 * @property {string} command - one of 'weak', 'grow', 'hack' - set by worker script
 * @property {number} start - Actual time when last command was started - set by worker script
 * @property {number} time - Estimaged duration - set by worker script
 * @property {number} eEnd - Estimated end time of finish - set by worker script
 * @property {number} end - Actual time when command ends - set by worker script
 * @property {number} result - Actual result of call - set by worker script
 * @property {number} execStart - Expected start time at the point exec() is called
 * @property {number} execEnd - Expected end time at the point exec() is called
 * @property {number} execTime - Expected duration at the point exec() is called
 */

/**
 * @typedef Counts
 * @type {object}
 * @property {number} weak - how many weak are currently executing
 * @property {number} grow - how many grow are currently executing
 * @property {number} hack - how many hack are currently executing
 */


function analyzeServer(ns, ram, hostname, cores = 1) {
  let player = ns.getPlayer()
  try {
    let server = ns.getServer(hostname)
    let values = calculateHGW(server, player, ram, cores, 0, 200, ns)
    //ns.tprint("analyzeServer() values: " + JSON.stringify(values))
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

function report(ns, list, useLog = false) {
  let sorted = [...list]
  sorted.sort((a, b) => (b.profit || 0) - (a.profit || 0))

  let results = sorted.filter(x => x.profit).map(x => {
    try {

      return {
        hostname: x.hostname,
        profit: x.profit ? ns.nFormat(x.profit, '$0,000.00a') : 'ERR',
        'wTime': x.wTime ? ns.nFormat(x.wTime/1000, '0') + 's' : 'ERR',
        'ram': x.ramUsed ? ns.nFormat(x.ramUsed, '0,000') : 'ERR',
        'max$': x.maxm ? ns.nFormat(x.maxm, '$0.0a') : 'ERR',
        'hack$': x.hm ? ns.nFormat(x.hm, '$0.0a') : 'ERR',
        'grow$': x.gm ? ns.nFormat(x.gm, '$0.0a') : 'ERR',
        'delay': x.delay ? ns.nFormat(x.delay, '0') : 'ERR',
        'active': x.activeHacks ? ns.nFormat(x.activeHacks, '0') : 'ERR',
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
    return
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

function reportDetails(ns, list, useLog = false) {
  let sorted = [...list]
  sorted.sort((a, b) => (b.profit || 0) - (a.profit || 0))

  let results = sorted.filter(x => x.profit).map(x => {
    try {

      return {
        hostname: x.hostname,
        'max$': x.maxm ? ns.nFormat(x.maxm, '$0.0a') : 'ERR',
        profit: x.profit ? ns.nFormat(x.profit, '$0,000.00a') : 'ERR',
        'hTime': x.hTime ? ns.nFormat(x.hTime/1000, '0') + 's' : 'ERR',
        'gTime': x.gTime ? ns.nFormat(x.gTime/1000, '0') + 's' : 'ERR',
        'wTime': x.wTime ? ns.nFormat(x.wTime/1000, '0') + 's' : 'ERR',
        'delay': x.delay ? ns.nFormat(x.delay, '0') : 'ERR',
        'active': x.activeHacks ? ns.nFormat(x.activeHacks, '0') : 'ERR',
        'ht': x.ht ? ns.nFormat(x.ht, '0,000') : 'ERR',
        'gt': x.gt ? ns.nFormat(x.gt, '0,000') : 'ERR',
        'wt': x.wt ? ns.nFormat(x.wt, '0,000') : 'ERR',
        'ram': x.ramUsed ? ns.nFormat(x.ramUsed, '0,000') : 'ERR',
        'hack$': x.hm ? ns.nFormat(x.hm, '$0.0a') : 'ERR',
        'grow$': x.gm ? ns.nFormat(x.gm, '$0.0a') : 'ERR',
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
    return
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
 * Calculate optimal 'batch' parameters for a server and player given 
 * given an amount of ram and number of cores (default 1) with a delay
 * of at least 200ms, which I think will always be the one with the
 * lowest delay where we maximize the threads that will fit within a certain
 * weaken number.
 * 
 * @param {Server} server
 * @param {Player} player
 * @param {number} ram - gb available
 * @param {number} cores - cores (default 1)
 * @param {number} wt - weaken threads, if not passed will find based on delay > 200ms
 * @param {number} minDelay - look for configurations with at least this delay, default 200ms
 */
 function calculateHGW(server, player, ram, cores = 1, wt = 0, minDelay = 200, ns) {
  // percent hacking with one thread
  let prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
  let hacked = {...prepped}
  let wtMin = wt ? wt : 1
  let wtMax = wt ? wt : 100
  for (let wt = wtMin; wt <= wtMax; wt++) {
    let hackPercent = hacking.hackPercent(prepped, player)
    let growPercentFn = (ht) => {
      hacked.hackDifficulty = hacked.minDifficulty + ht * 0.002
      hacked.moneyAvailable = hacked.moneyMax - (ht * hackPercent)
      return hacking.growPercent(hacked, 1, player, cores)
    }

    let { hackThreads, growThreads } = solveForWeakens(wt, hackPercent, growPercentFn)
    // ns.tprint(JSON.stringify({wt, hackThreads, growThreads}))
    let ht = hackThreads
    let gt = growThreads

    if (wt && hackThreads && growThreads) {
      let hp = hackThreads * hackPercent
      let hm = hp * prepped.moneyMax
      hacked.moneyAvailable = hacked.moneyMax - hm
      hacked.hackDifficulty = hacked.minDifficulty + hackThreads * 0.002
      let gp = hacking.growPercent(hacked, growThreads, player, cores) - 1
      let gm = hacked.moneyAvailable * gp
      let rH = hackThreads * 1.7
      let rG = growThreads * 1.75
      let rW = wt * 1.75
      let ramUsed = rH + rG * 16/5 + rW * 4
      let activeHacks = Math.trunc(ram / ramUsed)
      let hTime = hacking.hackTime(prepped, player)
      let gTime = hacking.growTime(prepped, player)
      let wTime = hacking.weakenTime(prepped, player)
      let delay = hTime / activeHacks
      if (delay > minDelay) {
        let hc = hacking.hackChance(prepped, player)
        let profit = Math.trunc(3600000/delay) * hm * hc
        let hExp = hacking.hackExp(prepped, player)
        let tExp = hExp * hc + hExp * (1-hc) * ht + gt * hExp + wt * hExp
  
        return {
          ht, gt, wt, hp, gp, hm, gm, rH, rG, rW, ramUsed, activeHacks,
          hTime, gTime, wTime, delay,
          hc, profit, hExp, tExp,
          maxm: server.moneyMax,
          hostname: server.hostname,
        }
      }
    }
  }
  return null;
 }

/**
 * @param {number} growPercent - Grow multiplier for 1 thread (i.e. 1.0025)
 * @param {number} money - Current money
 * @param {number} moneyMax - Desired money after grows
 */
function solveGrow(growPercent, money, moneyMax) {
  if (money >= moneyMax) { return 0; } // invalid
  const needFactor = 1 + (moneyMax - money) / money
  const needThreads = Math.log(needFactor)/Math.log(growPercent)
  return Math.ceil(needThreads)
}

/**
 * @param {number} weakenThreads - The number of weaken threads to optimize for
 * @param {number} hackPercent - The percent hacked with one thread, adjust with fudge factor for hackChance if desired
 * @param {function} growPercentFn - function taking hack threads and returning grow percent (i.e. 1.0025) for 1 grow thread
 * @return {Object} Object with hackThreads and growThreads properties
 */
 function solveForWeakens(weakenThreads, hackPercent, growPercentFn) {
  let minH = 1, maxH = weakenThreads * 24
  let validH = 0, validG = 0
  //ns.tprint(`Solving for weakens ${weakenThreads}, ${hackPercent}, ${growPercentFn}`)

  while (minH <= maxH) {
    let midH = (minH + maxH) >> 1
    let growPercent = growPercentFn(midH)
    let G = solveGrow(growPercent, 1e9*(1-(midH * hackPercent)), 1e9)
    // ns.tprint(`${minH}-${midH}-${maxH}: ` + JSON.stringify({ G, growPercent }))
    if (G * 0.004 + midH * 0.002 > weakenThreads * 0.050) { maxH = midH - 1; continue }
    validH = midH
    validG = G
    minH = midH + 1
  }

  return { hackThreads: validH, growThreads: validG }
}

const getScriptName = (command) => {
  return `/remote/${command}-hgw.js`
}

const getScript = (command) => {
  if (command === 'hack') {
    return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        port = port || 5
        const handle = ns.getPortHandle(port)
        const handle2 = ns.getPortHandle(port + 1)
        const obj = eval("window.obj = window.obj || {}")
        obj.errors = obj.errors || []
      
        let start = new Date().valueOf()
        // let time = ns.getHackTime(target)
        let eEnd = start + time
      
        let msg = JSON.stringify({ id, message: 'start', command: 'hack', start, time, eEnd })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      
        let result = await ns.hack(target)
      
        let end = new Date().valueOf()
        msg = JSON.stringify({ id, message: 'end', command: 'hack', end, result })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      }
      `
  }
  if (command === 'grow') {
    return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        port = port || 5
        const handle = ns.getPortHandle(port)
        const handle2 = ns.getPortHandle(port + 1)
        const obj = eval("window.obj = window.obj || {}")
        obj.errors = obj.errors || []
      
        let start = new Date().valueOf()
        let eEnd = start + time
      
        let msg = JSON.stringify({ id, message: 'start', command: 'grow', start, time, eEnd })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      
        let result = await ns.grow(target)
      
        let end = new Date().valueOf()
        msg = JSON.stringify({ id, message: 'end', command: 'grow', end, result })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      }
      `
  }
  if (command === 'weak') {
    return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        port = port || 5
        const handle = ns.getPortHandle(port)
        const handle2 = ns.getPortHandle(port + 1)
        const handle3 = ns.getPortHandle(port + 2)
        const obj = eval("window.obj = window.obj || {}")
        obj.errors = obj.errors || []
      
        // weakens are different, they run continuously so we loop
        let count = 0
        let start = new Date().valueOf()
        let eEnd = start + time
        let end = null
        let result = null
        let msg = JSON.stringify({ id, message: 'start', command: 'weak', start, time, eEnd })
        if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
      
        while (true) {
          result = await ns.weaken(target)
      
          if (!handle3.empty()) time = handle3.peek()
          end = new Date().valueOf()
          start = end
          time = ns.getWeakenTime(target)
          eEnd = start + time
          count++
          msg = JSON.stringify({ id, message: 'continue', command: 'weak', start, time, eEnd, end, result, count })
          if (!(handle.tryWrite(msg) || handle2.tryWrite(msg))) { obj.errors[obj.errors.length] = msg }
        }
      }`
  }

  throw new Error(`getScript('${command}') - unknown command!`)
}
