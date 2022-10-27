/*
This script should auto-ascend when it will give them a 2.0 modifier and re-purchase
all their equipment
*/

/** @param {NS} ns */
export async function main(ns) {
  let totalCost = [342913, 4115000, 8573000, 17146000, 20575000, 34291000, 51437000, 77153000, // weapons
      685825, 1715000, 8573000, 13717000, // armor
      1029000, 3086000, 6172000, 10287000] // vehicles
  totalCost = totalCost.reduce((p, c) => p + c, 0)

  let gearNames = ns.gang.getEquipmentNames()
  // ns.tprint('gearNames: ' + JSON.stringify(gearNames))
  let upgradeGearNames = gearNames.filter(x => ['Weapon', 'Armor', 'Vehicle'].find(y => ns.gang.getEquipmentType(x) === y))
  // ns.tprint('upgradeGearNames: ' + JSON.stringify(upgradeGearNames))

  while (true) {
    let p = ns.getPlayer()
    if (p.money > totalCost + 1000000) {
      let names = ns.gang.getMemberNames().filter(x => (ns.gang.getAscensionResult(x)?.agi || 0) >= (x === 'Boots' ? 1.1 : 1.1))
      for (let i = 0; i < names.length; i++) {
        let name = names[i]
        let original = ns.gang.getMemberInformation(name)
        let asc = ns.gang.getAscensionResult(name)
        ns.tprint(`Ascending ${name}: ` + JSON.stringify(asc))
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
