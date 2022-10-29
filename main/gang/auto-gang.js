/*

A 'cycle' lasts 5 minutes and the current task for any given member on a cycle
is set by taking the cycle and their member index and modding by the number
of tasks in your list, so it should spread out tasks evenly among your members,
and each one should progress through the list of tasks, although when you start
only the first member will start on task 0.

Set 'upgradeEquipmentNames' to a list of the gear you want to purchase,
currently it gets a list of all equipment by type and includes all types.



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

const DURATION = 5 * 60 * 1000 // 5 minutes

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
  let cycleTasks = ['Train Combat', 'Train Combat',
                    'Terrorism', 'Terrorism',
                    'Human Trafficking', 'Territory Warfare']

  while (true) {
    let memberNames = ns.gang.getMemberNames()
    ns.print(`Cycle ${cycle} activating for ${memberNames.length} gang members`)
    memberNames.forEach((name, index) => {
      let taskIndex = (cycle + index) % cycleTasks.length
      if (taskIndex === 0) {
        let result = ns.gang.ascendMember(name)
        if (result) ns.print(`INFO: Ascended gang member ${name}:\n      Hack:${sf(result.hack)}, Str:${sf(result.str)}, Def:${sf(result.def)}, Dex:${sf(result.dex)}, Agi:${sf(result.agi)}`)
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

    let cycleEnd = new Date(new Date().valueOf() + DURATION).toLocaleTimeString()
    ns.print(`Next cycle at ${cycleEnd}`)
    await ns.sleep(DURATION) // wait 5 minutes
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
