import { createTable, getOptions } from '/lib'

const defaultOptions = [
  ['--help'       , null, '--help             - display usage'],
  ['--t'          , null, '--t                - open tail window isntead of using terminal'],
  ['--push-remote', null, '--push-remote      - push files in /remote to all servers'],
  ['--nohack'     , null, '--nohack           - do not hack servers'],
  ['--connect'    , ''  , '--connect <server> - connect to server'],
  ['--ram'        , 0   , '--ram <count>      - display top <count> servers by ram'],
  ['--hack'       , 0   , '--hack <count>     - display top <count> servers by theoretical profit'],
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

  // find apps on home for hacking
	let homeApps = ns.ls('home', '.exe').reduce((p, c) => { p[c] = true; return p }, {})

  const remoteFiles = options['push-remote'] ? ns.ls('home', 'remote/') : []

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
  // root servers if we can
  //----------------------------------------------------------------------------------------------------

  const hackServers = async () => {
    /** @type {Server[]} */
    const unhackedServers = Object.values(servers).filter(x => !x.hasAdminRights)
    for (let i = 0; i < unhackedServers.length; i++) {
      let server = unhackedServers[i]
      if (!server.sshPortOpen && homeApps['BruteSSH.exe']) { ns.brutessh(server.hostname); await ns.sleep(10) }
      if (!server.ftpPortOpen && homeApps['FTPCrack.exe']) { ns.ftpcrack(server.hostname); await ns.sleep(10) }
      if (!server.smtpPortOpen && homeApps['relaySMTP.exe']) { ns.relaysmtp(server.hostname); await ns.sleep(10) }
      if (!server.httpPortOpen && homeApps['HTTPWorm.exe']) { ns.httpworm(server.hostname); await ns.sleep(10) }
      if (!server.sqlPortOpen && homeApps['SQLInject.exe']) { ns.sqlinject(server.hostname); await ns.sleep(10) }
      server = Object.assign(server, ns.getServer(server.hostname))
      if (server.openPortCount >= server.numOpenPortsRequired) {
        ns.nuke(server.hostname)
        server = Object.assign(server, ns.getServer(server.hostname))
      }
      servers[server.hostname] = server
    }
  }
  if (!options.nohack) await hackServers()

  //----------------------------------------------------------------------------------------------------
  // --push-remote - copy remote files to servers if we have admin rights and they have ram
  //----------------------------------------------------------------------------------------------------

  const copyFilesToRemote = async () => {
    let list = Object.values(servers)
    for(let i = 0; i < list.length; i++) {
      let server = list[i]
      if (server.hostname !== 'home' && server.hasAdminRights && server.maxRam > 0) {
        let serverFiles = ns.ls(server.hostname)
        for (let j = 0; j < remoteFiles.length; j++) {
          let remoteFile = remoteFiles[j]
          if (serverFiles.indexOf(remoteFile) < 0) {
            await ns.scp(remoteFile, server.hostname, 'home')
            await ns.sleep(10)
          }
        }
      }
    }
  }
  await copyFilesToRemote()

  let player = ns.getPlayer()

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

  const displayGeneral = () => {
    /** @type {Server[]} */
    let list = Object.values(servers)
    list.sort((a, b) => {
      const byOwned = (a.purchasedByPlayer && !b.purchasedByPlayer) ? -1 : (b.purchasedByPlayer && !a.purchasedByPlayer) ? 1 : 0
      const byHacking = a.requiredHackingSkill - b.requiredHackingSkill
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
        dmin: ns.nFormat(server.minDifficulty || 0, '0'),
        diff: (server.hackDifficulty === server.minDifficulty && server.minDifficulty > 1 ? green : '') + ns.nFormat(server.hackDifficulty || 0, '0.0'),
        ports: portsString(server),
        hack: (server.requiredHackingSkill <= player.skills.hacking ? green : red) + `${server.requiredHackingSkill}`
      }
    }), { top: true, bottom: true, align: { hostname: 'left' }})
    myprint('\n' + table.join('\n'))
  }
  displayGeneral()
}
