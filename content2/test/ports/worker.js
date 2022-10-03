/** @param {NS} ns */
export async function main(ns) {
  const [id, arg] = ns.args
	const start = new Date().valueOf()
	const handle = ns.getPortHandle(10)
	handle.write(JSON.stringify({ start, id, arg }))
}
