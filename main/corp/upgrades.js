/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('ALL')

	
	// // test - show values
	// let upgrades = ns.corporation.getUpgradeNames().map(name => {
	// 	let obj = { name }
	// 	obj.upgradeLevel = ns.corporation.getUpgradeLevel(name)
	// 	obj.upgradeLevelCost =ns.nFormat(ns.corporation.getUpgradeLevelCost(name) || 0, '$0.000a')
	// 	// obj.unlockUpgradeCost = ns.corporation.getUnlockUpgradeCost(name)
	// 	return obj
	// })
	// ns.tprint(JSON.stringify(upgrades, null, 2))
	// return

	
	while (true) {
		let info = ns.corporation.getCorporation()
		let funds = info.funds
		let limit = Math.min(Math.max(info.revenue, funds / 2), funds / 2)
		let names = ns.corporation.getUpgradeNames().filter(x => x !== 'DreamSense') // this one is counter-productive
		let upgraded = false
		names.forEach(name => {
      info = ns.corporation.getCorporation()
      limit = Math.min(Math.max(info.revenue / 5, funds / 20), funds / 2)
			let localLimit = (name === 'Wilson Analytics') ? Math.min(limit * 10, funds / 2) : limit
			let cost = ns.corporation.getUpgradeLevelCost(name)
			if (cost < localLimit) {
				ns.corporation.levelUpgrade(name)
				ns.print(`Upgrading ${name} for $${fnum(cost)}`)
				funds -= cost
				limit = Math.min(info.revenue / 10, funds / 100)
				upgraded = true
			}
		})
		if (!upgraded) {
			await ns.sleep(1000)
		} else {
			await ns.sleep(100)
		}
	}
}

/*
This script will level-up our corporate upgrades.  Criteria:

1. Upgrade cost must be less than current 1s revenue
2. Upgrade cost must be < 1/10th the corporate funds

*/

const fnum = (num) => { let e = Math.trunc(Math.log10(num) - 1); let ev = Math.pow(10, e); let rn = Math.trunc(num / ev * 1000) / 1000; return `${rn}e+${e}`; }
