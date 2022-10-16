/**
 * Run a script on a remote host
 */

/** @param {NS} ns */
export async function main(ns) {
  let [script, hosts, threads, ...args] = ns.args

  hosts = hosts.split(',')

  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i]
    const scriptRam = ns.getScriptRam(script)
    const hostRam = ns.getServerMaxRam(host) - ns.getServerUsedRam(host)
    let runThreads = threads || Math.trunc(hostRam / scriptRam)
    if (runThreads > 0) {
      ns.rm(script, host)
      await ns.scp(script, host)
      ns.exec(script, host, runThreads, ...args)
    }
  }
}