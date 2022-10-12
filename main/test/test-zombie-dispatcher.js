/** @param {NS} ns */
export async function main(ns) {
  /** @type {Object[]} */
  const zombies = eval(`window['zombies'] = []`)
  for (let i = 0; i < 1; i++) {
    const zombieArgs = [i, 10, ns.getServer(ns.getHostname()).cpuCores]
    ns.exec('/test/test-zombie.js', ns.getHostname(), 10, ...zombieArgs)
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
      await ns.sleep(1000)
    }
  }

  while(true) {
    let zombie = await findZombie()
    let time = new Date().valueOf()
    let wTime = ns.getWeakenTime('foodnstuff')
    zombie.finishTime = time + wTime
    zombie.ns.weaken('foodnstuff')
    ns.tprint(`Called weaken using zombie, waiting ${ns.nFormat(wTime / 1000, '0.0') + 's'}`)
    await ns.sleep(wTime + 20)

    zombie = await findZombie()
    time = new Date().valueOf()
    let gTime = ns.getGrowTime('foodnstuff')
    zombie.finishTime = time + gTime
    zombie.ns.grow('foodnstuff')
    ns.tprint(`Called grow using zombie, waiting ${ns.nFormat(gTime / 1000, '0.0') + 's'}`)
    await ns.sleep(gTime + 20)

    zombie = await findZombie()
    time = new Date().valueOf()
    let hTime = ns.getHackTime('foodnstuff')
    zombie.finishTime = time + hTime
    zombie.ns.hack('foodnstuff')
    ns.tprint(`Called hack using zombie, waiting ${ns.nFormat(hTime / 1000, '0.0') + 's'}`)
    await ns.sleep(hTime + 20)
  }
}