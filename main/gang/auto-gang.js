/*
1. You must have 12 gang members
2. Gang members will start in state given the cycle plus their index modded cycle count
3. Every 5 minutes, we increment the cycle count and re-assign jobs, ascending people moving into position 0

Jobs are:
 [
  "Unassigned",
  "Mug People",
  "Deal Drugs",
  "Strongarm Civilians",
  "Run a Con",
  "Armed Robbery",
  "Traffick Illegal Arms",
  "Threaten & Blackmail",
  "Human Trafficking",
  "Terrorism",
  "Vigilante Justice",
  "Train Combat",
  "Train Hacking",
  "Train Charisma",
  "Territory Warfare"
]

*/

const newMemberNames = ('General Kenobi,General Zod,Admiral Akbar,Admiral Thrawn' +
    ',Colonel Duke,Colonel Nick Fury,Major Tom,Major Paine' +
    ',Corporal Klinger,Corporal Barnes,Sergeant Slaughter,Sergeant Smith').split(',')

/** @param {NS} ns */
export async function main(ns) {
  // // show list of job names
  // ns.tprint(JSON.stringify(ns.gang.getTaskNames(), null, 2))
  // return

  ns.disableLog('ALL')

  // what gear will we buy after ascension?
  let equipmentNames = ns.gang.getEquipmentNames()
  let upgradeEquipmentNames = equipmentNames.filter(x => ['Weapon', 'Armor', 'Vehicle', 'Rootkit', 'Augmentation'].find(y => ns.gang.getEquipmentType(x) === y))

  let cycle = 0

  // with 6 jobs and 12 members, we should have two members on each
  let cycleTasks = ['Train Combat', 'Train Combat', 'Terrorism', 'Terrorism', 'Human Trafficking', 'Territory Warfare']

  while (true) {
    let memberNames = ns.gang.getMemberNames()
    ns.print(`Cycle ${cycle} activating for ${memberNames.length} gang members`)
    memberNames.forEach((name, index) => {
      let taskIndex = (cycle + index) % cycleTasks.length
      if (taskIndex === 0) {
        let result = ns.gang.ascendMember(name)
        if (result) ns.print(`INFO: Ascended gang member ${name}:\n      Hack:${sf(result.hack)}, Str:${sf(result.str)}, Def:${sf(result.def)}, Dex::${sf(result.dex)}, Agi::${sf(result.agi)}`)
        // if (result) ns.print(`INFO: Ascended gang member ${name}:\n      ${JSON.stringify(result)}`)
        purchaseEquipment(name)
      }
      ns.gang.setMemberTask(name, cycleTasks[taskIndex])
    })

    // hire new members if possible and set them to first job for this cycle,
    // should be training probably
    if (ns.gang.canRecruitMember()) {
      newMemberNames.forEach(name => {
        if (ns.gang.recruitMember(name)) {
          ns.print(`INFO: Recruited new gang member '${name}`)
          ns.gang.setMemberTask(name, cycleTasks[0])
          purchaseEquipment()
        }
      })
    }

    await ns.sleep(5 * 60 * 1000) // wait 5 minutes
    cycle++
  }

  /**
   * Purchase equipment for a gang member if we have the money
   * 
   * @param {string} memberName Name of the gang member to purchase equipment for
   */
   function purchaseEquipment(memberName) {
    let { money } = ns.getPlayer()
    upgradeEquipmentNames.forEach(equipName => {
      let cost = ns.gang.getEquipmentCost(equipName)
      if (money >= cost && ns.gang.purchaseEquipment(memberName, equipName)) money -= cost
    })
  }

  /**
   * Simple format for stats
   * 
   * @param {number} value
   */
  function sf(value) {
    if (typeof(value) !== 'number') return '???'
    return Math.trunc(value * 1000) / 1000
  }
}
