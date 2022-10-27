const ADD_LEVELS = 5 // extra levels to calculate for hacking money to void under-growing

import { createTable, getCustomFormulas } from "/lib"

let myGetServer = null

/** @type {HackingFormulas} */
const hacking = getCustomFormulas()

/** @param {NS} ns */
export async function main(ns) {
  myGetServer = name => ns.getServer(name)
  if (ns.args[0] === '--help' || ns.args[0] === '-h' || ns.args.length === 0) {
    const lines = [
      `Usage: run ${ns.getScriptName()} <command> <target> [-- host host] [--port port] [--gb gb] [--reserve gb] [--level lvl] [--skip #]`,
      `  command - optional, defaults to 'analyze'`,
      `      analyze - (default) analyze server(s) and report as a table`,
      `      details - analyze server(s) and report details a table`,
      `      run     - runs batcher`,
      `  target  - optional, defaults to 'all'`,
      `  host    - host for H/G/W scripts, defaults to current server`,
      `  port    - first port to use for communication (default 5), uses port+1 and port+2 also`,
      `  gb      - limit ram usage to gb`,
      `  reserve - reserve ram on host`,
      `  level   - act as if player were this level for analyze (ignored for run)`,
      `  skip    - if specified and target is all, skip the top <#> results`,
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
  let port = stripOption('port', 1)
  let gb = stripOption('gb', 0)
  let reserve = stripOption('reserve', 0)
  let level = stripOption('level', 0)
  let skip = stripOption('skip', 0)

  let [command, target] = args
  command = command || 'analyze'
  target = target || 'all'

  if (level && command === 'run') {
    level = 0
  }

  // ns.tprint(`INFO: options is ${JSON.stringify(options)}`)
  // ns.tprint(`INFO: args is ${JSON.stringify(args)}`)
  // ns.tprint(`INFO: values are ${JSON.stringify({ host, port, gb, command, target })}`)

  // get host information
  let hostServer = ns.getServer(host)
  let ram = hostServer.maxRam - hostServer.ramUsed - reserve
  if (command === 'analyze' || command === 'details') ram = hostServer.maxRam - reserve
  if (gb) ram = gb
  let cores = hostServer.cpuCores
  // ns.tprint(`INFO: host is ${host}, ram is ${ram}, target is ${target}`)

  // // DEBUG: which server(s) are killing us?
  // const servers = {}
  // const scanServer = (hostname) => {
  //   const server = ns.getServer(hostname)
  //   servers[hostname] = server
  //   server.connections = ns.scan(hostname)
  //   server.connections.forEach(name => {
  //     if (!servers[name]) scanServer(name)
  //   })
  // }
  // scanServer('home')
  // /** @type {Server[]} */
  // let serverList = Object.values(servers)
  // for (let i = 0; i < serverList.length; i++) {
  //   let player = ns.getPlayer()
  //   let x = serverList[i]
  //   if (!x.purchasedByPlayer && x.hostname !== 'home' && x.moneyMax > 0 && x.requiredHackingSkill < player.skills.hacking && x.hasAdminRights)
  //   console.log(`${i}: analyzing ${x.hostname}`)
  //   let calc = analyzeServer(ns, ram, x.hostname, cores)
  // }
  // return;

  // perform calculations and analyze server(s)
  let calculations = (target === 'all' || !target ? analyzeAllServers(ns, ram, cores, level) : [analyzeServer(ns, ram, target, cores, level)])

  //----------------------------------------------------------------------------------------------------
  // DEBUG - add calculations for server minus 10 serverGrowth (min 1)
  // myGetServer = name => {
  //   let realServer = ns.getServer(name)
  //   let fakeServer = {...realServer, serverGrowth: Math.max(1, realServer.serverGrowth - 10)}
  //   return fakeServer
  // }
  // const calculations2 = (target === 'all' || !target ? analyzeAllServers(ns, ram, cores, level) : [analyzeServer(ns, ram, target, cores, level)])
  // calculations = calculations.concat(calculations2.map(x => { return {...x, hostname: x.hostname + '-10'} }))
  //----------------------------------------------------------------------------------------------------


  //ns.tprint('calculations: ' + JSON.stringify(calculations))
  calculations.sort((a, b) => (b.profit || 0) - (a.profit || 0)) // highest profit first
  if (options.skip) calculations = calculations.slice(options.skip)
  // ns.tprint(`Have ${calculations.length} calculations...`)

  // if analyzing, report as a table and return
  if (command === 'analyze' || command === 'details') {
    ns.tprint(`INFO: host ${host}, ram ${ns.nFormat(ram, '0,000')} gb, cores ${cores}`);
    (command === 'analyze' ? report : reportDetails)(ns, calculations)
    return
  }

  // disable logs
  ns.disableLog('ALL')

  // DEBUG: console.log('calculations: ', calculations);

  var obj = eval("window['obj'] = window['obj'] || {}")
  obj.errors = []
  obj.nonstop = []

  obj.batchers = obj.batchers || {}
  let batcher = { state: 'STARTING', stateEnd: '', skip}
  batcher.calculations = calculations[0 + skip]
  target = batcher.calculations.hostname
  batcher.target = target
  obj.batchers[target] = batcher
  batcher.args = ns.args
  batcher.host = host
  batcher.command = command
  batcher.port = port
  batcher.player = ns.getPlayer()
  batcher.server = ns.getServer(batcher.target)
  batcher.hackTimeUpdates = []
  batcher.messageQueue = []

  batcher.ram = ram
  batcher.cores = cores

  report(ns, [batcher.calculations])


  /**
   * Object containing all active workers, key is exec time.
   * @type {Object<string,Worker}
   */
  batcher.workers = {}

  /**
   * Object containing created hacks and grows we haven't received a start
   * message for.  When we get the start message and the worker ending
   * immediately before is the same type, kill it.
   * @type {Object<string,Worker}
   */
  batcher.checkWorkers = {}

  /**
   * Array of workers, populated after start/continue message is received from
   * worker script and sorted by eEnd - expected end time set by script with
   * accurate start time and duration.
   *
   * @type {Worker[]}
   */
  batcher.processing = []
  batcher.totalProfit = 0
  batcher.hackSuccess = 0
  batcher.hackFail = 0

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
  batcher.compareWorkers = compareWorkers

  /**
   * Use binary search to quickly find worker or location to insert a new worker
   * using 'worker.eEnd' and given two at the same time, use  
   * 
   * @param {Worker} worker
   */
  const findProcessing = (worker) => {
    let min = 0, max = batcher.processing.length - 1
    while (min <= max) {
      let index = Math.trunc((min + max) / 2)
      let test = batcher.compareWorkers(worker, batcher.processing[index])
      if (test > 0) {
        min = index + 1
      } else {
        max = index - 1
      }
    }
    return min;
  }
  batcher.findProcessing = findProcessing

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
  batcher.counts = counts

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
  batcher.executions = executions

  /**
   * How many total times we've killed these commands
   * 
   * @type {Counts}
   */
  const kills = {
    weak: 0,
    grow: 0,
    hack: 0
  }
  batcher.kills = kills

  // kill scripts on host, first hack, then grow, then weaken
  while (await killScripts(ns, batcher)) {
    await ns.sleep(2000)
  }

  // make sure server has been prepped, in a real script we might do this automatically
  ns.print(`Ensuring server ${target} is ready`)
  const ensureServerIsReady = async (target) => {
    let testServer = ns.getServer(target)
    if (testServer.hackDifficulty !== testServer.minDifficulty || testServer.moneyAvailable !== testServer.moneyMax) {
      // ns.tprint(JSON.stringify(testServer, null, 2))
      ns.tprint(`WARNING!  ${target} needs prepping!`)
      ns.print(`WARNING!  ${target} needs prepping!`)
      await prepServer(ns, batcher)
    } else {
      ns.print(`Server ${target} is prepped and ready`)
    }
  }
  await ensureServerIsReady(target)

  // create port handles and clear  after killing scripts
  batcher.hResults = ns.getPortHandle(port)
  batcher.hResults2 = ns.getPortHandle(port + 1)
  batcher.hWeakenTime = ns.getPortHandle(port + 2)
  batcher.hResults.clear()
  batcher.hResults2.clear()
  batcher.hWeakenTime.clear()

  // used to calculate ram available
  batcher.hostMaxRam = ns.getServerMaxRam(host)

  // if we have an error, kill all scripts on all servers and exit
  const EXIT = (message, errorObject) => {
    ns.tprint(`ERROR: ${message}`)
    ns.tprint(`INFO: ` + JSON.stringify(errorObject, null, 2))
    otherServers.forEach(x => ns.killall(x.hostname))
    ns.killall()
    ns.exit()
  }

  /**
   * Process pending messages on ports from worker scripts
   */
  const processIncomingMessages = () => {
    // let messages = []
    // while (!batcher.hResults.empty()) {
    //   messages[messages.length] = JSON.parse(batcher.hResults.read())
    // }
    // while (!batcher.hResults2.empty()) {
    //   messages[messages.length] = JSON.parse(batcher.hResults2.read())
    // }
    let messages = batcher.messageQueue.map(x => JSON.parse(x))
    batcher.messageQueue = []
    if (messages.length === 0) return

    // sort 'end' first, then by id
    messages.sort((a, b) => {
      if (a.message === 'end' && b.message !== 'end') return -1
      if (b.message === 'end' && a.message !== 'end') return 1
      return a.id - b.id
    })

    messages.forEach(msg => {
      let { message, id, command, start, time, eEnd, end, result } = msg
      let worker = batcher.workers[id]
      if (!worker) EXIT(`Got message for unknown worker ${id}`, { msg })

      // ------------------------------ start message ------------------------------
      // { id, message: 'start', command: 'weak', start, time, eEnd }
      // Worker has actually started and called the method, add to the right spot
      // in processing[] and update with a more accurate 'eEnd' expected end time.
      if (message === 'start') {
        let index = batcher.findProcessing({ id, eEnd })
        if (batcher.compareWorkers({ id, eEnd }, batcher.processing[index]) === 0) EXIT('got start message for worker already in array!', { msg })

        // update worker with accurate info and insert into array at the right spot
        Object.assign(worker, { start, time, eEnd })
        batcher.processing = batcher.processing.slice(0, index).concat([worker]).concat(batcher.processing.slice(index))
        batcher.counts[command]++

        // check if previous command is the same, and kill it if so
        /** @type {Worker} */
        let previous = batcher.processing[index - 1]
        if (worker.command !== 'weak' && previous && previous.command === worker.command) {
          ns.kill(previous.pid, previous.host)
          delete batcher.workers[previous.id]
          batcher.counts[previous.command]--
          batcher.kills[previous.command]++
          batcher.processing = batcher.processing.slice(0, index - 1).concat(batcher.processing.slice(index))
        }
      } else if (message === 'continue') {
        // { id, message: 'continue', command: 'weak', start, time, eEnd, end, result }
        // this is for end and restart of 'weak' commands that are running continuously,
        // with end time and result from previous run and new eEnd and start times
        // for the new run

        batcher.nextWeak = 0

        // remove previous run from processing[]
        let oldIndex = batcher.findProcessing(worker)
        batcher.processing = batcher.processing.slice(0, oldIndex).concat(batcher.processing.slice(oldIndex + 1))

        // update worker and insert into new position in processing[] with new eEnd
        Object.assign(worker, { start, time, eEnd, end: null, result: null })
        let newIndex = batcher.findProcessing(worker)
        batcher.processing = batcher.processing.slice(0, newIndex).concat([worker]).concat(batcher.processing.slice(newIndex))
        batcher.executions[command]++
      } else if (message === 'end') {
        // ------------------------------ end message ------------------------------
        // { id, message: 'end', command: 'grow', end, result }
        // Update end information and remove from processing[] and workers{}
        let index = batcher.findProcessing(worker)

        // record profits, successes, and failures
        if (command === 'hack') {
          batcher.totalProfit += result || 0
          batcher.hackSuccess += result ? 1 : 0
          batcher.hackFail += result ? 0 : 1
          if (!batcher.firstHackFinish) {
            batcher.firstHackFinish = new Date().valueOf()
            batcher.state = 'ACTIVE'
            batcher.stateEnd = ''
            ns.print('First hack finished!')
          }
        } else if (command === 'grow') {
          batcher.checkServerMoney = true
        }

        delete batcher.workers[id]
        batcher.counts[command]--
        batcher.executions[command]++

        if (batcher.compareWorkers(worker, batcher.processing[index]) !== 0) {
          // EXIT(`got end message for worker missing from array!`, {msg, worker, index, processingLength: batcher.processing.length, previous: processing: batcher.processing[index-1], next: batcher.processing[index]})
          let err = { msg, worker, index, processingLength: batcher.processing.length, previous: batcher.processing[index - 1], next: batcher.processing[index] }
          batcher.missing = batcher.missing || []
          batcher.missing[batcher.missing.length] = err
          ns.tprint(`ERROR: Got end message for ${worker.command} not in processing array!`)
          ns.tprint(`INFO: ${batcher.processing[index - 1]?.id} -> ${id} <- ${batcher.processing[index]}`)
          ns.tprint(`INFO:` + JSON.stringify(err, null, 2))
        } else {
          // delete worker from processing[] and workers{}, update counts
          batcher.processing = batcher.processing.slice(0, index).concat(batcher.processing.slice(index + 1))
        }

      } else {
        EXIT(`unknown message ${message}`, msg)
      }
    });
  }

  // handle utilizing ram on other servers for weak scripts
  // let otherServers = [{"hostname":"n00dles","maxRam":4},{"hostname":"foodnstuff","maxRam":16},{"hostname":"sigma-cosmetics","maxRam":16},{"hostname":"joesguns","maxRam":16},{"hostname":"hong-fang-tea","maxRam":16},{"hostname":"harakiri-sushi","maxRam":16},{"hostname":"iron-gym","maxRam":32},{"hostname":"zer0","maxRam":32},{"hostname":"nectar-net","maxRam":16},{"hostname":"max-hardware","maxRam":32},{"hostname":"CSEC","maxRam":8},{"hostname":"silver-helix","maxRam":64},{"hostname":"phantasy","maxRam":32},{"hostname":"omega-net","maxRam":32},{"hostname":"neo-net","maxRam":32},{"hostname":"netlink","maxRam":16},{"hostname":"avmnite-02h","maxRam":64},{"hostname":"the-hub","maxRam":64},{"hostname":"I.I.I.I","maxRam":64},{"hostname":"summit-uni","maxRam":16},{"hostname":"zb-institute","maxRam":32},{"hostname":"catalyst","maxRam":128},{"hostname":"rothman-uni","maxRam":128},{"hostname":"alpha-ent","maxRam":128},{"hostname":"millenium-fitness","maxRam":64},{"hostname":"lexo-corp","maxRam":32},{"hostname":"aevum-police","maxRam":64},{"hostname":"rho-construction","maxRam":16},{"hostname":"global-pharm","maxRam":16},{"hostname":"omnia","maxRam":64},{"hostname":"unitalife","maxRam":32},{"hostname":"univ-energy","maxRam":128},{"hostname":"solaris","maxRam":16},{"hostname":"titan-labs","maxRam":128},{"hostname":"run4theh111z","maxRam":512},{"hostname":"microdyne","maxRam":64},{"hostname":"fulcrumtech","maxRam":128},{"hostname":"helios","maxRam":64},{"hostname":"vitalife","maxRam":64},{"hostname":".","maxRam":16},{"hostname":"omnitek","maxRam":512},{"hostname":"blade","maxRam":128},{"hostname":"powerhouse-fitness","maxRam":16}]
  let otherServers = []
  let usableServers = [...otherServers]
  batcher.otherServers = otherServers
  batcher.usableServers = usableServers

  const copyFilesToServers = async () => {
    ns.write(getScriptName('hack'), getScript('hack'), 'w')
    ns.write(getScriptName('grow'), getScript('grow'), 'w')
    ns.write(getScriptName('weak'), getScript('weak'), 'w')
    let servers = [...otherServers, host]
    for (let i = 0; i < servers.length; i++) {
      if (servers[i] === ns.getHostname()) continue
      ns.rm(getScriptName('hack'), servers[i])
      ns.rm(getScriptName('grow'), servers[i])
      ns.rm(getScriptName('weak'), servers[i])
      await ns.scp(getScriptName('hack'), servers[i])
      await ns.scp(getScriptName('grow'), servers[i])
      await ns.scp(getScriptName('weak'), servers[i])
    }
  }
  await copyFilesToServers()

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
  batcher.findOtherServer = findOtherServer

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
    if (batcher.workers[id]) return null

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

    batcher.workers[id] = worker
    const scriptFile = getScriptName(command)
    try {
      worker.pid = ns.exec(scriptFile, host, threads, batcher.target, id, command, port, execTime)
    } catch (ERR) {
      EXIT(ERR, { args: [scriptFile, host, threads, batcher.target, id, command, port, execTime], worker, calculations: batcher.calculations })
    }
    if (!worker.pid) {
      EXIT(`could not exec() script`, { args: [scriptFile, host, threads, batcher.target, id, command, port, execTime], worker, calculations: batcher.calculations })
    }
    return worker
  }
  batcher.createWorker = createWorker

  ns.tprint(`Starting main loop at ${new Date().toLocaleTimeString()}`)
  ns.tprint(`    Expect results at ${new Date(new Date().valueOf() + ns.getWeakenTime(target)).toLocaleTimeString()}`)
  ns.print(`Starting main loop at ${new Date().toLocaleTimeString()}`)
  ns.print(`    Expect results at ${new Date(new Date().valueOf() + ns.getWeakenTime(target)).toLocaleTimeString()}`)
  batcher.state = 'WARMUP'
  batcher.stateEnd = new Date(new Date().valueOf() + ns.getWeakenTime(target)).toLocaleTimeString()

  // for scheduling weaken commands
  batcher.nextWeak = new Date().valueOf()
  batcher.absoluteStartTime = new Date().valueOf()

  // for special processing running first hack before first weaken
  batcher.firstHack = true
  batcher.firstHackFinish = 0

  batcher.lastGrowCreatedAt = 0
  batcher.lastHackCreatedAt = 0

  // method is weak, weak, grow, weak, weak, grow with hack in between
  batcher.expectedWeak = Math.ceil(ns.getWeakenTime(target) / (batcher.calculations.delay)) // how many weakens will be running
  batcher.possibleHacks = batcher.calculations.activeHacks // how many hacks can we possibly fit?

  const removeOldProcessing = () => {
    let i = 0
    let time = new Date().valueOf() - 15 * 60 * 1000 // 15 minutes late
    while (batcher.processing.length && i < batcher.processing.length && batcher.processing[i].eEnd < time) {
      i++
    }
    if (i > 0) {
      obj.errors.push({ message: `Removing ${i} processing that are 30 seconds late`, rows: batcher.processing.slice(0, i) })
      let old = batcher.processing.slice(0, i)
      batcher.old = batcher.old || []
      batcher.old.push(old)
      batcher.processing = batcher.processing.slice(i)
    }
  }

  const REPORT_DELAY = 1 * 60 * 1000 // 1 minute
  const createResultReporter = () => {
    let lastReport = new Date().valueOf()
    return (data) => {
      const now = new Date().valueOf()
      if (now - lastReport >= REPORT_DELAY) {
        lastReport += REPORT_DELAY
        const seconds = (now - batcher.absoluteStartTime) / 1000
        const perHour = batcher.totalProfit / (seconds / 3600)
        if (!batcher.warmup) {
          batcher.warmup = batcher.calculations.wTime / 1000
        }
        let maxPerHour = 0
        // let activeSeconds = seconds - batcher.warmup
        // if (activeSeconds > 10) {
        //   maxPerHour = batcher.totalProfit / (activeSeconds / 3600)
        // }
        let activePerHour = 0
        if (batcher.firstHackFinish) {
          let activeSeconds = (new Date().valueOf() - batcher.firstHackFinish + batcher.calculations.delay) / 1000
          activePerHour = batcher.totalProfit / (activeSeconds / 3600)
        }
        let lastMinuteProfit = batcher.totalProfit - (batcher.lastTotalProfitReported || 0)
        batcher.lastTotalProfitReported = batcher.totalProfit
        // ns.tprint(`Report: \x1b[38;5;207m${batcher.target}\x1b[40m running on ${batcher.host}\n${JSON.stringify(data)}\n` +
        // `  kills: ${JSON.stringify(batcher.kills)}\n` +
        // `  counts: ${JSON.stringify(batcher.counts)}\n` + 
        // `  ${ns.nFormat(batcher.totalProfit, '$0,000.0a')} in ${ns.nFormat(seconds, '0,000')}s or ${ns.nFormat(perHour, '$0,000.0a')}/h  (${ns.nFormat(maxPerHour, '$0,000.0a')}/h max)`)
        const c1 = '\x1b[38;5;207m', c2 = '\x1b[38;5;75m', r = '\x1b[40m'
        ns.print(`Report: ${c1}${batcher.target}${r} (${batcher.host}): ` +
          `+${ns.nFormat(lastMinuteProfit, '$0,000.000a')}, ${ns.nFormat(batcher.totalProfit, '$0,000.000a')} in ${ns.nFormat(seconds, '0,000')}s or ${c2}${ns.nFormat(perHour, '$0,000.000a')}/h or ${c2}${ns.nFormat(activePerHour, '$0,000.000a')}/h`)
        if (obj.errors.length > 100) obj.errors = obj.errors.slice(100)
      }
    }
  }
  const reportResults = createResultReporter()

  const updateCalculations = () => {
    let hackTime = ns.getHackTime(batcher.target)
    if (hackTime < batcher.calculations.hTime) {
      batcher.server = ns.getServer(batcher.target)
      batcher.player = ns.getPlayer()
      let calculations = recalculateHGW(batcher.server, batcher.player, batcher.ram, batcher.cores, batcher.calculations, ns)
      if (calculations) {
        // we need to notify weakens of the new time, and may need to re-calculate
        let update = {
          time: new Date().valueOf(),
          timeString: new Date(new Date().valueOf()).toLocaleTimeString(),
          oldLevel: batcher.player.skills.hacking,
          newLevel: 0,
          oldPlayer: batcher.player,
          oldServer: batcher.server,
          oldCalculations: batcher.calculations,
        }
        batcher.hackTimeUpdates.push(update)
        batcher.hackTimeUpdates = batcher.hackTimeUpdates.slice(Math.max(batcher.hackTimeUpdates.length - 20, 0))
        batcher.newLevel = batcher.player.skills.hacking
        let lines = []
        lines.push('INFO: Calculation Update:')
        if (batcher.calculations.hlvl !== calculations.hlvl || true) lines.push(`hlvl: ${batcher.calculations.hlvl} => ${calculations.hlvl}`)
        if (batcher.calculations.ht !== calculations.ht) lines.push(`ht:${batcher.calculations.ht}=>${calculations.ht}`)
        if (batcher.calculations.gt !== calculations.gt) lines.push(`gt:${batcher.calculations.gt}=>${calculations.gt}`)
        // if (batcher.calculations.wt !== calculations.wt) lines.push(`wt: ${batcher.calculations.wt} => ${calculations.wt}`)
        if (batcher.calculations.hm !== calculations.hm) lines.push(`h$:${ns.nFormat(batcher.calculations.hm, '$0.000a')}=>${ns.nFormat(calculations.hm, '$0.000a')}`)
        if (batcher.calculations.gm !== calculations.gm) lines.push(`g$:${ns.nFormat(batcher.calculations.gm, '$0.000a')}=>${ns.nFormat(calculations.gm, '$0.000a')}`)
        if (batcher.calculations.hTime !== calculations.hTime) lines.push(`hTime:${ns.nFormat(batcher.calculations.hTime, '0')}=>${ns.nFormat(calculations.hTime, '0')}`)
        // if (batcher.calculations.gTime !== calculations.gTime) lines.push(`gTime: ${ns.nFormat(batcher.calculations.gTime, '0')} => ${ns.nFormat(calculations.gTime, '0')}`)
        // if (batcher.calculations.wTime !== calculations.wTime) lines.push(`wTime: ${ns.nFormat(batcher.calculations.wTime, '0')} => ${ns.nFormat(calculations.wTime, '0')}`)
        batcher.calculations = calculations
        batcher.hWeakenTime.clear()
        batcher.hWeakenTime.write(calculations.wTime)
        // ns.print(lines.join(', '))
        ns.print(`INFO: Level ${calculations.hlvl}: hgw ${calculations.ht}/${calculations.gt}/${calculations.wt}, active ${batcher.counts.hack}/${batcher.counts.grow}/${batcher.counts.weak}`)
      } else {
        ns.print("ERROR: Cannot update calculations!\n")
        ns.exit()
        // ns.tprint('args: ' + JSON.stringify([batcher.server, batcher.player, batcher.ram, batcher.cores, batcher.calculations.wt, 200, ns]))
      }
    }
  }

  const cancelNextHackIfMoneyLow = () => {
    if (batcher.checkServerMoney) {
      batcher.checkServerMoney = false;
      let server = ns.getServer(batcher.target)
      batcher.server = server
      if (server.moneyMax - server.moneyAvailable > batcher.calculations.gm) {
        for (let i = 0; i < batcher.processing.length; i++) {
          let worker = batcher.processing[i]
          if (worker.command === 'hack') {
            ns.kill(worker.pid, worker.host)
            batcher.kills.hack++
            delete batcher.workers[worker.id]
            batcher.processing = batcher.processing.slice(0, i).concat(batcher.processing.slice(i + 1))
            return;
          }
        }
      }
    }
  }

  //----------------------------------------------------------------------------------------------------
  // main loop
  //----------------------------------------------------------------------------------------------------
  while (true) {
    // update information with messages from worker scripts
    processIncomingMessages()
    cancelNextHackIfMoneyLow()
    removeOldProcessing()
    updateCalculations()

    batcher.availableRam = batcher.hostMaxRam - ns.getServerUsedRam(host)

    // schedule weakens every delay until we receive our first continue message from one
    if ((batcher.nextWeak != 0) && (new Date().valueOf() >= batcher.nextWeak)) {
      let duration = ns.getWeakenTime(target)
      let id = new Date().valueOf()
      let eEnd = id + duration

      // we can use other servers for weak
      let useHost = batcher.findOtherServer(batcher.calculations.rW) || host
      if (batcher.createWorker(useHost, 'weak', batcher.calculations.wt, id, duration, eEnd)) {
        batcher.nextWeak += batcher.calculations.delay // TODO: some extra weaks
        await ns.sleep(10)
        continue
      }
    }

    // schedule grows only when there are two weakens guaranteed before
    // it and two weakens guaranteed after it, and reserve ram for enough
    // hacks so that we have two grows per hack.  We can schedule 8 times
    // as many grows since we use two grow per hack and since hacks only
    // take 1/4 the time
    let missingHack = Math.max(batcher.possibleHacks - batcher.counts.hack, 0)
    let missingHackRam = missingHack * batcher.calculations.rH
    let missingWeak = Math.max(batcher.expectedWeak - batcher.counts.weak, 0)
    let missingWeakRam = missingWeak * batcher.calculations.rW
    let missingRam = missingHackRam + missingWeakRam + batcher.calculations.rH

    // if we have ram for this grow, and we have enough reserved for hacks for existing grows
    // plus this one, and we haven't created a grow in the last 20ms, check if it will fit
    if (batcher.availableRam > missingRam + batcher.calculations.rG && (new Date().valueOf() - batcher.lastGrowCreatedAt) >= 20) {
      let duration = ns.getGrowTime(target)
      let id = new Date().valueOf()
      let eEnd = id + duration

      let index = batcher.findProcessing({ eEnd, id })
      let nextWorker = batcher.processing[index]
      if (nextWorker && nextWorker.eEnd < eEnd + 200 && nextWorker.command === 'weak' && nextWorker.eEnd >= eEnd + 20 && nextWorker.eEnd <= eEnd + 50) {
        if (batcher.createWorker(host, 'grow', batcher.calculations.gt, id, duration, eEnd)) {
          batcher.lastGrowCreatedAt = id
          await ns.sleep(10)
          continue
        }
      }
    }

    if (batcher.availableRam >= batcher.calculations.rH) {
      let duration = ns.getHackTime(target)
      let id = new Date().valueOf()
      let eEnd = id + duration

      let index = batcher.findProcessing({ eEnd, id })
      let nextWorker = batcher.processing[index]
      if (nextWorker && nextWorker.command === 'grow' && nextWorker.eEnd >= (eEnd + 20) && nextWorker.eEnd <= (eEnd + 50)) {
        if (batcher.createWorker(host, 'hack', batcher.calculations.ht, id, duration, eEnd)) {
          batcher.firstHack = false
          batcher.lastHackCreatedAt = id
          await ns.sleep(10)
          continue
        }
      }
    }

    // didn't start anything, delay 10ms and report if it's been 10s
    reportResults({ availableRam: batcher.availableRam, hostMaxRam: batcher.hostMaxRam, expectedWeak: batcher.expectedWeak, possibleHacks: batcher.possibleHacks })
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


function analyzeServer(ns, ram, hostname, cores = 1, level = 0) {
  let player = ns.getPlayer()
  try {
    let server = myGetServer(hostname)
    // server.minDifficulty = 5
    let values = calculateHGW(server, player, ram, cores, 0, 200, ns, level)
    // let sP = {...server, serverGrowth: Math.trunc(server.serverGrowth * 1.1)}
    // let valuesP = calculateHGW(sP, player, ram, cores, 0, 200, ns, level)
    // let sM = {...server, serverGrowth: Math.trunc(server.serverGrowth * 0.9)}
    // let valuesM = calculateHGW(sM, player, ram, cores, 0, 200, ns, level)
    // values = null
    if (values) {
      // return { ...values, M: valuesM?.profit, P: valuesP?.profit }
      return values
    } else {
      ns.tprint(`analyzeServer failed for ${hostname}`)
    }
    return { hostname } // ERROR
  } catch (err) {
    ns.tprint(`ERROR!  ${err} with ${hostname}`)
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
  // list = list.slice(0, 2)
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
      return {
        hostname: colorStr + x.hostname,
        profit: x.profit ? ns.nFormat(x.profit, '$0,000.00a') : 'ERR',
        'wTime': x.wTime ? ns.nFormat(x.wTime / 1000, '0') + 's' : 'ERR',
        'ram': x.ramUsed ? ns.nFormat(x.ramUsed, '0,000') : 'ERR',
        'max$': x.maxm ? ns.nFormat(x.maxm, '$0.0a') : 'ERR',
        'hack$': x.hm ? ns.nFormat(x.hm, '$0.0a') : 'ERR',
        'grow$': x.gm ? ns.nFormat(x.gm, '$0.0a') : 'ERR',
        'delay': x.delay ? ns.nFormat(x.delay, '0') : 'ERR',
        'active': x.activeHacks ? ns.nFormat(x.activeHacks, '0') : 'ERR',
        'chance': x.hc ? ns.nFormat(x.hc, '0.0%') : 'ERR',
        'totalGB': x.totalRam ? ns.nFormat(x.totalRam, '0,000') : 'ERR',
        'hgw': `${x.ht}/${x.gt}/${x.wt}`,
        // 'M': x.M ? ns.nFormat(x.M, '$0,000.00a') : 'ERR',
        // 'P': x.P ? ns.nFormat(x.P, '$0,000.00a') : 'ERR',
        // 'PDIFF': x.P ? ns.nFormat((x.P / x.profit) - 1, '0.00%') : 'ERR'
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

function reportDetails(ns, list, useLog = false) {
  let sorted = [...list]
  sorted.sort((a, b) => (b.profit || 0) - (a.profit || 0))

  let results = sorted.filter(x => x.profit).map(x => {
    try {

      return {
        hostname: x.hostname,
        'max$': x.maxm ? ns.nFormat(x.maxm, '$0.0a') : 'ERR',
        profit: x.profit ? ns.nFormat(x.profit, '$0,000.00a') : 'ERR',
        'hTime': x.hTime ? ns.nFormat(x.hTime / 1000, '0') + 's' : 'ERR',
        'gTime': x.gTime ? ns.nFormat(x.gTime / 1000, '0') + 's' : 'ERR',
        'wTime': x.wTime ? ns.nFormat(x.wTime / 1000, '0') + 's' : 'ERR',
        'delay': x.delay ? ns.nFormat(x.delay, '0') : 'ERR',
        'active': x.activeHacks ? ns.nFormat(x.activeHacks, '0') : 'ERR',
        'ht': x.ht ? ns.nFormat(x.ht, '0,000') : 'ERR',
        'gt': x.gt ? ns.nFormat(x.gt, '0,000') : 'ERR',
        'wt': x.wt ? ns.nFormat(x.wt, '0,000') : 'ERR',
        'ram': x.ramUsed ? ns.nFormat(x.ramUsed, '0,000') : 'ERR',
        'hack$': x.hm ? ns.nFormat(x.hm, '$0.0a') : 'ERR',
        'grow$': x.gm ? ns.nFormat(x.gm, '$0.0a') : 'ERR',
        'chance': x.hc ? ns.nFormat(x.hc, '0.0%') : 'ERR',
        'totalGB': x.totalRam ? ns.nFormat(x.totalRam, '0,000') : 'ERR',
        'hgw': `${x.ht}/${x.gt}/${x.wt}`,
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

function recalculateHGW(server, player, ram, cores, calculations, ns) {
  // player has levelled up, try to use the same calculations as before, but
  // update values (i.e. times, money)
  let hlvl = player.skills.hacking
  let prepped = { ...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax }
  let hacked = { ...prepped }
  let { wt } = calculations

  let hackPercent = hacking.hackPercent(prepped, player)
  let growPercentFn = (ht) => {
    hacked.hackDifficulty = hacked.minDifficulty + ht * 0.002
    hacked.moneyAvailable = hacked.moneyMax - (ht * hackPercent)
    return hacking.growPercent(hacked, 1, player, cores)
  }
  let { hackThreads, growThreads } = solveForWeakens(wt, hackPercent, growPercentFn)
  let ht = hackThreads
  let gt = growThreads

  if (!gt) {
    ns.tprint(`ERROR: could not solve for hack and grow threads given ${wt} weaken threads on ${server.hostname}`)
    solveForWeakensDbg(wt, hackPercent, growPercentFn, ns)
    return null
  }

  let hp = hackThreads * hackPercent
  let hm = hp * prepped.moneyMax
  hacked.moneyAvailable = hacked.moneyMax - hm
  hacked.hackDifficulty = hacked.minDifficulty + hackThreads * 0.002
  let gp = hacking.growPercent(hacked, growThreads, player, cores) - 1
  let gm = hacked.moneyAvailable * gp
  let rH = hackThreads * 1.7
  let rG = growThreads * 1.75
  let rW = wt * 1.75
  let ramUsed = rH + rG * 16 / 5 + rW * 4
  let activeHacks = Math.trunc(ram / ramUsed)
  let hTime = hacking.hackTime(prepped, player)
  let gTime = hacking.growTime(prepped, player)
  let wTime = hacking.weakenTime(prepped, player)
  // let delay = hTime / activeHacks
  let delay = calculations.delay // can't change this, weakens are running
  let hc = hacking.hackChance(prepped, player)
  let profit = Math.trunc(3600000 / delay) * hm * hc
  let hExp = hacking.hackExp(prepped, player)
  let tExp = hExp * hc + hExp * (1 - hc) * ht + gt * hExp + wt * hExp
  let totalRam = ramUsed * activeHacks
  return Object.assign({}, calculations, {
    ht, gt, wt, gp, hm, gm, rH, rG, rW, ramUsed, activeHacks,
    hTime, gTime, wTime, delay, hc, profit, hExp, tExp, totalRam, hlvl
  })
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
 * @param {NS} ns
 */
function calculateHGW(server, player, ram, cores = 1, wt = 0, minDelay = 150, ns, level = 0) {
  // let start = performance.now()
  if (level) player = { ...player, skills: { ...player.skills, hacking: level } }
  let hlvl = player.skills.hacking

  // ns.tprint(JSON.stringify({ ram, hostname: server.hostname, hlvl }))

  // percent hacking with one thread
  let prepped = { ...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax }
  let isPrepped = server.hackDifficulty === server.minDifficulty && server.moneyAvailable === server.moneyMax
  let hTime = hacking.hackTime(prepped, player)
  let gTime = hacking.growTime(prepped, player)
  let wTime = hacking.weakenTime(prepped, player)

  let hacked = { ...prepped }
  // let wtMin = wt ? wt : 1
  // let wtMax = wt ? wt : 100
  let wtMin = 1, wtMax = 1320 // 1320 will get you from 99 difficulty down to 33, the largest possible change
  let valid = null
  while (wtMin <= wtMax) {
    let wt = Math.trunc((wtMin + wtMax) / 2)
    // console.log(`wt: ${wtMin}-${wt}-${wtMax}` + (valid ? `, valid: ${valid.wt} for ${ns.nFormat(valid.profit, '$0.000a')}` : ''))
    let hackPercent = hacking.hackPercent(prepped, player)

    // DEBUG
    // ns.tprint(JSON.stringify({ hostname: server.hostname, hackPercent }))

    let growPercentFn = (ht) => {
      hacked.hackDifficulty = hacked.minDifficulty + ht * 0.002
      hacked.moneyAvailable = hacked.moneyMax - (ht * hackPercent)
      return hacking.growPercent(hacked, 1, player, cores)
    }
    let gtPossible = Math.trunc(((wt * 0.050) - 0.002) / .008)
    let gpPossible = Math.pow(growPercentFn(1), gtPossible) - 1
    if (gpPossible < hackPercent) {
      // ns.tprint(`One hack at ${ns.nFormat(hackPercent, '0.0000%')} is too much for ${wt} weakens at (growPercent is ${growPercentFn(1)})`)
      // ns.tprint(`Possible grow threads ${gtPossible} gives ${ns.nFormat(gpPossible, '0.0000%')}`)
      wtMin = wt + 1
      continue
    }

    let { hackThreads, growThreads } = solveForWeakens(wt, hackPercent, growPercentFn, ns) // DEBUG change to solveForWeakensDbg
    let ht = hackThreads
    let gt = growThreads
    // console.log(`SolveForWeakens (ht/gt/wt): ${ht}/${gt}/${wt}`)

    // once gt is null, we've filled memory and there is no solution using
    // all memory and under 200ms delay.  So pick the previous wt and run with flag
    if (!gt) {
      // SHOULD NOT GET HERE - we check earlier that there's enough room in wt for grows with a single hack,
      // but maybe our solveForWeakens is messed up?
      // ns.tprint(`${server.hostname} gt not valid for ${wt}`) // DEBUG
      wtMin = wt + 1
      continue
    }

    // for debugging
    // ns.tprint('INFO: ' + JSON.stringify({ wt, ht, gt }))

    let hp = hackThreads * hackPercent
    let hm = hp * prepped.moneyMax
    hacked.moneyAvailable = hacked.moneyMax - hm
    hacked.hackDifficulty = hacked.minDifficulty + hackThreads * 0.002
    let gp = hacking.growPercent(hacked, growThreads, player, cores) - 1
    let gm = hacked.moneyAvailable * gp
    let rH = hackThreads * 1.7
    let rG = growThreads * 1.75
    let rW = wt * 1.75
    let ramUsed = rH + rG * 16 / 5 + rW * 4

    let activeHacks = Math.trunc(ram / ramUsed)
    let delay = hTime / activeHacks

    // DEBUG
    // ns.tprint(JSON.stringify({ wt, ht, gt, activeHacks, delay }))
    // return null;

    let acceptableDelay = true
    if (delay < minDelay) {
      acceptableDelay = false
      // DEBUG
      // ns.tprint('MIN DELAY: ' + JSON.stringify({ wt, ht, gt, activeHacks, delay }))

      let factor = minDelay / delay
      activeHacks = Math.trunc(activeHacks / factor)
      delay = hTime / activeHacks

      // DEBUG
      // ns.tprint('FIXED DELAY: ' + JSON.stringify({ wt, ht, gt, activeHacks, delay }))
    }

    // if delay is invalid, change ram instead
    let hc = hacking.hackChance(prepped, player)
    let profit = Math.trunc(3600000 / delay) * hm * hc
    let hExp = hacking.hackExp(prepped, player)
    let tExp = hExp * hc + hExp * (1 - hc) * ht + gt * hExp + wt * hExp
    let totalRam = ramUsed * activeHacks

    let result = {
      ht, gt, wt, hp, gp, hm, gm, rH, rG, rW, ramUsed, activeHacks,
      hTime, gTime, wTime, delay,
      hc, profit, hExp, tExp,
      maxm: server.moneyMax,
      hostname: server.hostname,
      totalRam, hlvl, isPrepped
    }

    if (acceptableDelay) {
      if (valid && valid.profit > result.profit) {
        // we already have more profit, decrease wt (which should be the direction to
        // shorter delays and thus more profit since wt is a proxy for ram)
        // ns.tprint('acceptableDelay and valid has better profit: ' + ns.nFormat(valid.profit, '$0.000a') + ' vs ' + ns.nFormat(result.profit, '$0.000a') + ', lowering wt')
        wtMax = wt - 1
        continue
      }

      valid = result
      // ns.tprint('acceptableDelay, lowering wt')
      wtMax = wt - 1
      continue
    }

    // unacceptably short delay, but valid
    // ns.tprint('unacceptable delay, but valid')

    if (valid) {
      // ns.tprint(`Have valid already, comparing new profit ${ns.nFormat(result.profit, '$0,000.00')} (wt ${result.wt}) with ${ns.nFormat(valid.profit, '$0,000.00')} (wt ${valid.wt})`)
      if (result.profit >= valid.profit * 1.01) {
        // result has better profit by 1% at least, go in that direction and record better result as valid
        if (result.wt < valid.wt) {
          wtMax = wt - 1
        } else {
          wtMin = wt + 1
        }
        valid = result
        continue
      }

      if (valid.profit >= result.profit * 1.01) {
        // existing has better profit by at least 1%, go in that direction
        if (valid.wt < result.wt) {
          wtMax = wt - 1
        } else {
          wtMin = wt + 1
        }
        continue
      }

      // fo for ram usage, profit doesn't matter more than 1%
      if (result.totalRam < valid.totalRam) {
        // result has better memory usage, go in that directino
        if (result.wt < valid.wt) {
          wtMax = wt - 1
        } else {
          wtMin = wt + 1
        }
        valid = result
        continue
      } 

      if (valid.totalRam < result.totalRam) {
        // valid has better memory usage, go in that direction
        if (valid.wt < result.wt) {
          wtMax = wt - 1
        } else {
          wtMin = wt + 1
        }
        continue
      }

      // the same rsult for ram and not more than 1% profit difference?  return the one with the most profit
      return valid.profit > result.profit ? valid : result
    } else {
      // console.log('valid not set and unacceptable delay, setting it with wt = ', wt)
      valid = result

      // if there are more weakens than necessary, go down, otherwise go up to try and find a longer delay
      // this can occur because we're using a huge range for weaken count and with high hack skill of 5210
      // and a lot of augs, I can hack hack phantasy for $532.9m with 24 threads and grow with 9990 for 81
      // weakens but only 4 active batches in 1 second
      if ((result.wt - 1) * 0.50 > (result.ht * 0.002 + result.gt * 0.004)) {
        wtMax = wt - 1
      } else {
        wtMin = wt + 1
      }
    }
  }
  // console.log('returning: ' + JSON.stringify(valid, null, 2))
  // let end = performance.now()
  // console.log(`calculateHGW took ${end - start} ms`) // usually about .1ms, occasionally 1.4ms :)
  return valid;
}

/**
 * @param {number} growPercent - Grow multiplier for 1 thread (i.e. 1.0025)
 * @param {number} money - Current money
 * @param {number} moneyMax - Desired money after grows
 */
function solveGrowMine(growPercent, money, moneyMax) {
  if (money >= moneyMax) { return 0; } // invalid
  const needFactor = 1 + (moneyMax - money) / money
  const needThreads = Math.log(needFactor) / Math.log(growPercent)
  return money < needThreads * 10 ? 0 : Math.ceil(needThreads) // too little money for accuracy
}

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

/**
 * @param {number} weakenThreads - The number of weaken threads to optimize for
 * @param {number} hackPercent - The percent hacked with one thread, adjust with fudge factor for hackChance if desired
 * @param {function} growPercentFn - function taking hack threads and returning grow percent (i.e. 1.0025) for 1 grow thread
 * @return {Object} Object with hackThreads and growThreads properties
 */
function solveForWeakens(weakenThreads, hackPercent, growPercentFn, ns) {
  let minH = 1, maxH = weakenThreads * 24
  let validH = 0, validG = 0
  //ns.tprint(`Solving for weakens ${weakenThreads}, ${hackPercent}, ${growPercentFn}`)

  while (minH <= maxH) {
    let midH = Math.trunc((minH + maxH) / 2)
    let hp = midH * hackPercent
    if (hp > 0.90) { maxH = (maxH === minH) ? midH - 1 : midH; continue } // don't hack over 90%
    let growPercent = growPercentFn(midH)
    let G = solveGrow(growPercent, 1e13 * (1 - (midH * hackPercent)), 1e13)
    if ((G * 0.004 + midH * 0.002) > weakenThreads * 0.050) { maxH = midH - 1; continue }
    validH = midH
    validG = G
    minH = midH + 1
  }

  return { hackThreads: validH, growThreads: validG }
}
/**
 * @param {number} weakenThreads - The number of weaken threads to optimize for
 * @param {number} hackPercent - The percent hacked with one thread, adjust with fudge factor for hackChance if desired
 * @param {function} growPercentFn - function taking hack threads and returning grow percent (i.e. 1.0025) for 1 grow thread
 * @return {Object} Object with hackThreads and growThreads properties
 */
function solveForWeakensDbg(weakenThreads, hackPercent, growPercentFn, ns) {
  let minH = 1, maxH = weakenThreads * 24
  let validH = 0, validG = 0
  //ns.tprint(`Solving for weakens ${weakenThreads}, ${hackPercent}, ${growPercentFn}`)
  let list = []

  while (minH <= maxH) {
    let midH = Math.trunc((minH + maxH) / 2)
    let hp = midH * hackPercent
    if (hp > 0.90) { // don't hack over 90%
      var oldMaxH = maxH
      maxH = (maxH === minH) ? midH - 1 : midH;
      list.push({
        minH, maxH, midH, G: 0, weakenThreads, hackPercent, hp, growPercent: 0, validH, validG,
        message: `-max: hp of ${ns.nFormat(hp, '0.00%')} is too high`
      })
      continue
    }
    let growPercent = growPercentFn(midH)
    let G = solveGrow(growPercent, 1e13 * (1 - hp), 1e13)
    list.push({ minH, maxH, midH, G, weakenThreads, hackPercent, hp, growPercent, validH, validG })

    // ns.tprint(`${minH}-${midH}-${maxH}: ` + JSON.stringify({ G, growPercent }))
    if (G * 0.004 + midH * 0.002 > weakenThreads * 0.050) {
      list[list.length - 1].message = `-max: too many threads`
      maxH = midH - 1;
      continue
    }
    validH = midH
    validG = G
    list[list.length - 1].message = `+min: found valid ${validH}H/${validG}G`
    minH = midH + 1
  }

  let lines = createTable(list.map(x => ({
    ht: `${x.minH}-${x.midH}-${x.maxH}`,
    gw: `${x.G}/${x.weakenThreads}`,
    hp: `${ns.nFormat(x.hp || 0, '0.000%')}`,
    gp: `${ns.nFormat(x.growPercent || 0, '0.000%')}`,
    validH: `${x.validH}`,
    validG: `${x.validG}`,
    message: x.message
  })), { align: { message: 'left', ht: 'center' } })
  ns.tprint('solveForWeakensDbg:\n' + lines.join('\n'))
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
        const obj = eval("window.obj = window.obj || {}")
        const batcher = obj.batchers[target]
      
        let start = new Date().valueOf()
        let eEnd = start + time
      
        let msg = JSON.stringify({ id, message: 'start', command: 'hack', start, time, eEnd })
        batcher.messageQueue[batcher.messageQueue.length] = msg
      
        let result = await ns.hack(target)
      
        let end = new Date().valueOf()
        msg = JSON.stringify({ id, message: 'end', command: 'hack', end, result })
        batcher.messageQueue[batcher.messageQueue.length] = msg
      }
      `
  }
  if (command === 'grow') {
    return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        const obj = eval("window.obj = window.obj || {}")
        const batcher = obj.batchers[target]
      
        let start = new Date().valueOf()
        let eEnd = start + time
        let msg = JSON.stringify({ id, message: 'start', command: 'grow', start, time, eEnd })
        batcher.messageQueue[batcher.messageQueue.length] = msg
      
        let result = await ns.grow(target)
      
        let end = new Date().valueOf()
        msg = JSON.stringify({ id, message: 'end', command: 'grow', end, result })
        batcher.messageQueue[batcher.messageQueue.length] = msg
      }
      `
  }
  if (command === 'weak') {
    return `/** @param {NS} ns */
      export async function main(ns) {
        let [target, id, command, port, time] = ns.args
        const obj = eval("window.obj = window.obj || {}")
        const batcher = obj.batchers[target]
      
        // weakens are different, they run continuously so we loop
        time = batcher.calculations.wTime
        let count = 0
        let start = new Date().valueOf()
        let eEnd = start + time
        let end = null
        let result = null
        let msg = JSON.stringify({ id, message: 'start', command: 'weak', start, time, eEnd })
        batcher.messageQueue[batcher.messageQueue.length] = msg
      
        while (true) {
          result = await ns.weaken(target)
      
          end = new Date().valueOf()
          start = end
          time = batcher.calculations.wTime
          eEnd = start + time
          count++
          msg = JSON.stringify({ id, message: 'continue', command: 'weak', start, time, eEnd, end, result, count })
          batcher.messageQueue[batcher.messageQueue.length] = msg
        }
      }`
  }

  throw new Error(`getScript('${command}') - unknown command!`)
}


const killScripts = async (ns, batcher) => {
  let { host } = batcher
  batcher.state = 'KILLING'
  batcher.stateEnd = '???'
  ns.tprint(`Killing scripts on ${host}...`)
  const infos = ns.ps(host)

  let total = 0

  let count = 0
  let targets = infos.filter(x => x.filename.indexOf('hack-hgw') >= 0)
  for (let i = 0; i < targets.length; i++) {
    ns.kill(targets[i].pid, host)
    count++
  }
  if (count) ns.print(`killed ${count} hack-hgw.js scripts`)
  total += count
  await ns.sleep(500)

  count = 0
  targets = infos.filter(x => x.filename.indexOf('grow-hgw') >= 0)
  for (let i = 0; i < targets.length; i++) {
    ns.kill(targets[i].pid, host)
    count++
  }
  if (count) ns.print(`killed ${count} grow-hgw.js scripts`)
  total += count
  await ns.sleep(500)

  count = 0
  targets = infos.filter(x => x.filename.indexOf('weak-hgw') >= 0)
  for (let i = 0; i < targets.length; i++) {
    count++
    ns.kill(targets[i].pid, host)
  }
  if (count) ns.print(`killed ${count} weak-hgw.js scripts`)
  total += count
  await ns.sleep(total ? 2000 : 500)

  return total
}

/**
 * @param {NS} ns
 * @param {string} host
 * @param {string} target
 */
async function prepServer(ns, batcher) {
  let {target, host} = batcher
  batcher.state = 'PREPPING'
  batcher.stateEnd = '???'
  ns.print(`Prepping ${target} using ${host}`)
  let weakScript = `/** @param {NS} ns */
  export async function main(ns) {
    const [target] = ns.args
    await ns.weaken(target)
  }`
  let growScript = `/** @param {NS} ns */
  export async function main(ns) {
    const [target] = ns.args
    await ns.grow(target)
  }`
  ns.write(`/var/tmp/hgw-prep-weak.js`, weakScript, 'w')
  ns.write(`/var/tmp/hgw-prep-grow.js`, growScript, 'w')
  if (host !== ns.getHostname()) {
    ns.rm(`/var/tmp/hgw-prep-weak.js`, host)
    ns.rm(`/var/tmp/hgw-prep-grow.js`, host)
    await ns.scp(`/var/tmp/hgw-prep-weak.js`, host)
    await ns.scp(`/var/tmp/hgw-prep-grow.js`, host)
  }

  let server = ns.getServer(target)
  let player = ns.getPlayer()
  while (server.hackDifficulty > server.minDifficulty || server.moneyAvailable < server.moneyMax) {
    let hostS = ns.getServer(host)
    let availableRam = hostS.maxRam - hostS.ramUsed - (host === 'home' ? 64 : 0)
    let availableThreads = Math.floor(availableRam / 1.75)
    let wTime = hacking.weakenTime(server, player)
    let done = new Date(new Date().valueOf() + wTime).toLocaleTimeString()
    ns.print(`Performing one cycle - done at ${done}`)
    batcher.stateEnd = done

    let { gt, wt, totalWt, totalT } = calcPrep(ns, server, hostS.cpuCores)
    let calcGt = gt
    let endTime = new Date(new Date().valueOf() + wTime).toLocaleTimeString()
    if (totalT > availableThreads) {
      let partial = Math.min(wt, availableThreads)
      let remaining = availableThreads - partial
      ns.print(JSON.stringify({ gt, wt, partial, remaining }))
      wt = partial
      gt = 0
      if (remaining > 0) {
        let full = Math.trunc(remaining / 27) // 2 grow, 25 weaken
        wt += 2 * full
        gt += 25 * full
        remaining -= full * 27
        wt += Math.min(remaining, 2)
        gt += Math.max(0, remaining - 2)
      }
      ns.print(JSON.stringify({ gt, wt, partial, remaining }))
      let doneServer = {...server, hackDifficulty: Math.max(server.hackDifficulty + gt * 0.004 - wt * 0.050, server.minDifficulty) }
      let newWeakenTime = hacking.weakenTime(server, player)
      endTime = endTime + `+${Math.trunc(newWeakenTime / 1000)}s?`
    } else {
      wt = totalWt // adjust to cover gt
      // gt is fine
    }

    ns.print('INFO: ' + JSON.stringify({ gt, wt, availableThreads, diff: server.hackDifficulty - server.minDifficulty, '$': server.moneyMax - server.moneyAvailable }, null, 2))
    let pids = []
    if (wt) {
      pids[0] = ns.exec(`/var/tmp/hgw-prep-weak.js`, host, wt, target, wt, new Date().valueOf())
      ns.print(`Weaking ${target} using ${wt} threads on ${host} - pid ${pids[0]}`)
    }
    if (gt) {
      pids[1] = ns.exec(`/var/tmp/hgw-prep-grow.js`, host, gt, target, gt, new Date().valueOf())
      ns.print(`Growing ${target} using ${gt} threads on ${host} - pid ${pids[1]} (need ${calcGt - gt} after)`)
    }
    if (!(gt || wt)) {
      ns.print(`prepping doesn't need any threads?!?!  ${server.hackDifficulty - server.minDifficulty}, ${server.moneyMax - server.moneyAvailable}`)
      break;
    }
    batcher.stateEnd = endTime
    await ns.sleep(wTime+100)
    while (ns.ps(host).filter(x => x.pid === pids[0] || x.pid === pids[1]).length) {
      await ns.sleep(1000)
    }
    server = ns.getServer(target)
    player = ns.getPlayer()
  }
  ns.print(`Done prepping...`)
  batcher.state = 'READY'
  batcher.stateEnd = ''
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
