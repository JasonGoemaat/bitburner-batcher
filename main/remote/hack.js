/** @param {NS} ns */
export async function main(ns) {
  let [target, id, command, port, time] = ns.args
  port = port || 5
  const handle = ns.getPortHandle(port)
  const handle2 = ns.getPortHandle(port + 1)

  let start = new Date().valueOf()
  // let time = ns.getHackTime(target)
  let eEnd = start + time

  let msg = JSON.stringify({ id, message: 'start', command: 'hack', start, time, eEnd })
  if (!handle.tryWrite(msg)) {
    if (!handle2.tryWrite(msg)) {
      ns.print(`ERROR: cannot 'start' write to port ${port}`)
    }
  }

  let result = await ns.hack(target)

  let end = new Date().valueOf()
  msg = JSON.stringify({ id, message: 'end', command: 'hack', end, result })
  if (!handle.tryWrite(msg)) {
    if (!handle2.tryWrite(msg)) {
      ns.print(`ERROR: cannot write 'end' to port ${port}`)
    }
  }
}
