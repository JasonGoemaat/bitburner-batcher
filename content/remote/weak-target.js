/** @param {NS} ns */
export async function main(ns) {
  const [target, command, batchStartTime, startTime, expectedEndTime] = ns.args

  // ---------- for initial testing ----------
  // ns.tprint('weak-target.js args:' + JSON.stringify({target, command, batchStartTime, startTime, expectedEndTime}, null, 2))
  
  // if batchStartTime is set, we must be batching, otherwise we could be prepping
  if (batchStartTime) {
    // look for global object created by 'batcher.js'
    let me = eval(`mainBatchInfo && mainBatchInfo['${target}'] && mainBatchInfo['${target}'].batches &&
    mainBatchInfo['${target}'].batches['${batchStartTime}'] &&
    mainBatchInfo['${target}'].batches['${batchStartTime}']['${command}']`)
    
    // exit script if it's not present, i.e. in reset, so we can restart batches
    if (!me) return;

    me.actualStart = new Date().valueOf()
    me.result = await ns.weaken(target)
    me.actualFinish = new Date().valueOf()
  } else {
    await ns.weaken(target)
  }
}
