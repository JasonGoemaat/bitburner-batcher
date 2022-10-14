/** @param {NS} ns */
export async function main(ns) {
  let [target, id] = ns.args
  while (true) {
    await ns.hack(target)
  }  
}
