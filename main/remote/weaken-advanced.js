/** @param {NS} ns */
export async function main(ns) {
  let [target, id, weakenPort, growPort] = ns.args
  const handleWeaken = ns.getPortHandle(weakenPort)

  while (true) {
    await ns.weaken(target)
    if (handleWeaken.empty()) handleWeaken.write(`${id}`)
  }
}
