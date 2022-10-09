import { default as format } from '/lib/format.js'

const showUsage = ns => {
	ns.tprint('Usage: run servers.js <command>')
	ns.tprint('  <command> - list(default), all (default), buy, delete')
	ns.tprint('  list - list servers and top 3 options')
	ns.tprint('  all  - list servers and all options')
	ns.tprint('  delete <hostname> - delete server')
	ns.tprint('  buy <hostname> <gb> (<old hostname>) - purchase server (and replace old host)')
	ns.tprint('')
}

/** @param {NS} ns */
export async function main(ns) {
	let [command, hostname, gb, oldHostname] = ns.args
	if (command === '--help') { showUsage(ns); return; }
	command = command || 'list'
	
	const player = await ns.getPlayer()

	let limit = ns.getPurchasedServerLimit()
	let current = ns.getPurchasedServers()
	for (let i = 0; i < current.length; i++) current[i] = await ns.getServer(current[i]);
	// ns.tprint(`Have ${current.length}/${limit} servers`)

	let options = []
	for (let i = 4; i <= ns.getPurchasedServerMaxRam(); i *= 2) {
		let cost = ns.getPurchasedServerCost(i)
		options.push({ cost, gb: i })
	}

	// ns.tprint(`${JSON.stringify({hostname, purchaseGb})}`)
	// if (hostname && purchaseGb) {
	// 	await ns.purchaseServer(hostname, purchaseGb)
	// }
	switch(command) {
		case 'all':
		case 'list':
			ns.tprint(`Servers ${current.length}/${limit}:`)
			if (current.length === 0) {
				ns.tprint('  You do not own any servers')
			} else {
				current.forEach(x => {
					let hostname = `${x.hostname}`.padEnd(20)
					let maxRam = format.gb(x.maxRam)
					let usedRam = format.gb(Math.ceil(x.ramUsed))
					let ramStr = `${usedRam}/${maxRam} used`.padEnd(16)
					ns.tprint(`  ${hostname} ${ramStr}`)
				})
			}
			let min = 0, max = options.length - 1
			if (command === 'list') {
				let maxIndex = 0
				for (let i = 0; i < options.length; i++) {
					if (options[i].cost < player.money && options[i].cost > options[maxIndex].cost) maxIndex = i;
				}
				min = Math.max(0, maxIndex - 3)
				max = Math.min(maxIndex + 1, options.length - 1)
			}
			ns.tprint('')
			ns.tprint('Options: ')
			for (let i = min; i <= max; i++) {
				ns.tprint(`  ${options[i].gb} gb for ${format.money(options[i].cost)}`)
			}
			break;
		case 'delete':
			ns.deleteServer(hostname)
			break;
		case 'buy':
			if (oldHostname) {
				await ns.killall(oldHostname)
				let deleteResult = await ns.deleteServer(oldHostname)
				ns.tprint(`Deleted server ${oldHostname} result ${deleteResult}`)
			}
			let result = await ns.purchaseServer(hostname, gb)
			if (!result) {
				ns.tprint(`FAILED! '${hostname}' with ${gb}GB result '${result}'`)
			} else {
				ns.tprint(`Purchased server '${result}' with ${gb}GB`)
			}
			break;
		default:
			ns.tprint(`ERROR: Unknown command '${command}'`)
			ns.tprint('')
			showUsage(ns);
			break;
	}
}