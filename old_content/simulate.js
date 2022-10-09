// Cool, I can just run with this
// Analyze a server
// We will run batches
//		* the active hacking time will be hackMs
//		* each batch will run 3 commands, weaken, hack, grow
//		* there will be a delay between each command
// So totalTime = hackMs + weakenMs
// BatchCount = hackMs / delay / 3

import { default as formulas, getHackingFormulas } from '/lib/formulas.js'
import { default as format } from '/lib/format.js'
import { calculateBatch3, calculateBatch4 } from '/lib/calculate.js'

let hacking = {}

const showUsage = ns => {
	ns.tprint('Usage: run simulate-batch.js <target> [options]')
	ns.tprint('  <target>          - target machine')
	ns.tprint('  --delay <ms>      - use specified delay (default 100)')
	ns.tprint('  --mem <gb>        - use up to GB (default 2048)')
	ns.tprint('  --host <host>     - use host to run (and mem if not specified)')
	ns.tprint('  --reserve <gb>    - combined with host, reserves ram on host')
	ns.tprint('  --run             - actually run, picking most profitable')
	ns.tprint('  --cycles <cycles> - end after <cycles> cycles')
	ns.tprint('  --test            - run one batch for testing')
}

export function calculateHacks(formulas, server, player, delay) {
}

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('sleep')
	ns.disableLog('exec')
  ns.tail()
	hacking = getHackingFormulas(ns)
	let args = [...ns.args]
	let optionMem = null
	let optionHost = null
	let optionRun = false
	let optionDelay = 100
	let optionCycles = -1
	let optionReserve = 0
  let optionTest = false
	for (let i = 0; i < args.length;) {
		const optionName = `${args[i]}`;
		if (optionName.substring(0, 2) === '--') {
			args.splice(i, 1)
			switch (optionName) {
				case '--mem':
					optionMem = args.splice(i, 1)[0]
					break
				case '--delay':
					optionDelay = args.splice(i, 1)[0]
					break
				case '--host':
					optionHost = args.splice(i, 1)[0]
					break
				case '--reserve':
					optionReserve = args.splice(i, 1)[0]
					break
				case '--cycles':
					optionCycles = args.splice(i, 1)[0]
					break
        case '--run':
          optionRun = true
          break
        case '--test':
          optionTest = true
          break
        default:
					ns.tprint(`ERROR!   Unknown option '${optionName}'`)
					showUsage(ns)
					return
			}
		} else {
			i++
		}
	}
	let [target] = args
	ns.tprint(`Analyzing '${target}'`)
	if (!target) { ns.tprint(`ERROR!  target not specified!`); showUsage(ns); return; }

	if (optionRun && !optionHost) {
		ns.tprint(`The --host option must be specified when using --run`)
		showUsage()
		return
	}

	if (optionHost && (optionMem === null)) {
		let temp = ns.getServer(optionHost)
		optionMem = temp.maxRam - optionReserve
	}

	optionMem = optionMem || 2048

	let server = ns.getServer(target)
	let preppedServer = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
	let player = ns.getPlayer()
	let analyze = formulas.analyze(server, player)
	let prepped = analyze.prepped

	let delay = optionDelay
	let results = []

	const scriptRam = ns.getScriptRam('/remote/weaken.js')
	if (scriptRam < 1.6) {
		ns.tprint(`Invalid script ram for /remote/weaken.js: ${scriptRam}`)
		return
	}

	for (let hackThreads = 1; hackThreads <= 1000; hackThreads++) {
		let values = calculateBatch3(server, player, hackThreads, formulas, optionDelay)
		if (values.totalMemory > optionMem) break;
		results.push(values)
	}

	for (let hackThreads = 1; hackThreads <= 1000; hackThreads++) {
		let values = calculateBatch4(server, player, hackThreads, formulas, optionDelay)
		if (values.totalMemory > optionMem) break;
		results.push(values)
	}

	// results.sort((a, b) => a.profitPerTerabyteHour - b.profitPerTerabyteHour)
	results.sort((a, b) => a.profit - b.profit)

	ns.tprint(`${results.length} results`)

	// if  not running, list options and return
	if (!optionRun) {
		let lines = ['']
		lines.push(`Total Time: ${format.short(prepped.hackTime / 1000)} seconds`)
		for (let i = 0; i < results.length; i++) {
			let use = results[i]
			lines.push(`${use.method} ${use.batches} x ${use.hackThreads},${use.growThreads},${use.weakenThreads} hacks ${use.totalThreads} total ${format.money(use.profit)} per minute using ${format.gb(use.totalMemory)} at ${format.money(use.profitPerTerabyteHour)} /tb/h`)
		}
		ns.tprint(lines.join('\n'))
		
		ns.tprint(JSON.stringify(results.pop(), null, 2))

		// ns.tprint(JSON.stringify(analyze, null, 2))
		// ns.tprint(`hack chance: ${prepped.hackChance}`)
		return
	}

	await ns.scp('/remote/weaken.js', optionHost)
	ns.tprint(`Copied weaken.js to ${optionHost}`)
	await ns.sleep(100)
	await ns.scp('/remote/grow.js', optionHost)
	ns.tprint(`Copied grow.js to ${optionHost}`)
	await ns.sleep(100)
	await ns.scp('/remote/hack.js', optionHost)
	ns.tprint(`Copied hack.js to ${optionHost}`)
	await ns.sleep(100)
	ns.tprint(`Copied files to ${optionHost}`)


	let use = results.pop()
	ns.tprint(`${use.method} ${use.batches} x ${use.hackThreads} hacks ${use.totalThreads} total ${format.money(use.profit)} per minute using ${format.gb(use.totalMemory)} at ${format.money(use.profitPerTerabyteHour)} /tb/h`)
	ns.tprint(JSON.stringify(use, null, 2))
  await ns.sleep(100)

	let overallStart = performance.now()
	let overallHacked = 0

	ns.print(`${new Date().toLocaleTimeString()}: Starting batches, batch will take ${format.short((prepped.weakenTime + prepped.hackTime)/1000)} seconds`);
  await ns.sleep(100)
	let cycleCount = 0

	while(optionCycles < 0 || cycleCount < optionCycles) {
		cycleCount++
		
		// freshen server and player info, times can change as you gain hacking levels, etc.
		server = ns.getServer(target)
		player = ns.getPlayer(target)
		server = await prep(ns, server, player, optionMem, scriptRam, optionHost)
		analyze = formulas.analyze(server, player)
		prepped = analyze.prepped
    let lastPrepped = { ...prepped }

		ns.tprint(`${new Date().toLocaleTimeString()}: Starting batch...`);
    await ns.sleep(500)

		if (server.hackDifficulty > server.minDifficulty || server.moneyAvailable < server.moneyMax) {
			ns.print(`${new Date().toLocaleTimeString()}: PREP FAILED????`)
			await ns.sleep(1000)
			continue
		}

		let schedule = []
		let time = 0
		let batchStart = performance.now()

		const add = (name, batchId, command, threads, duration) => {
			schedule.push({
				time, batchId, command, threads, name, start: time - duration // start time below 0
			})
			time += optionDelay
		}

    const batchCount = (optionTest ? 1 : use.batches)
    ns.tprint(`Running ${batchCount} batches...`)
    await ns.sleep(500)
		for (let batchId = 1; batchId <= batchCount; batchId++) {
			add('hack', batchId, 'hack', use.hackThreads, prepped.hackTime)
			if (use.weakenHackThreads) add('weakenHack', batchId, 'weaken', use.weakenHackThreads, prepped.weakenTime)
			add('grow', batchId, 'grow', use.growThreads, prepped.growTime)
			add(use.weakenGrowThreads ? 'weakenGrow' : 'weaken', batchId, 'weaken', use.weakenGrowThreads || use.weakenThreads, prepped.weakenTime)
		}

		// let's toss in one final grow and one final weaken
		add('grow', 'XX', 'growLast', Math.ceil(use.growThreads + use.hackThreads / 3), prepped.growTime)
		add('weaken', 'XX', 'weakenLast', Math.ceil(use.weakenThreads + use.hackThreads * 2 / 3), prepped.weakenTime)

		// sort by start time
    ns.tprint(`Running ${schedule.length} schedules...`)
    await ns.sleep(500)
		schedule.sort((a, b) => a.start - b.start)

		let offset = schedule[0].start // negative number
		schedule.forEach(job => job.start -= offset) // now should start at 0
		const startTime = performance.now()

		while (schedule.length > 0) {
      //--------------------------------------------------------------------------------
      // TODO: Adjust times here, may have loop that keeps polling player?  Server *shouldn't* change and times should only lower as player gains hacking levels...
      const handleChange = async () => {
        server = ns.getServer(target)
        player = ns.getPlayer(target)
        analyze = formulas.analyze(server, player)
        prepped = analyze.prepped
        if (prepped.hackTime !== lastPrepped.hackTime) {
          // if (prepped.hackTime > lastPrepped.hackTime) {
          //   ns.print(`ERROR!  hackTime has increased from ${lastPrepped.hackTime} to ${prepped.hackTime}`)
          // }
          // const adjust = (j, lastPrepped, prepped) => {
          //   if (j.command === 'hack') {
          //     j.start += (lastPrepped.hackTime - prepped.hackTime)
          //   } else if (j.command === 'grow') {
          //     j.start += (lastPrepped.growTime - prepped.growTime)
          //   } else if (j.command === 'weaken') {
          //     j.start += (lastPrepped.weakenTime - prepped.weakenTime)
          //   }
          // }
          // for(let i = 0; i < schedule.length; i++) {
          //   adjust(schedule[j])
          // }
          // adjust(job)
          ns.tprint(`${new Date().toLocaleTimeString()}: WARNING: times have changed, hack from ${lastPrepped.hackTime} to ${prepped.hackTime}`)
          lastPrepped = prepped
          // schedule.unshift(job)
          return true
        }
        return false
      }

      await handleChange()

			let job = schedule.shift()
			let ms = job.start - (performance.now() - startTime)

      // if (ms < -optionDelay) {
      //   // missed a whole delay!
      //   if (job.command === 'hack' || job.command === 'grow') {
      //     ns.print(`Missed a hack, that's fine`)
      //     ns.print(`WARNING: Missed a ${job.command}.  SHAME SHAME SHAME, let's fix it later though`)
      //   }
      //   continue;
      // }

      if (ms >= 15) {
				await ns.sleep(ms)
			}

      //--------------------------------------------------------------------------------
			await ns.exec(`/remote/${job.command}.js`, optionHost, job.threads, target, job.name, job.batchId)
		}

		const sleepTime = prepped.hackTime + optionDelay * 4 + 1000
		ns.print(`${new Date().toLocaleTimeString()}: Sleeping for ${format.short(sleepTime/1000)} seconds`)
		await ns.sleep(sleepTime)
		
		// verify we are done, or wait for up to 30 seconds before restarting to prep again
		server = ns.getServer(target)
		let waitCount = 0
		for (let i = 0; i < 10 && (server.hackDifficulty > server.minDifficulty || server.moneyAvailable < server.moneyMax); i++) {
			waitCount++
			await ns.sleep(1000)
			server = ns.getServer(target)
		}
		if (waitCount) {
			ns.tprint(`ERROR!  ${target} Had to wait ${waitCount} seconds, need prep?`)
		}
		analyze = formulas.analyze(server, player)
		prepped = analyze.prepped

		let batchHacked = use.totalAmount
		overallHacked += batchHacked
		let overallTime = performance.now() - overallStart
		let batchTime = performance.now() - batchStart
		let fm = format.money, fs = format.short
		ns.print(`${new Date().toLocaleTimeString()}: batch  : ${fm(batchHacked)} in ${fs(batchTime/1000)}s at ${fm(batchHacked*60/(batchTime/1000))}/m`)
		ns.print(`${new Date().toLocaleTimeString()}: overall: ${fm(overallHacked)} in ${fs(overallTime/1000)}s at ${fm(overallHacked*60/(overallTime/1000))}/m`)
    if (optionTest) {
      break
    }
	}
}

/**  */

/**
 * @param {NS} ns
 * @param {Server} server Server info from ns.getServer(target)
 * @param {Player} player Player status for calculations
 * @param {number} ram Ram to use
 * @param {number} scriptRam Ram taken by one thread
 * @param {string} host Host to run on
 * @returns {Server}
 */
const prep = async (ns, server, player, ram, scriptRam, host) => {
	const target = server.hostname

	//--------------------------------------------------------------------------------
	// Prep server if we can decrease difficulty and/or increase money
	//--------------------------------------------------------------------------------
	while (server.hackDifficulty > server.minDifficulty || server.moneyAvailable < server.moneyMax) {
    ns.tprint('PREPPING')
    await ns.sleep(100)
    ns.print('\u001b[31;1m---------- \u001b[34;1mPREP \u001b[31;1m----------')
		let totalThreads = Math.floor(ram / scriptRam)
		let growPercent = formulas.growPercent(server, 1, player, 1) - 1
		let percentNeeded = (server.moneyMax - server.moneyAvailable) / server.moneyAvailable
		let growThreads = Math.ceil(percentNeeded / growPercent)
		let extraWeakenThreads = Math.ceil(growThreads * 0.004 / 0.050) // extra weakens for grows
		let weakenThreads = Math.ceil((server.hackDifficulty - server.minDifficulty) / 0.050)
		let weakenTime = formulas.weakenTime(server, player)
		ns.print(`${new Date().toLocaleTimeString()}: Need ${format.short(growThreads)} grows and ${format.short(weakenThreads)} (${format.short(weakenThreads + extraWeakenThreads)}) weakens (${totalThreads} slots available)`)
		if (weakenThreads > totalThreads) {
      // ns.tprint('WARNING: prep - WEAKEN')
      // await ns.sleep(1000)
    
			// we need a lot of weakening, use totalThreads
			ns.print(`${new Date().toLocaleTimeString()}: A lot of weakening required, weakening ${totalThreads} on ${target} in ${format.short(weakenTime/1000)}s`)
			await ns.exec('/remote/weaken.js', host, totalThreads, target, 'prep-weaken')
			await ns.sleep(weakenTime + 1000) // extra second
		} else if (growThreads + weakenThreads + extraWeakenThreads > totalThreads) {
      // ns.tprint('WARNING: prep - TOO MANY, BOTH')
      // await ns.sleep(1000)

      // we need more than one cycle of weaken/grow, but we can grow some
			let availableThreads = totalThreads - weakenThreads;
			// for every 12.5 grow threads, we need 1 weaken thread
			let actualGrowThreads = Math.floor(availableThreads / 13) * 12
			let actualWeakenThreads = weakenThreads + Math.ceil(actualGrowThreads / 12)
			ns.print(`${new Date().toLocaleTimeString()}: Growing ${actualGrowThreads} and weakening ${actualWeakenThreads} on ${target} in ${format.short(weakenTime/1000)}s`)
			await ns.exec('/remote/weaken.js', host, actualWeakenThreads, target, 'prep-weaken')
			await ns.exec('/remote/grow.js', host, actualGrowThreads, target, 'prep-grow')
			await ns.sleep(weakenTime + 1000) // wait for them to finish, 1 extra second
		} else {
      ns.tprint('WARNING: prep - ONE CYCLE')
      await ns.sleep(1000)

			// we can do it all in one cycle
			let actualWeakenThreads = weakenThreads + extraWeakenThreads
			ns.print(`${new Date().toLocaleTimeString()}: Growing ${growThreads} and weakening ${actualWeakenThreads} on ${target} in ${format.short(weakenTime/1000)}s`)
			await ns.exec('/remote/weaken.js', host, actualWeakenThreads, target, 'prep-weaken')
			if (growThreads > 0) await ns.exec('/remote/grow.js', host, growThreads, target, 'prep-grow')
			await ns.sleep(weakenTime + 1000) // wait for them to finish, 1 extra second
		}

		server = ns.getServer(target)
		player = ns.getPlayer()

    ns.tprint('WARNING: prep - DONE')
    await ns.sleep(1000)
  }
	
  return server
}
