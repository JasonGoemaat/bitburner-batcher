// Thanks @Zoekeeper on discord for the idea

/** @param {NS} ns */
export async function main(ns) {
  /** @type {Object[]} */
  // const zombies = eval(`window['zombies'] = window['zombies'] || []`)
  const zombies = eval(`window['zombies'] = []`)
  for (let i = zombies.length; i < 1; i++) {
    const zombieArgs = [i, 10, ns.getServer(ns.getHostname()).cpuCores]
    ns.exec('/test/test-zombie.js', ns.getHostname(), 10, ...zombieArgs)
  }

  if (false) {
    ns.hack('foodnstuff')
    ns.grow('foodnstuff')
    ns.weaken('foodnstuff')
  }

  let runOnZombie = (zombie, duration, command, ...args) => {
    ns.print(`runOnZombie command: ${command} taking ${ns.nFormat(duration || 0, '0')} ms, args: ${JSON.stringify(args)}`)
    zombie.whenAvaialable = new Date().valueOf() + duration + 2000 // 2000 is fudge-factor
    
    // this seems to break straight-away
    // zombie.active = true
    // zombie.ns[command](...args).then(result => {
    //   zombie.result = result
    //   zombie.active = false
    // })

    zombie.ns[command](...args)
  }

  let findZombie = async () => {
    ns.print('finding zombie')
    while (true) {
      for (let i = 0; i < zombies.length; i++) {
        if ((zombies[i].whenAvaialable || 0) + 2000 < new Date().valueOf()) { // double fudge-factor
          ns.print(`found zombie ${i}`)
          return zombies[i]
        }
      }
      await ns.sleep(1000)
    }
  }

  let runOnZombie2 = (zombie, duration, command, ...args) => {
    ns.print(`runOnZombie2 command: ${command} taking ${ns.nFormat(duration || 0, '0')} ms, args: ${JSON.stringify(args)}`)
    zombie.active = true
    zombie.ns[command](...args).then(result => {
      zombie.result = result
      zombie.active = false
    })
  }

  let findZombie2 = async () => {
    ns.print('finding zombie')
    while (true) {
      for (let i = 0; i < zombies.length; i++) {
        if (!zombies[i].active) {
          ns.print(`found zombie ${i}`)
          return zombies[i]
        }
      }
      await ns.sleep(500)
    }
  }

  ns.atExit(() => {
    
  })

  while (true) {
    let hZombie = await findZombie2()
    let ht = ns.getHackTime('foodnstuff')
    runOnZombie2(hZombie, ht, 'hack', 'foodnstuff')
    await ns.sleep(ht-2000)

    let gZombie = await findZombie2()
    let gt = ns.getGrowTime('foodnstuff')
    runOnZombie2(gZombie, gt, 'grow', 'foodnstuff')
    await ns.sleep(gt-2000)

    let wZombie = await findZombie2()
    let wt = ns.getWeakenTime('foodnstuff')
    runOnZombie2(wZombie, wt, 'weaken', 'foodnstuff')
    await ns.sleep(wt-2000)
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