/** @param {NS} ns */
export async function main(ns) {
  let pids = ns.ps().filter(x => x.filename.indexOf('batcher-hgw') >= 0).map(x => x.pid)
  for (let i = 0; i < pids.length; i++) {
    ns.moveTail(1100, i * 250 + 20, pids[i])
    ns.resizeTail(1300, 240, pids[i])
    await ns.sleep(50)
  }
}