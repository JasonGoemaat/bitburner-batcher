/** @param {NS} ns */
export async function main(ns) {
  let simple = eval('window.simple')
  let [target, targetDifficulty, targetMoney, hackThreads] = ns.args
  if ((!target) || (!targetDifficulty) || (!targetMoney)) { ns.tprint('ERROR: simple.js requires target, targetDifficulty, and targetMoney'); return; }

  while(true) {
    // yes, this is cheat-y...  The starter script remains running and
    // provides access to this function which calls getServer on the starter's
    // ns.getServer() method.  This works because the method is synchronous
    // and the starter is waiting on a custom promise and not sleeping.
    // Thanks Zoekeeper!
    let server = simple['getServer'](target)
    
    // base odds of each command
    let odds = {
      hack: 1,
      grow: 1,
      weak: 1,
    }

    // odds of hacking vary from 0 with 25% money to 2 with 100%
    let moneyFraction = server.moneyAvailable / server.moneyMax
    odds.hack = Math.max(0, (moneyFraction - 0.25) * 8/3)
    
    // odds of growing vary from 0.5 with full money to 2 with 0%
    odds.grow = (1 - moneyFraction) * 1.5 + 0.5

    // odds of weakening vary from 0.25 with min difficulty to 10.25
    // if difficulty is 2x min
    let diff = (server.hackDifficulty - server.minDifficulty) / server.minDifficulty
    odds.weak = Math.min(diff, 2) * 5 / 2 + 0.25

    let rnd = Math.random() * (odds.hack + odds.grow + odds.weak)
    if (rnd < odds.hack) {
      // console.log('Hack: ', JSON.stringify({rnd, odds}))
      await ns.hack(target, { threads: hackThreads })
    } else if (rnd < odds.hack + odds.grow ) {
      // console.log('Grow: ', JSON.stringify({rnd, odds}))
      await ns.grow(target)
    } else {
      // console.log('Weak: ', JSON.stringify({rnd, odds}))
      await ns.weaken(target)
    }
  }
}