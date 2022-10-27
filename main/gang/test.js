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
    return {
      name: m.name,
      agi: fnum(m.agi),
      mult: fnum(m.agi_asc_mult),
      exp: ns.nFormat(m.agi_exp, '0,000.0a'),
      texp: ns.nFormat(m.agi_asc_points, '0,000.0a'),
      eqmult: fnum(m.agi_mult),
      aasc: a ? fnum(a.agi) : 'NO',
      masc: max ? fnum(max) : 'NO',
    }
  })
  ns.tprint('Agility:\n' + createTable(data, { align: { names: 'left' }}).join('\n'))
}

function fnum(num) {
  return num.toFixed(3)
}