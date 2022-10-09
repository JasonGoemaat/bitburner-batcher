/** @param {NS} ns */
export async function main(ns) {
  const [target] = ns.args
  await ns.weaken(target)
}