/*
Report on employee stats for each division
*/

import { createTable } from '/lib.js'

/** @param {NS} ns */
export async function main(ns) {
  let corp = ns.corporation.getCorporation()

  let list = []
  let attributes = ['mor', 'hap', 'ene', 'int', 'cha', 'exp', 'cre', 'eff', 'sal']
  for (let i = 0; i < corp.divisions.length; i++) {
    let division = corp.divisions[i]
    for (let j = 0; j < division.cities.length; j++) {
      let city = division.cities[j]
      let office = ns.corporation.getOffice(division.name, city)
      let employees = office.employees.map(employeeName => ns.corporation.getEmployee(division.name, city, employeeName))
      let totals = employees.reduce((acc, employee) => {
        attributes.forEach(att => acc[att] = (acc[att] || 0) + employee[att])
        return acc
      }, {})
      let avg = { division: division.name, city, count: employees.length }
      attributes.forEach(att => avg[att] = ((totals[att] || 0) /employees.length).toFixed(1))
      list.push(avg)
    }
  }
  ns.tprint('AVERAGE EMPLOYEE STATS:\n' + createTable(list).join('\n'))
}
