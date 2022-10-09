/** @param {NS} ns */
export async function main(ns) {
	let [hostname, minDifficulty, money] = ns.args
  if ((!hostname) || (!securityLevel) || (!money)) { ns.tprint('ERROR: simple.js requires hostname, minDifficulty, and money'); return; }
	const targetSecurityLevel = info.minDifficulty + 2
	const targetMoney = info.moneyMax * 0.95

	while(true) {
		if (await ns.getServerSecurityLevel(hostname) > targetSecurityLevel) {
		 	await ns.weaken(hostname)
		} else if (ns.getServerMoneyAvailable(hostname) < targetMoney) {
		 	await ns.grow(hostname)
		} else {
		 	await ns.hack(hostname)
		}
	}
}