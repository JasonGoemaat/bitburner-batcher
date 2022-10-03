/*

Yet another re-thinking of how to do it...

I noticed that for rho-construction, the numbers are tight.  I seem
to need *just* over 2 grows for each hack.  And the numbers are close
to what would be optimal  For instance take this:

| $6.445t | 13/1/27/3 | 5.23%  | $870.639m | 8203    | 438.86   |

If I lower hacks to 12 and grows to 25, I can lower grow threads to 2.
If I completely re-think and spam weaken(), I can cover the full 265
seconds of a weaken cycle with 5300 weaken() calls taking up 9.275 TB
and get a weaken() hitting every 50ms.  I can then work in 'grow()
calls wherever I can and work in hack() calls when I can as well.

weaken() can go in a loop, so it will never take more time because
the server is low (unless I grow too much for one weaken)
And I can create 1740 weaken() loops on the other servers.  So the
weakens only take up 6052gb on home, leaving 26716 gb available
on home for grows and hacks.

At any one time there are 4 grows running for each hack.  I'm using 12 hack
and two sets of 12 grows.  So 12 + (24 * 4) = 108 threads running
at the same time for a cycle period that is 188.4 gb.   Dividing our
26716 gb ram by that gives 141.8 that can be run in a 'hackTime' or
66173.2 ms.   Dividing 3600 seconds by 66.173 gives 54.4 cycles of 141.8
and about 469ms batch time.

I <should> be able to net 5.482 trillion, minus 7.4% for the 265 second
warm-up.  But that warmup can be shortended by 66 seconds if we start
executing things right away and only lose 5.55% giving us $5.17t

Increasing memory will shorten batches, but I don't know if I want to go
below 20 weakens per second.  10 is <probably> fine, but the lower I
go, the more opportunities will be missed.  Also with the grow() together,
I need two weakens to hit...  That would gain me 15% though...  Giving me $5.95t


Each weaken() can take care of 25 hacks and 12.5 grows.  So it's over-kill
for a hack cycle, and exactly perfect if we have TWO weaken calls for one grow.

Splitting up the grow is actually more effective since the effect is multiplicative
I think.   Unless the increased difficulty from a single grow makes it less
effective, have to check on that...

Using test.js I see that I don't always NEED all the grows.   24 is actually
too few if we hack successfully all the time.  But since we fail almost
10% of the time, that actually helps out.
*/

import {
  disableLogs, openTail, getWeakenServers
} from './batcher3lib.js'

/** @param {NS} ns */
export async function main(ns) {
  const TARGET = 'rho-construction'

  let b3 = eval('window.b3 = window.b3 || {}')
  be.started = []
  b3.completed = [] 

  disableLogs(ns)
  await openTail(ns)
  let server = ns.getServer(TARGET)
  if (server.hackDifficulty != server.minDifficulty) { ns.tprint(`${TARGET} not at min difficulty: ${server.hackDifficulty}`); return }
  if (server.moneyAvailable != server.moneyMax) { ns.tprint(`${TARGET} not at min difficulty: ${server.hackDifficulty}`); return }

  let weakenServers = getWeakenServers()
  for (let i = 0; i < weakenServers.length; i++) {
    await ns.scp(['/remote/weak-target.js', '/remote/grow-target.js', '/remote/hack-target.js'], weakenServers[i].hostname)
  }

  const scheduleWeaken = (id, command, params) => {
    let hostname = 'home'
    if (weakenServers.length > 0) {
      hostname = weakenServers[0]
      weakenServers[0].maxRam -= 1.75
      if (weakenServers[0].maxRam < 1.75) weakenServers = weakenServers.slice(1)
    }
    ns.exec('/remote/weak-target.js', TARGET, id, command, params)
  }

  let start = new Date().valueOf()
  let weakenTime = ns.formulas.hacking.weakenTime(server)
  let firstWeakenTime = weakenTime + start
  let nextTime = start
  while (nextTime < firstWeakenTime) {
    let time = new Date().valueOf()
    if (time >= nextTime) {
      scheduleWeaken(time, 'weaken', '')
      nextTime += 50
    }
    let sleepMs = nextTime - new Date().valueOf() - 15
    if (sleepMs >= 1) await ns.sleep(sleepMs)
  }

  const BATCH_TIME = 500
  const port = ns.getPortHandle(1)

  // skip consume until we have an empty port
  let PORT_DATA = port.read()
  while (PORT_DATA != 'NULL PORT DATA') {
    await ns.sleep(5)
    PORT_DATA = port.read()
  }

  // now wait for a message to schedule our first 'grow' for a batch
  while (PORT_DATA === 'NULL PORT DATA') {
    await ns.sleep(5)
    PORT_DATA = port.read()
  }

  let BASE_TIME = new Date().valueOf()
}