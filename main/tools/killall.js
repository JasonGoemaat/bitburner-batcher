/** @param {NS} ns */
export async function main(ns) {
	let [command, hostArg] = ns.args
  command = command ? `${command}` : null

  /** @type {Server[]} */
  let runnable = []
  if (hostArg) {
    runnable = [{ hostname: hostArg }]
  } else {
    const servers = {}
    const scanServer = (hostname) => {
      const server = ns.getServer(hostname)
      servers[hostname] = server
      server.connections = ns.scan(hostname)
      server.connections.forEach(name => {
        if (!servers[name]) scanServer(name)
      })
    }
    scanServer('home')
    runnable = Object.values(servers).filter(x => x.hasAdminRights && x.maxRam > 0 && x.hostname !== 'home').concat([{ hostname: 'home' }])
  }

	runnable.forEach(x => {
		if (typeof(command) === 'string' && command.length > 0 && command !== 'all') {
			var list = ns.ps(x.hostname)
      let start = performance.now()
      let count = 0
			list.forEach(info => {
				if (info.filename.indexOf(command) >= 0 || JSON.stringify(info.args).indexOf(command) >= 0) {
          count++
					ns.kill(info.pid, x.hostname)
				}
			})
      let end = performance.now()
      if (count) ns.tprint(`Killed ${count} scripts on ${x.hostname} in ${ns.nFormat(end - start, '0.000')} ms`)
		} else {
			ns.killall(x.hostname)
		}
	})
}