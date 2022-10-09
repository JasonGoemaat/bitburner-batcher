/** @param {NS} ns */
export async function main(ns) {
    const [hostname] = ns.args
    await ns.grow(hostname)
}