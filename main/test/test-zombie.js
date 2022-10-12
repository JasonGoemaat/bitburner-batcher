/** @param {NS} ns */
export async function main(ns) {
  let [id, threads, cores] = ns.args
  const zombies = eval(`window['zombies'] = window['zombies'] || []`)
  zombies[zombies.length] = { id, threads, cores: cores || 1, finishTime: 0, ns }
  if (false) ns.grow('n00dles') // say we're using ram
  while(true) {
    await ns.sleep(1e9)
  }
}