import { createTable } from '/lib.js'

/** @param {NS} ns */
export async function main(ns) {
  let divisionNames = ns.corporation.getCorporation().divisions.map(x => x.name)
  if (ns.args[0]) divisionNames = ns.args[0].split(',')

	const expandOffices = (divisionName, cityName, development = false) => {
    let office = ns.corporation.getOffice(divisionName, cityName)
    if (office.employees.length > 5000) return
		let div = ns.corporation.getDivision(divisionName)
		let info = ns.corporation.getCorporation()
		let limit = Math.min(info.funds / 10000, info.revenue / 1000)
		if (div.makesProducts && cityName === 'Aevum') limit *= 100
		let expandSize = 0
		for (let i = 1; i < 5000; i++) {
			let cost = ns.corporation.getOfficeSizeUpgradeCost(divisionName, cityName, i)
			// ns.tprint(`${i} cost ${ns.nFormat(cost || 0, '$0.000a')} limit ${ns.nFormat(limit || 0, '$0.000a')}`)
			if (cost > limit) break
			expandSize = i
		}
    expandSize = Math.max(0, Math.min(expandSize, 5000 - office.employees.length))
		if (expandSize > 0) {
			ns.tprint(`Expanding offices in ${divisionName} - ${cityName} by ${expandSize}`)
			ns.corporation.upgradeOfficeSize(divisionName, cityName, expandSize)
		}
	}

	const hireEmployees = (divisionName, cityName) => {
		let office = ns.corporation.getOffice(divisionName, cityName)
		let neededHires = office.size - office.employees.length
		// if (neededHires) ns.tprint(`Hiring ${neededHires} employees in  ${divisionName} - ${cityName}`)
		for (let i = 0; i < neededHires; i++) ns.corporation.hireEmployee(divisionName, cityName)

		let positions = ['Operations', 'Engineer', 'Business', 'Management', 'Research & Development', 'Training', 'Unassigned']
		let counts = positions.reduce((p, c) => Object.assign(p, { [c]: { count: 0, weight: 1 } }), {})
		office = ns.corporation.getOffice(divisionName, cityName)
		let employees = office.employees.map(name => ns.corporation.getEmployee(divisionName, cityName, name))
		let otherCounts = employees.reduce((p, c) => {
			p[c.pos] = p[c.pos] || 0
			p[c.pos]++
			return p
		}, {})

		// aw, screw it...  for now just map everyone based on desired weights
		let weights = [1, 1, 1, 1, 1, 20, 0] // oper, eng, bus, man, res, tra, unassigned
		let totalWeights = weights.reduce((p, c) => p + c, 0)
		let employeeCounts = weights.map(w => Math.trunc(w * employees.length / totalWeights))
    let last = weights.reduce((p, c, i) => (c > 0 ? i : p), 0)
		for (let i = 0; i < 6; i++) {
			let emps = []
			if (i < last) {
				emps = employees.splice(0, employeeCounts[i])
			} else {
				emps = employees
			}
			for (let j = 0; j < emps.length; j++) {
				ns.corporation.assignJob(divisionName, cityName, emps[j].name, positions[i])
			}
		}
	}

	let doCity = async (divisionName, cityName) => {
		expandOffices(divisionName, cityName)
		await ns.sleep(50)
		hireEmployees(divisionName, cityName)
		await ns.sleep(50)
	}

	let doDivision = async (divisionName) => {
		let division = ns.corporation.getDivision(divisionName)
		for (let i = 0; i < division.cities.length; i++) {
			let cityName = division.cities[i]
			await doCity(divisionName, cityName)
		}
		await ns.sleep(1000)
	}

	let info = ns.corporation.getCorporation()
	for (let i = 0; i < info.divisions.length; i++) {
		let division = info.divisions[i]
    if (divisionNames.find(x => x === division.name)) {
      await doDivision(division.name)
    }
	}
}