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
      attributes.forEach(att => avg[att] = ((totals[att] || 0) /employees.length).toFixed(3))
      list.push(avg)
    }
  }
  ns.tprint('AVERAGE EMPLOYEE STATS:\n' + createTable(list).join('\n'))
}

/*

Example at 8:30 am - RE has all research, except in Aevum it's all training

┌──────────┬───────────┬───────┬───────┬───────┬───────┬──────┬──────┬──────┬──────┬──────┬────────┐
│ division │      city │ count │   mor │   hap │   ene │  int │  cha │  exp │  cre │  eff │    sal │
├──────────┼───────────┼───────┼───────┼───────┼───────┼──────┼──────┼──────┼──────┼──────┼────────┤
│ Software │     Aevum │   183 │ 100.0 │ 110.0 │ 110.0 │ 73.9 │ 74.7 │ 87.1 │ 75.7 │ 74.9 │ 1117.2 │
│ Software │ Chongqing │    63 │ 100.0 │ 110.0 │ 110.0 │ 74.0 │ 77.5 │ 89.7 │ 75.1 │ 73.9 │ 1128.0 │
│ Software │ Sector-12 │    63 │ 100.0 │ 110.0 │ 110.0 │ 72.4 │ 74.9 │ 87.5 │ 75.0 │ 74.3 │ 1110.2 │
│ Software │ New Tokyo │    63 │ 100.0 │ 110.0 │ 110.0 │ 74.1 │ 75.4 │ 89.2 │ 75.5 │ 74.5 │ 1123.8 │
│ Software │    Ishima │    63 │ 100.0 │ 110.0 │ 110.0 │ 73.0 │ 77.0 │ 89.9 │ 74.7 │ 72.0 │ 1117.5 │
│ Software │  Volhaven │    63 │ 100.0 │ 110.0 │ 110.0 │ 74.8 │ 76.0 │ 87.7 │ 74.2 │ 74.0 │ 1118.3 │
│       RE │     Aevum │   453 │  74.6 │  73.0 │  74.9 │ 75.0 │ 75.3 │ 75.7 │ 75.2 │ 74.6 │ 1123.3 │
│       RE │ Chongqing │   303 │  76.5 │  74.0 │  74.4 │ 76.1 │ 73.4 │ 76.6 │ 75.3 │ 74.9 │ 1127.7 │
│       RE │ Sector-12 │   303 │  74.2 │  75.2 │  75.6 │ 73.8 │ 72.6 │ 76.6 │ 74.6 │ 74.1 │ 1113.3 │
│       RE │ New Tokyo │   303 │  74.7 │  75.0 │  75.6 │ 74.3 │ 77.4 │ 75.0 │ 74.5 │ 75.2 │ 1128.1 │
│       RE │    Ishima │   303 │  75.6 │  75.8 │  73.9 │ 75.1 │ 76.2 │ 75.2 │ 72.8 │ 75.3 │ 1122.0 │
│       RE │  Volhaven │   303 │  73.6 │  73.6 │  74.0 │ 74.3 │ 74.4 │ 74.3 │ 75.0 │ 74.6 │ 1116.3 │
└──────────┴───────────┴───────┴───────┴───────┴───────┴──────┴──────┴──────┴──────┴──────┴────────┘

Ok, too slow, so re-did with three decimal points at 8:47 am

┌──────────┬───────────┬───────┬─────────┬─────────┬─────────┬────────┬────────┬────────┬────────┬────────┬──────────┐
│ division │      city │ count │     mor │     hap │     ene │    int │    cha │    exp │    cre │    eff │      sal │
├──────────┼───────────┼───────┼─────────┼─────────┼─────────┼────────┼────────┼────────┼────────┼────────┼──────────┤
│ Software │     Aevum │   183 │ 100.000 │ 110.000 │ 110.000 │ 73.934 │ 74.694 │ 87.412 │ 75.678 │ 74.880 │ 1117.230 │
│ Software │ Chongqing │    63 │ 100.000 │ 110.000 │ 110.000 │ 73.968 │ 77.460 │ 89.979 │ 75.079 │ 73.889 │ 1128.048 │
│ Software │ Sector-12 │    63 │ 100.000 │ 110.000 │ 110.000 │ 72.381 │ 74.921 │ 87.769 │ 75.032 │ 74.333 │ 1110.238 │
│ Software │ New Tokyo │    63 │ 100.000 │ 110.000 │ 110.000 │ 74.063 │ 75.381 │ 89.464 │ 75.492 │ 74.540 │ 1123.762 │
│ Software │    Ishima │    63 │ 100.000 │ 110.000 │ 110.000 │ 73.048 │ 76.984 │ 90.176 │ 74.667 │ 71.984 │ 1117.524 │
│ Software │  Volhaven │    63 │ 100.000 │ 110.000 │ 110.000 │ 74.794 │ 76.016 │ 88.015 │ 74.238 │ 74.048 │ 1118.286 │
│       RE │     Aevum │   453 │ 100.000 │ 100.000 │ 100.000 │ 75.007 │ 75.407 │ 76.103 │ 75.208 │ 74.767 │ 1123.265 │
│       RE │ Chongqing │   303 │ 100.000 │ 100.000 │ 100.000 │ 76.139 │ 73.432 │ 76.930 │ 75.287 │ 74.941 │ 1127.683 │
│       RE │ Sector-12 │   303 │ 100.000 │ 100.000 │ 100.000 │ 73.838 │ 72.558 │ 76.851 │ 74.587 │ 74.092 │ 1113.277 │
│       RE │ New Tokyo │   303 │ 100.000 │ 100.000 │ 100.000 │ 74.333 │ 77.436 │ 75.349 │ 74.518 │ 75.244 │ 1128.139 │
│       RE │    Ishima │   303 │ 100.000 │ 100.000 │ 100.000 │ 75.056 │ 76.185 │ 75.527 │ 72.772 │ 75.290 │ 1121.990 │
│       RE │  Volhaven │   303 │ 100.000 │ 100.000 │ 100.000 │ 74.271 │ 74.436 │ 74.636 │ 75.003 │ 74.578 │ 1116.267 │
└──────────┴───────────┴───────┴─────────┴─────────┴─────────┴────────┴────────┴────────┴────────┴────────┴──────────┘
*/