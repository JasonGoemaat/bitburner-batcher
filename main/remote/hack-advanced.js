/** @param {NS} ns */
export async function main(ns) {
  let [target, id, weakenPort, growPort] = ns.args
  const handleWeaken = ns.getPortHandle(weakenPort)
  const handleGrow = ns.getPortHandle(growPort)

  while (true) {
    while (handleWeaken.empty() || handleGrow.empty()) await ns.sleep(10) // wait for a weaken and grow
    handleWeaken.clear() // consume weaken
    handleGrow.clear() // consume grow
    await ns.hack(target)
    handleWeaken.clear() // pending weakens are no longer valid
    handleGrow.clear() // pending grows are no longer valid
  }
}
