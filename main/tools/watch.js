

/** @param {NS} ns */
export async function main(ns) {
  let format = {
    short: n => n ? ns.nFormat(n, '0,000.000') : 'null',
    money: n => n ? ns.nFormat(n, '$0,000.000a') : 'null',
    gb: n => n ? ns.nFormat(n, '0,000') : 'null',
  }

  const host = ns.args[0] || await ns.getHostname()
	ns.print(`watching ${host}...`)
	let last = await ns.getServer(host)
	ns.disableLog('sleep')
  let start = performance.now()
	while (true) {
		await ns.sleep(10)
		const info = await ns.getServer(host)
		let count = 0
		let diff = Object.keys(info).reduce((p, c) => {
			let propType = typeof(info[c])
			if (propType === 'string') {
				if (last[c] != info[c]) {
					p[c] = `${c}: ${last[c]} => ${info[c]}`
					count++
				}
			} else if (propType === 'number') {
				if (last[c] != info[c]) {
					let lastStr = format.short(last[c])
					let infoStr = format.short(info[c])
					let diff = (info[c] || 0) - (last[c] || 0)
					let diffStr = format.short(diff)
					if (c.toUpperCase().indexOf('MONEY') >= 0) {
						lastStr = format.money(last[c])
						infoStr = format.money(info[c])
						diffStr = format.money(diff)
					} else if (c.toUpperCase().indexOf('RAM') >= 0) {
						lastStr = format.gb(last[c])
						infoStr = format.gb(info[c])
						diffStr = format.gb(diff)
					}
					let diffShow = `${diff >= 0 ? '+' : ''}${diffStr}`
					p[c] = `${c}: ${lastStr} => ${infoStr} (${diffShow})`
					count++
				}
			}
			return p
		}, {})
		last = info
		if (count) {
      const diffs = []
			Object.keys(diff).forEach(key => diffs.push(`key: ${diff[key]}`))
      // ns.write('/var/log/watch.txt', `${host}@${Math.trunc(performance.now())}: ${diffs.join(', ')}\n`, 'a')
      ns.tprint(`${host}@${ns.nFormat(Math.trunc(performance.now() - start) / 1000, '0,000.0')}: ${diffs.join(', ')}`)
		}
	}
}
