// --- CONFIG SECTION ---
//const testFile="/tools/batcher.js"; //File to run to initiate testing
// const testFile="/sample/stalefish-batcher.js"; //File to run to initiate testing
// const host='huge'
// const testTimeLimit=1000*60*30+(248800); //Graded time, 30 min + weaken time, so 30 min active
// const testFileArgs=['omega-net', Math.trunc(testTimeLimit/1000)]; //Any arguments to be sent to the test file
// --- END CONFIG SECTION ---

// --- CONFIG SECTION ---
const testFile="/tools/batcher.js"; // File to run to initiate testing
const testTimeLimit=3600000; // Graded time, 30 min + 1/2 weaken time to compare with my hour run
const testFileArgs=['150,2,19,25']; // (not used for mine)
const host = null;
// --- END CONFIG SECTION ---

/* mine made xxx over an hour with 336.5 second warmup using paramters:
const WEAK_DELAY = 327
const WEAK_THREADS = 3
const GROW_THREADS = 37
const HACK_THREADS = 38

Looks like I actually messed up, I used the delay for 2 weakens (327) but should have used 485 for 3.
That could lead to a lower than optimal duty cycle or memory usage?  There will be more weakens floating around
than are absolutely needed, but maybe that's not a bad thing...  Expected profit was around $152b/hour,
actually $136.5b/hour if you take the warm-up into account.  I started with I think 15.7 billion.
I am also making $1.52 million a second (10% of batcher) running the simple scripts on other servers.

/tools/grader.js: Finished testing after 1:00:00. Money increased by $117.66b, effective profit is $1.96b/min
Level 256->296
Afterwards the expected profit went from $152b to $191b

Stalefish is reporting $68.6m per second which is over 3x what mine made, total $221.6b over 55 minutes
We'll see...  Started at 136b?  (maybe 133b), level 296, at 3:04:41.
Weaken time had gone down from 365 seconds to 305 seconds, so there should be a pretty big improvement
just because of my gained levels...

Stalefish got this, only running 25:18, or 20 active minutes:
      End time: 1518 (0:25:18)
         Money: $84.858b
        Profit: $84.858b
     Batch DPS: $66.661m/s
      This DPS: $55.888m/s
       Avg DPS: $55.888m/s

So that should have earned $252b with a 100% active hour.  But since it has to adjust, it lost 1/6 its
possible earnings.  Taking it's actual DPS for the batch and averaging with the next expected batch dps
compared to actual:
  55.888 + (74.8*55.9/66.7) = $59.3m per second or $213.5b/hour, more than my expected somehow?
I noticed ram usage was 118GB/132GB


My expected max is 213.7b with 2 weak threads, 19 hack , 25 grow, hack% 3.0, grow% 3.1, 52.2m per hack every 536ms
Let me try mine with these values:
268 2 19 25 - expect $213.7b/hr

/tools/batcher.js: Starting main loop at 3:56:59 AM
/tools/batcher.js:     Expect results at 4:00:51 AM

I'm only using 15 terabytes on HUGE? and about 1220 threads?  Oh, I'm an idiot...
Batcher is still using the 2 grows for each hack method...  Let me adjust to:
90 1 18 12

Running script with 1 thread(s), pid 11344 and args: [].
/tools/batcher.js: Starting main loop at 4:12:21 AM
/tools/batcher.js:     Expect results at 4:16:11 AM

still only using 36gb total, why?  That's 1/3 the possible ram
should be using 44 threads every 270ms over 300s
900 batches of 44 threads = 40k threads

in 300s, should have 3300 weaken active
should have 1750 grows, but only 4/5
Wait, those numbers are way off, except hacks should be 4x
Let's calculate in reverse...
Given X weaken (threads) total, I should have 4/5/2 grow (threads) and 1/5/4 hack (threads)
3300 + 3300*4/5/2*12 + 3300/5/4*18
= 22k threads or 38692.5gb
God, I'm retarded...  Of course the numbers would be off in my analyzing
I need to increase my threads by a factor of 3.4, which means time would go way down from 90 to 26ms.
Time to increase the thread counts by 3.4, but leave the 90ms
/tools/grader.js: Finished testing after 0:32:24. Money increased by $76.63b, effective profit is $2.36b/min

***** Ok, think I fixed it *****
const WEAK_DELAY = 120
const WEAK_THREADS = 4
const GROW_THREADS = 60
const HACK_THREADS = 50

Started with $140.959b, Hacking skill 360 (almost 361)

/tools/batcher.js: Starting main loop at 5:29:45 AM
/tools/batcher.js:     Expect results at 5:33:11 AM

still just 82373gb used out of 131000, wtf?  maybe I should lower the delay...  more weakens
all around.  The original delay IS based on a perfect scenario, and more weakens helps it out
keeping at minimum difficulty, and only hurts a bit.  Cutting it in 1/2 would add 12 threads to the 122,
so possibly cut profits by 9-10%, but if I can use 60% more ram, that's huge.  We'll see after it finishes
So far 7 active minutes, 70 billion dollars.  On track for $550b by the end, twice what I thought
(30 min + 144 sec)
/tools/grader.js: Finished testing after 0:32:24. Money increased by $277.66b, effective profit is $8.57b/min

********** Ok, starting stalefish
Beginning batch of omega-net at level undefined at 6:10:09 AM
         Money: $0.000
    Start time:    0 (0:00:00)
    Batch time:  202 (0:03:22)
     Batch DPS: $86.820m/s

Batch ended
      End time: 1747 (0:29:07)
         Money: $121.800b
        Profit: $121.800b
     Batch DPS: $78.791m/s
      This DPS: $69.700m/s
       Avg DPS: $69.700m/s
 
Remaining time (0:00:00) not enough to batch
Beginning batch of omega-net at level undefined at 6:39:17 AM
         Money: $0.000
    Start time:    0 (0:00:00)
    Batch time:  200 (0:03:20)
     Batch DPS: $87.806m/s

Calculated given the batch DPS alone (which doesn't include warm-up), that would be only $5.2b/min
Goes up to using 126TB of ram, pretty good.  Started at level 371, $431.8b

/tools/grader.js: Finished testing after 0:32:24. Money increased by $121.80b, effective profit is $3.76b/min

// wow, 1/2 what mine gets

********** NEXT: Use my batcher with smaller time

Decreasing 120ms delay to 60ms, or maybe analyze again and update all, but use 1/2 the
recommended delay.

Ok, params are 114 │    4 │   57 │     50, so using delay 60, 4 weaken, 57 hack, 50 grow

Running script with 1 thread(s), pid 740 and args: [].
/tools/batcher.js: Starting main loop at 6:50:12 AM
/tools/batcher.js:     Expect results at 6:53:31 AM
start $588b

Let's try again with lvl 400, $898.6b
  Running script with 1 thread(s), pid 13901 and args: [].
  /tools/batcher.js: Starting main loop at 1:49:23 PM
  /tools/batcher.js:     Expect results at 1:52:32 PM
At 660 seconds, made $150.9b at a rate of $822.6b per hour
200 second warm-up, so at 800 seconds (3.6b every 10 seconds)
  $197.8b in 801 (or 600) so rate of $889.3b including warm-up should be more like $1.18t per hour,

  It died after 3112 seconds - with profit being $927.9b per hour, gaining $802.2b in 3,112 seconds

ERROR: End message for a weaken that was 30 seconds late...  So one of the weakens actually didn't
execute with minimum difficulty.  That makes sense looking at the numbers...  4 weakens isn't enough
for 57 grows.  Also I'm an idiot, the weaken times can change, but they should get lower.  I may
have to update them somehow.  Well, since read() is free, maybe I can write the time to a file
and place it on the server?
*/


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