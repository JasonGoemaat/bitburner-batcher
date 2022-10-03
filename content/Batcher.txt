# My batching strategy

Sample global object which will store batches:

```js
// access a batch by this within the batches script
batchInfo.target.batches[batchStartTime]

// this will also be available globally on wht window object for the 
// scripts to put their results in

window.batchInfo['ecorp'].batches[batchStartTime]

batchInfo: { // batchInfo is global on window object
  "batch target": {
    "host": "home", // host that batcher.js is running on
    "pid": 1, // pid on host that is the batcher
    "duration": 1000, // ms for a single batch
    "cycle": 25, // ms target for a cycle (sleep this minus actual time)
    "cycles": {
      total: 1230, // total cycles sent
      totalMs: 5922, // total time spent processing a cycle, added to by batcher
                    // by subtracting performance.now() at start of cycle with end of cycle before wait
    "batches": {
      'batch start time': {
        hack: {
          host: 'batcher-0', // set by batcher - computer script is running on
          execStart: 123456, // set by batcher - performance.now() before exec()
          execfinish: 123456.1, // set by batcher - performance.now() after exec()
          expectedFinish: 123466, // set by batcher - calculated finish time
          pid: 13, // set by batcher - result of exec()
          startTime: 123456.05, // set by script - performance.now() by script when it starts
          endTime: 123466.05, // set by script - performance.now() by script after command runs
          result: 1900, // amount of money stolen by hack().  weaken gives amount weakened (always 0.05 * thread count), grow gives "The number by which the money on the server was multiplied for the growth.", i.e. 1.1 for +10% I think
        },
        weakhack: { /* same fields as hack */ },
        grow: { /* same fields as hack */ },
        // The number by which the money on the server was multiplied for the growth.
        weakgrow: { /* same fields as hack */ },
      }
    }
  }
}
```

`batch-manager.js` which finds targets and creates executes `batcher.js` with
calculated target, rates, memory, etc on a host it finds with memory to run it.
On restart (reload of web page for instance) it will make sure all the
scripts it created have exited and start fresh.

`batcher.js` will do all the work of actually scheduling batches.  On each
`cycle` we will calculate the times it takes for each of the three scripts
to run.  We then calculate what batch if any the command would execute at the
right time for.  For each command we then process differently:

1. Hack - batch must exist and have both weakens and the grow scheduled
2. WeakenHack - batch must not exist yet, we will create it if we have enough mem
3. Grow - batch must exist and have both weakens scheduled
4. WeakenGrow - batch must exist and have WeakenHack scheduled already

The unique id for a batch will be a millisecond time identifier for when
the batch starts.  This can be found by taking the target start 

## Scripts

Scripts will take the following args:

0. target (used by script for target and to find )
1. command (one of 'hack', 'grow', 'weakhack', or 'weakgrow', used by script to save results to global object)
2. batch start time (id for batch)
3. start time (script will not execute if it is too late, which would be on a restart)
4. expected end time

Script can get the global object like so to update:


```js
// we can get the individual object for our batch like so
let [target, command, batchStartTime, startTime, expectedEndTime] = ns.args
let me = eval(`batchInfo && batchInfo['${target}'] && batchInfo['${target}'].batches &&
      batchInfo['${target}'].batches['${batchStartTime}'] &&
      batchInfo['${target}'].batches['${batchStartTime}']['${command}']`)

window.batchInfo = { 'ecorp': { batches: { "123": { weakhack: { test: 'hi' } } } } }

```