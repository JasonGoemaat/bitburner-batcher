/*

Auto find and purchase augs, try to bribe using corporate funds?
 
*/

/** @param {NS} ns */
export async function main(ns) {
  const sing = ns.singularity

  let start = new Date().valueOf()
  let cities = ['Aevum', 'Volhaven', 'Chongqing', 'New Tokyo', 'Ishima', 'Sector-12']
  while (true) {
    for (let j = 0; j < 100; j++) { // this is enough for 90xp
      for (let i = 0; i < 5000; i++) {
        cities.forEach(city => sing.travelToCity(city))
      }
      await ns.sleep(0)
    }
  }
  let end = new Date().valueOf()
  ns.tprint(`Done traveling in ${(end - start).toFixed(0)} ms`)
}