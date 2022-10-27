/*
This script should auto-ascend when it will give them a 2.0 modifier and re-purchase
all their equipment
*/

/** @param {NS} ns */
export async function main(ns) {

  let gearNames = ns.gang.getEquipmentNames()
  // ns.tprint('gearNames: ' + JSON.stringify(gearNames))
  let upgradeGearNames = gearNames.filter(x => ['Weapon', 'Armor', 'Vehicle', 'Rootkit'].find(y => ns.gang.getEquipmentType(x) === y))
  // ns.tprint('upgradeGearNames: ' + JSON.stringify(upgradeGearNames))
  let totalCost = upgradeGearNames.reduce((p, c) => p + ns.gang.getEquipmentCost(c), 0)
  ns.tprint('TOTAL COST: ' + totalCost.toFixed(1) + '\n' + JSON.stringify(upgradeGearNames))

  while (true) {
    let p = ns.getPlayer()
    if (p.money > totalCost + 1000000) {
      let getMaxAscensionResult = name => {
        let a = ns.gang.getAscensionResult(name)
        if (!a) return 0
        let max = ['hack', 'str', 'def', 'dex', 'agi', 'cha'].reduce((p, c) => Math.max(a[c], p), 0);
        return max;
      }
      let names = ns.gang.getMemberNames().filter(x => getMaxAscensionResult(x) >= (x === 'Boots' ? 1.1 : 1.2))
      for (let i = 0; i < names.length; i++) {
        let name = names[i]
        let maxa =  getMaxAscensionResult(name)
        let original = ns.gang.getMemberInformation(name)
        let asc = ns.gang.getAscensionResult(name)
        ns.tprint(`Ascending ${name}: ` + JSON.stringify({maxa: maxa.toFixed(3), ...Object.fromEntries(Object.entries(asc).map(x => { x[1] = Math.trunc(x[1] * 1000)/1000; return x }))}))
        ns.tprint(`    Before: ` + JSON.stringify( {
          hack_mult: original.hack_asc_mult.toFixed(3),
          str_mult: original.str_asc_mult.toFixed(3),
          def_mult: original.def_asc_mult.toFixed(3),
          dex_mult: original.dex_asc_mult.toFixed(3),
          agi_mult: original.agi_asc_mult.toFixed(3),
          cha_mult: original.cha_asc_mult.toFixed(3),
        }))
        ns.gang.ascendMember(name)
        upgradeGearNames.forEach(gearName => ns.gang.purchaseEquipment(name, gearName))
        let after = ns.gang.getMemberInformation(name)
        ns.tprint(`    After: ` + JSON.stringify( {
          hack_mult: after.hack_asc_mult.toFixed(3),
          str_mult: after.str_asc_mult.toFixed(3),
          def_mult: after.def_asc_mult.toFixed(3),
          dex_mult: after.dex_asc_mult.toFixed(3),
          agi_mult: after.agi_asc_mult.toFixed(3),
          cha_mult: after.cha_asc_mult.toFixed(3),
        }))
      }
    }
    await ns.sleep(5000)
  }
}
