/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL')
  let player = ns.getPlayer()
  let start = new Date().valueOf()
  let checkpoint = start + 10000
  let baseXp = player.exp.hacking
  let xpTenSec = baseXp
  let xpMinute = baseXp
  let xpHour = baseXp
  let countTenSec = 0
  while (true) {
    let ms = checkpoint - new Date().valueOf()
    if (ms >= 0) await ns.sleep(ms)
    countTenSec += 1
    let time = checkpoint
    checkpoint += 10000
    let newPlayer = ns.getPlayer()
    let xpDiff = newPlayer.exp.hacking - xpTenSec
    xpTenSec = newPlayer.exp.hacking
    // let xpHour = xpDiff * 360
    let xpSec = xpDiff / 10
    let xpTot = newPlayer.exp.hacking - baseXp
    let xpSecTot = xpTot / (new Date().valueOf() - start)
    ns.print(`${ns.nFormat(xpTenSec, '0,000.000a')} last 10 seconds, ${ns.nFormat(xpSec, '0,000.000a')} / sec (total ${ns.nFormat(xpSecTot, '0,000.000a')} / sec)`)
    // ns.toast(`${ns.nFormat(xpTenSec, '0,000.000a')} last 10 seconds, ${ns.nFormat(xpSec, '0,000.000a')} / sec (total ${ns.nFormat(xpSecTot, '0,000.000a')} / sec)`, "success", 2000)

    if ((countTenSec % 6) === 0) {
      let xp = newPlayer.exp.hacking - xpMinute
      xpMinute = newPlayer.exp.hacking
      let xs = xp / 60
      ns.print(`${ns.nFormat(xp, '0,000.000a')} last minute, ${ns.nFormat(xs, '0,000.000a')} / sec`)
    }

    if ((countTenSec % 360) === 0) {
      let xp = newPlayer.exp.hacking - xpHour
      xpHour = newPlayer.exp.hacking
      let xs = xp / 3600
      ns.print(`${ns.nFormat(xp, '0,000.000a')} last hour, ${ns.nFormat(xs, '0,000.000a')} / sec`)
      ns.tprint(`${ns.nFormat(xp, '0,000.000a')} last hour, ${ns.nFormat(xs, '0,000.000a')} / sec`)
      ns.toast(`${ns.nFormat(xp, '0,000.000a')} last hour, ${ns.nFormat(xs, '0,000.000a')} / sec`, "success", 15000)
    }

    player = newPlayer
  }
}