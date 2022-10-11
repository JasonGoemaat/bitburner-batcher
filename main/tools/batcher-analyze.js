import { createTable, createVTable, getCustomFormulas } from '/lib'

/** @param {NS} ns */
export function main(ns) {
  const [host, target] = ns.args
  if (!host || !target) { ns.tprint('ERROR: must pass host and target'); return }
  
  const hostServer = ns.getServer(host)
  const ram = hostServer.maxRam
  const maxThreads = Math.floor(ram / 1.75) // hacks are a bit cheaper, meh
  
  /** @type {HackingFormulas} */
  const hacking = getCustomFormulas()
  const player = ns.getPlayer()
  const server = ns.getServer(target)
  const prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}

  const money = prepped.moneyMax

  const htime = hacking.hackTime(prepped, player)
  const gtime = htime * 4
  const wtime = htime * 5

  const hper = hacking.hackPercent(prepped, player)
  const gper = hacking.growPercent(prepped, 1, player, 1) - 1
  const hchance = hacking.hackChance(prepped, player)

  const batchTime = 400
  const maxBatches = Math.trunc(wtime / batchTime)

  const calculate = (hackThreads) => {
    const hackPercent = hackThreads * hper
    if (hackPercent > 0.7 || hackPercent <= 0) return null // don't want a hack to go lower
    const totalHackMoney = money * hackPercent
    const remainingMoney = money - totalHackMoney
    const requiredGrowPercent = totalHackMoney / remainingMoney
    const growThreads = Math.ceil(requiredGrowPercent / gper)
    const growPercent = growThreads * gper
    let growThreadsEach = Math.ceil(growThreads / 2)
    const weakenThreads = Math.max(Math.ceil(growThreadsEach / 12.5), Math.ceil(hackThreads / 25))
    const totalActiveThreads = hackThreads + growThreads * 8 + weakenThreads * 5 * 3
    const realHackMoney = totalHackMoney * hchance

    //----------------------------------------------------------------------------------------------------
    // ok, here's our changes from calculateOld
    // 1 hack requires 2 grow and 6 weakens,
    //  scheduling w,w,w,g,w,w,w,g and fitting hacks in somewhere:
    //             w,h,w,w,g,w,w,h,w,g for example, doesn't matter which end has two weakens


    //----------------------------------------------------------------------------------------------------

    // let batches = maxThreads / totalActiveThreads
    const ramPerBatch = hackThreads * 1.7 + growThreadsEach * 2 * 4 * 1.75 + weakenThreads * 3 * 5 * 1.75
    const activeBatches = Math.trunc(ram / ramPerBatch)
    const wtpms = activeBatches * 3 / (htime) // weaken threads per millisecond
    const weakenDelay = 1/wtpms
    let batches = wtime / weakenDelay / 3
    let batches2 = Math.trunc(ram / ramPerBatch)
    //let weakenDelay = Math.trunc(wtime / batches / 3)
    
    // double-check calculations for what is active at any one time
    let calcWeakens = Math.trunc(wtime / weakenDelay) // all weakens are active
    let calcGrows = (calcWeakens * 2/3) * 4/5 // 2/3 as many grows as weakens in the same time, 4/5 the time
    let calcHacks = (calcWeakens * 1/3) / 5 // 1/3 as many hacks as weakens in the same time, 1/5 the time
    let calcRamUsage = calcWeakens * weakenThreads * 1.75 + calcGrows * growThreadsEach * 1.75 + calcHacks * hackThreads * 1.7
    // weakenDelay = weakenDelay * calcRamUsage / ram
    // batches = wtime / weakenDelay / 3

    const profitPerSecond = realHackMoney * (1000 / (weakenDelay * 3))
    const profitPerMinute = realHackMoney * (60000 / (weakenDelay * 3))
    const profitPerHour = realHackMoney * (3600000 / (weakenDelay * 3))
    // const profitPerHour = realHackMoney * batches * 3600000 / wtime
    return { hackThreads, growThreadsEach, growThreads, weakenThreads, hackPercent, totalHackMoney,
      growPercent, totalActiveThreads, realHackMoney, batches, weakenDelay, batchTime: weakenDelay * 2,
      profitPerHour, calcWeakens, calcGrows, calcHacks, calcRamUsage, batches2 }
  }

  const calculateOld = (hackThreads) => {
    const hackPercent = hackThreads * hper
    if (hackPercent > 0.7 || hackPercent <= 0) return null // don't want a hack to go lower
    const totalHackMoney = money * hackPercent
    const remainingMoney = money - totalHackMoney
    const requiredGrowPercent = totalHackMoney / remainingMoney
    const growThreads = Math.ceil(requiredGrowPercent / gper)
    const growPercent = growThreads * gper
    let growThreadsEach = Math.ceil(growThreads / 2)
    const weakenThreads = Math.max(Math.ceil(growThreadsEach / 12.5), Math.ceil(hackThreads / 25))
    const totalActiveThreads = hackThreads + growThreads * 8 + weakenThreads * 5 * 3
    const realHackMoney = totalHackMoney * hchance
    
    // let batches = maxThreads / totalActiveThreads
    const ramPerBatch = hackThreads * 1.7 + growThreadsEach * 2 * 4 * 1.75 + weakenThreads * 3 * 5 * 1.75
    const activeBatches = Math.trunc(ram / ramPerBatch)
    const wtpms = activeBatches * 3 / (htime) // weaken threads per millisecond
    const weakenDelay = 1/wtpms
    let batches = wtime / weakenDelay / 3
    let batches2 = Math.trunc(ram / ramPerBatch)
    //let weakenDelay = Math.trunc(wtime / batches / 3)
    
    // double-check calculations for what is active at any one time
    let calcWeakens = Math.trunc(wtime / weakenDelay) // all weakens are active
    let calcGrows = (calcWeakens * 2/3) * 4/5 // 2/3 as many grows as weakens in the same time, 4/5 the time
    let calcHacks = (calcWeakens * 1/3) / 5 // 1/3 as many hacks as weakens in the same time, 1/5 the time
    let calcRamUsage = calcWeakens * weakenThreads * 1.75 + calcGrows * growThreadsEach * 1.75 + calcHacks * hackThreads * 1.7
    // weakenDelay = weakenDelay * calcRamUsage / ram
    // batches = wtime / weakenDelay / 3

    const profitPerSecond = realHackMoney * (1000 / (weakenDelay * 3))
    const profitPerMinute = realHackMoney * (60000 / (weakenDelay * 3))
    const profitPerHour = realHackMoney * (3600000 / (weakenDelay * 3))
    // const profitPerHour = realHackMoney * batches * 3600000 / wtime
    return { hackThreads, growThreadsEach, growThreads, weakenThreads, hackPercent, totalHackMoney,
      growPercent, totalActiveThreads, realHackMoney, batches, weakenDelay, batchTime: weakenDelay * 2,
      profitPerHour, calcWeakens, calcGrows, calcHacks, calcRamUsage, batches2 }
  }

  let byWeakenThreads = []
  for (let i = 0; i < 1000; i++) {
    let values = calculate(i + 1)
    if (!values) break
    if (byWeakenThreads.length !== 0 && byWeakenThreads[byWeakenThreads.length -1].weakenThreads === values.weakenThreads) {
      byWeakenThreads[byWeakenThreads.length - 1] = values
    } else {
      byWeakenThreads[byWeakenThreads.length] = values
    }
  }
  if (byWeakenThreads.length === 0) {
    ns.tprint('ERROR!  Could not find a valid configuration')
    return
  }

  // ns.tprint('byWeakenThreads[1]:' + JSON.stringify(byWeakenThreads[1], null, 2))
  
  const transformed = byWeakenThreads.map(x => ({
    batches: ns.nFormat(x.batches, '0,000'),
    batches2: ns.nFormat(x.batches2, '0,000'),
    // wtime: ns.nFormat(wtime/1000, '0,000.0') + 's',
    wdelay: ns.nFormat(x.weakenDelay || 0, '0,000'),
    weak: x.weakenThreads,
    hack: x.hackThreads,
    growx2: x.growThreadsEach,
    tot: x.totalActiveThreads,
    'hack%': ns.nFormat(x.hackPercent || 0, '0.0%'),
    'grow%': ns.nFormat(x.growPercent || 0, '0.0%'),
    'hack$': ns.nFormat(x.totalHackMoney || 0, '$0,000.0a'),
    '$/hr': ns.nFormat(x.profitPerHour || 0, '$0,000.0a'),
    cWeak: ns.nFormat(x.calcWeakens, '0.0'),
    cGrow: ns.nFormat(x.calcGrows, '0.0'),
    cHack: ns.nFormat(x.calcHacks, '0.0'),
    cRam:  ns.nFormat(x.calcRamUsage, '0.0'),
  }))
  //ns.tprint('transformed[0]:' + JSON.stringify(transformed[0], null, 2))
  //ns.tprint('transformed[1]:' + JSON.stringify(transformed[1], null, 2))

  const table = createTable(transformed.slice(0, 50))
  ns.tprint('\n' + table.join('\n'))

  const values = { host, target, ram, maxThreads,
    moneyMax: ns.nFormat(server.moneyMax, '$0,000.0a'),
    htime: ns.nFormat(htime/1000, '0,000.0') + 's',
    gtime: ns.nFormat(gtime/1000, '0,000.0') + 's',
    wtime: ns.nFormat(wtime/1000, '0,000.0') + 's',
  }
  ns.tprint('\n' + createVTable(values).join('\n'))
}