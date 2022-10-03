/** @param {NS} ns */
export async function main(ns) {
  // const [target, command, batchStartTime, startTime, expectedEndTime] = ns.args
  const target = 'rho-construction'

  ns.disableLog('sleep')
  ns.disableLog('exec')
  ns.disableLog('kill')

  const SAFETY_THRESHOLD = 15 // if hack or grow is under this threshold, cancel batch
  const BATCH_DURATION = 500 // from sim2.js, seems like a good number
  const THREADS = {
    hack: 18, weakhack: 1, grow: 38, weakgrow: 4 // from sim2.js
  }
  const MEMORY = {
    hack: 1.7 * THREADS.hack,
    weakhack: 1.75 * THREADS.weakhack * 1/5,
    grow: 1.75 * THREADS.grow * 4/5,
    weakgrow: 1.75 * THREADS.weakgrow,
  }

  const host = 'home'

  // ensure scripts are present on the host server(s), and the most recent copies
  if (host !== 'home') await ns.scp(['/remote/weak-target.js', '/remote/grow-target.js', '/remote/hack-target.js'], target)

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
    slots: { // must exec command within this many ms of batch start

      // here the times are spread out, but shouldn't I want to get the hacks/grows
      // to execute as soon before the weakens as I can?
      // hack: { min: BATCH_DURATION*0/4, max: BATCH_DURATION*1/4 - SAFETY_THRESHOLD },
      // weakhack: { min: BATCH_DURATION*1/4, max: BATCH_DURATION*2/4 - SAFETY_THRESHOLD },
      // grow: { min: BATCH_DURATION*2/4, max: BATCH_DURATION*3/4 - SAFETY_THRESHOLD },
      // weakgrow: { min: BATCH_DURATION*3/4, max: BATCH_DURATION*4/4 - SAFETY_THRESHOLD },

      // weakens take much less memory (1/18th a hack and about 1/9 a grow)
      // I *could* actually schedule a bunch of each and kill the extras after I know when
      // the hack/grow are actually sceduled so only the first one after is executed...
      // that wouldn't help as much for hack() because they start after the weakens have already
      // been running a long time, but for the grow that might work...
      // another idea is to spread out the weakens and spread a few extra in.  When they are executed
      // doesn't matter as much, difficulty only affects their scheduling

      // anyway, here I'm just shortening the times for hack and grow so we will spend more
      // time weakened, and hopefully schedule everything in
      hack: { min: 0, max: 49 },
      weakhack: { min: 50, max: 249 },
      grow: { min: 250, max: 299 },
      weakgrow: { min: 300, max: 499 },
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
  
  // start off reserving memory for ~2 batches threads scheduled as a safety measure
  // let reserved = (MEMORY.grow + MEMORY.hack + MEMORY.weakgrow + MEMORY.weakhack) * 2
  let reserved = 0

  let testServer = ns.getServer(target)
  if (testServer.hackDifficulty !== testServer.minDifficulty || testServer.moneyAvailable !== testServer.moneyMax) {
    ns.tprint(JSON.stringify(testServer, null, 2))
    ns.tprint(`ERROR!  ${target} needs prepping!`)
    ns.exit()
  }

  while (true) {
    wbi.reserved = reserved
    let cycle_start = performance.now()

    let hostServer = ns.getServer(host)
    let availableRam = hostServer.maxRam - hostServer.ramUsed - reserved
    wbi.availableRam = availableRam
    let server = ns.getServer(target)
    let isMinDifficulty = server.hackDifficulty === server.minDifficulty
    let player = ns.getPlayer()
    let currentTime = new Date().valueOf()
    let times = {
      hack: Math.trunc(currentTime + ns.formulas.hacking.hackTime(server, player)),
      weakhack: Math.trunc(currentTime + ns.formulas.hacking.weakenTime(server, player)),
      grow: Math.trunc(currentTime + ns.formulas.hacking.growTime(server, player)),
      weakgrow: Math.trunc(currentTime + ns.formulas.hacking.weakenTime(server, player)),
    }
    let batchIds = { // batch id is the start time frame for the batch
      hack: Math.trunc(times.hack / BATCH_DURATION) * BATCH_DURATION,
      weakhack: Math.trunc(times.weakhack / BATCH_DURATION) * BATCH_DURATION,
      grow: Math.trunc(times.grow / BATCH_DURATION) * BATCH_DURATION,
      weakgrow: Math.trunc(times.weakgrow / BATCH_DURATION) * BATCH_DURATION,
    }
    let inBatch = {
      hack: times.hack % BATCH_DURATION,
      weakhack: times.weakhack % BATCH_DURATION,
      grow: times.grow % BATCH_DURATION,
      weakgrow: times.weakgrow % BATCH_DURATION,
    }

    const batchesToCancel = new Set()

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
        execArgs, // if ns.kill(pid) doesn't work
      }
      batch[command] = info

      // target, command, batchStartTime, startTime, expectedEndTime
      info.pid = ns.exec(...execArgs)

      // ---------- for initial testing ----------
      // ns.tprint(JSON.stringify(execArgs, null, 2))
      // ns.tprint(JSON.stringify(info, null, 2))
      // ns.exit()
    }

    const killChild = (info) => {
      const args = [...info.execArgs]
      const script = args.shift()
      const host = args.shift()
      const threads = args.shift()
      ns.kill(script, host, ...args)
      //ns.print(`killChild() killing ` + JSON.stringify(info, null, 2))
      //ns.tprint(`killChild() killing ` + JSON.stringify(info, null, 2))
      //ns.kill(info.pid) // think this works on the same computer for reference save?  if not will use above
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

    if (inBatch.weakgrow >= batchInfo.slots.weakgrow.min && inBatch.weakgrow < batchInfo.slots.weakgrow.max) {
      let batch = batchInfo.batches[batchIds.weakgrow]
      if (batch && batch.weakhack && !batch.weakgrow) {
        schedule(batch, 'weak', THREADS.weakgrow, 'weakgrow', times.weakgrow)
        batch.time = times.weakgrow
        batch.reserved -= MEMORY.weakgrow
        reserved -= MEMORY.weakgrow
      }
    }

    if (inBatch.weakhack >= batchInfo.slots.weakhack.min && inBatch.weakhack < batchInfo.slots.weakhack.max) {
      let batch = batchInfo.batches[batchIds.weakhack]
      // this one won't exist since weakhack should be scheduled first
      if (!batch && availableRam >= MEMORY.hack + MEMORY.grow + MEMORY.weakgrow + MEMORY.weakhack) {
        batch = batchInfo.batches[batchIds.weakhack] = { startTime: batchIds.weakhack }
        schedule(batch, 'weak', THREADS.weakhack, 'weakhack', times.weakhack)
        batch.time = times.weakhack

        // reserve ram for the other commands in this batch
        // TODO: Possible alter memory by fraction of weaken time, i.e. MEMORY.hack*1/5 and MEMORY.grow*4/5
        batch.reserved = (MEMORY.hack + MEMORY.grow + MEMORY.weakgrow)
        reserved += batch.reserved
      }
    }

    Array.from(batchesToCancel).forEach(batchId => {
      ns.tprint(`cancelling batch id ${batchId}`)
      let batch = batchInfo.batches[batchId]
      if (batch) {
        completedBatches[batchId] = batch
        completed.push(batch)
        batch.cancelled = true
        batch.cancelTime = currentTime
        delete batchInfo.batches[batchId]
        batchInfo.canceledBatches++

        if (batch.weakhack) {
          killChild(batch.weakhack)
        }
        
        if (batch.weakgrow) {
          killChild(batch.weakgrow)
        } else {
          reserved -= MEMORY.weakgrow // canceling script we already reserved memory for but haven't run
          batch.reserved -= MEMORY.weakgrow
        }

        if (batch.grow) {
          killChild(batch.grow)
        } else {
          reserved -= MEMORY.grow // canceling script we already reserved memory for but haven't run
          batch.reserved -= MEMORY.grow
        }

        // shouldn't cancel if hack was assigned, unless maybe we're easing off?
        if (batch.hack) {
          killChild(batch.hack)
          ns.tprint('KILLING A HACK?!?!?! ' + JSON.stringify(batch.hack, null, 2))
        } else {
          reserved -= MEMORY.hack // canceling script we already reserved memory for but haven't run
          batch.reserved -= MEMORY.hack
        }
      }
    })

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
