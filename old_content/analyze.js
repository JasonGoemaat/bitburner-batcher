// Analyze a server

import { default as f, getHackingFormulas } from '/lib/formulas.js'
import { default as format } from '/lib/format.js'

let hacking = {}

const showUsage = ns => {
	ns.tprint('Usage: run analyze.js (options) [target]')
	ns.tprint('  [target] - target machine')
	ns.tprint('	 Options:')
	ns.tprint('		--json   			 - show JSON of data')
	ns.tprint('		--batch  			 - show batch info')
	ns.tprint('		--profit 			 - show profit info')
	ns.tprint('		--prep [host]		 - prep target using host')
	ns.tprint('		--wait   			 - wait for prep and alert')
	ns.tprint('		--detail [hackCount] - batch detail for given hackCount')
	ns.tprint('		--delay [ms] 		 - delay between batch components (default 500)')
	ns.tprint('		--max [hackCount]    - max hacks for list (default 30)')
	ns.tprint('		--min [hackCount]    - min hacks for list (default max minus 10)')
}

/** @param {NS} ns */
export async function main(ns) {
	// if (ns.args.length === 0) return showUsage(ns)
	// let args = [...ns.args]
	// if (args[0] === '-all') {
	// 	args.shift()
	// 	if (args.length !== 3) return showUsage(ns)
	// }

	hacking = await getHackingFormulas(ns)
	let args = [...ns.args]
	let optionJson = false
	let optionBatch = false
	let optionProfit = false
	let optionPrep = null
	let optionDetail = 0
	let optionDelay = 500
	let optionMax = 30
	let optionMin = null
	for (let i = 0; i < args.length;) {
		const optionName = `${args[i]}`;
		if (optionName.substring(0, 2) === '--') {
			args.splice(i, 1)
			switch (optionName) {
				case '--json':
					optionJson = true
					break
				case '--batch':
					optionBatch = true
					break
				case '--profit':
					optionProfit = true
					break
				case '--prep':
					optionPrep = args.splice(i, 1)[0]
					break
				case '--wait':
					optionWait = true
					break
				case '--detail':
					optionDetail = args.splice(i, 1)[0]
					break
				case '--delay':
					optionDelay = args.splice(i, 1)[0]
					break
				case '--max':
					optionMax = args.splice(i, 1)[0]
					break
				case '--min':
					optionMin = args.splice(i, 1)[0]
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
	let host = optionPrep
	ns.tprint(`Analyzing target '${target}'' with host '${host}'`)
	if (!target) {
		ns.tprint(`ERROR!  target not specified!`)
		showUsage(ns)
		return
	}
	
	const server = await ns.getServer(target)
	const prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
	const player = await ns.getPlayer()
	const threads = 1
	const cores = 1

	// const bnmultipliers = ns.getBitNodeMultipliers() // Requires Source-File-5 to run
	// ns.tprint(`BitNodeMultipliers: ${JSON.stringify(bnmultipliers, null, 2)}`)

	const real = {
		hackChance: hacking.hackChance(server, player),
		hackExp: hacking.hackExp(server, player),
		hackPercent: hacking.hackPercent(server, player),
		growPercent: hacking.growPercent(server, threads, player, cores),
		hackTime: hacking.hackTime(server, player),
		growTime: hacking.growTime(server, player),
		weakenTime: hacking.weakenTime(server, player)
	}
	
	const realPrepped = {
		hackChance: hacking.hackChance(prepped, player),
		hackExp: hacking.hackExp(prepped, player),
		hackPercent: hacking.hackPercent(prepped, player),
		growPercent: hacking.growPercent(prepped, threads, player, cores),
		hackTime: hacking.hackTime(prepped, player),
		growTime: hacking.growTime(prepped, player),
		weakenTime: hacking.weakenTime(prepped, player)
	}

	const weakensNeeded = (server.hackDifficulty - server.minDifficulty) / 0.05
	const moneyNeeded = server.moneyMax - server.moneyAvailable
	const percentNeeded = moneyNeeded / server.moneyAvailable
	const growsNeeded = percentNeeded / (real.growPercent - 1)
	const totalWeakensNeeded = weakensNeeded + Math.ceil(growsNeeded * 0.004 / 0.050)
	const cycleLength = (realPrepped.weakenTime + optionDelay * 4)
	const cycleSeconds = Math.trunc(cycleLength) / 1000
	const batchesPerCycle = Math.trunc(cycleLength / (optionDelay * 5))

	//ns.tprint(JSON.stringify({weakensNeeded, moneyNeeded, percentNeeded, growsNeeded}))
	ns.tprint(`Need ${format.short(weakensNeeded)} weakens and ${format.short(growsNeeded)} grows (${format.short(totalWeakensNeeded)} weakens including grows)`)
	ns.tprint(`Server size: ${format.money(server.moneyMax)}, seconds to weaken: ${Math.trunc(real.weakenTime)/1000}`)
	ns.tprint(`Batch cycle takes ${cycleSeconds} seconds for ${batchesPerCycle} batches`)

	let results = []
	let b = optionMax
	let a = optionMin || (Math.max(1, optionMax - 10))
	for (let hackCount = a; hackCount <= b; hackCount++) {
		let hackFraction = Math.min(1, realPrepped.hackPercent * hackCount) // hackPercent is really hackFraction
		let hackWeakens = Math.ceil(hackCount * 0.002 / 0.050)
		let moneyHacked = Math.trunc(server.moneyMax * hackFraction)
		let moneyRemaining = server.moneyMax - moneyHacked
		let growFractionNeeded = moneyHacked / moneyRemaining
		let growCount = Math.ceil(growFractionNeeded / (realPrepped.growPercent - 1))
		let growWeakens = Math.ceil(growCount * 0.004 / 0.050)
		
		// original formula acts as if hacks and grows take as much time as weakens
		// let requiredGB = Math.ceil((hackCount + hackWeakens + growCount + growWeakens) * 1.8)
		// ok, added 2 because we add 1, and multiply by 2 because we over-schedule weakens
		let requiredGB = ((hackWeakens + growWeakens + 2) * 2 * 1.8)
			+ (growCount * (real.growTime / real.weakenTime)) // batch is weakenTime, grow only running for growTime 
			+ (hackCount * (real.hackTime / real.weakenTime)) // batch is weakenTime, hack  only running for hackTime 

		// let profit = moneyHacked / requiredGB / 0.5
		let totalGB = requiredGB * batchesPerCycle
		let paddedGB = requiredGB * (batchesPerCycle + 2) // padded for scheduling 2 batches ahead
		let totalMoney = moneyHacked * batchesPerCycle
		let totalProfit = totalMoney / cycleSeconds

		let messageBatch = `Batch: ${('' + hackCount).padStart(2)} hacks, ${hackWeakens} weakens, ${growCount} grows, ${growWeakens} weakens, gain ${format.money(moneyHacked)}`
		let totalProfitPerGB = totalProfit / totalGB
		
		let messageProfit = `${('' + hackCount).padStart(2)} hacks gives ${format.money(moneyHacked * batchesPerCycle).padStart(9)} in ${cycleSeconds} seconds at ${format.money(totalProfit).padStart(9)}/s requiring ${format.gb(totalGB).padStart(9)} - ${format.money(totalProfitPerGB)}/gb/s`

		results.push({ 
			hackCount, hackWeakens, growCount, growWeakens,
			cycleSeconds, batchesPerCycle, totalGB, totalMoney, totalProfit,
			totalProfitPerGB, paddedGB,
			messageBatch, messageProfit,
			detail: {
				hackCount, hackFraction, hackWeakens, moneyHacked, moneyRemaining, growFractionNeeded,
				growCount, growWeakens, requiredGB, cycleLength, cycleSeconds, batchesPerCycle,
				totalGB, totalMoney, totalProfit, totalProfitPerGB, paddedGB
			}
		})
	}

	if (optionJson) ns.tprint(`all: ${JSON.stringify({ real, realPrepped }, null, 2)}`)

	if (optionBatch) {
		ns.tprint('')
		ns.tprint(`Batch info for ${target}`)
		results.forEach(x => ns.tprint(x.messageBatch))
	}

	if (optionProfit) {
		ns.tprint('')
		ns.tprint(`Profit info for ${target}`)
		results.forEach(x => ns.tprint(x.messageProfit))
	}

	if (optionDetail) {
		ns.tprint('')
		ns.tprint(`Profit info for ${target} with ${optionDetail} hacks per batch`)
		let detail = results.find(x => x.hackCount === optionDetail)
		ns.tprint(`type of optionDetail is ${typeof(optionDetail)}`)
		if (!detail) {
			ns.tprint(`ERROR!  Detail not found for ${optionDetail} hacks`)
			return
		}
		ns.tprint(JSON.stringify(detail, null, 2))
	}

	if (optionPrep) {
		// really should have a remote/prep.js script for this...
		ns.tprint('')
		ns.tprint(`Prepping ${target} using host ${host}, should take ${format.short(real.weakenTime / 1000)} seconds`)
		ns.tprint(`Need ${format.short(weakensNeeded)} weakens and ${format.short(growsNeeded)} grows (${format.short(totalWeakensNeeded)} weakens including grows)`)
		await ns.scp(['/remote/grow.js', '/remote/weaken.js', '/remote/hack.js'], host)
		const timeString = `${Math.trunc(performance.now())}`
		const pidGrow = await ns.exec('/remote/grow.js', host, Math.ceil(growsNeeded + 1), target, timeString)
		const pidWeaken = await ns.exec('/remote/weaken.js', host, Math.ceil(totalWeakensNeeded + 5), target, timeString)
		while (true) {
			await ns.sleep(100)
			const growRunning = await ns.isRunning(pidGrow, host)
			const weakenRunning = await ns.isRunning(pidWeaken, host)
			if (!(growRunning || weakenRunning)) {
				ns.tprint('--------------------------------------------------------------------------------')
				ns.tprint(`-- PREP OF ${target} FINISHED!`)
				ns.tprint('--------------------------------------------------------------------------------')
				break;
			}
		}
		return
	}

	ns.tprint('')
	const allResults = [...results]
	allResults.sort((a, b) => b.totalProfitPerGB - a.totalProfitPerGB)
	const rec = allResults[0]
	allResults.sort((a, b) => b.totalProfit - b.totalProfit)
	const rec2 = allResults[0]
	ns.tprint(rec.messageBatch)
	ns.tprint(rec.messageProfit)
	ns.tprint('')
	ns.tprint(`Server max money: ${format.money(server.moneyMax)}`)
	ns.tprint(`Batch Time: ${Math.trunc((real.weakenTime + optionDelay * 4)/1000)} seconds`)
	
	ns.tprint(`Recommendations (requires ${format.gb(rec.paddedGB)}, ${format.gb(rec2.paddedGB)}):`)
	ns.tprint(`    run batch.js ${target} ${host || '[host]'} ${rec.hackCount} --delay ${optionDelay}`)
	if (growsNeeded || totalWeakensNeeded) {
		ns.tprint('--------------------------------------------------------------------------------')
		ns.tprint(`-- PREP OF ${target} REQUIRED!`)
		ns.tprint(`-- need ${format.short(growsNeeded)} grows and ${format.short(totalWeakensNeeded)} weakens`)
		ns.tprint(`-- run analyze.js ${target} --prep <host>`)
		ns.tprint('--------------------------------------------------------------------------------')
	}
}