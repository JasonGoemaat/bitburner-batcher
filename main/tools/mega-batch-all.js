/*
MEGA Hack

At super high skill levels with lots of augs, hacking with batches becomes impossible.
At hacking level 325,000 for instance and most augs for example I can weaken megacorp
in 43 milliseconds, way under the time for a single batch using my batcher-hgw.  There
is no way to even schedule ahead, might as well start all three.  And 1 hack thread
steals 81.6% and needs 8 grow threads and 1 weaken thread only.

So this will create three 'zombies' and double the grow threads and weaken threads
needed and call all three commands at once.

- Thanks @Zoekeeper on discord for the idea

This particular script calls mega-batch.js for each server we can hack

*/

import { createTable, getCustomFormulas } from "/lib"

let myGetServer = null

/** @type {HackingFormulas} */
const hacking = getCustomFormulas()

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')

  let servers = {}
  const scanServer = (hostname) => {
    const server = ns.getServer(hostname)
    servers[hostname] = server
    server.connections = ns.scan(hostname)
    server.connections.forEach(name => {
      if (!servers[name]) scanServer(name)
    })
  }
  scanServer('home')

  let player = ns.getPlayer()
  let hackableServers = Object.entries(servers).map(x => x[1]).filter(x => x.hasAdminRights && x.moneyMax && x.requiredHackingSkill < player.skills.hacking && !x.purchasedByPlayer)
  hackableServers = hackableServers.filter(x => ['megacorp', 'ecorp', '4sigma', 'b-and-a', 'omnitek', 'kuai-gong', 'nwo', 'blade', 'clarkinc'].find(y => y === x.hostname))
  for (let i = 0; i < hackableServers.length; i++) {
    let server = hackableServers[i]
    // if (i === 0) ns.run('/tools/mega-batch.js', 1, '--host', server.hostname)
    ns.run('/tools/mega-batch.js', 1, '--target', server.hostname)
  }
  ns.tprint('started all!')
}