/** @param {NS} ns */
export async function main(ns) {
  ns.singularity.purchaseTor()
  ns.singularity.getDarkwebPrograms().forEach(name => {
    ns.tprint(`INFO: Buying ${name}: ${ns.singularity.purchaseProgram(name)}`)
  })
}