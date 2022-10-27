// TODO:
// 1. Fix --monitor, which should not kill anything, but should

// args: --host <host,host,host> - add hosts to default of 'grinder', 'grinder-[0-24]'
//       --gb <gb> - ram to reserve on 'home' only

import { createTable } from './lib.js'

/** @param {NS} ns */
export async function main(ns) {
  let args = [...ns.args]
  let options = {}
  const stripOption = (optionName, defaultValue) => {
    for (let i = 0; i < args.length - 1; i++) {
      if (args[i] === '--' + optionName) {
        if (typeof(defaultValue) === 'undefined') {
          // TODO: fix this, not working for --monitor
          options[optionName] = true
          args = args.slice(0, i).concat(args.slice(i + 1));
        } else {
          options[optionName] = args[i + 1];
          args = args.slice(0, i).concat(args.slice(i + 2));
        }
        return options[optionName] }
    }
    options[optionName] = defaultValue
    return defaultValue
  }
  // let host = stripOption('host', ns.getHostname())
  let reserveGb = stripOption('gb', 32)
  let monitor = stripOption('monitor')

  ns.disableLog('ALL')
  let hosts = ['grinder']
  // let targets = ['joesguns', 'foodnstuff', 'n00dles', 'sigma-cosmetics', 'nectar-net', 'hong-fang-tea', 'harakiri-sushi', 'neo-net', 'zer0', 'max-hardware', 'iron-gym']
  let targets = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25].map(x => 'joesguns')

  for (let i = 0; i < targets.length - 1; i++) {
    hosts.push(`grinder-${i}`)
  }
  if (args[0]) {
    hosts = args[0].split(',').concat(hosts)
  }
  hosts = hosts.filter(x => { try { 
    return ns.getServerMaxRam(x) > 0
  } catch { return false } })
  ns.tprint('hosts: ' + hosts.join(' '))
  if (!hosts.length) {
    ns.tprint('ERROR: No hosts')
    return
  }

  // targets = targets.slice(0, hosts.length)
  targets = hosts.map(x => 'joesguns') // always the best, works for 20 grinding servers for me

  if (!monitor) { // TODO: Fix this, probably just not getting the value right above
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
      let args = [host, target]
      if (host === 'home' && reserveGb) {
        args.push(reserveGb)
      }
      pids.push(ns.run('/test/test-grind.js', 1, ...args))
      await ns.sleep(200)
    }
  }

  while (true) {
    let results = []
    for (let i = 0; i < targets.length; i++) {
      let target = targets[i];
      let host = hosts[i]
      try {
        let income = ns.getScriptIncome('/remote/hack-loop.js', host, target, 0) || 0
        let expGain = ns.getScriptExpGain('/remote/hack-loop.js', host, target, 0) || 0
        results.push({ target, host, income, expGain })
        await ns.sleep(100)
      } catch (err) {
        // maybe server was deleted?
        targets.splice(i, 1)
        hosts.splice(i, 1)
        i--
      }
    }
    results.unshift({
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
    await ns.sleep(10000)
  }
}
