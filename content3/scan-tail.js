let homeApps = {}

const showUsage = ns => {
	ns.print('Usage: run scan.js (options)')
	ns.print('	 Options:')
	ns.print('		--push   			 - re-push lib and remote files to all hosts')
}

/** @param {NS} ns */
export async function main(ns) {
  const format = {
    money: x => ns.nFormat(x, "$0.00a"),
    ram: x => {
      if (x > Math.pow(2,50)) return ns.nFormat(x / Math.pow(2,50), "0,000") + 'pb'
      if (x > Math.pow(2,40)) return ns.nFormat(x / Math.pow(2,40), "0,000") + 'tb'
      if (x > Math.pow(2,30)) return ns.nFormat(x / Math.pow(2,30), "0,000") + 'gb'
      if (x > Math.pow(2,20)) return ns.nFormat(x / Math.pow(2,20), "0,000") + 'mb'
      if (x > Math.pow(2,10)) return ns.nFormat(x / Math.pow(2,10), "0,000") + 'kb'
      return ns.nFormat(x, "0,000") + 'b'
    }
  }
	ns.tail()
	ns.ls('home', '.exe').forEach(x => homeApps[x] = true)
  await ns.asleep(10)
  ns.moveTail(320,200)
  ns.resizeTail(1280, 600)
	let args = [...ns.args]
	let optionPush = false
	for (let i = 0; i < args.length;) {
		const optionName = `${args[i]}`;
		if (optionName.substring(0, 2) === '--') {
			args.splice(i, 1)
			switch (optionName) {
				case '--push':
					optionPush = true
					break

				default:
					ns.print(`ERROR!  Unknown option '${optionName}'`)
					showUsage(ns)
					return
			}
		} else {
			i++
		}
	}
	//let [target] = args

	const remoteFiles = [...(await ns.ls('home', 'remote/')),...(await ns.ls('home', 'lib/'))]
	ns.print('remote files:')
	ns.print(JSON.stringify(remoteFiles, null, 2))

	const parents = {}
	const children = {}
	const serverInfo = {}
	const servers = []
	const queue = []
	const serverMessages = {}
	const queued = {}

	const player = await ns.getPlayer()

	const doScan = async (host) => {
		if (serverInfo[host]) return
		servers.push(host)
		// ns.print(`${host}: scanning...`)
		var server = await ns.getServer(host)
		serverInfo[host] = server
		children[host] = children[host] || []

		// hack server
		if (!server.hasAdminRights) {
        	if (!(await hackPorts(ns, host, server))) {
            	// ns.print(`${host}: need more programs to nuke!`)
				serverMessages[host] = 'Need to write more programs to nuke'
            	return;
        	} else {
				ns.print(`${host}: nuking...`);
				await ns.nuke(host)
				ns.print(`${host}: NUKED!`)

				// install remote files
				if (remoteFiles && remoteFiles.length > 0) {
					await ns.scp(remoteFiles, host)
					ns.print(`${host}: files copied`)
				}
			}
		} else if (optionPush) {
			// install remote files
			if (remoteFiles && remoteFiles.length > 0) {
				await ns.scp(remoteFiles, host)
                ns.print(`${host}: files copied`)
				await ns.sleep(25)
			}
		}

		// backdoor
		if (ns.installBackdoor && ns.connect && !server.backdoorInstalled) {
			ns.print(`${host}: installing backdoor...`);
			await ns.connect(host)
			await ns.installBackdoor()
		}

		// scan
		const connected = await ns.scan(host)
		connected.forEach(connectedHost => {
			if (!queued[connectedHost]) {
				queue.push(connectedHost)
				queued[connectedHost] = true
				children[host].push(connectedHost)
				parents[connectedHost] = parents[connectedHost] || []
				parents[connectedHost].push(host)
			}
		})
	}

	queued[ns.getHostname()] = true
	queue.push(ns.getHostname())
	while (queue.length > 0) {
		await doScan(queue.shift());
	}

	// ok, we may have hacked some servers, so let's refresh their infos
	for (let i = 0; i < servers.length; i++) {
		let host = servers[i]
		serverInfo[host] = await ns.getServer(host)
	}

  /**
   * Calculate maximum theoretical profit allowing for fractional threads.
   * 
   * @param {number} ht - Hack Time (ms)
   * @param {number} hp - Hack Percent (actually fraction, i.e. 0.03 means hack 3% max money with one thread)
   * @param {number} gp - Grow Percent (actually growth, i.e. 1.002 means 0.2% growth per thread)
   * @param {number} mm - Max Money
   * @param {number} hc - Hack Chance (fraction)
   * @param {number} gb - Available Ram (gb)
   * @param {number} hexp - hackExp (per thread, should be for grow, weaken, successful hack, 1/4 for unsuccessful hack)
   */
   const theory = (ht, hp, gp, mm, hc, ram, hexp) => {
    const hackThreadRam = 1.7
    const growThreadRam = 1.75
    const weakenThreadRam = 1.75

    const hackThreads = 1
    const hackMoney = mm * hackThreads * hp
    const remainingMoney = mm - hackMoney
    const percentNeeded = hackMoney / remainingMoney
    const growThreads = percentNeeded / (gp - 1)
    
    const instantaneousHackThreads = hackThreads
    
    // for each hack we need growThreads grow threads, and they run 4x the time
    const instantaneousGrowThreads = hackThreads * growThreads * 4

    // for each grow thread running, we need 0.004 / 0.050 weaken threads, and they take 5/4 the time
    const instantaneousGrowWeakenThreads = instantaneousGrowThreads * 0.004 / 0.050 * 5 / 4

    // for each hack thread running, we need 0.002 / 0.050 weaken threads, and they take 5x the time
    const instantaneousHackWeakenThreads = instantaneousHackThreads * 0.002 / 0.050 * 5

    const instantaneousRam = instantaneousHackThreads * hackThreadRam
      + instantaneousGrowThreads * growThreadRam
      + (instantaneousGrowWeakenThreads + instantaneousHackWeakenThreads) * weakenThreadRam

    // instantaneousRam used over a period of  ht (hackTime) gives us how much is used by 1 hack thread over 1 hack time
    // calculate hacks per gbms
    const hacksPerGbms = 1 / (instantaneousRam * ht)

    // The instantaneous calculations are based on ht (hackTime), so they will take
    // instantaneousRam used for ht to produce hackMoney over the long run considering
    // we need to spread out the hacks, weakens, and grows.  So we take the given ram
    // divided by instantaneousRam to get how much we can produce in ht (hackTime) for
    // that much ram.  The units for the resulting humber are money/(gbms)
    const profitPerGbms = (hackMoney * hc) / (instantaneousRam * ht)

    // our final results will be in profit / hour given the passed ram
    const gbms = ram * 3600000
    const profit = profitPerGbms * gbms

    const totalHacks = hacksPerGbms * gbms
    const totalExpThreads = totalHacks * (hc + (1-hc)/4) // 1/4 the exp for failed hacks
      + (totalHacks) + (totalHacks * growThreads) // full xp for grow threads
      + totalHacks * 0.002 / 0.050 // full xp for weakens needed for hack
      + totalHacks * growThreads * 0.004 / 0.050 // full xp for weakens needed for grows
    const hackExp = hexp * totalExpThreads
    return { profit, growThreads, hackExp }
  }

  let totalRam = 0
  const getTotalRam = () => {
    if (!totalRam) {
      totalRam = Object.entries(serverInfo).map(x => x[1]).filter(x => x.hasAdminRights).reduce((p, c) => p + c.maxRam, 0)
    }
    return totalRam
  }

  /** @param {Server} server */
  const profitForServer = (server) => {
    if (server.requiredHackingSkill > player.skills.hacking) return 0
    if (server.moneyMax < 1) return 0
    const prepped = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax}
    const ram = getTotalRam()
    const ht = ns.formulas.hacking.hackTime(prepped, player)
    const hp = ns.formulas.hacking.hackPercent(prepped, player)
    const gp = ns.formulas.hacking.growPercent(prepped, 1, player, 1)
    const mm = prepped.moneyMax
    const hc = ns.formulas.hacking.hackChance(prepped, player)
    const hexp = ns.formulas.hacking.hackExp(server, player)
    const { profit } = theory(ht, hp, gp, mm, hc, ram, hexp)
    return profit
  }

	const reportWithChildren = (host, level = 0) => {
		const server = serverInfo[host]
    // output will be tabbed basec on level (2 spaces)
		const padding = "".padStart(level * 2, ' ')
		const cores = `${server.cpuCores} core${server.cpuCores > 1 ? 's' : ''}`
		const ram = ns.nFormat(server.maxRam * Math.pow(2, 30), "0,000") // it's in GB
		const arr = []
		let displayName = host
		if (server.hasAdminRights) arr.push('ADMIN')
		if (server.backdoorInstalled) {
			displayName = `[${host}]`
			arr.push('BACKDOOR')
		}
		
		let hackingDiff = Math.trunc(player.skills.hacking - server.requiredHackingSkill)
		if (hackingDiff > 0) arr.push('CANHACK')
		arr.push(`Hacking${hackingDiff >= 0 ? '+' : ''}${hackingDiff}`)

		ns.print(`${padding}${displayName} ${cores} ${ram} [${arr.join(',')}] ${server.maxRam} ${format.money(server.moneyAvailable)}/${format.money(server.moneyMax)} ${server.hackDifficulty}/${server.minDifficulty} diff, ${server.serverGrowth} growth`)

		for (let i = 0; i < children[host].length; i++) {
			reportWithChildren(children[host][i], level + 1)
		}
	}

	// report on all servers, starting with our current one
	ns.print('--------------------------------------------------------------------------------')
	reportWithChildren(ns.getHostname())

	ns.print('--------------------------------------------------------------------------------')
	let moneyServers = [...servers].sort((a, b) => {
		return serverInfo[a].moneyMax - serverInfo[b].moneyMax
	})
	let maxServerLength = servers.reduce((p, c) => Math.max(c.length, p), 0)
	for (let i = 0; i < moneyServers.length; i++) {
		const host = moneyServers[i]
		const server = serverInfo[host]
		const name = host.padEnd(maxServerLength, ' ')
		const money1 = `${format.money(server.moneyAvailable)}`.padStart(12)
		const money2 = `${format.money(server.moneyMax)} `.padStart(12)
		const growth = `growth: ${server.serverGrowth}`.padEnd(12)
		const difficulty = `${Math.trunc(server.hackDifficulty)}/${server.minDifficulty}`.padEnd(7)
		const ram = format.ram((server.maxRam - server.ramUsed) * Math.pow(2, 30)).padEnd(7)
		const ramMax = format.ram(server.maxRam * Math.pow(2, 30)).padEnd(7)
		const arr = []
		let displayName = host
		if (server.hasAdminRights) arr.push('ADMIN')
		if (server.backdoorInstalled) {
			displayName = `[${host}]`
			arr.push('BACKDOOR')
		}
    const profit = ns.nFormat(profitForServer(server), "$0.0a").padStart(7)
		let hackingDiff = Math.trunc(player.skills.hacking - server.requiredHackingSkill)
		if (hackingDiff > 0) arr.push('CANHACK')
		arr.push(`${server.requiredHackingSkill}${hackingDiff >= 0 ? '+' : ''}${hackingDiff}`)
		ns.print(`${name} ${money1} ${money2} ${growth} ${difficulty} ${ram} ${ramMax} ${profit} [${arr.join(',')}]`)
	}
}

/// Automatically hack the ports on server required for nuking if possible
const hackPorts = async (ns, host, server) => {
    const portApps = [
        [ns.ftpcrack, server.ftpPortOpen, 'FTPCrack.exe'],
        [ns.brutessh, server.sshPortOpen, 'BruteSSH.exe'],
        [ns.httpworm, server.httpPortOpen, 'HTTPWorm.exe'],
        [ns.sqlinject, server.sqlPortOpen, 'SQLInject.exe' ],
        [ns.relaysmtp, server.smtpPortOpen, 'relaySMTP.exe']
    ]

    let portsNeeded = server.numOpenPortsRequired - server.openPortCount
    let needed = []

    for (let i = 0; i < portApps.length && portsNeeded > 0; i++) {
        const [fn, flag, name] = portApps[i]
        if (flag) {
            //ns.print(`Already open: ${name}`)
            continue;
        }
        if (!fn) {
            needed.push(name);
            //ns.print(`Need to write ${name}`)
            continue;
        }
        if (!homeApps[name]) {
            needed.push(name);
            //ns.print(`Missing program ${name}`)
            continue;
        }

        ns.print(`Running ${name}...`)
        await fn(host)
        portsNeeded--
    }

    if (portsNeeded > 0) {
        ns.print(`'${host}': needs ${portsNeeded} more ports open (write ${needed.join(', ')}).`)
        return false;
    }

    return true;
}