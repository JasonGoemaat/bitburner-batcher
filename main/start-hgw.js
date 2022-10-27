import { createTable } from '/lib'

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')

  killAllByName(ns, 'batcher');
  await ns.sleep(1000)
  killAllByName(ns, 'hack');
  await ns.sleep(1000)
  killAllByName(ns, 'grow');
  await ns.sleep(1000)
  killAllByName(ns, 'weak');
  await ns.sleep(1000)
  
  var obj = eval("window['obj'] = window['obj'] || {}")
  obj.batchers = {}
  ns.tprint('usage: start-hgw [kill]')
  // let hosts = ['peta', 'peta-0', 'peta-1', 'peta-2', 'peta-3']
  // let targets = ['alpha-ent', 'rho-construction', 'catalyst', 'lexo-corp', 'syscore']
  // let hosts = ['peta', 'peta-1', 'peta-2']
  // let targets = ['the-hub', 'rho-construction', 'summit-uni']

  // let targets = ['clarkinc', 'ecorp', '4sigma']
  let targets = ['all', 'all'] // 'all' will use top calculated servers, unfortunately we won't know what they are :(
  let hosts = ['peta', 'peta-0']

  if (ns.args[0] && (ns.args[0] !== 'kill')) {
    hosts = ns.args[0].split(',')
    targets = hosts.map(() => 'all')
  }

  if (ns.args[1]) {
    targets = ns.args[1].split(',')
  }

  let runningOn = ns.getHostname()
  for (let i = 0; i < hosts.length; i++) {
    let host = hosts[i]
    await ns.scp('lib.js', host)
    await ns.sleep(50)
    await ns.scp('/tools/batcher-hgw.js', host)
    await ns.sleep(50)
  }

  // 183.91 for 1 (restart) + 4 (table borders, heading) + 1 ('total' line) + 4 (hosts) - sounds right
  // total height: 223, so add 40 for title bar and bottom border of window
  ns.resizeTail(880, ((targets.length || 1) + 6) * 18.4 + 40) // 18.4 line height, 40 for title bar and window

  while (true) {
    let pids = []

    for (let i = 0; i < hosts.length; i++) {
      await killScripts(ns, hosts[i])
    }

    if (ns.args[0] === 'kill') {
      ns.tprint('Done killing only, exiting...')
      return
    }

    await ns.sleep(1000)
    let skip = 0

    let scriptsWithArgs = []
    let skips = []
    for (let i = 0; i < targets.length; i++) {
      const host = hosts[i]
      const target = targets[i]
      ns.tprint(`Starting to target ${target} on ${host}`)
      let scriptArgs = ['run', target, '--host', host]
      if (target === 'all') {
        scriptArgs = scriptArgs.concat(['--skip', skip])
        skip++
        skips.push(skip)
      } else {
        skips.push(undefined)
      }
      let script = '/tools/batcher-hgw.js'
      let pid = ns.exec(script, host, 1, ...scriptArgs)
      pids.push(pid)
      scriptsWithArgs.push({ pid, script, scriptArgs, target, host })
      await ns.sleep(2000)
    }

    // TODO: Add argument for this?
    // for (let i = 0; i < pids.length; i++) {
    //   ns.tail(pids[i])
    //   await ns.sleep(500)
    //   ns.moveTail(1100, i * 250 + 20, pids[i])
    //   ns.resizeTail(1300, 240, pids[i])
    // }

    var restartAt = new Date().valueOf() + 90 * 60 * 1000
    var restartTime = new Date(restartAt).toLocaleTimeString()
    ns.print(`Done starting batchers, waiting 90 minutes to restart at ${restartTime}...`)
    ns.tprint(`Done starting batchers, waiting 90 minutes to restart at ${restartTime}...`)

    while (new Date().valueOf() < restartAt) {
      let results = []
      for (let i = 0; i < scriptsWithArgs.length; i++) {
        let { pid, script, scriptArgs, target, host } = scriptsWithArgs[i]
        try {
          let income = ns.getScriptIncome(script, host, ...scriptArgs) || 0
          let expGain = ns.getScriptExpGain(script, host, ...scriptArgs) || 0
          let hourly = income * 3600
          let state = "???"
          let stateEnd = "???"

          // see if we have batcher
          if (obj && obj.batchers) {
            let b = Object.values(obj.batchers).find(x => x.host === host)
            if (b) {
              target = b.target
              state = b.state
              stateEnd = b.stateEnd
            }
          }

          results.push({ target, host, income, hourly, expGain, state, stateEnd })
          await ns.sleep(100)
        } catch (err) {
          // maybe server was deleted?
        }
      }
      results.unshift({
        host: '', target: 'total',
        income: results.reduce((p, c) => p + c.income, 0) || 0,
        hourly: results.reduce((p, c) => p + c.hourly, 0) || 0,
        expGain: results.reduce((p, c) => p + c.expGain, 0) || 0,
        state: 'RUNNING',
        stateEnd: new Date(restartAt).toLocaleTimeString(),
      })
      let table = createTable(results.map(x => ({
        target: x.target,
        host: x.host,
        income: x.income < 0 ? '--' : ns.nFormat(x.income || 0, '$0,000.00a'),
        'hourly': x.hourly < 0 ? '--' : ns.nFormat(x.hourly || 0, '$0,000.00a'),
        expGain: x.expGain <= 0 ? 'waiting' : ns.nFormat(x.expGain || 0, '0,000'),
        state: x.state,
        finish: x.stateEnd
      })), { align: { host: 'left', target: 'left', state: 'center', stateEnd: 'center' } })
      ns.clearLog()
      let time = new Date().valueOf()
      ns.print(`Restart in ${ns.nFormat((restartAt - time) / 60000, '0.0')} min at ${new Date(restartAt).toLocaleTimeString()}`)
      ns.print(table.join('\n'))

      await ns.sleep(5950)
    }

    for (let i = 0; i < pids.length; i++) {
      ns.kill(pids[i], hosts[i])
    }

    await ns.sleep(1000)
  }
}

const killScripts = async (ns, host) => {
  ns.tprint(`Killing scripts on ${host}...`)
  const infos = ns.ps(host)

  let targets = infos.filter(x => x.filename.indexOf('hack-hgw') >= 0)
  for (let i = 0; i < targets.length; i++) {
    ns.kill(targets[i].pid, host)
  }
  await ns.sleep(500)

  targets = infos.filter(x => x.filename.indexOf('grow-hgw') >= 0)
  for (let i = 0; i < targets.length; i++) {
    ns.kill(targets[i].pid, host)
  }
  await ns.sleep(500)

  targets = infos.filter(x => x.filename.indexOf('weak-hgw') >= 0)
  for (let i = 0; i < targets.length; i++) {
    ns.kill(targets[i].pid, host)
  }
  await ns.sleep(500)
}

/*
Growers: tera-3,tera-2,tera-1

tera-6,tera-5,tera-4 phantasy,silver-helix,the-hub

*/


function killAllByName(ns, command) {
  /** @type {Server[]} */
  let runnable = []
  const servers = {}
  const scanServer = (hostname) => {
    const server = ns.getServer(hostname)
    servers[hostname] = server
    server.connections = ns.scan(hostname)
    server.connections.forEach(name => {
      if (!servers[name]) scanServer(name)
    })
  }
  scanServer('home')
  runnable = Object.values(servers).filter(x => x.hasAdminRights && x.maxRam > 0 && x.hostname !== 'home').concat([{ hostname: 'home' }])

	runnable.forEach(x => {
		if (typeof(command) === 'string' && command.length > 0 && command !== 'all') {
			var list = ns.ps(x.hostname)
      let count = 0
			list.forEach(info => {
				if (info.filename.indexOf(command) >= 0 || JSON.stringify(info.args).indexOf(command) >= 0) {
          count++
					ns.kill(info.pid, x.hostname)
				}
			})
      if (count) ns.tprint(`${x.hostname}: killed ${count} scripts`)
      // ns.tprint(` - other - ${x.hostname}: killed ${count} scripts`)
		} else {
      ns.tprint(`${x.hostname}: killing all`)
			ns.killall(x.hostname)
		}
	})
}
