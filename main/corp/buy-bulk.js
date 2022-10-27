/** @param {NS} ns */
export async function main(ns) {
  let TARGET_STORAGE = 0.75
	let divName = 'Software'

  ns.disableLog('ALL')
	ns.tail()
  await ns.sleep(100)
  ns.resizeTail(900, 900)

	let corp = ns.corporation
	// let divName = 'IBM' // software
	// let divName = 'TB' // Tobacco
	let div = corp.getDivision(divName)
	let matSize = {
		Water: 0.05,
		Energy: 0.01,
		Food: 0.03,
		Plants: 0.05,
		Metal: 0.1,
		Hardware: 0.06,
		Chemicals: 0.05,
		Drugs: 0.02,
		Robots: 0.5,
		AICores: 0.1,
		RealEstate: 0.005,
		"Real Estate": 0.005,
		"AI Cores": 0.1,
	}

	// Software - value for each component
	// Hardware: 1
	// Robots: 7
	// AI Cores: 3
	// Real Estate: 4 
	// let targetMatStorageFraction = {
	// 	// what fraction of storage to use for each material
	// 	Hardware: 0.05,
	// 	Robots: 0.20,
	// 	'AI Cores': 0.10,
	// 	'Real Estate': 0.25,
	// }

	
	// // Tobacco - value for each component
	// // Hardware: 2
	// // Robots: 4
	// // AI Cores: 2
	// // Real Estate: 2
	// let TARGET_STORAGE = 0.50
	// let targetMatStorageFraction = {
	// 	// what fraction of storage to use for each material
	// 	Hardware: TARGET_STORAGE * 2/10,
	// 	Robots: TARGET_STORAGE * 4/10,
	// 	'AI Cores': TARGET_STORAGE * 2/10,
	// 	'Real Estate': TARGET_STORAGE * 2/10,
	// }

	// Pharmeceuticals - value for each component
	// Hardware: 2
	// Robots: 5
	// AI Cores: 4
	// Real Estate: 1
	let targetMatStorageFraction = {
		// what fraction of storage to use for each material
		Hardware: TARGET_STORAGE * 2/12,
		Robots: TARGET_STORAGE * 5/12,
		'AI Cores': TARGET_STORAGE * 4/12,
		'Real Estate': TARGET_STORAGE * 1/12,
	}
	let weightNames = ['Hardware', 'Robots', 'AI Cores', 'Real Estate']
	let weightsByIndustry = {
		"Energy": [0, 0.05, 0.3, 0.65], // 0.08 adv, 0.7 sci
		"Utilities": [0, 0.4, 0.4, 0.5], // 0.08 adv, 0 .6 sci
		"Agriculture": [0.2, 0.3, 0.3, 0.72], // 0.04 adv, 0.5 sci
		"Fishing": [0.35, 0.5, 0.2, 0.15], // Hardware, Robots, AI Cores, Real Estate
		"Mining": [0.4, 0.45, 0.45, 0.3], // 0.06 adv, 0.26 sci
		"Food": [0.15, 0.3, 0.25, 0],
		"Tobacco": [0.15, 0.2, 0.15, 0.15], // adv 0.2, sci 0.75
		"Chemical": [0.2, 0.25, 0.2, 0.25], // adv 0.07, sci 0.75
		"Pharmaceutical": [0.15, 0.25, 0.2, 0.05], // adv 0.16, sci 0.8
		"Computer": [0, 0.36, 0.19, 0.2], // "Computer" - adv 0.17, sci 0.62
		"Robotics": [0.19, 0, 0.36, 0.32], // adv 0.18, sci 0.65
		"Software": [0.25, 0.05, 0.18, 0.15], // adv 0.16, sci 0.62
		"Healthcare": [0.1, 0.1, 0.1, 0.1], // adv 0.11, sci 0.75
		"RealEstate": [0.05, 0.6, 0.6, 0], // adv 0.25, sci 0.05
	}

	// let c = ns.corporation.getCorporation()
	// c.divisions.forEach(x => {
	// 	ns.tprint(`${x.name}: ${x.type}`)
	// })
	// let d = ns.corporation.getDivision('Fishing')
	// ns.tprint('Fishing Division:\n' + JSON.stringify(d, null, 2))
	// return

	let lastState = 'UNKNOWN'
	while (true) {
		let info = ns.corporation.getCorporation()
		while (true) {
			if (info.state !== lastState) {
				ns.print(`State: ${lastState} => ${info.state}`)
				lastState = info.state
			}
			if (lastState === 'START') break
			await ns.sleep(100)
			info = ns.corporation.getCorporation()
		}
		const useCity = name => name === 'New Tokyo' || true
		div.cities.forEach(city => {
			if (corp.hasWarehouse(divName, city) && useCity(city)) {
				let wh = corp.getWarehouse(divName, city)
				let weights = weightsByIndustry[div.type]
				let totalWeight = weights.reduce((p, c) => p + c, 0)
				weightNames.forEach((weightName, index) => {
          if (!div.products.find(x => x === weightName)) {
            let targetStorage = (wh.size * TARGET_STORAGE) * (weights[index] / totalWeight)
            let targetAmount = targetStorage / matSize[weightName]
            let mat = corp.getMaterial(divName, city, weightName)
            let existingAmount = mat.qty
            let neededAmount = Math.trunc(targetAmount - existingAmount)
            let purchaseAmountPerSecond = (neededAmount >= targetAmount * 0.05) ? Math.trunc(neededAmount / 10) : 0
            purchaseAmountPerSecond = Math.trunc(purchaseAmountPerSecond)
            purchaseAmountPerSecond = Math.max(0, purchaseAmountPerSecond)
            purchaseAmountPerSecond = Math.min(2000000000, purchaseAmountPerSecond)
            let args = [divName, city, mat.name, purchaseAmountPerSecond * 10]
            ns.print(`${weightName} want ${fnum(targetStorage, 0)} space or ${fnum(targetAmount, 0)} units, need ${fnum(neededAmount)}, buying ${fnum(purchaseAmountPerSecond, 0)} (${purchaseAmountPerSecond * 10}):`); // + JSON.stringify(args))
            ns.corporation.bulkPurchase(...args)
          }
				})
				// Object.entries(targetMatStorageFraction).forEach(x => {
				// 	let mat = corp.getMaterial(divName, city, x[0])
				// 	let targetAmount = (wh.size * x[1]) / matSize[x[0]]
				// 	let existingAmount = mat.qty
				// 	let purchaseAmountPerSecond = (targetAmount - existingAmount) / 10
				// 	purchaseAmountPerSecond = Math.trunc(purchaseAmountPerSecond)
				// 	purchaseAmountPerSecond = Math.max(0, purchaseAmountPerSecond)
				// 	purchaseAmountPerSecond = Math.min(2000000, purchaseAmountPerSecond)
				// 	let args = [divName, city, mat.name, purchaseAmountPerSecond]
				// 	ns.print(`${corp.state} buying ${ns.nFormat(targetAmount - existingAmount, '0,000')}/${ns.nFormat(targetAmount, '0,000')}:` + JSON.stringify(args))
				// 	ns.corporation.buyMaterial(...args)
				// })
			}
		})
    break
	}
}

const fnum = (num, places = 3) => {
  let a = Math.abs(num)
  let s = num < 0 ? '-' : ''
  if (num < 1000) return s + num.toFixed(places)
  let e = Math.trunc(Math.log10(num)/3);
  let ev = Math.pow(10, e * 3);
  let rn = s + (num / ev).toFixed(places);
  if (e >= 11) return s + `${rn}e+${e*3}`;
  return `${s}${rn}${'XkmbtqQsSno'.charAt(e)}`
}
