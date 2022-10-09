# My batching strategy

Sample global object which will store batches:

{
  "batch target": {
    "cycles": {
      total: 1230, // total cycles sent
      totalMs: 5922, // total time spent processing a cycle, added to by batcher
                     // by subtracting performance.now() at start of cycle with end of cycle before wait
    }
    "batches": {
      "batch start": {
        hack: {
          host: 'batcher-0', // set by batcher - computer script is running on
          execStart: 123456, // set by batcher - performance.now() before exec()
          execfinish: 123456.1, // set by batcher - performance.now() after exec()
          expectedFinish: 123466, // set by batcher - calculated finish time
          pid: 13, // set by batcher - result of exec()
          startTime: 123456.05, // set by script - performance.now() by script when it starts
          endTime: 123466.05, // set by script - performance.now() by script after command runs
        },
        weakhack: { /* same fields as hack */ },
        grow: { /* same fields as hack */ },
        weakgrow: { /* same fields as hack */ },
      }
    }
  }
}