const CONSTANTS = {
  ServerBaseGrowthRate: 1.03, // Unadjusted Growth rate
  ServerMaxGrowthRate: 1.0035, // Maximum possible growth rate (max rate accounting for server security)
}

function calculateIntelligenceBonus(intelligence, weight = 1) {
  return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
}

/**
 * Returns the chance the player has to successfully hack a server
 */
function calculateHackingChance(server, player) {
  const hackFactor = 1.75;
  const difficultyMult = (100 - server.hackDifficulty) / 100;
  const skillMult = hackFactor * player.skills.hacking;
  const skillChance = (skillMult - server.requiredHackingSkill) / skillMult;
  const chance =
    skillChance *
    difficultyMult *
    player.mults.hacking_chance *
    calculateIntelligenceBonus(player.skills.intelligence, 1);
  if (chance > 1) {
    return 1;
  }
  if (chance < 0) {
    return 0;
  }

  return chance;
}

function getBNMHackExpGain(player) {
  // HackExpGain based on player.bitNodeN
  const map = { 4: 0.4, 5: 0.5, 6: 0.25, 7: 0.25, 9: 0.05, 11: 0.5 }
  return map[player.binNodeN] || 1
}

function getBNMScriptHackMoney(player) {
  // ScriptHackMoney based on player.bitNodeN
  // what is 'ScriptHackMoneyGain'?  
  //    Says influences how much of the stolen money will be added to player?
  //    BN 8 has it set to 0?  So no money for hacking at all!
  const map = { 3: 0.2, 4: 0.2, 5: 0.15, 6: 0.75, 7: 0.5, 8: 0.3, 9: 0.1, 10: 0.5, }
  return map[player.bitNodeN] || 1
}

/**
 * Returns the amount of hacking experience the player will gain upon
 * successfully hacking a server
 */
function calculateHackingExpGain(server, player) {
  const baseExpGain = 3;
  const diffFactor = 0.3;
  if (server.baseDifficulty == null) {
    server.baseDifficulty = server.hackDifficulty;
  }
  let expGain = baseExpGain;
  expGain += server.baseDifficulty * diffFactor;

  // return expGain * player.mults.hacking_exp * BitNodeMultipliers.HackExpGain;
  return expGain * player.mults.hacking_exp * getBNMHackExpGain(player);
}

/**
 * Returns the percentage of money that will be stolen from a server if
 * it is successfully hacked (returns the decimal form, not the actual percent value)
 */
function calculatePercentMoneyHacked(server, player) {
  // Adjust if needed for balancing. This is the divisor for the final calculation
  const balanceFactor = 240;

  const difficultyMult = (100 - server.hackDifficulty) / 100;
  const skillMult = (player.skills.hacking - (server.requiredHackingSkill - 1)) / player.skills.hacking;
  const percentMoneyHacked =
    (difficultyMult * skillMult * player.mults.hacking_money * getBNMScriptHackMoney(player)) / balanceFactor;
  if (percentMoneyHacked < 0) {
    return 0;
  }
  if (percentMoneyHacked > 1) {
    return 1;
  }

  return percentMoneyHacked;
}

/**
 * Returns time it takes to complete a hack on a server, in seconds
 */
function calculateHackingTime(server, player) {
  const difficultyMult = server.requiredHackingSkill * server.hackDifficulty;

  const baseDiff = 500;
  const baseSkill = 50;
  const diffFactor = 2.5;
  let skillFactor = diffFactor * difficultyMult + baseDiff;
  // tslint:disable-next-line
  skillFactor /= player.skills.hacking + baseSkill;

  const hackTimeMultiplier = 5;
  const hackingTime =
    (hackTimeMultiplier * skillFactor) /
    (player.mults.hacking_speed * calculateIntelligenceBonus(player.skills.intelligence, 1));

  return hackingTime;
}

/**
 * Returns time it takes to complete a grow operation on a server, in seconds
 */
function calculateGrowTime(server, player) {
  const growTimeMultiplier = 3.2; // Relative to hacking time. 16/5 = 3.2
  return growTimeMultiplier * calculateHackingTime(server, player);
}

/**
 * Returns time it takes to complete a weaken operation on a server, in seconds
 */
function calculateWeakenTime(server, player) {
  const weakenTimeMultiplier = 4; // Relative to hacking time
  return weakenTimeMultiplier * calculateHackingTime(server, player);
}

function calculateServerGrowth(server, threads, player, cores = 1) {
  const numServerGrowthCycles = Math.max(Math.floor(threads), 0);

  //Get adjusted growth rate, which accounts for server security
  const growthRate = CONSTANTS.ServerBaseGrowthRate;
  let adjGrowthRate = 1 + (growthRate - 1) / server.hackDifficulty;
  if (adjGrowthRate > CONSTANTS.ServerMaxGrowthRate) {
    adjGrowthRate = CONSTANTS.ServerMaxGrowthRate;
  }

  //Calculate adjusted server growth rate based on parameters
  const serverGrowthPercentage = server.serverGrowth / 100;
  const numServerGrowthCyclesAdjusted =
    numServerGrowthCycles * serverGrowthPercentage * BitNodeMultipliers.ServerGrowthRate;

  //Apply serverGrowth for the calculated number of growth cycles
  const coreBonus = 1 + (cores - 1) / 16;
  return Math.pow(adjGrowthRate, numServerGrowthCyclesAdjusted * player.mults.hacking_grow * coreBonus);
}

export function calculateAll(server, player, threads = 1, cores = 1) {
  return {
    hackChance: calculateHackingChance(server, player),
    hackExp: calculateHackingExpGain(server, player),
    hackPercent: calculatePercentMoneyHacked(server, player),
    growPercent: calculateServerGrowth(server, threads, player, cores),
    hackTime: calculateHackingTime(server, player) * 1000,
    growTime: calculateGrowTime(server, player) * 1000,
    weakenTime: calculateWeakenTime(server, player) * 1000,

    // extra info
    intelligenceBonus: calculateIntelligenceBonus(player.intelligence),
    security: {
      raisedByHack: 0.002 * threads,
      raisedByGrow: 0.004 * threads,
      loweredByWeaken: 0.050 * threads,
      lowerThreadsNeeded: (server.hackDifficulty - server.minDifficulty) / 0.050,
    }
  }
}

export function analyze(server, player) {
  let preppedServer = {...server, hackDifficulty: server.minDifficulty, moneyAvailable: server.moneyMax }
  let current = {}
  let prepped = {}
  let keys = ['hackChance', 'hackExp', 'hackPercent', 'growPercent', 'hackTime', 'growTime', 'weakenTime']
  keys.forEach(key => {
    current[key] = key === 'growPercent' ? mine[key](server, 1, player, 1) : mine[key](server, player)
    prepped[key] = key === 'growPercent' ? mine[key](preppedServer, 1, player, 1) : mine[key](preppedServer, player)
  })

	const moneyNeeded = server.moneyMax - server.moneyAvailable
	const percentNeeded = moneyNeeded / server.moneyAvailable
	
  const growsNeeded = percentNeeded / (current.growPercent - 1)
  const weakensNeeded = (server.hackDifficulty - server.minDifficulty) / 0.050
	const totalWeakensNeeded = weakensNeeded + Math.ceil(growsNeeded * 0.004 / 0.050)

  let result = {
    current, prepped, currentServer: server, preppedServer,
    growsNeeded, weakensNeeded, totalWeakensNeeded,
  }

  return result
}

const mine = {
  /** @param {Server} server
   * @param {Player} player
   */
  hackChance: (server, player) => calculateHackingChance(server, player),
  /** @param {Server} server
   * @param {Player} player
   */
   hackExp: (server, player) => calculateHackingExpGain(server, player), // needs BitNodeModifiers
  /** @param {Server} server
   * @param {Player} player
   */
   hackPercent: (server, player) => calculatePercentMoneyHacked(server, player),
  /** @param {Server} server
   * @param {Player} player
   */
   growPercent: (server, threads, player, cores = 1) => calculateServerGrowth(server, threads, player, cores),
  /** @param {Server} server
   * @param {Player} player
   */
   hackTime: (server, player) => calculateHackingTime(server, player) * 1000,
  /** @param {Server} server
   * @param {Player} player
   */
   growTime: (server, player) => calculateGrowTime(server, player) * 1000,
  /** @param {Server} server
   * @param {Player} player
   */
   weakenTime: (server, player) => calculateWeakenTime(server, player) * 1000,

  // extra info
  /** @param {Server} server
   * @param {Player} player
   */
   intelligenceBonus: (server, player) => calculateIntelligenceBonus(server, player),
  all: calculateAll,
  analyze
}

export default mine

export function checkFormulasExe(ns) {
  let files = ns.ls('home', 'Formulas.exe')
  return (files.length > 0)
}

export function getHackingFormulas(ns, force = null) {
  if (force === true || (force === null && checkFormulasExe(ns))) {
    return ns.formulas.hacking
  }
  return mine
}