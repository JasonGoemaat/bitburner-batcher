/** @param {NS} ns */
export async function main(ns) {
	const [command] = ns.args
  
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
  /** @type {Server[]} */
  let runnable = Object.values(servers).filter(x => x.hasAdminRights && x.maxRam > 0 && x.hostname !== 'home').concat(['home'])
	runnable.forEach(x => {
		if (command) {
			var list = ns.ps(x.hostname)
			list.forEach(info => {
				if (info.filename.indexOf(command) >= 0) {
					ns.scriptKill(info.pid, x.hostname)
				}
			})
		} else {
			ns.killall(x.hostname)
		}
	})
}