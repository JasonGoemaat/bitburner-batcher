/**
 * Run a script on a remote host
 */

/** @param {NS} ns */
export async function main(ns) {
  let [script, hosts, threads, ...args] = ns.args

  if (hosts === 'all') {
    /** @type {Object<string,Server>} */
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
    let list = Object.values(servers)
    list = list.filter(x => x.hostname !== 'home' && x.maxRam > 0 && x.ramUsed === 0 && x.purchasedByPlayer === false)
    hosts = list.map(x => x.hostname)
  } else {
    hosts = hosts.split(',')
  }

  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i]
    const scriptRam = ns.getScriptRam(script)
    const hostRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host)
    let runThreads = threads || Math.trunc(hostRam / scriptRam)
    if (runThreads > 0) {
      ns.rm(script, host)
      await ns.scp(script, host)
      ns.exec(script, host, runThreads, ...args)
    }
  }
}