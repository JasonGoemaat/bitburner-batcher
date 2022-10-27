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
  let maxAffordableGb = 0
  let maxIndex = 0
  let c = 0
	for (let i = 4; i <= ns.getPurchasedServerMaxRam(); i *= 2, c++) {
		let cost = ns.getPurchasedServerCost(i)
    if (cost < player.money) {
      maxAffordableGb = i
      maxIndex = c
    }
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
				current.forEach((x, index) => {
					let hostname = `${x.hostname}`.padEnd(20)
					let maxRam = ns.nFormat(x.maxRam * 1e9, '0,000.0b')
					let usedRam = ns.nFormat(Math.ceil(x.ramUsed) * 1e9, '0,000.0b')
          let freeRam = ns.nFormat(Math.floor(x.maxRam - x.ramUsed) * 1e9, '0,000.0b')
					let ramStr = `${usedRam}/${maxRam} used, free: ${freeRam}`.padEnd(16)
					ns.tprint(`  ${('' + index).padStart(3, ' ')} ${hostname} ${ramStr}`)
				})
			}
			let min = 0, max = options.length - 1
			if (command === 'list') {
				for (let i = 0; i < options.length; i++) {
					if (options[i].cost < player.money && options[i].cost > options[maxIndex].cost) maxIndex = i;
				}
				min = Math.max(0, maxIndex - 2)
				max = Math.min(maxIndex + 2, options.length - 1)
			}
			ns.tprint('')
			ns.tprint('Options: ')
			for (let i = min; i <= max; i++) {
        let buyCommand = `buy <hostname> ${options[i].gb}`
        if (i === maxIndex) buyCommand += '  <--- Max Affordable'
        let gb = `${options[i].gb}`
				ns.tprint(`${i === maxIndex ? 'INFO:' : '     '} ${gb.padStart(8)}GB for ${ns.nFormat(options[i].cost, '$0,000.0a').padStart(7)} - ${buyCommand}`)
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
      if (gb === 'auto') gb = maxAffordableGb
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
