/**
 * @param {Server} server Server to calculate for
 * @param {Player} player Player to calculate for
 * @param {number} hackThreads How many hack threads to calculate for
 * @param {any} formulas Object with hacking formulas on it
 * @param {number} delay Delay to use between work elements
 * @param {number} scriptRam Ram required to run a script
 */
 export function calculateBatch3(server, player, hackThreads, formulas, delay, scriptRam = 1.75) {
	let method = "Batch-3"

	const preppedServer = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
	const batches = Math.trunc((formulas.hackTime(preppedServer, player) - (delay * 2)) / (delay * 3))
	const hackPercent = formulas.hackPercent(preppedServer, player)
	const hackChance = formulas.hackChance(preppedServer, player)
	const hackTime = formulas.hackTime(preppedServer, player)
	const weakenTime = formulas.weakenTime(preppedServer, player)
	const growTime = formulas.growTime(preppedServer, player)
	
	// should be close to hackTime + weakenTime,
	//	but (delay * 3) is one batch and total is under hackTime, and
	//	we add delay * 2 for extra grow/weaken after the last hack
	const totalTime = batches * (delay * 3) + (delay * 2) + weakenTime

  let totalHackPercent = hackPercent * hackThreads
	let hackedAmount = hackPercent * hackThreads * server.moneyAvailable
	let hackedServer = {...preppedServer, hackDifficulty: preppedServer.hackDifficulty + hackThreads * 0.002, moneyAvailable: preppedServer.moneyMax - hackedAmount }
	let growFraction = formulas.growPercent(hackedServer, 1, player, 1) - 1
	let percentNeeded = hackedAmount / hackedServer.moneyAvailable
	let growThreads = Math.ceil(percentNeeded / growFraction) + 1
  let totalGrowPercent = growFraction * growThreads
	let weakenThreads = Math.ceil((growThreads * 0.004 + hackThreads * 0.002) / 0.050) + 1
	let totalThreads = (growThreads + weakenThreads + hackThreads) * batches + weakenThreads + growThreads
	let totalAmount = hackedAmount * batches * Math.min(hackChance, 1)
	let profit = totalAmount / (totalTime / 1000 / 60) // per minute
	let totalMemory = Math.ceil(totalThreads * scriptRam) // in gb
	let profitPerTerabyteHour = (profit * 60) / (totalMemory / 1024)
	return { method, batches, hackThreads, growThreads, weakenThreads,
		totalTime, totalThreads, totalMemory, profit, totalAmount,
		profitPerTerabyteHour,
		hackedAmount, hackChance, weakenTime, growTime, hackTime, totalAmount,
		hostname: server.hostname,
		hackPercent, moneyMax: server.moneyMax, totalHackPercent, totalGrowPercent }
}

/**
 * @param {Server} server Server to calculate for
 * @param {Player} player Player to calculate for
 * @param {number} hackThreads How many hack threads to calculate for
 * @param {any} formulas Object with hacking formulas on it
 * @param {number} delay Delay to use between work elements
 * @param {number} scriptRam Ram required to run a script
 */
export function calculateBatch4(server, player, hackThreads, formulas, delay, scriptRam = 1.75) {
	let method = "Batch-4"

	const preppedServer = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
	const batches = Math.trunc((formulas.hackTime(server, player) - (delay * 2)) / (delay * 4))
	const hackPercent = formulas.hackPercent(server, player)
	const hackChance = formulas.hackChance(server, player)
	const hackTime = formulas.hackTime(preppedServer, player)
	const weakenTime = formulas.weakenTime(preppedServer, player)
	const growTime = formulas.growTime(preppedServer, player)
	const totalTime = batches * (delay * 4) + (delay * 2) + weakenTime

  let totalHackPercent = hackPercent * hackThreads
	let hackedAmount = hackPercent * hackThreads * server.moneyAvailable
	let hackedServer = {...preppedServer, moneyAvailable: preppedServer.moneyMax - hackedAmount } // assume weakened
	let growFraction = formulas.growPercent(hackedServer, 1, player, 1) - 1
	let percentNeeded = hackedAmount / hackedServer.moneyAvailable
	let growThreads = Math.ceil(percentNeeded / growFraction) + 1
  let totalGrowPercent = growFraction * growThreads
	let weakenHackThreads = Math.ceil(hackThreads * 0.002 / 0.050) + 1
	let weakenGrowThreads = Math.ceil(growThreads * 0.004 / 0.050) + 1
	let weakenThreads = weakenHackThreads + weakenGrowThreads
	let totalThreads = (growThreads + weakenThreads + hackThreads) * batches +  weakenThreads + growThreads
	let totalAmount = hackedAmount * batches * Math.min(hackChance, 1)
	let profit = totalAmount / (totalTime / 1000 / 60) // per minute
	let totalMemory = Math.ceil(totalThreads * scriptRam) // in gb
	let profitPerTerabyteHour = (profit * 60) / (totalMemory / 1024)
	return { method, batches, hackThreads, growThreads, weakenThreads,
		weakenHackThreads, weakenGrowThreads,
		totalTime, totalThreads, totalMemory, profit, totalAmount,
		profitPerTerabyteHour,
		hackedAmount, hackChance, weakenTime, growTime, hackTime, totalAmount,
		hostname: server.hostname,
		hackPercent, moneyMax: server.moneyMax, totalHackPercent, totalGrowPercent }
}