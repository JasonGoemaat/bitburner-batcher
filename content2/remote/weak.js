/** @param {NS} ns */
export async function main(ns) {
  const obj = eval("window.obj") // 'CHEAT', but just for debugging

  let [target, id, command, port] = ns.args
  port = port || 5
  const handle = ns.getPortHandle(port)

  // weakens are different, they run continuously so we loop
  let count = 0
  let oldId = 0
  while (true) {
    let start = new Date().valueOf()
    let time = ns.getWeakenTime(target)
    let eEnd = start + time
    if (count > 0) {
      oldId = id
      id = start
    }
    let msg = JSON.stringify({ id, message: (count > 0) ? 'continue' :'start', command: 'weak', start, time, eEnd, oldId })
    if (!handle.tryWrite(msg)) {
      obj.errors[obj.errors.length] = msg
    }

    let result = await ns.weaken(target)

    let end = new Date().valueOf()
    msg = JSON.stringify({ id, message: 'end', command: 'weak', end, result })
    if (!handle.tryWrite(msg)) {
      obj.errors[obj.errors.length] = msg
    }
    count++
  }
}
