const schema = [
  ['repeat', false]
]

const fnum = num => {
  if (Math.abs(num) < 1000) return Math.trunc(num * 1000) / 1000
  let e = Math.trunc(Math.log10(num))
  num = num / Math.pow(10, e)
  return num.toFixed(3) + `e+${e}`
}

/** @param {NS} ns */
export async function main(ns) {

  let flags = ns.flags(schema)
  const sing = ns.singularity

  const FACTION = 'Bachman & Associates'
  let augs = getFactionAugs(ns, FACTION)

  // install non-governor augs
  while (true) {
    // if we need rep for augs we can afford, attempt to bribe the faction
    // with corporation funds
    let needRepAugs = augs.filter(x => x.needed && x.affordable && !x.haveRep)
    let maxRequiredRep = needRepAugs.reduce((p, c) => Math.max(p, c.rep), 0)
    let neededRep = maxRequiredRep - augs.currentRep
    if (neededRep > 0) {
      let corpInfo = ns.corporation.getCorporation()
      if (corpInfo && corpInfo.funds > 0) {
        let possibleRep = Math.trunc(corpInfo.funds / 1e9)
        if (possibleRep > neededRep) {
          ns.tprint(`Bribing '${FACTION} with $${fnum(neededRep * 1e9)} to get ${fnum(neededRep)} rep`)
          ns.corporation.bribe(FACTION, neededRep * 1e9)
        }
      }
    }

    augs = getFactionAugs(ns, FACTION)
    const possible = augs.filter(x => x.needed && x.affordable && x.haveRep && x.havePrereqs)
    if (possible.length === 0) break
    possible.sort((a, b) => b.cost - a.cost)
    let money = augs.playerMoney
    while (possible.length > 0) {
      let next = possible.shift()
      if (next.cost <= augs.playerMoney) {
        ns.tprint(`WARNING: Purchasing aug: ${next.name} for $${fnum(next.cost)}`)
        sing.purchaseAugmentation(FACTION, next.name)
        augs.playerMoney -= next.cost
      } else {
        ns.tprint(`WARNING: CANNOT AFFORD: ${next.name}`)
      }
    }

    augs = getFactionAugs(ns, FACTION)
    break
  }

  ns.tprint(JSON.stringify(augs, null, 2))

  // now load up on NeuroFlux Governor, if --repeat flag is passed
  if (!flags.repeat) return
  while (augs.playerMoney >= (augs.find(x => x.name === 'NeuroFlux Governor')?.cost || 0)) {
    let aug = augs.find(x => x.name === 'NeuroFlux Governor')
    let neededRep = aug.rep - augs.currentRep
    if (neededRep > 0) {
      let corpInfo = ns.corporation.getCorporation()
      let possibleRep = Math.trunc(corpInfo.funds / 1e9)
      if (possibleRep < neededRep) {
        ns.tprint('INFO: Ran out of corporate funds to buy rep')
      }
      ns.tprint(`INFO: Bribing '${FACTION} with $${fnum(neededRep * 1e9)} to get ${fnum(neededRep)} rep`)
      ns.corporation.bribe(FACTION, neededRep * 1e9)
    }
    ns.tprint(`WARNING: Purchasing aug: ${aug.name} for $${fnum(aug.cost)}`)
    sing.purchaseAugmentation(FACTION, aug.name)
    augs = getFactionAugs(ns, FACTION)
  }
  ns.tprint('WARNING: Out of money!')
}

/**
 * 
 * @param {NS} ns 
 * @param {string} faction 
 * @returns any[]
 */
const getFactionAugs = (ns, faction) => {
  const sing = ns.singularity
  let installed = sing.getOwnedAugmentations(false).reduce((p, c) => Object.assign(p, { [c]: true }), {})
  let owned = sing.getOwnedAugmentations(true).reduce((p, c) => Object.assign(p, { [c]: true }), {})
  let augs = sing.getAugmentationsFromFaction(faction).map(x => {
    return {
      name: x,
      rep: sing.getAugmentationRepReq(x),
      cost: sing.getAugmentationPrice(x),
      installed: installed[x] ? true : false,
      owned: owned[x] ? true : false,
      prereqs: sing.getAugmentationPrereq(x)
    }
  })
  
  const playerMoney = ns.getServerMoneyAvailable('home')
  const currentRep = sing.getFactionRep(faction)

  augs.forEach(aug => {
    aug.needed = !aug.owned
    aug.affordable = aug.cost <= playerMoney
    aug.haveRep = aug.rep <= currentRep
    aug.havePrereqs = true
    aug.prereqs.forEach(prereq => {
      if (!owned[prereq]) aug.havePrereqs = false
    })
  })

  augs.currentRep = currentRep
  augs.playerMoney = playerMoney
  return augs
}