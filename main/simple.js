import { getCustomFormulas } from "./lib";

const SCRIPT = '/remote/simple.js'

const black = '\x1b[30m', red = '\x1b[31m', green = '\x1b[32m', yellow = '\x1b[33m', blue = '\x1b[34m',
  magenta = '\x1b[35m', cyan = '\x1b[36m', white = '\x1b[37m',
  Bblack = '\x1b[40m', Bred = '\x1b[41m', Bgreen = '\x1b[42m', Byellow = '\x1b[43m', Bblue = '\x1b[44m',
  Bmagenta = '\x1b[45m', Bcyan = '\x1b[46m', Bwhite = '\x1b[47m';
  

/** @param {NS} ns */
export async function main(ns) {
	let [target, runners, threads] = ns.args

  ns.write('/remote/simple.js', `/** @param {NS} ns */
  export async function main(ns) {
    let [target, targetDifficulty, targetMoney, hackThreads] = ns.args
    if ((!target) || (!targetDifficulty) || (!targetMoney)) { ns.tprint('ERROR: simple.js requires target, targetDifficulty, and targetMoney'); return; }
  
    while(true) {
      if (await ns.getServerSecurityLevel(target) > targetDifficulty + Math.random() * 2) {
         await ns.weaken(target)
      } else if (ns.getServerMoneyAvailable(target) < targetMoney - targetMoney * Math.random() * 0.1) {
         await ns.grow(target)
      } else {
         await ns.hack(target, { threads: hackThreads})
      }
    }
  }`, 'w')

  if (!target || !runners) { ns.tprint('ERROR: simple.js requires target and at least one runner'); return; }
  ns.tprint('INFO: runners: ', runners)
  if (runners === 'all') {
    let text = ns.read('/var/servers.txt')
    if (!text) {
      ns.tprint(`ERROR: Cannot use 'all' without running scan to populate /var/servers.txt`)
      return
    }
    /** @type {Server[]} */
    let servers = Object.values(JSON.parse(text));
    servers = servers.filter(x => x.hasAdminRights && !x.purchasedByPlayer && x.ramUsed === 0 && x.maxRam > 0)
    runners = servers.map(x => x.hostname)
    ns.tprint('INFO: runners: ', runners.join(', '))
  } else {
    runners = runners.split(',')
  }

  let hacking = getCustomFormulas()
  let targetServer = ns.getServer(target)
  let prepped = {...targetServer, hackDifficulty: targetServer.minDifficulty, moneyAvailable: targetServer.moneyMax }
  let player = ns.getPlayer()
  let hp = hacking.hackPercent(prepped, player)

  for (let i = 0; i < runners.length; i++) {
    const runner = runners[i]
    ns.rm(SCRIPT, runners[i])
    await ns.scp(SCRIPT, runners[i]);

    const scriptRam = ns.getScriptRam(SCRIPT, runner)
    const availableRam = ns.getServerMaxRam(runner) - ns.getServerUsedRam(runner)
    let useThreads = threads || Math.trunc(availableRam / scriptRam)
    let maxThreads = Math.max(1, Math.min(useThreads, Math.floor(1 / hp / 3)))
    const targetMoney = Math.trunc((await ns.getServerMaxMoney(target)) * 0.95)
    const targetDifficulty = (await ns.getServerMinSecurityLevel(target)) + 2

    ns.print(JSON.stringify({ runner, hp, threads, maxThreads }))

    if (useThreads < 1) {
      ns.tprint(`WARNING: ${cyan}${runner}${white} has no ram available`)
    } else {
      ns.tprint(`${white}Running ${maxThreads} threads on ${cyan}${runner}${white} targeting ${cyan}${target}`)
      ns.exec(SCRIPT, runner, useThreads, target, targetDifficulty, targetMoney, maxThreads)
    }
  }
}