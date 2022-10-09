/** @param {NS} ns */
export async function main(ns) {
  const [target] = ns.args
  let h = await ns.hack(target)
  while (!h) {
    h = await ns.hack(target)
  }
  ns.tprint(`${target} hacked ${ns.nFormat(h, '$0,000')}`)
  let g = await ns.grow(target)
  ns.tprint(`${target} grew ${ns.nFormat(g, '0,000.000000')}`)
  let w = await ns.weaken(target)
  ns.tprint(`${target} weaken ${ns.nFormat(w, '0,000.000')}`)
}