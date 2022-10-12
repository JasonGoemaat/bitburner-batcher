/** @param {NS} ns */
export async function main(ns) {
  /** @type {Object[]} */
  const zombies = eval(`window['zombies'] = window['zombies'] || []`)
  // for (let i = 0; i < 1; i++) {
  //   const zombieArgs = [i, 10, ns.getServer(ns.getHostname()).cpuCores]
  //   ns.exec('/test/test-zombie.js', ns.getHostname(), 10, ...zombieArgs)
  // }
  if (false) {
    ns.hack('foodnstuff')
    ns.grow('foodnstuff')
    ns.weaken('foodnstuff')
  }

  let runOnZombie = async (command, ...args) => {
    let zombie = await findZombie()
  }

  let findZombie = async () => {
    ns.tprint('finding zombie')
    while (true) {
      let time = new Date().valueOf()
      for (let i = 0; i < zombies.length; i++) {
        if (zombies[i].finishTime < (time - 10)) {
          ns.tprint(`found zombie ${i}`)
          return zombies[i]
        }
      }
      await ns.sleep(3000)
    }
  }

  while(true) {
    let time = new Date().valueOf()
    let zombie = null

    zombie = await findZombie()
    time = new Date().valueOf()
    let hTime = ns.getHackTime('foodnstuff')
    zombie.finishTime = time + hTime + 2000
    //ns.tprint('Using eval to call hack')
    //eval(`window.zombies[0].ns.hack('foodnstuff').then(result => window.zombies[0].result = result)`)
    ns.tprint('Calling hack')
    zombie.ns.hack('foodnstuff')
    ns.tprint(`Called hack using zombie, waiting ${ns.nFormat(hTime / 1000, '0.0') + 's'}`)
    await ns.sleep(hTime + 2000)
    ns.tprint(`Sleep finished, finding another zombie...`)

    zombie = await findZombie()
    time = new Date().valueOf()
    let wTime = ns.getWeakenTime('foodnstuff')
    zombie.finishTime = time + wTime + 2000
    // ns.tprint('Using eval to call weaken')
    // eval(`window.zombies[0].ns.weaken('foodnstuff').then(result => window.zombies[0].result = result)`)
    ns.tprint('Calling weaken')
    zombie.ns.weaken('foodnstuff')
    ns.tprint(`Called weaken using zombie, waiting ${ns.nFormat(wTime / 1000, '0.0') + 's'}`)
    await ns.sleep(wTime + 2000)
    ns.tprint(`Sleep finished, finding another zombie`)

    zombie = await findZombie()
    time = new Date().valueOf()
    let gTime = ns.getGrowTime('foodnstuff')
    zombie.finishTime = time + gTime + 2000
    // ns.tprint('Using eval to call grow')
    // eval(`window.zombies[0].ns.grow('foodnstuff').then(result => window.zombies[0].result = result)`)
    ns.tprint('Calling grow')
    zombie.ns.grow('foodnstuff')
   ns.tprint(`Called grow using zombie, waiting ${ns.nFormat(gTime / 1000, '0.0') + 's'}`)
    await ns.sleep(gTime + 2000)
    ns.tprint(`Sleep finished, finding another zombie`)
  }
}