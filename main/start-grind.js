import { createTable } from './lib.js'

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')
  let hosts = ['grinder']
  let targets = ['joesguns', 'foodnstuff', 'n00dles', 'sigma-cosmetics', 'nectar-net',
    'hong-fang-tea', 'harakiri-sushi', 'neo-net', 'zer0', 'max-hardware', 'iron-gym']
  for (let i = 0; i < targets.length - 1; i++) {
    hosts.push(`grinder-${i}`)
  }
  if (ns.args[0]) {
    hosts = ns.args[0].split(',').concat(hosts)
  }
  hosts = hosts.filter(x => { try { 
    return ns.getServerMaxRam(x) > 0
  } catch { return false } })
  ns.tprint('hosts: ' + hosts.join(' '))
  if (!hosts.length) {
    ns.tprint('ERROR: No hosts')
    return
  }
  targets = targets.slice(0, hosts.length)

  let grinderHost = ns.getHostname()
  let killPids = ns.ps(grinderHost).filter(x => x.filename.indexOf("test-grind") >= 0).map(x => x.pid)
  for (let i = 0; i < killPids.length; i++) {
    ns.kill(killPids[i], grinderHost)
    await ns.sleep(50)
  }
  if (killPids.length) ns.tprint(`INFO: grind - killed ${killPids.length} scripts on ${grinderHost}`)

  let pids = []
  for (let i = 0; i < targets.length; i++) {
    const host = hosts[i]
    const target = targets[i]
    ns.print(`Starting to target ${target} on ${host}`)
    pids.push(ns.run('/test/test-grind.js', 1, host, target))
    await ns.sleep(200)
  }


  while (true) {
    let results = targets.map((target, index) => {
      let host = hosts[index]
      let income = ns.getScriptIncome('/remote/hack-loop.js', host, target, 0) || 0
      let expGain = ns.getScriptExpGain('/remote/hack-loop.js', host, target, 0) || 0
      return { target, host, income, expGain }
    })
    results.push({
      host: '', target: 'total',
      income: results.reduce((p, c) => p + c.income, 0) || 0,
      expGain: results.reduce((p, c) => p + c.expGain, 0) || 0
    })
    let table = createTable(results.map(x => ({
      target: x.target,
      host: x.host,
      income: x.income < 0 ? '--' : ns.nFormat(x.income || 0, '$0,000.00a'),
      expGain: x.expGain <= 0 ? 'waiting' : ns.nFormat(x.expGain || 0, '0,000'),
    })), { align: { host: 'left', target: 'left' }})
    ns.clearLog()
    ns.print(table.join('\n'))
    await ns.sleep(15000)
  }
}
