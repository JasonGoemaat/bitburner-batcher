/** @param {NS} ns */
export async function main(ns) {
  let sing = ns.singularity
  let count = 0
  while (sing.purchaseAugmentation('Daedalus', 'NeuroFlux Governor')) count++;
  ns.tprint(`Purchased ${count}`)
}