/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('scan')
  
  //----------------------------------------------------------------------------------------------------
  // scan all servers
  //----------------------------------------------------------------------------------------------------

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

  //----------------------------------------------------------------------------------------------------
  // Connect to passed server, finding path
  //----------------------------------------------------------------------------------------------------
  const getPathTo = (hostname) => {
    const findPath = (hostname) => {
      const visited = { home: true }
      let queue = [[ns.getHostname()]]
      while (queue.length) {
        const current = queue.pop()
        let connected = ns.scan(current[current.length - 1])
        for (let i = 0; i < connected.length; i++) {
          let host = connected[i];
          if (!visited[host]) {
            visited[host] = true
            if (host === hostname) return current.concat(host)
            queue.push(current.concat(host))
          }
        }
      }
      return null
    }

    let path = findPath(hostname)
    if (!path) { ns.tprint(`Could not find a path to ${hostname}`); ns.exit() }
    // ns.tprint('\n' + path.join(', '))
    return path.slice(1)
  }

  let path = getPathTo(ns.args[0])
  path.forEach(hostname => ns.singularity.connect(hostname))
}
