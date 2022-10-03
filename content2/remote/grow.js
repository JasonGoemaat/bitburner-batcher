/** @param {NS} ns */
export async function main(ns) {
  const obj = eval("window.obj") // 'CHEAT', but just for debugging

  let [target, id, command, port] = ns.args
  port = port || 5
  const handle = ns.getPortHandle(port)

  let start = new Date().valueOf()
  let time = ns.getGrowTime(target)
  let eEnd = start + time
  
  let msg = JSON.stringify({ id, message: 'start', command: 'grow', start, time, eEnd })
  if (!handle.tryWrite(msg)) {
    obj.errors[obj.errors.length] = msg
  }

  let result = await ns.grow(target)

  let end = new Date().valueOf()
  msg = JSON.stringify({ id, message: 'end', command: 'grow', end, result })
  if (!handle.tryWrite(msg)) {
    obj.errors[obj.errors.length] = msg
  }
}
