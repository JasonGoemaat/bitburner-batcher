// --- CONFIG SECTION ---
const testFile="/sample/stalefish-batcher.js"; //File to run to initiate testing
const host='huge'
const testTimeLimit=1000*60*30; //Graded time, 30 min + weaken time, so 30 min active
const testFileArgs=['omega-net', Math.trunc(testTimeLimit/1000)]; //Any arguments to be sent to the test file
// --- END CONFIG SECTION ---

/** @param {NS} ns */
export async function main(ns) {
  let startTime = Date.now();
  let startMoney = ns.getServerMoneyAvailable("home");
  if (host) {
    ns.rm(testFile, host)
    await ns.scp(testFile, host)
    ns.exec(testFile, host, 1, ...testFileArgs)
  } else {
    ns.run(testFile, 1, ...testFileArgs);
  }
  await ns.asleep(testTimeLimit);
  let finishTime = Date.now();
  let finishMoney = ns.getServerMoneyAvailable("home");

  let message = `Finished testing after ${ns.nFormat((finishTime-startTime)/1000,"0:00:00")}. Money increased by ${ns.nFormat(finishMoney-startMoney,"$0.00a")}, effective profit is ${ns.nFormat((finishMoney-startMoney)*60000/(finishTime-startTime),"$0.00a")}/min`
  console.log(message);
  ns.tprint(message);
  ns.write('/var/log/grader.txt', message + '\n', 'a')
}