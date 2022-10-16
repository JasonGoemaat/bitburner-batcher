/** @param {NS} ns */
export async function main(ns) {
  ns.tprint('usage: start-hgw [kill]')
  // let hosts = ['peta', 'peta-0', 'peta-1', 'peta-2', 'peta-3']
  // let targets = ['alpha-ent', 'rho-construction', 'catalyst', 'lexo-corp', 'syscore']
  let hosts = ['peta', 'peta-2']
  let targets = ['the-hub', 'alpha-ent']

  while (true) {
    let port = 1
    let pids = []

    for (let i = 0; i < hosts.length; i++) {
      await killScripts(ns, hosts[i])
    }

    if (ns.args[0] === 'kill') {
      ns.tprint('Done killing only, exiting...')
      return
    }

    for (let i = 0; i < targets.length; i++) {
      const host = hosts[i]
      const target = targets[i]
      ns.tprint(`Starting to target ${target} on ${host}`)
      pids.push(ns.run('/tools/batcher-hgw.js', 1, 'run', target, '--host', host, '--port', port))
      port += 3
      await ns.sleep(2000)
    }

    for (let i = 0; i < pids.length; i++) {
      ns.tail(pids[i])
      await ns.sleep(500)
    }

    for (let i = 0; i < pids.length; i++) {
      ns.moveTail(1100, i * 250 + 20, pids[i])
      ns.resizeTail(1300, 240, pids[i])
      await ns.sleep(500)
    }

    var restartTime = new Date(new Date().valueOf() + 90*60*1000).toLocaleTimeString()
    ns.print(`Done starting batchers, waiting 90 minutes to restart at ${restartTime}...`)
    ns.tprint(`Done starting batchers, waiting 90 minutes to restart at ${restartTime}...`)
    await ns.sleep(90*60*1000)

    for (let i = 0; i < pids.length; i++) {
      ns.kill(pids[i])
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
}

