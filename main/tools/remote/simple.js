/** @param {NS} ns */
export async function main(ns) {
  let [target, threads] = ns.args
  // threads = threads || ns.ps().find(x => x.filename === ns.getScriptName() && JSON.stringify(ns.args) === JSON.stringify(x.args)).threads

  const minDifficulty = ns.getServerMinSecurityLevel(target)
  const moneyMax = ns.getServerMaxMoney(target)
  ns.print(JSON.stringify({threads, minDifficulty, moneyMax }, null, 2))

  while (true) {
    const difficulty = ns.getServerSecurityLevel(target)
    const money = ns.getServerMoneyAvailable(target)
    ns.print(`difficulty: ${difficulty}/${minDifficulty}, money: ${ns.nFormat(money, '$0.00a')}/${ns.nFormat(moneyMax, '0.00a')}`)
    if (difficulty - minDifficulty >= 1 + 5 * Math.random()) {
      await ns.weaken(target)
    } else if (money < moneyMax * 0.7 || (money < moneyMax * 0.9 && Math.random() < 0.8)) {
      await ns.grow(target)
    } else {
      await ns.hack(target)
    }
  }
}
