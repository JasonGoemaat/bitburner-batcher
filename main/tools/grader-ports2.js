// --- CONFIG SECTION ---
const testFile="/tools/batcher-ports2.js"; // File to run to initiate testing
const testTimeLimit=3600000; // Graded time, 30 min + 1/2 weaken time to compare with my hour run
const testFileArgs=['home', 'rho-construction']; // arguments to pass for testing
// --- END CONFIG SECTION ---

/** @param {NS} ns */
export async function main(ns) {
  let [host] = ns.args
  let startTime = Date.now();
  let startMoney = ns.getServerMoneyAvailable("home");
  if (host) {
    ns.rm(testFile, host)
    await ns.scp(testFile, host)
    ns.exec(testFile, 1, ...testFileArgs)
  } else {
    ns.run(testFile, 1, ...testFileArgs);
  }
  await ns.asleep(testTimeLimit);
  let finishTime = Date.now();
  let finishMoney = ns.getServerMoneyAvailable("home");

  let message = `Finished testing after ${ns.nFormat((finishTime-startTime)/1000,"0:00:00")}. Money increased by ${ns.nFormat(finishMoney-startMoney,"$0.00a")}, effective profit is ${ns.nFormat((finishMoney-startMoney)*60000/(finishTime-startTime),"$0.00a")}/min`
  console.log(message);
  ns.tprint(message);
  ns.write('/var/log/grader.txt', ''.padStart(80, '-') + '\n', 'a')
  ns.write('/var/log/grader.txt', `${testFile} ${testFileArgs.join(' ')}\n`, 'a')
  ns.write('/var/log/grader.txt', message + '\n', 'a')
}