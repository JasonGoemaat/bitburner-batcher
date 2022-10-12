/** @param {NS} ns */
export async function main(ns) {
  /** @type {Object[]} */
  const zombies = eval(`window['zombies'] = window['zombies'] || []`)
  for (let i = 0; i < 10; i++) {
    const zombieArgs = [i, 10, ns.getServer(ns.getHostname()).cpuCores]
    ns.exec('/test/test-zombie.js', ns.getHostname(), 10, ...zombieArgs)
  }

  let findZombie = async () => {
    while (true) {
      let zombie = null;
      let time = new Date().valueOf()
      for (let i = 0; i < zombies.length; i++) {
        if (zombies[i].finishTime < (time - 10)) return zombies[i]
      }
      await ns.sleep(100)
    }
  }

  while(true) {
    let zombie = await findZombie()
    let time = new Date().valueOf()
    let wTime = ns.getWeakenTime('foodnstuff')
    zombie.finishTime = time + wTime
    zombie.ns.weaken('foodnstuff')
    await ns.sleep(wTime + 20)

    zombie = await findZombie()
    time = new Date().valueOf()
    let gTime = ns.getGrowTime('foodnstuff')
    zombie.finishTime = time + gTime
    zombie.ns.grow('foodnstuff')
    await ns.sleep(gTime + 20)

    zombie = await findZombie()
    time = new Date().valueOf()
    let hTime = ns.getHackTime('foodnstuff')
    zombie.finishTime = time + hTime
    zombie.ns.hack('foodnstuff')
    await ns.sleep(hTime + 20)
  }
}