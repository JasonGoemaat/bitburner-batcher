/** @param {NS} ns */
export async function main(ns) {
  // let sing = ns.singularity
  // ns.tprint(sing.getCrimeChance('Shoplifting'))
  // sing.getOwnedSourceFiles()
  // ns.tprint(JSON.stringify(sing.getOwnedSourceFiles(), null, 2))
  // ns.tprint(sing.createProgram('FTPCrack.exe', true))
  commitCrime(ns, 'mug')
}

/** @param {NS} ns */
function commitCrime(ns, crime, focus = true) {
  ns.tprint(`Committing crime: ${crime}${focus ? ' - FOCUSSED' : ''}`)
  ns.singularity.commitCrime(crime, focus)
}