/*
Reassign employees

Usage: run corp/reassign.js <division> [<city(s)|all>] [1,1,1,1,1,1]

Where 1,1,1,1,1,1 are weights to give to each of Operations, Engineers, Business, Management, Research & Development, and Training,
defaults are 1,1,1,1,1,0

Running with no args or invalid args will give options
*/

/** @param {NS} ns */
export async function main(ns) {
  let [divisionName, cityNames, weightsString] = ns.args
  let corp = ns.corporation.getCorporation()
  
  if (!divisionName) {
    ns.tprint("Division must be specified, one of: " + corp.divisions.map(x => x.name).join(', '))
    showUsage(ns)
    return
  }
  cityNames = cityNames || 'all'
  weightsString = weightsString || '1,1,1,1,1,0'

  let division = corp.divisions.find(x => x.name === divisionName)
  if (!division) {
    ns.tprint(`WARNING: Division '${divisionName} not found, specify one of:\n  ` + corp.divisions.map(x => x.name).join(', '))
    return
  }

  /** @type {string[]} */
  let cities = []
  if (cityNames === 'all') {
    cities = [...division.cities]
  } else {
    let notFound = false
    let original = cityNames.split(',')
    cities = []
    while (original.length > 0) {
      let one = original.shift()
      if (division.cities.find(x => x === one)) {
        cities.push(one)
      } else {
        ns.tprint(`WARNING: City not found!: ${one}'`)
        notFound = true
      }
    }
    if (notFound) {
      ns.tprint("WARNING: One or more cities not found, use CSV containing one or more:")
      ns.tprint(`INFO:      ` + division.cities.join(', '))
      return
    }
  }

  let weights = weightsString.split(',').map(x => parseFloat(x))
  if (weights.length != 6) {
    ns.tprint(`WARNING: weights must be CSV of SIX numbers, i.e. 2,2,1,1,0.5,0)`)
    return
  }

  const positions = ['Operations', 'Engineer', 'Business', 'Management', 'Research & Development', 'Training', 'Unassigned']
  for (let i = 0; i < cities.length; i++) {
    let cityName = cities[i]
    let office = ns.corporation.getOffice(divisionName, cityName)

    // hire new if we have space
    let neededHires = office.size - office.employees.length
		for (let i = 0; i < neededHires; i++) ns.corporation.hireEmployee(divisionName, cityName)

    office = ns.corporation.getOffice(divisionName, cityName)
    let employees = office.employees

    let totalWeights = weights.reduce((p, c) => p + c, 0)
    let employeeCounts = weights.map(w => Math.trunc(w * employees.length / totalWeights))
    let last = weights.reduce((p, c, i) => (c > 0 ? i : p), 0)
    // ns.tprint(JSON.stringify({cityName, weights, employeeCounts, last}))
    for (let i = 0; i < 6; i++) {
      let emps = []
      if (i < last) {
        emps = employees.splice(0, employeeCounts[i])
      } else {
        emps = employees
        employees = []
      }
      // ns.tprint(`Assigning ${emps.length} employees to ${positions[i]}`)
      for (let j = 0; j < emps.length; j++) {
        ns.corporation.assignJob(divisionName, cityName, emps[j], positions[i])
      }
    }
  }

  ns.tprint('Done!')
}

/** @param {NS} ns */
function showUsage(ns) {
  ns.tprint('INFO: run corp/reassign.js <division> [<city(s)|all>] [1,1,1,1,1,1]')
  ns.tprint('INFO:  * division must be specified')
  ns.tprint('INFO:  * default is all cities, or enter CSV of city names')
  ns.tprint('INFO:  * csv of weights for 6 jobs, default is 1 for all but 0 for training')
}