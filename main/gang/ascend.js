import { createTable } from '/lib'

/** @param {NS} ns */
export async function main(ns) {
  let names = ns.gang.getMemberNames()
  let members = names.map(x => ns.gang.getMemberInformation(x))
  let asc = names.map(x => ns.gang.getAscensionResult(x))
  let getMaxAscensionResult = name => {
    let a = ns.gang.getMemberInformation(name)
    if (!a) return 0
    let max = ['hack', 'str', 'def', 'dex', 'agi', 'cha'].reduce((p, c) => Math.max(a[c + '_asc_mult'], p), 0);
    return max;
  }
  let data = members.map((m, i) => {
    /** @type {GangMemberAscension} */
    let a = asc[i]
    let max = getMaxAscensionResult(m.name)
    let avg = a ? (a.str + a.def + a.dex + a.agi) / 4 : undefined
    return {
      name: m.name,
      stats: `${fnum(m.str, 0)}/${fnum(m.def, 0)}/${fnum(m.dex, 0)}/${fnum(m.agi, 0)}`,
      asc: a ? `${fnum(a.str)}/${fnum(a.def)}/${fnum(a.dex)}/${fnum(a.agi)}` : 'NO',
      avg: avg ? `${fnum(avg, 3)}` : 'NO',
    }
  })
  ns.tprint('Ascension:\n' + createTable(data, { align: { names: 'left' }}).join('\n'))
}

function fnum(num, places = 3) {
  return typeof(num) === 'number' ? num.toFixed(places) : `${num}`
}