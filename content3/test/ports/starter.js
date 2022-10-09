/** @param {NS} ns */
export async function main(ns) {
  let COUNT = [ns.args]
  COUNT = COUNT || 10
  if (COUNT > 50) {
    ns.tprint(`WARNING: The default port limit is 50, script may stall with ${COUNT}`)
    ns.tprint(`INFO: You can up it to 100 in options, pausing 5 seconds...`)
    await ns.sleep(5000)
  }
	const handle = ns.getPortHandle(10)
	handle.clear()
  let lines = []
	const overallStart = new Date().valueOf()
	for (let i = 0; i < COUNT; i++) {
		const start = new Date().valueOf() - overallStart
		const pid = ns.exec('/test/ports/worker.js', 'home', 1, i, 1234)
		const end = new Date().valueOf() - overallStart
		lines.push(`${end.toString().padStart(3, '0')}: pid=${pid} beforeExec=${start} id=${i}`)
	}
	let msgCount = 0

  let sleeps = []

	while (msgCount < COUNT) {
		let count = 0
		while (handle.empty()) {
			count++
      sleeps.push({ start: new Date().valueOf() - overallStart, end: 0 })
			await ns.sleep(1)
      sleeps[sleeps.length - 1].end = new Date().valueOf() - overallStart
		}
		let msg = JSON.parse(handle.read())
		let scriptStart = msg.start - overallStart
		const msgTime = `${new Date().valueOf() - overallStart}`.padStart(3, '0')
		lines.push(`${msgTime}: waitCount=${count} scriptStart=${scriptStart} id=${msg.id} arg=${msg.arg} - '${JSON.stringify(msg)}'`)
		msgCount++
	}

  sleeps.forEach((sleep, index) => {
    lines.push(`${(new Date().valueOf() - overallStart).toString().padStart(3, '0')}: sleep ${index} start ${sleep.start} end ${sleep.end}`)
  })
  ns.tprint('\n' + lines.join('\n'))
	const done = new Date().valueOf() - overallStart
	ns.tprint(`done: ${done}`)
}
