// find scripts running on all servers and report their profit

import { createTable } from '/lib'

/** @param {NS} ns */
export async function main(ns) {
  //----------------------------------------------------------------------------------------------------
  // scan all servers
  //----------------------------------------------------------------------------------------------------

  /** @type {Object<string,Server} */
  const servers = {}

  const scanServer = (hostname) => {
    const server = ns.getServer(hostname)
    servers[hostname] = server
    server.connections = ns.scan(hostname)
    server.connections.forEach(name => {
      if (!servers[name]) scanServer(name)
    })
  }
  scanServer('home')

  let scripts = Object.values(servers).reduce((p, server) => {
    return p.concat(ns.ps(server.hostname).map(x => {
      const { filename, pid, args, threads } = x
      const income = ns.getScriptIncome(filename, server.hostname, ...args)
      const expGain = ns.getScriptExpGain(filename, server.hostname, ...args)
      const [totalIncome, totalTime] = ns.getTotalScriptIncome(filename, server.hostname, ...args)
      const totalExpGain = ns.getTotalScriptExpGain(filename, server.hostname, ...args)
      return { hostname: server.hostname, filename, pid, args, threads, income, expGain, totalIncome, totalExpGain, totalTime }
    }))
  }, [])

  scripts.sort((a, b) => (b.income - a.income) ? b.income - a.income : a.hostname.localeCompare(b.hostname))

  const totals = scripts.reduce((p, c) => {
    p.income = (p.income || 0) + c.income
    p.expGain = (p.expGain || 0) + c.expGain
    p.totalIncome = (p.totalIncome || 0) + c.totalIncome
    p.totalExpGain = (p.totalExpGain || 0) + c.totalExpGain
    return p
  }, { hostname: 'total', filename: 'total' })

  scripts = scripts.slice(0, 10).concat([totals])

  try {
    let table = createTable(scripts.map(x => ({
      hostname: x.hostname,
      filename: x.filename,
      income: ns.nFormat(x.income, '$0.000a'),
      // totalIncome: ns.nFormat(x.totalIncome, '$0.000a'),
      expGain: ns.nFormat(x.expGain, '0.000a'),
      // totalExpGain: ns.nFormat(x.totalExpGain, '0.000a'),
    })), { align: { hostname: 'left', filename: 'left' }})

    ns.tprint('\n' + table.join('\n'))
  } catch (err) {
    ns.tprint(`ERROR: ${err}`)
    ns.tprint(JSON.stringify(scripts))
  }
}
