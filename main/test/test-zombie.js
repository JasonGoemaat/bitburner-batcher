/** @param {NS} ns */
export async function main(ns) {
  let [id, threads, cores] = ns.args
  const zombies = eval(`window['zombies'] = window['zombies'] || []`)
  zombies[zombies.length] = { id, threads, cores: cores || 1, finishTime: 0, ns }
  if (false) {
    ns.grow('n00dles') // say we're using ram
    ns.hack('n00dles') // say we're using ram
    ns.weaken('n00dles') // say we're using ram
  } 
  let promise = new Promise(resolve => ns.quit = resolve);
  await promise
}