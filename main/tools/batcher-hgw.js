const GROWTH_FUDGE_FACTOR = 0.99 // Must recover this much of a hack

import { createTable, getCustomFormulas } from "/lib"

const hacking = getCustomFormulas()

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
      `  port - port to use for communication (default 5)`,
    ]
    ns.tprint('\n' + lines.join('\n'))
    return
  }
  
  let [host, target, command, port] = ns.args
  ns.tprint(JSON.stringify({host, target, command, port}))
  port = port || 5

  // get host information
  let hostServer = ns.getServer(host)
  let ram = (command === 'analyze') ? hostServer.maxRam : hostServer.maxRam - hostServer.ramUsed // use all ram when anlyzing only
  let cores = hostServer.cpuCores

  let server = ns.getServer(target)
  let player = ns.getPlayer()
  player.skills.hacking = 911
  let calc = calculateHGW(server, player, ram, cores = 1, ns)
  calc.sort((a, b) => b.referenceProfit - a.referenceProfit)
  calc = calc.slice(0, 10)
  let table = createTable(calc.map(x => ({
    ht: x.ht,
    gt: x.gt,
    wt: x.wt,
    hp: ns.nFormat(x.hp, '0.00%'),
    gp: ns.nFormat(x.gp, '0.00%'),
    hm: ns.nFormat(x.hm, '$0,000.0a'),
    gm: ns.nFormat(x.gm, '$0,000.0a'),
    batchRam: ns.nFormat(x.batchRam, '0,000.0') + 'GB',
    profit: ns.nFormat(x.profit, '$0,000.00a') + '/GB',
    perHour: ns.nFormat(x.profitPerHour, '$0,000.00a'),
    reference: ns.nFormat(x.referenceProfit, '$0,000.00a'),
    delay: ns.nFormat(x.batchDelay, '0,000'),
    htime: ns.nFormat(x.hackTime, '0,000'),
    batches: ns.nFormat(x.concurrentBatches, '0,000.0'),
    // hackTime, batchesPerHour, profitPerHour, batchDelay, referenceProfit
  })))
  
  ns.tprint('Results:\n' + table.join('\n'))
  return

  // perform calculations and analyze server(s)
  const calculations = (target === 'all' ? analyzeAllServers(ns, ram, cores) : [analyzeServer(ns, ram, target, cores)])
  calculations.sort((a, b) => (b.profitPerHour || 0) - (a.profitPerHour || 0)) // highest profit first
  
  // if analyzing, report as a table and return
  if (command === 'analyze') {
    report(ns, calculations)
    return
  }

  var obj = eval("window['obj'] = window['obj'] || {}")
  obj.errors = []
  obj.nonstop = []

  // disable logs
  ns.disableLog('ALL')

  /**
   * Object containing all active workers, key is exec time.
   * @type {Object<string,Worker}
   */
  let workers = {}

  /**
   * Array of workers, populated after start/continue message is received from
   * worker script and sorted by eEnd - expected end time set by script with
   * accurate start time and duration.
   *
   * @type {Worker[]}
   */
   let processing = []
   let totalProfit = 0

  /**
   * Function to compare workers using eEnd and then id, used to keep
   * processing[] sorted and perform binary searches to find slots for
   * scheduling when we know the end time.
   * 
   * @param {Worker} worker1
   * @param {Worker} worker2
   */
   const compareWorkers = (worker1, worker2) => {
    if (!worker2) return -1 // this is 'less' than no worker, for bsearch insert
    if (worker1.eEnd > worker2.eEnd) return 1
    if (worker1.eEnd < worker2.eEnd) return -1
    if (worker1.id > worker2.id) return 1
    if (worker1.id < worker2.id) return -1
    return 0
  }

  /**
   * Use binary search to quickly find worker or location to insert a new worker
   * using 'worker.eEnd' and given two at the same time, use  
   * 
   * @param {Worker} worker
   */
  const findProcessing = (worker) => {
    let min = 0, max = processing.length - 1
    while (min <= max) {
      let index = Math.trunc((min + max) / 2)
      let test = compareWorkers(worker, processing[index])
      if (test > 0) {
        min = index + 1
      } else {
        max = index - 1
      }
    }
    return min;
  }

  const growScriptThreadRam = 1.75
  const hackScriptThreadRam = 1.7
  const weakScriptThreadRam = 1.75

  /**
   * How many scripts are currently executing, used to calculate ram usage
   * when scheduling grows so we leave room for hacks.
   * 
   * @type {Counts}
   */
   const counts = {
    weak: 0,
    grow: 0,
    hack: 0
  }

  /**
   * How many total executions we've had since start
   * 
   * @type {Counts}
   */
   const executions = {
    weak: 0,
    grow: 0,
    hack: 0
  }

  // ensure hosts have the most recent scripts
  const copyFilesToServer = async (hostname) => {
    ns.print(`Copying files to host ${hostname}`)
    await ns.scp(['/remote/weak.js', '/remote/grow.js', '/remote/hack.js'], hostname)
  }
  if (host !== 'home') {
    await copyFilesToServer(host)
  }

  // make sure server has been prepped, in a real script we might do this automatically
  ns.print(`Ensuring server ${target} is ready`)
  const ensureServerIsReady = (target) => {
    let testServer = ns.getServer(target)
    if (testServer.hackDifficulty !== testServer.minDifficulty || testServer.moneyAvailable !== testServer.moneyMax) {
      ns.tprint(JSON.stringify(testServer, null, 2))
      ns.tprint(`ERROR!  ${target} needs prepping!`)
      ns.exit()
    }
  }
  ensureServerIsReady(target)

  // used to calculate ram available
  const hostMaxRam = ns.getServerMaxRam(host)

  // if we have an error, kill all scripts on all servers and exit
  const EXIT = (message, errorObject) => {
    ns.tprint(`ERROR: ${message}`)
    otherServers.forEach(x => ns.killall(x.hostname))
    ns.killall()
    ns.exit()
  }

  /**
   * Process pending messages on ports from worker scripts
   */
  const processIncomingMessages = () => {
    let messages = []
    while (!handle.empty()) {
      messages[messages.length] = JSON.parse(handle.read())
    }
    while (!handle2.empty()) {
      messages[messages.length] = JSON.parse(handle2.read())
    }
    if (messages.length === 0) return

    // sort 'end' first, then by id
    messages.sort((a, b) => {
      if (a.message === 'end' && b.message !== 'end') return -1
      if (b.message === 'end' && a.message !== 'end') return 1
      return a.id - b.id
    })

    messages.forEach(msg => {
      let { message, id, command, start, time, eEnd, end, result}  = msg
      let worker = workers[id]
      if (!worker) EXIT(`Got message for unknown worker ${id}`, {msg, workers})

      // ------------------------------ start message ------------------------------
      // { id, message: 'start', command: 'weak', start, time, eEnd }
      // Worker has actually started and called the method, add to the right spot
      // in processing[] and update with a more accurate 'eEnd' expected end time.
      if (message === 'start') {
        let index = findProcessing({ id, eEnd })
        if (compareWorkers({ id, eEnd }, processing[index]) === 0)  EXIT('got start message for worker already in array!', { msg, processing, workers })

        // update worker with accurate info and insert into array at the right spot
        Object.assign(worker, { start, time, eEnd })
        processing = processing.slice(0, index).concat([worker]).concat(processing.slice(index))
        counts[command]++
      } else if (message === 'continue') {
        // { id, message: 'continue', command: 'weak', start, time, eEnd, end, result }
        // this is for end and restart of 'weak' commands that are running continuously,
        // with end time and result from previous run and new eEnd and start times
        // for the new run
        
        // the first time we get a continue, disable scheduling new weak commands
        nextWeak = 0

        // remove previous run from processing[]
        let oldIndex = findProcessing(worker)
        processing = processing.slice(0, oldIndex).concat(processing.slice(oldIndex + 1))

        // update worker and insert into new position in processing[] with new eEnd
        Object.assign(worker, { start, time, eEnd, end: null, result: null })
        let newIndex = findProcessing(worker)
        processing = processing.slice(0, newIndex).concat([worker]).concat(processing.slice(newIndex))
        executions[command]++
      } else if (message === 'end') {
        // ------------------------------ end message ------------------------------
        // { id, message: 'end', command: 'grow', end, result }
        // Update end information and remove from processing[] and workers{}
        let index = findProcessing(worker)
        if (compareWorkers(worker, processing[index]) !== 0) EXIT(`got end message for worker missing from array!`, {msg, worker, index, processingLength: processing.length, processing: processing[index]})

        // record profits
        if (command ==='hack') {
          totalProfit += result || 0
        }

        // delete worker from processing[] and workers{}, update counts
        processing = processing.slice(0, index).concat(processing.slice(index + 1))
        delete workers[id]
        counts[command]--
        executions[command]++
      } else {
        EXIT(`unknown message ${message}`, msg)
      }
    });
  }

  // handle utilizing ram on other servers for weak scripts
  // let otherServers = [{"hostname":"n00dles","maxRam":4},{"hostname":"foodnstuff","maxRam":16},{"hostname":"sigma-cosmetics","maxRam":16},{"hostname":"joesguns","maxRam":16},{"hostname":"hong-fang-tea","maxRam":16},{"hostname":"harakiri-sushi","maxRam":16},{"hostname":"iron-gym","maxRam":32},{"hostname":"zer0","maxRam":32},{"hostname":"nectar-net","maxRam":16},{"hostname":"max-hardware","maxRam":32},{"hostname":"CSEC","maxRam":8},{"hostname":"silver-helix","maxRam":64},{"hostname":"phantasy","maxRam":32},{"hostname":"omega-net","maxRam":32},{"hostname":"neo-net","maxRam":32},{"hostname":"netlink","maxRam":16},{"hostname":"avmnite-02h","maxRam":64},{"hostname":"the-hub","maxRam":64},{"hostname":"I.I.I.I","maxRam":64},{"hostname":"summit-uni","maxRam":16},{"hostname":"zb-institute","maxRam":32},{"hostname":"catalyst","maxRam":128},{"hostname":"rothman-uni","maxRam":128},{"hostname":"alpha-ent","maxRam":128},{"hostname":"millenium-fitness","maxRam":64},{"hostname":"lexo-corp","maxRam":32},{"hostname":"aevum-police","maxRam":64},{"hostname":"rho-construction","maxRam":16},{"hostname":"global-pharm","maxRam":16},{"hostname":"omnia","maxRam":64},{"hostname":"unitalife","maxRam":32},{"hostname":"univ-energy","maxRam":128},{"hostname":"solaris","maxRam":16},{"hostname":"titan-labs","maxRam":128},{"hostname":"run4theh111z","maxRam":512},{"hostname":"microdyne","maxRam":64},{"hostname":"fulcrumtech","maxRam":128},{"hostname":"helios","maxRam":64},{"hostname":"vitalife","maxRam":64},{"hostname":".","maxRam":16},{"hostname":"omnitek","maxRam":512},{"hostname":"blade","maxRam":128},{"hostname":"powerhouse-fitness","maxRam":16}]
  let otherServers = []
  let usableServers = [...otherServers]

  const copyScriptsToOtherServers = async () => {
    for (let i = 0; i < otherServers.length; i++) {
      await copyFilesToServer(otherServers[i].hostname)
    }
  }
  await copyScriptsToOtherServers()

  /**
   * Used to schedule weakens on other servers
   */
  const findOtherServer = (ram) => {
    while (usableServers.length > 0 && usableServers[0].maxRam < weakScriptRam) {
      usableServers = usableServers.slice(1) 
    }

    if (usableServers.length <= 0) return null
    usableServers[0].maxRam -= weakScriptRam
    return usableServers[0].hostname
  }

  /**
   * Create a new worker
   * @param {string} host Hostname to execute command on
   * @param {string} command One of 'weak', 'hack', 'grow'
   * @param {number} threads How many threads to use
   * @param {number} id Id (time)
   * @param {number} execTime Expected duration
   * @param {number} execEnd Expected end time
   */
   const createWorker = (host, command, threads, id, execTime, execEnd) => {
    if (workers[id]) return null

    /**
     * @type{Worker}
     */
    const worker = {
      id,
      command,
      start: null,
      time: null,
      eEnd: null,
      end: null,
      result: null,
      execStart: id,
      execEnd,
      execTime,
      host,
      pid: null,
    }

    workers[id] = worker
    const scriptFile = `/remote/${command}.js`
    worker.pid = ns.exec(scriptFile, host, threads, target, id, command, PORT, execTime)
    if (!worker.pid) {
      EXIT(`could not exec() script`, {args: [scriptFile, host, threads, target, id, command, PORT], worker})  
    }
    return worker
  }

  ns.tprint(`Starting main loop at ${new Date().toLocaleTimeString()}`)
  ns.tprint(`    Expect results at ${new Date(new Date().valueOf() + ns.getWeakenTime(target)).toLocaleTimeString()}`)

  // for scheduling weaken commands
  let nextWeak = new Date().valueOf()
  let absoluteStartTime = new Date().valueOf()

  // for special processing running first hack before first weaken
  let firstHack = true 

  let lastGrowCreatedAt = 0
  let lastHackCreatedAt = 0

  // method is weak, weak, grow, weak, weak, grow with hack in between
  let expectedWeak = Math.ceil(ns.getWeakenTime(target) / WEAK_DELAY) // how many weakens will be running
  let possibleHacks = Math.ceil(ns.getHackTime(target) / (WEAK_DELAY  * 4)) // how many hacks can we possibly fit?

  const removeOldProcessing = () => {
    let i = 0
    let time = new Date().valueOf() - 30000 // 30 seconds late
    while (processing.length && i < processing.length && processing[i].eEnd < time) {
      i++
    }
    if (i > 0) {
      obj.errors.push({ message: `Removing ${i} processing that are 30 seconds late`, rows: processing.slice(0, i)})
      processing = processing.slice(i)
    }
  }

  const createReporter = () => {
    let lastReport = new Date().valueOf()
    return (data) => {
      const now = new Date().valueOf()
      if (now - lastReport >= 10000) {
        lastReport = now
        ns.tprint(JSON.stringify(counts))
        ns.tprint(JSON.stringify(data))
        const seconds = (now - absoluteStartTime) / 1000
        const perHour = totalProfit / (seconds / 3600)
        ns.tprint(`${ns.nFormat(totalProfit, '$0,000.0a')} in ${ns.nFormat(seconds, '0,000')} or ${ns.nFormat(perHour, '$0,000.0a')} per hour`)

      }
    }
  }
  const report = createReporter()

  //----------------------------------------------------------------------------------------------------
  // main loop
  //----------------------------------------------------------------------------------------------------
  while (true) {
    // update information with messages from worker scripts
    processIncomingMessages()
    removeOldProcessing()

    let ram = hostMaxRam - ns.getServerUsedRam(host)
    if (ram < hackScriptRam) EXIT('Not enough ram!  Tweak your settings...', {ram, hostMaxRam, hackScriptRam})

    // schedule weakens every WEAK_DELAY until we receive our first continue message from one
    if ((nextWeak != 0) && (new Date().valueOf() >= nextWeak)) {
      let duration = ns.getWeakenTime(target)
      let id = new Date().valueOf()
      let eEnd = id + duration

      // we can use other servers for weak
      let useHost = findOtherServer(weakScriptRam) || host
      if (createWorker(useHost, 'weak', WEAK_THREADS, id, duration, eEnd)) {
        nextWeak += WEAK_DELAY
        await ns.sleep(10)
        continue
      }
    }

    // schedule grows only when there are two weakens guaranteed before
    // it and two weakens guaranteed after it, and reserve ram for enough
    // hacks so that we have two grows per hack.  We can schedule 8 times
    // as many grows since we use two grow per hack and since hacks only
    // take 1/4 the time
    let missingHack = Math.max(possibleHacks - counts.hack, 0)
    let missingHackRam = missingHack * hackScriptRam
    let missingWeak = Math.max(expectedWeak - counts.weak, 0)
    let missingWeakRam = missingWeak * weakScriptRam
    let missingRam = missingHackRam + missingWeakRam + (RAM_SAFETY_FACTOR * hackScriptRam)
    if (ram >  missingRam + growScriptRam) {
      let duration = ns.getGrowTime(target)
      let id = new Date().valueOf()
      let eEnd = id + duration

      let index = findProcessing({ eEnd, id })
      const previousTwoAreWeak = processing[index - 1]?.command === 'weak' && processing[index - 2]?.command === 'weak'
      const nextTwoAreWeak = processing[index]?.command === 'weak' && processing[index + 1]?.command === 'weak'
      if (previousTwoAreWeak && nextTwoAreWeak && lastGrowCreatedAt < id - 20) {
        lastGrowCreatedAt = id
        if (createWorker(host, 'grow', GROW_THREADS, id, duration, eEnd)) {
          await ns.sleep(10)
          continue
        }
      }
    }

    if (ram >= hackScriptRam) {
      let duration = ns.getHackTime(target)
      let id = new Date().valueOf()
      let eEnd = id + duration

      let index = findProcessing({ eEnd, id })
      
      if (firstHack) {
        // on first hack we schedule within 200ms of first weaken
        if (processing.length > 0 && processing[0].eEnd - eEnd < 200 && processing[0].eEnd > eEnd) {
          if (createWorker(host, 'hack', HACK_THREADS, id, duration, eEnd)) {
            firstHack = false
            await ns.sleep(10)
            continue
          }
        }
      } else {
        // count previous grow until we reach beginning of list or another hack
        let pastGrows = 0
        for (let i = index - 1; i >= 0; i--) {
          let w = processing[i]
          if (w.command === 'hack') break
          if (w.command === 'grow' && Math.abs(w.eEnd - eEnd) > 15) pastGrows++
        }
        
        // count future grow until we reach end of list or another hack
        let futureGrows = 0
        for (let i = index; i < processing.length; i++) {
          let w = processing[i]
          if (w.command === 'hack') break
          if (w.command === 'grow' && Math.abs(w.eEnd - eEnd) > 15) futureGrows++
        }
        
        // skip current/previous for weaken find if it is within 20ms
        const timeDiffCurrent = Math.abs(processing[index]?.eEnd - eEnd)
        const timeDiffPrevious = Math.abs(processing[index - 1]?.eEnd - eEnd)
        const skipCurrent = timeDiffCurrent < 10 ? 1 : 0
        const skipPrevious = timeDiffPrevious < 2 ? 1 : 0
        const previousIsWeak = processing[index - 1]?.command === 'weak' && processing[index - 1 - skipPrevious]?.command === 'weak'
        const nextIsWeak = processing[index]?.command === 'weak' && processing[index + skipCurrent]?.command === 'weak'

        if (previousIsWeak && nextIsWeak && pastGrows >= 2 && futureGrows >= 2 && lastHackCreatedAt < id - 20 ) {
          lastHackCreatedAt = id
          if (createWorker(host, 'hack', HACK_THREADS, id, duration, eEnd)) {
            await ns.sleep(10)
            continue
          }
        }
      }
    }

    // didn't start anything, delay 10ms and report if it's been 10s
    report({ram, hostMaxRam, expectedWeak, possibleHacks})
    await ns.sleep(10)
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
 * Solve how many grow threads are needed
 */
function solveGrow(moneyMax, moneyAvailable, growPercent) {
  // naive
  let neededPercent = moneyAvailable / (moneyMax - moneyAvailable)
  let neededThreads = neededPercent / growPercent

  // calculated, if growPercent is .numCycleForGrowth


}

/**
 * Calculate optimal 'batch' parameters for a server and player given 
 * given an amount of ram and number of cores (default 1)
 * 
 * @param {Server} server
 * @param {Player} player
 * @param {number} ram - gb available
 * @param {number} cores - cores (default 1)
 */
function calculateHGW(server, player, ram, cores = 1, ns) {
  // percent hacking with one thread
  let prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
  let hackPercentOneThread = hacking.hackPercent(server, player)
  let maxHacks = Math.trunc(0.95 / hackPercentOneThread)
  // ns.tprint('maxHacks: ' + ns.nFormat(maxHacks, '0,000')) // 144 for rho-construction

  let list = []
  for (let ht = maxHacks; ht >= 1; ht--) {
    let hp = hackPercentOneThread * ht
    let hm = prepped.moneyMax * hp
    let hacked = {...prepped, hackDifficulty: prepped.minDifficulty + ht * 0.002, moneyAvailable: prepped.moneyMax - hm}
    let growPercentOneThread = hacking.growPercent(hacked, 1, player, cores) - 1
    let growPercentNeeded = hm / hacked.moneyAvailable
    let gt = Math.ceil(growPercentNeeded / growPercentOneThread)
    let gp = hacking.growPercent(hacked, gt, player, cores) - 1
    let gm = hacked.moneyAvailable * gp
    while (gm >= hm && gt > 0) {
      gt = gt - 1
      gp = hacking.growPercent(hacked, gt, player, cores) - 1
      gm = hacked.moneyAvailable * gp
    }
    gt += 1
    gp = hacking.growPercent(hacked, gt, player, cores) - 1
    gm = hacked.moneyAvailable * gp

    let wt = Math.ceil((gt * 0.004 + ht * 0.002) / 0.050)
    // ns.tprint(JSON.stringify({ht, hp: ns.nFormat(hp, '0.00000'), gt, gp: ns.nFormat(gp, '0.00000'), wt}))

    let batchRam = ht * 1.7 + gt * 4 * 1.75 + wt * 5 * 1.75
    let profit = hm / batchRam
    let concurrentBatches = Math.trunc(ram / batchRam) - 1
    let hackTime = hacking.hackTime(server, player)
    let batchesPerHour = 3600000/hackTime*concurrentBatches
    let profitPerHour = batchesPerHour * hm
    let batchDelay = hackTime / concurrentBatches
    let referenceProfit = profitPerHour * (3600000 - (hackTime * 5))/3600000
    list.push({ ht, gt, wt, hp, gp, hm, gm, batchRam, profit, hackTime,
      batchesPerHour, profitPerHour, batchDelay, referenceProfit, concurrentBatches })
  }
  return list
}

/*
How does this work out to 7.67t per hour, 7.12t for reference?

10 hack, 30 grow, 3 weaken, $884.5m profit, 253.3gb, 406 delay, 52s hackTime
works out to 128 concurrent batches, 32,422.4 gb
Profit shows $7.56t/hr, $7.12t with reference warm-up, 10 hack, 30 grow, 3 weaken
Manual verification - 128 concurrent batches, delay 406ms:
  Active hack threads: 10 * 128 = 1280 * 1.7 = 2176gb
  Active grow threads: 30 * 128 * 4 * 1.75 = 26880gb
  Active weaken threads: 3 * 128 * 5 * 1.75 = 3360gb


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
*/
