const SCRIPT = '/remote/simple.js'

const black = '\x1b[30m', red = '\x1b[31m', green = '\x1b[32m', yellow = '\x1b[33m', blue = '\x1b[34m',
  magenta = '\x1b[35m', cyan = '\x1b[36m', white = '\x1b[37m',
  Bblack = '\x1b[40m', Bred = '\x1b[41m', Bgreen = '\x1b[42m', Byellow = '\x1b[43m', Bblue = '\x1b[44m',
  Bmagenta = '\x1b[45m', Bcyan = '\x1b[46m', Bwhite = '\x1b[47m';
  

/** @param {NS} ns */
export async function main(ns) {
	let [target, ...runners] = ns.args

  if (!target || runners.length < 1) { ns.tprint('ERROR: simple.js requires target and at least one runner'); return; }
  for (let i = 0; i < runners.length; i++) {
    const runner = runners[i]

    await ns.scp(SCRIPT, runners[i]);

    const scriptRam = ns.getScriptRam(SCRIPT, runner)
    const availableRam = ns.getServerMaxRam(runner) - ns.getServerUsedRam(runner)
    const threads = Math.trunc(availableRam / scriptRam)
    const targetMoney = Math.trunc((await ns.getServerMaxMoney(target)) * 0.95)
    const targetDifficulty = (await ns.getServerMinSecurityLevel(target)) + 2

    if (threads < 1) {
      ns.tprint(`WARNING: ${cyan}${runner}${white} has no ram available`)
    } else {
      ns.tprint(`${white}Running ${threads} threads on ${cyan}${runner}${white} targeting ${cyan}${target}`)
      ns.exec(SCRIPT, runner, threads, target, targetDifficulty, targetMoney)
    }
  }
}