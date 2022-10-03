import { money, short, colors as c, theme } from '/lib/format.js'

/**
 * Can we make batches easier?
 * 
 * What if we could just drop in what we need and run continuously?  Why
 * have I been scheduling so far ahead and setting up the commands first?
 * 
 * My new idea is that since the program is running all the time, we can
 * easily maintain a list of batches with the start time as the key.  Then we
 * have a set time window.  And since weakens are always scheduled before
 * grows, and grows before hacks, we can know if it's possible to schedule
 * 
 * Here's my thought, say we have a 1 second batch time.
 * 
 * We only schedule the command if it is within the first 1/2 of the window for
 * it.  One second batch, we schedule the commands to end in this frame, giving
 * us a buffer for late commands:
 * 
 *    Hack (0ms-125ms)
 *    WeakenGrow (250ms-375ms)
 *    Grow (500ms-625ms)
 *    WeakenGrow (750ms-825ms)
 * 
 * The batch objects will have when each command is sceduled.  They will have
 * the batch start time as a key.  Given a time we can find the batch id
 * by modding by our set batch time (1000ms). Say we are running a batch
 * and `performance.now() + hackTime` equals returns `16234843.28282`.  We
 * We divide that by 1000 (our batch ms) to get 16234.  We take the remainder
 * (843) and realize that isn't in the correct time for a hack (0-125) so 
 * we skip the hack.  If the remainder was say 19, we could lookup the object:
 * 
 * {
 *  16234: { weakenHack: true, grow: true, weakenGrow: true }
 * }
 * 
 * And only schedule if hack isn't already set, and if all the other three
 * are set.
 * 
 * Then we repeat the checks for each of the other commands, all at the same
 * interval between sleeps.  Then we sleep for say 10ms and try again.  This
 * should be really fast since we are just doing a getServer(), getPlayer(),
 * and checking formulas.
 * 
 * 
 * hp = hackPercent (for 1 thread)
 * gp = total grow percent to equal hp
 * h = max * hp
 * g = (1 - (max * hp)) * gp
 * g = h
 * (1 - (max * hp)) * gp = max * hp
  * simplify using max = 1
 * gp * (1 - hp) = hp
 * gp = hp / (1 - hp)
 * at hp = 0.5, gp will be 1, which is correct, 100% growth of 50% money
 * at hp = 0.75, gp will be 3, which is correct, 300% growth of 25% money
 * at hp = 0.25, gp will be 0.333, which makes sense, 1/4 loss means grow 1/3 of remaining
 * however, I'm trying to maximize total threads (tt) which is hack threads (ht) + grow threads (gt)
 * 
 * ht = 1, say we have 1 hack thread
 * we have gp = hp / (1 - hp) formula
 * to get gt, we take gp / growPercent
 * and total threads will be gt + 1
 * gp = gt * growPercent
 * gt * growPercent = hp / (1 - hp)
 * gt = hp / ((1 - hp) * growPercent)
 * tt = hp / ((1 - hp) * growPercent) + 1
 * 
 * at hp = 0.5 and growPercent = 0.1, that should give 10 grow threads
 * at hp = 0.75, and growPercent = 0.1, that whould give 30 grow threads
 * at hp = 0.25, and growPercent = 0.1, that would give 3.333 grow threads
 * 
 * UGGG!  I don't see a way to maximize the function for thread count
 * 
 * Oh, ht is really the input I want, and hp is calculated off that.  So
 * let's replace hp with (ht * hackPercent), but I want to maximize hp using
 * the formula...
 * 
 * gt = hp / ((1 - hp) * growPercent)
 * tt = hp / ((1 - hp) * growPercent) + ht
 * tt = (ht * hackpercent) / ((1 - (ht * hackpercent)) * growPercent) + ht
 */

const config = {
  overGrow: 0.1, // over-grow 10% to handle hacks starting later with higher skill
}

const logTable = (rows, heading = null, headers = null, formatters = null) => {
	const a = `\x1b[37m` // white
	const b = `\x1b[36m` // cyan
	const c = `\x1b[33m` // yellow
  // const d = '\x1b[34m' // blue (is too dark)
  const d = '\x1b[38;5;81m' // lighter blue

  if (headers) {
		rows.unshift(headers)
	}
	rows = rows.map(row => {
		return row.map((col, index) => (formatters && formatters[index] && typeof(col) !== 'string') ? formatters[index](col) : `${col}`)
	})

	const lines = []

	const maxLengths = rows[0].map((v, index) => {
		// we just care about the index
		return rows.reduce((p, c) => Math.max(p, c[index].length), 0)
	})
	
	// simple heading
	if (heading) lines.push(`${b}[${a}+${b}]${d} ${heading}`);

	rows.forEach(row => {
		const combined = ` ${b}|${a} ` + row.map((x, index) => x.padEnd(maxLengths[index])).join(` ${b}|${a} `) + ` ${b}|`
		lines.push(combined)
	})

	if (headers) {
		const divider = ' |' + maxLengths.map(length => {
			return ''.padEnd(length + 2, '-');
		}).join('|') + '|'
		lines.splice(2, 0, divider)
	}

  return lines
}

/** @param {NS} ns */
export async function main(ns) {
  if (ns.args.length === 0) {
    ns.tprint(`run sim2.js <target> [<host>] [<playerLevel>]`)
    return
  }

  ns.tail()
  await ns.asleep(1)
	ns.moveTail(320, 40)
	ns.resizeTail(1280, 600)

  let [target, host, RAM_GB, PLAYER_LEVEL] = ns.args
  target = target || 'omega-net'

  //----------------------------------------------------------------------------------------------------
  // set parameters for test
  // BATCH_MS = 1000 || BATCH_MS // 1 second batches
  const DURATION = 3600 // run for 3600 seconds
  let serverHost = ns.getServer(host)
  RAM_GB = RAM_GB || (serverHost.maxRam - serverHost.ramUsed)
  const CORES = serverHost.cpuCores || 1

  let player = ns.getPlayer()
  PLAYER_LEVEL = PLAYER_LEVEL || player.skills.hacking
  player.skills.hacking = PLAYER_LEVEL

  let serverCurrent = ns.getServer(target)
  let serverMaxxed = { ...serverCurrent, hackDifficulty: serverCurrent.minDifficulty, moneyAvailable: serverCurrent.moneyMax }
  let hackPercent = ns.formulas.hacking.hackPercent(serverMaxxed, player)
  
  let serverHalfMoney = { ...serverMaxxed, moneyAvailable: serverMaxxed.moneyMax / 2}
  let growPercent = ns.formulas.hacking.growPercent(serverHalfMoney, 1, player, 1) - 1
  let weakenTime = ns.formulas.hacking.weakenTime(serverMaxxed, player)
  ns.tprint(`weakenTime for server ${serverMaxxed.hostname} is ${weakenTime}`)
  let growTime = ns.formulas.hacking.growTime(serverMaxxed, player)
  let hackTime = ns.formulas.hacking.hackTime(serverMaxxed, player)
  let hackChance = ns.formulas.hacking.hackChance(serverMaxxed, player)

  if (hackChance <= 0) {
    let neededLevels = serverCurrent.requiredHackingSkill - player.skills.hacking
    const reset = '\x1b[0m'
    const white = `\x1b[36m`
    const server = white
    const other = white

    ns.tprint(`${theme.hostname(target)} is unhackable at the moment, use ${theme.command('--addhack <levels>')} with at least ${neededLevels}`)
    ns.tprint(`Theme:`)
    Object.keys(theme.colors).forEach(key => {
      ns.print(`Theme color ${key} ${theme[key]('looks like this')} and has reset`)
    })
    return
  }

  ns.print(JSON.stringify({
    hackChance, hackPercent, growPercent, hackTime, growTime, weakenTime, RAM_GB
  }, null, 2))

  let sf = x => `${Math.trunc(x * 100) / 100}`

  /**
   * Get detailed hacking information given global server variables and
   * the passed fraction of money to hack
   * 
   * @param {number} hp Percent (actually fraction) of money to hack, i.e. 0.10 is 10%
   */
  const getInfo = (hp, ram, runSeconds, level = null) => {
    ram = ram || RAM_GB
    runSeconds = runSeconds || DUR
    level = level || PLAYER_LEVEL
    player.skills.hacking = level

    // hacking 1% to 50% of a server's money
    let hm = serverMaxxed.moneyAvailable * hp // hacked money
    let gp = hp / (1 - hp)
    let ht = hp / hackPercent
    let gt = gp / growPercent
    let wt = (ht * 0.002) + (gt * 0.004)
    let tt = ht + gt + wt
    let ratio = tt / hp
    let time = ht * hackTime + gt * growTime + wt * weakenTime // total time all threads are running if spread out
    let roi = (hm * hackChance) / (time / 1000) // generic roi at specified percent per thread-second

    // now real ratio, no partial threads
    let rht = Math.ceil(ht)
    let rhp = rht * hackPercent
    let rhm = serverMaxxed.moneyAvailable * rhp // real hacked money
    let realHackedServer = { ...serverMaxxed, moneyAvailable: serverMaxxed.moneyMax - rhm } // server with money stolen, but difficulty minimized by weaken after hack
    let realGrowPercent = ns.formulas.hacking.growPercent(realHackedServer, 1, player, CORES) - 1 // for 1 thread
    let growthPercentNeeded = rhm / realHackedServer.moneyAvailable // money needed / money remaining
    let rgt = Math.ceil(growthPercentNeeded / realGrowPercent)
    let rwht = Math.ceil(ht * 0.002 / 0.050) // real weaken threads to make up for hacking
    let rwgt = Math.ceil(gt * 0.004 / 0.050) // real weaken threads to make up for growing
    let rwt = rwht + rwgt
    let rtt = rht + rgt + rwt // real total threads needed for one batch
    let rratio = rtt / rhp // lower is better - threads per real hacked money
    let rtime = rht * hackTime + rgt * growTime + rwt * weakenTime // total time all threads are running if spread out
    let btime = weakenTime // batch time
    let rroi = (rhm * hackChance) / (rtime / 1000) // money per thread-second taking into account hackChance

    // gbs is gigabyte-seconds.   It is a measure of how many seconds this batch would take
    // if it is given 1gb. This isn't a real figure since the batch will obviously take more
    // ram to run, but it spreads that ram out over time.
    // For example: (rht * 1.7 * hackTime) / 1000
    //    This means you will use up 1.7 gb for each hack thread and the hack threads will be 
    //    running for hackTime / 1000 seconds.   So it would use that much memory for that much time.
    // Since we will be using ram efficiently, we should be able to pretty much have batches running
    // at all times and using as much ram as possible.  
    // 
    // So if our server has 32TB (32768 gb) free ram and we run for an hour, we take
    // 32768 gb * 3600 seconds to get 117964800 gbs and divide it by this calculated gbs
    // for these values.  Maybe have to subtract the initial weaken time for the wasted time
    // before we start earning?
    let gbs = ((rht * 1.7 * hackTime) + (rgt * 1.75 * growTime) + (rwt * 1.75 * weakenTime)) / 1000
    let avaialbleGbs = ram * (3600 - (weakenTime / 1000))
    let runs = Math.trunc(avaialbleGbs / gbs)
    let interval = DURATION * 1000 / runs
    let totalProfit = runs * rhm * hackChance
    const totalHackExp = ns.formulas.hacking.hackExp(serverMaxxed, player) * runs * rht
    const startingLevel = ns.formulas.skills.calculateSkill(player.exp.hacking, player.mults.hacking_exp)
    const endingLevel = ns.formulas.skills.calculateSkill(player.exp.hacking + totalHackExp, player.mults.hacking_exp)

    return {hp, hm, gp, ht, gt, wt, tt, ratio, time, roi, rht, rhp, rhm, growthPercentNeeded, rgt, rwht, rwgt, rwt, rtt, rratio, rtime, btime, rroi, gbs, runs, totalProfit, totalHackExp, startingLevel, endingLevel, usedLevel: level, interval}
  }

  // calculate info and times for 0.1% increments up to 1% and 1% increments up to 50% money hacked
  let times = []
  for (let i = 0.1; i < 1; i += 0.1) times.push(i)
  for (let i = 1; i < 51; i++) times.push(i)
  let infos = times.map(p => getInfo(p / 100, RAM_GB, DURATION)).sort((a, b) => b.totalProfit - a.totalProfit)
  let headers = [
    'profit',
    'threads',
    'hack %',
    'hack $',
    'batches',
    'interval',
  ]
  let rows = infos.map(info => [
    money(info.totalProfit),
    `${sf(info.rht)}/${sf(info.rwht)}/${sf(info.rgt)}/${sf(info.rwgt)}`,
    sf(info.rhp * 100) + '%',
    money(info.rhm),
    sf(info.runs),
    sf(info.interval)])

  var table = logTable(rows.slice(0, 10), "Hacking Info", headers, null)
  ns.print('table:\n' + table.join('\n'))

  let values = [
    ['hackPercent', hackPercent],
    ['hackChance', hackChance],
    ['hackTime', hackTime],
    ['weakenTime', weakenTime],
    ['growTime', growTime],
    ['growPercent', growPercent],
    ['maxMoney', money(serverMaxxed.moneyMax)],
    ['moneyAvailable', money(serverCurrent.moneyAvailable)],
    ['minDifficulty', serverMaxxed.minDifficulty],
    ['batchSeconds', short(weakenTime/60000)],
    ['runs', infos[0].runs],
    ['totalProfit', money(infos[0].totalProfit)],
    ['startingLevel', infos[0].startingLevel],
    ['totalHackExp', infos[0].totalHackExp],
    ['endingLevel', infos[0].endingLevel],
    ['usedLevel', infos[0].usedLevel],
    ['hackThreads', infos[0].rht],
    ['weakhackThreads', infos[0].rwht],
    ['growThreads', infos[0].rgt],
    ['weakgrowThreads', infos[0].rwgt],  ]

  table = logTable(values, `${target}`, null, null)
  ns.tprint('values:\n' + table.join('\n'))

  if (!host) {
    ns.tprint('INFO: Specify host parameter for detailed information, add memory to limit memory')
    return
  }

  // let serverHost = ns.getServer(host)
  // ram = ram || serverHost.maxRam - serverHost.ramUsed
  // let threads = Math.trunc(ram / 1.75)


  // for (let i = 0.25; i < 1; i += 0.05) {
  //   let hp = i
  //   let gp = hp / (1 - hp)
  //   ns.tprint(`${i}`.padLeft(5, ' ') + `: `)
  // }
}
