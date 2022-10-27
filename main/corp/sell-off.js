/*
This script is used to sell off everything at market price.  It
should be useful for finding investors.  It delays 10 seconds
to give you time to get to the corp screen easily and opens up
it's own tail window with a countdown.  You should go to your main
corporation screen and look for the Total Profit to get high, then
click 'Find Investors'
*/

/** @param {NS} ns */
export async function main(ns) {
  ns.tail()
  ns.disableLog('ALL')
  ns.print('Waiting for 5 seconds')
  await ns.sleep(5000)

  let corp = ns.corporation.getCorporation()
  while (corp.state !== 'START') {
    await ns.sleep(100)
    corp = ns.corporation.getCorporation()
  }

  ns.print('Waiting 8-10 seconds for next cycle...')
  let lastState = corp.state
  while (true) {
    while (corp.state === lastState) {
      await ns.sleep(100)
      corp = ns.corporation.getCorporation()
    }
    if (corp.state === 'START') break
    lastState = corp.state
    ns.print('State: ' + corp.state)
  }

  ns.print('----- STARTING TO SELL -----')
  ns.print('Get ready and check for investors')
  ns.print('when the revenue increases!')
  let divisions = corp.divisions
  for (let i = 0; i < divisions.length; i++) {
    let division = divisions[i]
    let cities = division.cities
    for (let j = 0; j < cities.length; j++) {
      let city = cities[j]
      ns.print(`Selling in ${division.name} - ${city}`)
      let warehouse = ns.corporation.getWarehouse(division.name, city)

      // sell mats
      let mats = ns.corporation.getMaterialNames().map(materialName => ns.corporation.getMaterial(division.name, city, materialName)).filter(x => x && x.qty > 1)
      for (let k = 0; k < mats.length; k++) {
        let mat = mats[k]
        ns.corporation.sellMaterial(division.name, city, mat.name, 'MAX', 'MP')
      }
      
      // sell products
      for (let k = 0; k < division.products.length; k++) {
        let productName = division.products[k]
        let product = ns.corporation.getProduct(division.name, productName)
        ns.corporation.sellProduct(division.name, city, productName, 'MAX', 'MP', true)
      }
    }
  }

  corp = ns.corporation.getCorporation()
  lastState = corp.state
  while (true) {
    while (corp.state === lastState) {
      await ns.sleep(100)
      corp = ns.corporation.getCorporation()
    }
    if (corp.state === 'START') break
    lastState = corp.state
    ns.print('State: ' + corp.state)
  }

  ns.print('Cycle complete, hope you found investors!')
}