/*
TODO:

1. get rid of 'reserved' ram
  * Instead, feel free to issue kills on future batches to free up ram
  * Start with maybe the next grow to schedule, cancel the whole batch
2. have multiple waves of weakens for both grow() and hack()
  * when scheduling a grow() or hack(), kill the extra weakens leaving
    only the most closely timed one at least 15ms ahead
  * add several weakens, at least XX ms apart (maybe 20?  50?)
  * hack and grow then have a lot of time to schedule and won't fail very often
  * weakens are super cheap, 1 weaken for 22 hacks for instance
  * Sample with 22/1/49/5 and having 5x weakens for each
    * adds 20 threads of weakengrow(), but only for a hack duration (1/5)
      * but cancelling a batch for a missed grow() isn't that bad then, we cancel more
      * 
    * adds 4 threads of weakenhack() for a grow duration (4/5)
*/

/** @param {NS} ns */
export async function main(ns) {
  // const [target, command, batchStartTime, startTime, expectedEndTime] = ns.args
  const target = 'rho-construction'

  ns.disableLog('sleep')
  ns.disableLog('exec')
  ns.disableLog('kill')

  const BATCH_DURATION = 500 // from sim2.js, seems like a good number
  
  // main settings to tweak, grow raised to 39 next sim at level 904, 18/1/39/4, that's not cool!
  // maybe I should add a grow thread all the time
  let THREADS = { hack: 12, grow: 24 }

  const host = 'home'

  // get host ram (not needed atm, we do this each cycle)
  // const maxRam = await ns.getServerMaxRam(host) - await ns.getServerUsedRam(host)
  const wbi = eval("window.mainBatchInfo = {}")
  const batchInfo = eval("window.batchInfo = {}")
  const batches = eval("window.batches = {}")
  Object.assign(batchInfo, {
    host,
    pid: ns.pid,
    duration: BATCH_DURATION, // just under theoretical max for 1300 skill on rho-construction with 32.5TB ram
    cycle: 10, // minimum ms for a check cycle
    canceledBatches: 0,
    slots: {
      hack: { min: 0, max: 200 },
      grow: { min: 250, max: 399 },
    },
    cycles: { // calculating how much time we spend processing cycles using performance.now()
      total: 0,
      totalMs: 0
    },
    reserved: 0, // mb reserved for batches we've created with weaken before starting hack and grow
    batches,
    getBatches: () => Object.keys(batches).map(key => batchInfo.batches[key]),
    getTotalReserved: () => Object.keys(batches).map(key => batchInfo.batches[key].reserved).reduce((p, c) => p + c, 0),
  })
  wbi[target] = batchInfo

  const completedBatches = eval("window.completedBatches = {}")
  const completed = eval("window.completed = []")

  let testServer = ns.getServer(target)
  if (testServer.hackDifficulty !== testServer.minDifficulty || testServer.moneyAvailable !== testServer.moneyMax) {
    ns.tprint(JSON.stringify(testServer, null, 2))
    ns.tprint(`ERROR!  ${target} needs prepping!`)
    ns.exit()
  }

  let FIRST_BATCH = 0

  let weakens = []
  let BASE_TIME = new Date().now()

  while (true) {
    let cycle_start = performance.now()
    let currentTime = new Date().valueOf()
    let player = ns.getPlayer()
    let server = ns.getServer(target)
    let isMinDifficulty = server.hackDifficulty === server.minDifficulty

    let hostServer = ns.getServer(host)
    let availableRam = hostServer.maxRam - hostServer.ramUsed - reserved
    wbi.availableRam = availableRam

    if (!FIRST_BATCH) FIRST_BATCH = Math.trunc((currentTime + ns.formulas.hacking.hackTime(server, player)) / BATCH_DURATION) * BATCH_DURATION

    let times = {
      hack: Math.trunc(currentTime + ns.formulas.hacking.hackTime(server, player)),
      grow: Math.trunc(currentTime + ns.formulas.hacking.growTime(server, player)),
      weak: Math.trunc(currentTime + ns.formulas.hacking.growTime(server, player)),
    }

    let batchIds = { // batch id is the start time frame for the batch
      hack: Math.trunc(times.hack / BATCH_DURATION) * BATCH_DURATION,
      grow: Math.trunc(times.grow / BATCH_DURATION) * BATCH_DURATION,
    }

    let inBatch = {
      hack: times.hack % BATCH_DURATION,
      grow: times.grow % BATCH_DURATION,
    }

    const batchesToCancel = new Set()

    // if ramping up, we start weakens
    if (currentTime < FIRST_BATCH) {}

    /**
     * Schedule a command and return the starting object for it
     */
    const schedule = (batch, script, threads, command, expectedFinish) => {
      let execArgs = [`/remote/${script}-target.js`, host, threads, target, command, batch.startTime, expectedFinish]
      let info = {
        host,
        pid: 0, // set below
        result: null, // set by script
        execStart: currentTime,
        actualStart: 0, // set by script
        expectedFinish,
        actualFinish: 0, // set by script
        // execArgs, // if ns.kill(pid) doesn't work
      }
      batch[command] = info

      // target, command, batchStartTime, startTime, expectedEndTime
      info.pid = ns.exec(...execArgs)

      // ---------- for initial testing ----------
      // ns.tprint(JSON.stringify(execArgs, null, 2))
      // ns.tprint(JSON.stringify(info, null, 2))
      // ns.exit()
    }

    if (inBatch.hack >= batchInfo.slots.hack.min && inBatch.hack <= batchInfo.slots.hack.max) {
      // if we're at min difficulty and in hack windows, check for cancelling previous batch
      if (isMinDifficulty) {
        const previousBatchId = batchIds.hack - BATCH_DURATION * 5
        let previousBatch = batchInfo.batches[previousBatchId]
        if (previousBatch && !previousBatch.hack) batchesToCancel.add(previousBatchId)
      }

      let batch = batchInfo.batches[batchIds.hack]
      if (batch) {
        if (isMinDifficulty && !(batch.weakhack && batch.weakgrow && batch.grow)) {
          batchesToCancel.add(batchIds.hack)
        } else if (!batch.hack) {
          schedule(batch, 'hack', THREADS.hack, 'hack', times.hack)
          batch.time = times.hack
          batch.reserved -= MEMORY.hack
          reserved -= MEMORY.hack
        }
      }
    }

    if (inBatch.grow >= batchInfo.slots.grow.min && inBatch.grow < batchInfo.slots.grow.max) {
      let batch = batchInfo.batches[batchIds.grow]
      if (batch) {
        if (isMinDifficulty && !(batch.weakhack && batch.weakgrow)) {
          ns.tprint(`grow() - missing a weaken, adding batch id ${batchIds.grow} to cancel list`)
          batchesToCancel.add(batchIds.grow)
        } else if (!batch.grow) {
          schedule(batch, 'grow', THREADS.grow, 'grow', times.grow)
          batch.time = times.grow
          batch.reserved -= MEMORY.grow
          reserved -= MEMORY.grow
        }
      }
    }

    // check previous batch and move to completed after a short delay
    const oldBatch = Math.trunc(currentTime / BATCH_DURATION) - BATCH_DURATION * 4
    if (batchInfo.batches[oldBatch]) {
      completedBatches[oldBatch] = batchInfo.batches[oldBatch]
      completed.push(batchInfo.batches[oldBatch])
      delete batchInfo.batches[oldBatch]
    }

    let cycle_end = performance.now()
    const cycle_ms = (cycle_end - cycle_start)
    batchInfo.cycles.total += 1
    batchInfo.cycles.totalMs += cycle_ms
    await ns.sleep(Math.max(1, batchInfo.cycle - cycle_ms))
  }
}

let server = ns.getServer(TARGET)
if (server.hackDifficulty != server.minDifficulty) { ns.tprint(`${TARGET} not at min difficulty: ${server.hackDifficulty}`); return }
if (server.moneyAvailable != server.moneyMax) { ns.tprint(`${TARGET} not at min difficulty: ${server.hackDifficulty}`); return }

let weakenServers = getWeakenServers()
for (let i = 0; i < weakenServers.length; i++) {
  await ns.scp(['/remote/weak-target.js', '/remote/grow-target.js', '/remote/hack-target.js'], weakenServers[i].hostname)
}

const scheduleWeaken = (ns, id, command, params) => {
  let hostname = 'home'
  if (weakenServers.length > 0) {
    hostname = weakenServers[0]
    weakenServers[0].maxRam -= 1.75
    if (weakenServers[0].maxRam < 1.75) weakenServers = weakenServers.slice(1)
  }
  ns.exec('/remote/weak-target.js', TARGET, id, command, params)
}

let start = new Date().valueOf()
let weakenTime = ns.formulas.hacking.weakenTime(server)
let firstWeakenTime = weakenTime + start
let nextTime = start
while (nextTime < firstWeakenTime) {
  let time = new Date().valueOf()
  if (time >= nextTime) {
    scheduleWeaken(time, 'weaken', '')
    nextTime += 50
  }
  let sleepMs = nextTime - new Date().valueOf() - 15
  if (sleepMs >= 1) await ns.sleep(sleepMs)
}