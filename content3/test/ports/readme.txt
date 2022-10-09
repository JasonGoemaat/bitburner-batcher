# Test exec() and port handles

The purpose of these is to test timings for calling exec() and using ports.
The `starter.js` script starts 10 `worker.js` scripts which send a message
back with timings.

The result is that we call exec() to start 10 scripts and that takes 4ms.
Then the scripts do not start until we relinquish control, by using `sleep(1)`
in this case.  We actually have to sleep twice before we start getting messages.
In that time all 10 scripts have started and completed, and all exactly at the
10ms mark.   Then we have called `sleep(1)` two times waiting for messages
on the port, and we get all 10 messages and output the reults at and finish
on the 11ms mark.

Let's try with 100 (requires upping port size in options to 100, default is 50).

* GENERAL results for me have it taking about 40ms-50ms total
* Normally all scripts report the same starting time.  Example:
  * exec() looping reports times evenly spaced 0ms to 35ms
  * exec() call takes 0, 1, or 2 ms
  * I report calling the last exec() at 35ms and all scripts report start time is 35ms
  * port was empty and one sleep() started at 35 ms and ended at 49 ms
  * all messages received at 49 or 50 ms after the sleep was done
* I had one time that took **1575!** milliseconds back when using ns.tprint() in the loop
  * The system must have been busy, all exec() done at 1497
  * calling exec() took no time, `ns.tprint()` must have been the culprit


**Sample run:**

    [home ~/]> run /test/ports/starter.js
    Running script with 1 thread(s), pid 69 and args: [].
    /test/ports/starter.js: 001: pid=70 beforeExec=0 id=0
    /test/ports/starter.js: 001: pid=71 beforeExec=1 id=1
    /test/ports/starter.js: 002: pid=72 beforeExec=1 id=2
    /test/ports/starter.js: 002: pid=73 beforeExec=2 id=3
    /test/ports/starter.js: 002: pid=74 beforeExec=2 id=4
    /test/ports/starter.js: 003: pid=75 beforeExec=2 id=5
    /test/ports/starter.js: 003: pid=76 beforeExec=3 id=6
    /test/ports/starter.js: 004: pid=77 beforeExec=3 id=7
    /test/ports/starter.js: 004: pid=78 beforeExec=4 id=8
    /test/ports/starter.js: 004: pid=79 beforeExec=4 id=9
    /test/ports/starter.js: 011: waitCount=2 scriptStart=10 id=0 arg=1234 - '{"start":1664746897439,"id":0,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=1 arg=1234 - '{"start":1664746897439,"id":1,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=2 arg=1234 - '{"start":1664746897439,"id":2,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=3 arg=1234 - '{"start":1664746897439,"id":3,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=4 arg=1234 - '{"start":1664746897439,"id":4,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=5 arg=1234 - '{"start":1664746897439,"id":5,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=6 arg=1234 - '{"start":1664746897439,"id":6,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=7 arg=1234 - '{"start":1664746897439,"id":7,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=8 arg=1234 - '{"start":1664746897439,"id":8,"arg":1234}'
    /test/ports/starter.js: 011: waitCount=0 scriptStart=10 id=9 arg=1234 - '{"start":1664746897439,"id":9,"arg":1234}'
    /test/ports/starter.js: done: 11