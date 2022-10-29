/*

Auto find and purchase augs, try to bribe using corporate funds?
 
*/

/** @param {NS} ns */
export async function main(ns) {
  const sing = ns.singularity
  sing.connect('n00dles')
  while (true) {
    await sing.manualHack()
  }
}