/** @param {NS} ns */
export async function main(ns) {
  let [target, id, weakenPort, growPort] = ns.args
  const handleWeaken = ns.getPortHandle(weakenPort)
  const handleGrow = ns.getPortHandle(growPort)

  while (true) {
    while (handleWeaken.empty()) await ns.sleep(10) // wait for a weaken
    handleWeaken.clear() // consume weaken
    await ns.grow(target)
    if (handleGrow.empty()) handleGrow.write(`${id}`) // have to write something for hack to listen for
    handleWeaken.clear() // pending weakens are no longer valid
  }
}
