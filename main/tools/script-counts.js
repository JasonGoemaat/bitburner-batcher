import { createTable } from '/lib.js'

/** @param {NS} ns */
export async function main(ns) {
  /** @type {Object<string,Server} */
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
  await ns.sleep(15)

  let hosts = Object.values(servers).filter(s => s.hasAdminRights && s.maxRam > 0)
  let results = {}
  for (let i = 0; i < hosts.length; i++) {
    let host = hosts[i]
    let hostname = host.hostname
    let ps = ns.ps(hostname).reduce((p,c) => {
      let x = p[c.filename] || { hostname, filename: c.filename, threads: 0, count: 0 }
      x.count++
      x.threads += c.threads
      p[c.filename] = x
      return p
    }, {})
    if (Object.keys(ps).length > 0) {
      results[hostname] = ps
      await ns.sleep(10)
    }
  }

  // ns.tprint(JSON.stringify(results, null, 2))
  let list = Object.values(results).reduce((p, c) => {
    // here c is an object with script as the key
    return p.concat(Object.values(c))
  }, [])

  // let sorted = Object.entries(results).reduce((p, c) => {
  //   p = p.concat(Object.values(c))
  //   return p
  // }, []).sort((a, b) => a.hostname.localeCompare(b.hostname))
  list.sort((a, b) => a.hostname.localeCompare(b.hostname))

  let lines = createTable(list, { align: { hostname: 'left', filename: 'left' }})
  ns.tprint('Results:\n' + lines.join('\n'))
}
