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
  ns.tprint(`Command: '${command}, Hosts: ${runnable.map(x => x.hostname).join(', ')}`)

	runnable.forEach(x => {
		if (typeof(command) === 'string' && command.length > 0 && command !== 'all') {
			var list = ns.ps(x.hostname)
      let count = 0
			list.forEach(info => {
				if (info.filename.indexOf(command) >= 0 || JSON.stringify(info.args).indexOf(command) >= 0) {
          count++
					ns.kill(info.pid, x.hostname)
				}
			})
      if (count) ns.tprint(`${x.hostname}: killed ${count} scripts`)
      // ns.tprint(` - other - ${x.hostname}: killed ${count} scripts`)
		} else {
      ns.tprint(`${x.hostname}: killing all`)
			ns.killall(x.hostname)
		}
	})
}