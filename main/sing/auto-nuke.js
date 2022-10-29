/*

Auto find and purchase augs, try to bribe using corporate funds?
 
*/

/** @param {NS} ns */
export async function main(ns) {
  const sing = ns.singularity
  // const program = 'NUKE.exe'
  const program = 'BruteSSH.exe'

  let start = new Date().valueOf()
  while (true) {
    ns.rm(program)
    sing.createProgram(program, false)
    while (!ns.ls('home', program).length) {
      await ns.sleep(10)
    }
  }
}