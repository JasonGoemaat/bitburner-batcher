/** @param {NS} ns */
export async function main(ns) {
  let divisionNames = ns.corporation.getCorporation().divisions.map(x => x.name)
  if (ns.args[0]) divisionNames = ns.args[0].split(',')

	await ns.sleep(5000)
	ns.disableLog('ALL')

	while (true) {
		let info = ns.corporation.getCorporation()
		let funds = info.funds
		let limit = Math.min(info.revenue, funds/50)
		let upgraded = false
		info.divisions.forEach(division => {
      if (divisionNames.find(x => x === division.name)) {
        division.cities.forEach(city => {
          if (ns.corporation.hasWarehouse(division.name, city)) {
            let cost = ns.corporation.getUpgradeWarehouseCost(division.name, city)
            if (cost < limit) {
              ns.print(`Upgrading ${division.name} ${city} for $${fnum(cost)}`)
              ns.corporation.upgradeWarehouse(division.name, city)
              funds -= cost
              limit = Math.min(info.revenue, funds/50)
              upgraded = true
            }
          }
        })
      }
		})
		if (!upgraded) await ns.sleep(1000)
	}
}

/*
This script will level-up our corporate upgrades.  Criteria:

1. Upgrade cost must be less than current 1s revenue
2. Upgrade cost must be < 1/10th the corporate funds

*/

const fnum = (num) => { let e = Math.trunc(Math.log10(num) - 1); let ev = Math.pow(10, e); let rn = Math.trunc(num / ev * 1000) / 1000; return `${rn}e+${e}`; }
