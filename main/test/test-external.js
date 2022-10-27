import { openWindow, log, table } from '/external.js'

/** @param {NS} ns */
export async function main(ns) {
  const url = 'https://jasongoemaat.github.io/bitburner-vue-viewer/'
  openWindow(url)
  await ns.sleep(5000) // time for window to open and it to start listening for messages
  
  // showing logging
  log('test-external.js', `Hello, world!
  this is pretty cool, being able to log to an external window, right?`)
  return;
}

  // openWindow('http://127.0.0.1:5173/bitburner-vue-viewer/')

//   // showing tables, output server list
//   /** @type {Object<string,Server} */
//   const servers = {}
//   const scanServer = (hostname) => {
//     const server = ns.getServer(hostname)
//     servers[hostname] = server
//     server.connections = ns.scan(hostname)
//     server.connections.forEach(name => {
//       if (!servers[name]) scanServer(name)
//     })
//   }
//   scanServer('home')
//   table('test-external.js', Object.values(servers).map(server => {
//     return {
//       hostname: server.hostname,
//       level: server.requiredHackingSkill,
//       hasAdminRights: server.hasAdminRights,
//       maxRam: server.maxRam,
//       moneyMax: server.moneyMax,
//       minDifficulty: server.minDifficulty,
//     }
//   }))
// }