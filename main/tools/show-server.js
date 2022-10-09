/** @param {NS} ns */
export async function main(ns) {
  let server = ns.getServer(ns.args[0])
  ns.tprint(JSON.stringify(server, null, 2))
}