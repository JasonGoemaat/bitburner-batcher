import { createTable, getOptions } from '/lib'

const defaultOptions = [
  ['--help'       , null, '--help     - display usage'],
  ['--backdoor'   , null, '--backdoor - backdoor after connecting']
]

/** @param {NS} ns */
export async function main(ns) {
  const { options, args } = getOptions(ns, defaultOptions)
  if (options.help) { showUsage(ns, defaultOptions); return }

  ns.disableLog('scan')
  
  // print to console by default, or use and open tail window
  let myprint = ns.tprint
  if (options.t) {
    ns.tail()
    await ns.sleep(10)
    ns.moveTail(320, 40)
    ns.resizeTail(1280, 600)
    myprint = ns.print
  }

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
  const getConnectCommand = (hostname) => {
    const findPath = (hostname) => {
      const visited = { home: true }
      let queue = [['home']]
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
    ns.tprint('\n' + path.join(';connect '))
    ns.exit()
  }
  if (options['connect']) getConnectCommand(options['connect'])

  //----------------------------------------------------------------------------------------------------
  // Default display - general server info by purchased, sorted by required hacking level, money, name
  //----------------------------------------------------------------------------------------------------

  const displayGeneral = async () => {
    /** @type {Server[]} */
    let list = Object.values(servers)
    list.sort((a, b) => {
      const byOwned = (a.purchasedByPlayer && !b.purchasedByPlayer) ? -1 : (b.purchasedByPlayer && !a.purchasedByPlayer) ? 1 : 0
      const byHacking = b.requiredHackingSkill - a.requiredHackingSkill
      const byName = a.hostname.localeCompare(b.hostname)
      return byOwned || byHacking || byName
    })
    
    // hostname, 'OWNED|ADMIN|blank', RAM, MoneyMax, Money%, MinDifficulty, Difficulty
    const green = '\x1b[32m', red = `\x1b[31m`
    // DEBUG: ns.tprint(list.map(x => JSON.stringify(x)).join('\n'))
    let table = createTable(list.map(server => {
      /** @param {Server} s */
      const portsString = (s) => {
        if (s.numOpenPortsRequired === 0 || s.purchasedByPlayer) return ''
        if (s.openPortCount < s.numOpenPortsRequired) return `${red}${s.openPortCount}/${s.numOpenPortsRequired}`
        return `${green}${s.openPortCount}/${s.numOpenPortsRequired}`
      }
      return {
        hostname: server.hostname,
        type: server.purchasedByPlayer ? 'OWNED' : (server.hasAdminRights ? "ADMIN" : ""),
        ram: !server.maxRam ? '' : (server.hasAdminRights ? green : red) + ns.nFormat(server.maxRam * 1e9 || 0, '0b'),
        avail: !server.maxRam ? '' : (server.ramUsed === 0 && server.hasAdminRights ? green : red) + ns.nFormat((server.maxRam - server.ramUsed) * 1e9 || 0, '0b'),
        '$': ns.nFormat(server.moneyMax || 0, '$0.0a'),
        '%$': server.moneyMax ? (((server.moneyAvailable === server.moneyMax) && server.moneyMax ? green  : '') + ns.nFormat((server.moneyAvailable || 0) / (server.moneyMax || 1), '0%')) : '',
        'growth': server.serverGrowth ? ns.nFormat(server.serverGrowth, '0,000.00') : 'ERR',
        dmin: ns.nFormat(server.minDifficulty || 0, '0'),
        diff: (server.hackDifficulty === server.minDifficulty && server.minDifficulty > 1 ? green : '') + ns.nFormat(server.hackDifficulty || 0, '0.0'),
        ports: portsString(server),
        hack: (server.requiredHackingSkill <= player.skills.hacking ? green : red) + `${server.requiredHackingSkill}`
      }
    }), { top: true, bottom: true, align: { hostname: 'left' }})

    if (options.open) {
      // let url = 'https://jasongoemaat.github.io/bitburner-vue-viewer/'
      let url = 'http://127.0.0.1:5173/bitburner-vue-viewer/'
      let mywin = eval(`window.mywin = window.mywin || {}`)
      if (!mywin.scan || mywin.scan.closed) {
        mywin.scan = eval(`window.open('` + url + `', '_blank', 'popup=true,width=1920,height=1000,startX=0,startY=0')`)
        await ns.sleep(1000)
      }
      if (mywin.scan.closed) {
        ns.tprint('ERROR: Could not open window or window was closed')
        ns.tprint('INFO:  Are you running the steam (electron) version?')
      } else {
        let text = table.join('\n')
        let ansirx = /\x1b[^m]+m/g
        text = text.replace(ansirx, '')
        mywin.scan.postMessage({ id: 'scan', command: 'log', lines: text, clear: true }, '*')
      }
    } else {
      myprint('\n' + table.join('\n'))
    }
  }
  await displayGeneral()

  ns.write('/var/servers.txt', JSON.stringify(servers), 'w')
}
