/** @param {NS} ns */
export async function main(ns) {
  const obj = eval("window.obj") // 'CHEAT', but just for debugging

  let [target, id, command, port] = ns.args
  port = port || 5
  const handle = ns.getPortHandle(port)
  const handle2 = ns.getPortHandle(port + 1)

  // weakens are different, they run continuously so we loop
  let count = 0
  let start = new Date().valueOf()
  let time = ns.getWeakenTime(target)
  let eEnd = start + time
  let end = null
  let result = null
  let msg = JSON.stringify({ id, message: 'start', command: 'weak', start, time, eEnd })
  if (!handle.tryWrite(msg)) {
    if (!handle2.tryWrite(msg)) {
      obj.errors[obj.errors.length] = msg
    }
  }

  while (true) {
    result = await ns.weaken(target)

    end = new Date().valueOf()
    start = end
    time = ns.getWeakenTime(target)
    eEnd = start + time
    count++
    msg = JSON.stringify({ id, message: 'continue', command: 'weak', start, time, eEnd, end, result, count })
    if (!handle.tryWrite(msg)) {
      if (!handle2.tryWrite(msg)) {
        obj.errors[obj.errors.length] = msg
      }
    }
  }
}
