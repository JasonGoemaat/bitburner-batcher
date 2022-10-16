let HOST = 'peta'

// Solve for number of growth threads required to get from money_lo to money_hi
function solveGrow(base, money_lo, money_hi) {
  if (money_lo >= money_hi) { return 0; }

  let threads = 1000;
  let prev = threads;
  for (let i = 0; i < 30; ++i) {
      let factor = money_hi / Math.min(money_lo + threads, money_hi - 1);
      threads = Math.log(factor) / Math.log(base);
      if (Math.ceil(threads) == Math.ceil(prev)) { break; }
      prev = threads;
  }

  return Math.ceil(Math.max(threads, prev, 0));
}

/** @param {NS} ns */
async function calcBatchParams(ns, target_name, hacking_levels = 1, t0 = 50) {
  const target = ns.getServer(target_name);
  const host   = ns.getServer(HOST);
  ns.tprint(`INFO: Targeting ${target_name} using ${HOST}`)
  const player = JSON.parse(JSON.stringify(ns.getPlayer()));

  const hack_time_hi = ns.formulas.hacking.hackTime(target, player);
  const grow_time_hi = 3.2 * hack_time_hi;
  const weak_time_hi = 4.0 * hack_time_hi;
  player.skills.hacking += hacking_levels - 1;
  const hack_time_lo = ns.formulas.hacking.hackTime(target, player);
  const grow_time_lo = 3.2 * hack_time_lo;
  const weak_time_lo = 4.0 * hack_time_lo;

  const hack_frac = ns.formulas.hacking.hackPercent(target, player);
  const hack_prob = ns.formulas.hacking.hackChance(target, player);
  const grow_base = ns.formulas.hacking.growPercent(target, 1, player, host.cpuCores);
  const weak_base = 0.05 * (1 + (host.cpuCores - 1) / 16);

  if (hack_frac == 0) { return null; }
  const max_hack_threads = Math.ceil(1 / hack_frac);
  const batch_data = Array.from({ length: max_hack_threads + 1 }, () =>
      ({ threads: [0, 0, 0, 0], profit: 0, exp: 0 }));

  for (let hack_threads = 1; hack_threads <= max_hack_threads; ++hack_threads) {
      const money_taken = Math.max(hack_threads * hack_frac, 0) * target.moneyMax;
      const grow_threads = solveGrow(grow_base, target.moneyMax - money_taken, target.moneyMax);

      const weak_threads_hack = Math.ceil(hack_threads * 0.002 / weak_base);
      const weak_threads_grow = Math.ceil(grow_threads * 0.004 / weak_base);

      const data = batch_data[hack_threads];
      data.threads[0] = hack_threads;
      data.threads[1] = weak_threads_hack;
      data.threads[2] = grow_threads;
      data.threads[3] = weak_threads_grow;
      data.profit     = hack_prob * money_taken;
  }

  const ram_max = host.maxRam - ns.getScriptRam("grader.js") - ns.getScriptRam("batch.js");
  const kW_max  = Math.floor(1 + (weak_time_lo - 4 * t0) / (8 * t0));

  const params = { target: target_name, t0, max_hacking: player.skills.hacking,
      max_money: target.moneyMax, min_level: target.minDifficulty, dps: 0 };

  schedule: for (let kW = kW_max; kW >= 1; --kW) {
      const kG_lo = Math.ceil(Math.max((kW - 1) * 0.8, 1));
      const kG_hi = Math.floor(1 + kW * 0.8);

      for (let kG = kG_hi; kG >= kG_lo; --kG) {
          const kH_lo = Math.ceil(Math.max((kW - 1) * 0.25, (kG - 1) * 0.3125, 1));
          const kH_hi = Math.floor(Math.min(1 + kW * 0.25, 1 + kG * 0.3125));

          for (let kH = kH_hi; kH >= kH_lo; --kH) {
              // get period ranges permitted by each k
              let period_lo_H = (hack_time_hi + 5 * t0) / kH;
              let period_hi_H = (hack_time_lo - 1 * t0) / (kH - 1);
              let period_lo_G = (grow_time_hi + 3 * t0) / kG
              let period_hi_G = (grow_time_lo - 3 * t0) / (kG - 1);
              let period_lo_W = (weak_time_hi + 4 * t0) / kW;
              let period_hi_W = (weak_time_lo - 4 * t0) / (kW - 1);

              // if all ranges overlap, we have a period range which permits all kH, kG, kW: take its minimum
              let period_lo = Math.max(period_lo_H, period_lo_G, period_lo_W);
              let period_hi = Math.min(period_hi_H, period_hi_G, period_hi_W);
              if (period_lo <= period_hi) {
                  let data = null;

                  // binary search for the maximum threads we can fit
                  for (let ht_lo = 1, ht_hi = max_hack_threads; ht_hi >= ht_lo;) {
                      const ht = Math.round((ht_lo + ht_hi) / 2);
                      const this_data = batch_data[ht];

                      const ram_used = kH * 1.70 * this_data.threads[0]
                                     + kW * 1.75 * this_data.threads[1]
                                     + kG * 1.75 * this_data.threads[2]
                                     + kW * 1.75 * this_data.threads[3];

                      if (ram_used <= ram_max) {
                          data = this_data;
                          ht_lo = ht + 1;
                      } else {
                          ht_hi = ht - 1;
                      }
                  }

                  if (data) {
                      const dps = 1000 * data.profit / period_lo;
                      if (dps > params.dps) {
                          params.dps     = dps;
                          params.kW      = kW;
                          params.kG      = kG;
                          params.kH      = kH;
                          params.period  = period_lo;
                          params.threads = data.threads;
                      }

                      // skip to next kW
                      continue schedule;
                  }
              }
          }
      }
  }

  if (params.dps <= 0) { return null; }
  return params;
}

/** @param {NS} ns */
async function runBatcher(ns, params, duration, minDuration) {
  let player = ns.getPlayer();
  let target = ns.getServer(params.target);

  let hacking   = player.skills.hacking;
  let hack_time = ns.formulas.hacking.hackTime(target, player);
  let grow_time = 3.2 * hack_time;
  let weak_time = 4.0 * hack_time;

  const scripts = [
      "/bin/hack.js",
      "/bin/weak.js",
      "/bin/grow.js",
      "/bin/weak.js"
  ];

  const pids = [
      Array(params.kH).fill(0),
      Array(params.kW).fill(0),
      Array(params.kG).fill(0),
      Array(params.kW).fill(0)
  ];

  const delays = [
      params.kH * params.period - 4 * params.t0 - hack_time,
      params.kW * params.period - 3 * params.t0 - weak_time,
      params.kG * params.period - 2 * params.t0 - grow_time,
      params.kW * params.period - 1 * params.t0 - weak_time
  ];

  const first_batch = [params.kW - params.kH, 0, params.kW - params.kG, 0];

  const time_epoch   = performance.now() + params.t0;
  const time_end     = time_epoch + duration;
  const time_end_min = time_epoch + (minDuration || 0);

  for (let batch = 0;; ++batch) {
      const iW = batch % params.kW;
      const iG = batch % params.kG;
      const iH = batch % params.kH;
      const jW = (batch + 1) % params.kW;
      const jG = (batch + 1) % params.kG;
      const jH = (batch + 1) % params.kH;
      const this_index = [iH, iW, iG, iW];
      const next_index = [jH, jW, jG, jW];

      const time_begin = time_epoch + batch * params.period;
      await ns.sleep(time_begin - performance.now());
      const time_delay = performance.now() - time_begin;

      let dispatch = true;
      if (time_delay >= params.t0) {
          ns.print(ns.sprintf("WARN: %5d loop started %.2fms late", batch, time_delay));
          dispatch = false;
      }

      // ensure the previous batch has finished
      for (let i = 0; i < 4; ++i) {
          if (pids[i][this_index[i]] != 0) {
              if (ns.isRunning(pids[i][this_index[i]], HOST)) {
                  ns.print(ns.sprintf("WARN: %5d %s finished late", batch, scripts[i]));
                  ns.kill(pids[i][this_index[i]], HOST);
              }
              pids[i][this_index[i]] = 0;
          }
      }

      player = ns.getPlayer();
      target = ns.getServer(params.target);

      if ((player.skills.hacking > params.max_hacking && time_begin > time_end_min) || time_begin > time_end) {
          ns.print(ns.sprintf("ERROR: %5d Ending batching", batch));

          for (let i = 0; i < 4; ++i) {
              for (const pid of pids[i]) { ns.kill(pid, HOST); }
          }
          
          return;
      } else if (player.skills.hacking != hacking) {
          ns.print(ns.sprintf("WARN: %5d Hacking increased to %d", batch, player.skills.hacking));

          hacking   = player.skills.hacking;
          hack_time = ns.formulas.hacking.hackTime(target, player);
          grow_time = 3.2 * hack_time;
          weak_time = 4.0 * hack_time;
  
          delays[0] = params.kH * params.period - 4 * params.t0 - hack_time;
          delays[1] = params.kW * params.period - 3 * params.t0 - weak_time;
          delays[2] = params.kG * params.period - 2 * params.t0 - grow_time;
          delays[3] = params.kW * params.period - 1 * params.t0 - weak_time;
      }

      const cur_money = target.moneyAvailable;
      const cur_level = target.hackDifficulty;

      if (cur_level > params.min_level) {
          ns.print(ns.sprintf("WARN: %5d Security level raised by %.3f", batch, cur_level - params.min_level));

          // Kill hack and grow about to land
          ns.kill(pids[0][next_index[0]], HOST); pids[0][next_index[0]] = 0;
          ns.kill(pids[2][next_index[2]], HOST); pids[2][next_index[2]] = 0;

          // Skip the upcoming dispatch since the security is raised
          dispatch = false;
      } else if (cur_money < params.max_money) {
          ns.print(ns.sprintf("WARN: %5d Money too low, at %.1f%%", batch, 100 * cur_money / target.max_money));

          // Kill hack about to land
          ns.kill(pids[0][next_index[0]], HOST);
      } else {
          // If there's no hack coming up, the next batch does nothing
          if (pids[0][next_index[0]] == 0) {
              for (let i = 1; i < 4; ++i) {
                  ns.kill(pids[i][next_index[i]], HOST);
                  pids[i][next_index[i]] = 0;
              }
          }
      }

      if (dispatch) {
          let dispatch_error = false;
          let i = 0
          for (i = 0; i < 4; ++i) {
              if (batch < first_batch[i]) { continue; }

              // pids[i][this_index[i]] = ns.run(scripts[i], params.threads[i], params.target, time_begin + delays[i]);
  
              pids[i][this_index[i]] = ns.exec(scripts[i], HOST, params.threads[i], params.target, time_begin + delays[i]);
              
              if (pids[i][this_index[i]] == 0) {
                  dispatch_error = true;
                  break;
              }
          }

          if (dispatch_error) {
              ns.print(ns.sprintf("ERROR: %5d Could not dispatch %s", batch, scripts[i]));

              for (i = 0; i < 4; ++i) {
                  ns.kill(pids[i][this_index[i]], HOST);
                  pids[i][this_index[i]] = 0;
              }
          }
      }
  }
}

function HGW_SCRIPT(name) {
  return `export async function main(ns) {
  let target = ns.args[0];
  let begin  = ns.args[1];

  if (begin > performance.now()) {
      await ns.sleep(begin - performance.now());
  }
  
  await ns.${name}(target);
}`;
}

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");

  const target_name = ns.args[0] ?? "rho-construction";
  // const duration    = ns.args[1] ?? 60 * 60 * 60;
  const duration = 60 * 60 * 60;
  HOST = ns.args[1] || HOST

  await ns.write("/bin/hack.js", HGW_SCRIPT("hack"),   "w");
  await ns.write("/bin/grow.js", HGW_SCRIPT("grow"),   "w");
  await ns.write("/bin/weak.js", HGW_SCRIPT("weaken"), "w");

  if (HOST !== ns.getHostname()) {
    ns.rm('/bin/hack.js', HOST)
    ns.rm('/bin/grow.js', HOST)
    ns.rm('/bin/weak.js', HOST)
    await ns.scp('/bin/hack.js', HOST)
    await ns.scp('/bin/grow.js', HOST)
    await ns.scp('/bin/weak.js', HOST)
  }

  while (true) {
    const time_epoch  = performance.now();
    const money_epoch = ns.getPlayer().money;

    for (;;) {
        let p = ns.getPlayer()
        let levels = Math.max(30, Math.ceil(p.skills.hacking / 40))
        const params = await calcBatchParams(ns, target_name, levels);
        if (!params) { throw new Error(`Could not calculate batch params for ${target_name}`); }
    
        const  time_begin = (performance.now() - time_epoch) / 1000;
        const  time_batch = time_begin + params.kW * params.period / 1000;
        const money_begin = ns.getPlayer().money - money_epoch;

        if (time_batch >= duration) {
            ns.tprintf(`Remaining time (${ns.nFormat((duration - time_begin) / 1000, "0:00:00")}) not enough to batch`);
            break;
        }

        ns.tprintf(`Beginning batch of ${params.target} at level ${params.hacking} at ${new Date(Date.now()).toLocaleTimeString()}`);
        ns.tprintf(`         Money: \$${ns.nFormat(money_begin, "0.000a")}`);
        ns.tprintf(`    Start time: ${time_begin.toFixed(0).padStart(4)} (${ns.nFormat(time_begin, "0:00:00")})`);
        ns.tprintf(`    Batch time: ${time_batch.toFixed(0).padStart(4)} (${ns.nFormat(time_batch, "0:00:00")})`);
        ns.tprintf(`     Batch DPS: \$${ns.nFormat(params.dps, "0.000a")}/s`)

        const minRunTime = 10 * 60 * 1000; // 10 minutes no matter what
        await runBatcher(ns, params, (duration - time_batch) * 1000, minRunTime);

        const  time_end = (performance.now() - time_epoch) / 1000;
        const money_end = ns.getPlayer().money - money_epoch;
        const batch_dps = (money_end - money_begin) / (time_end - time_batch);
        const  real_dps = (money_end - money_begin) / (time_end - time_begin);
        const   avg_dps = money_end / time_end;

        ns.tprintf(`Batch ended`)
        ns.tprintf(`      End time: ${time_end.toFixed(0).padStart(4)} (${ns.nFormat(time_end, "0:00:00")})`);
        ns.tprintf(`         Money: \$${ns.nFormat(money_end, "0.000a")}`);
        ns.tprintf(`        Profit: \$${ns.nFormat(money_end - money_begin, "0.000a")}`);
        ns.tprintf(`     Batch DPS: \$${ns.nFormat(batch_dps, "0.000a")}/s`);
        ns.tprintf(`      This DPS: \$${ns.nFormat(real_dps, "0.000a")}/s`);
        ns.tprintf(`       Avg DPS: \$${ns.nFormat(avg_dps, "0.000a")}/s`);
        ns.tprintf(" ");
    }
  }
}