/** @param {NS} ns */
export async function main(ns) {
  let divisionNames = ns.corporation.getCorporation().divisions.map(x => x.name)
  if (ns.args[0]) divisionNames = ns.args[0].split(',')

  ns.disableLog('sleep')

	while (true) {
		let info = ns.corporation.getCorporation()
		// ns.print(`${info.divisions.length} divisions`)
		for (let i = 0; i < info.divisions.length; i++) {
			let div = info.divisions[i]
      if (divisionNames.find(x => x === div.name) && div.popularity < 1e300) {
        // ns.print(`Division: ${div.name}`)
        let cost = ns.corporation.getHireAdVertCost(div.name)
        info = ns.corporation.getCorporation()
        // let limit = Math.min(Math.max(info.revenue, info.funds / 2), info.funds)
        let limit = info.funds
        if (cost < limit) {
          ns.print(`Hiring AdVert for ${div.name} for $${fnum(cost)}`)
          ns.corporation.hireAdVert(div.name)
          await ns.sleep(50)
        } else {
          // ns.print(`Skipping AdVert for ${div.name} for $${fnum(cost)}`)
          await ns.sleep(50)
        }
      }
		}
		await ns.sleep(100)
	}
}

const fnum = (num) => { let e = Math.trunc(Math.log10(num) - 1); let ev = Math.pow(10, e); let rn = Math.trunc(num / ev * 1000) / 1000; return `${rn}e+${e}`; }
