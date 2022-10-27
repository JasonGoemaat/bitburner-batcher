import { createTable } from '/lib'

/** @param {NS} ns */
export async function main(ns) {
  let names = ns.gang.getMemberNames()
  let [memberName] = ns.args
  if (!memberName || !names.find(x => x === memberName)) {
    ns.tprint('INFO: Specify member name: ' + JSON.stringify(names))
    return
  }

  let member = ns.gang.getMemberInformation(memberName)
  let asc = ns.gang.getAscensionResult(memberName)
  ns.tprint(`INFO: Member '${memberName}'`)
  ns.tprint(JSON.stringify({
    memberInformation: member,
    ascensionResult: asc
  }, null, 2))
}
