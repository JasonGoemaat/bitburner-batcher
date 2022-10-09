let avaialbleServers = {
  'giga-0': 64
}

/** @param {NS} ns */
export async function main(ns) {
  const obj = eval('window.obj = window.obj || {}')
  const contents = `export async function main(ns) { 
    const obj = eval('window.obj = window.obj || {}')
    obj['hack'] = []
    obj['hack'].push(performance.now())
    ns.tprint(performance.now())
    await ns.hack('foodnstuff')
    ns.tprint(performance.now())
    obj['hack'].push(performance.now())
  }`
  await ns.write('/temp/hack.js', contents, 'w')
  const pid = ns.exec('/temp/hack.js', 'home', 1)
  if (!pid) { ns.tprint('ERROR: Could not exec'); return }
  const logs = 
  ns.tprint(`logs:\n${ns.getScriptLogs(pid).join('\n')}`)
  await ns.sleep(1)
  ns.tprint(`logs (sleep 1ms):\n${ns.getScriptLogs(pid).join('\n')}`)
  await ns.sleep(10)
  ns.tprint(`logs (sleep 10ms):\n${ns.getScriptLogs(pid).join('\n')}`)
  await ns.sleep(50)
  ns.tprint(`logs (sleep 50ms):\n${ns.getScriptLogs(pid).join('\n')}`)
  await ns.sleep(13000)
  ns.tprint(`logs (sleep 13000ms):\n${ns.getScriptLogs(pid).join('\n')}`)
  ns.tprint(`hack:\n${JSON.stringify(obj, null, 2)}`)
}