/** @param {NS} ns */
export async function main(ns) {
  const [target, command, batchStartTime, startTime, expectedEndTime] = ns.args

  // if batchStartTime is set, we must be batching, otherwise we could be prepping
  if (batchStartTime) {
    // look for global object created by 'batcher.js'
    let me = eval(`mainBatchInfo && mainBatchInfo['${target}'] && mainBatchInfo['${target}'].batches &&
    mainBatchInfo['${target}'].batches['${batchStartTime}'] &&
    mainBatchInfo['${target}'].batches['${batchStartTime}']['${command}']`)
    
    // exit script if it's not present, i.e. in reset, so we can restart batches
    if (!me) return;

    me.actualStart = new Date().valueOf()
    me.result = await ns.hack(target)
    me.actualFinish = new Date().valueOf()
  } else {
    await ns.hack(target)
  }
}
