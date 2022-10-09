/** @param {NS} ns */
export async function main(ns) {
	let [target, targetDifficulty, targetMoney] = ns.args
  if ((!target) || (!targetDifficulty) || (!targetMoney)) { ns.tprint('ERROR: simple.js requires target, targetDifficulty, and targetMoney'); return; }

	while(true) {
		if (await ns.getServerSecurityLevel(target) > targetDifficulty + Math.random() * 2) {
		 	await ns.weaken(target)
		} else if (ns.getServerMoneyAvailable(target) < targetMoney - targetMoney * Math.random() * 0.1) {
		 	await ns.grow(target)
		} else {
		 	await ns.hack(target)
		}
	}
}