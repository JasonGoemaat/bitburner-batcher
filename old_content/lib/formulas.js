export const CONSTANTS = {
  VersionString: "2.1.0",
  VersionNumber: 25,

  // Speed (in ms) at which the main loop is updated
  _idleSpeed: 200,

  /** Max level for any skill, assuming no multipliers. Determined by max numerical value in javascript for experience
   * and the skill level formula in Player.js. Note that all this means it that when experience hits MAX_INT, then
   * the player will have this level assuming no multipliers. Multipliers can cause skills to go above this.
   */
  MaxSkillLevel: 975,

  // Milliseconds per game cycle
  MilliPerCycle: 200,

  // How much reputation is needed to join a megacorporation's faction
  CorpFactionRepRequirement: 400e3,

  // Base RAM costs
  BaseCostFor1GBOfRamHome: 32000,
  BaseCostFor1GBOfRamServer: 55000, //1 GB of RAM

  // Cost to travel to another city
  TravelCost: 200e3,

  // Faction and Company favor-related things
  BaseFavorToDonate: 150,
  DonateMoneyToRepDivisor: 1e6,
  FactionReputationToFavorBase: 500,
  FactionReputationToFavorMult: 1.02,
  CompanyReputationToFavorBase: 500,
  CompanyReputationToFavorMult: 1.02,

  // NeuroFlux Governor Augmentation cost multiplier
  NeuroFluxGovernorLevelMult: 1.14,

  NumNetscriptPorts: 20,

  // Server-related constants
  HomeComputerMaxRam: 1073741824, // 2 ^ 30
  ServerBaseGrowthRate: 1.03, // Unadjusted Growth rate
  ServerMaxGrowthRate: 1.0035, // Maximum possible growth rate (max rate accounting for server security)
  ServerFortifyAmount: 0.002, // Amount by which server's security increases when its hacked/grown
  ServerWeakenAmount: 0.05, // Amount by which server's security decreases when weakened

  PurchasedServerLimit: 25,
  PurchasedServerMaxRam: 1048576, // 2^20

  // Augmentation Constants
  MultipleAugMultiplier: 1.9,

  // TOR Router
  TorRouterCost: 200e3,

  // Stock market
  WSEAccountCost: 200e6,
  TIXAPICost: 5e9,
  MarketData4SCost: 1e9,
  MarketDataTixApi4SCost: 25e9,
  StockMarketCommission: 100e3,

  // Hospital/Health
  HospitalCostPerHp: 100e3,

  // Intelligence-related constants
  IntelligenceCrimeWeight: 0.025, // Weight for how much int affects crime success rates
  IntelligenceInfiltrationWeight: 0.1, // Weight for how much int affects infiltration success rates
  IntelligenceCrimeBaseExpGain: 0.05,
  IntelligenceProgramBaseExpGain: 0.1, // Program required hack level divided by this to determine int exp gain
  IntelligenceGraftBaseExpGain: 0.05,
  IntelligenceTerminalHackBaseExpGain: 200, // Hacking exp divided by this to determine int exp gain
  IntelligenceSingFnBaseExpGain: 1.5,
  IntelligenceClassBaseExpGain: 0.01,

  // Time-related constants
  MillisecondsPer20Hours: 72000000,
  GameCyclesPer20Hours: 72000000 / 200,

  MillisecondsPer10Hours: 36000000,
  GameCyclesPer10Hours: 36000000 / 200,

  MillisecondsPer8Hours: 28800000,
  GameCyclesPer8Hours: 28800000 / 200,

  MillisecondsPer4Hours: 14400000,
  GameCyclesPer4Hours: 14400000 / 200,

  MillisecondsPer2Hours: 7200000,
  GameCyclesPer2Hours: 7200000 / 200,

  MillisecondsPerHour: 3600000,
  GameCyclesPerHour: 3600000 / 200,

  MillisecondsPerHalfHour: 1800000,
  GameCyclesPerHalfHour: 1800000 / 200,

  MillisecondsPerQuarterHour: 900000,
  GameCyclesPerQuarterHour: 900000 / 200,

  MillisecondsPerFiveMinutes: 300000,
  GameCyclesPerFiveMinutes: 300000 / 200,

  // Player Work & Action
  BaseFocusBonus: 0.8,

  ClassDataStructuresBaseCost: 40,
  ClassNetworksBaseCost: 80,
  ClassAlgorithmsBaseCost: 320,
  ClassManagementBaseCost: 160,
  ClassLeadershipBaseCost: 320,
  ClassGymBaseCost: 120,

  ClassStudyComputerScienceBaseExp: 0.5,
  ClassDataStructuresBaseExp: 1,
  ClassNetworksBaseExp: 2,
  ClassAlgorithmsBaseExp: 4,
  ClassManagementBaseExp: 2,
  ClassLeadershipBaseExp: 4,

  // Coding Contract
  // TODO: Move this into Coding contract implementation?
  CodingContractBaseFactionRepGain: 2500,
  CodingContractBaseCompanyRepGain: 4000,
  CodingContractBaseMoneyGain: 75e6,

  // Augmentation grafting multipliers
  AugmentationGraftingCostMult: 3,
  AugmentationGraftingTimeBase: 3600000,

  // SoA mults
  SoACostMult: 7,
  SoARepMult: 1.3,

  // Value raised to the number of entropy stacks, then multiplied to player multipliers
  EntropyEffect: 0.98,

  // BitNode/Source-File related stuff
  TotalNumBitNodes: 24,

  InfiniteLoopLimit: 2000,

  Donations: 25,

  LatestUpdate: `
v2.1.0 - 2022-08-23
-------------------

  * pending
  * nerf noodle bar

`,
}

export const BitNodeMultipliers = {
  HackingLevelMultiplier: 1,
  StrengthLevelMultiplier: 1,
  DefenseLevelMultiplier: 1,
  DexterityLevelMultiplier: 1,
  AgilityLevelMultiplier: 1,
  CharismaLevelMultiplier: 1,

  ServerGrowthRate: 1,
  ServerMaxMoney: 1,
  ServerStartingMoney: 1,
  ServerStartingSecurity: 1,
  ServerWeakenRate: 1,

  HomeComputerRamCost: 1,

  PurchasedServerCost: 1,
  PurchasedServerSoftcap: 1,
  PurchasedServerLimit: 1,
  PurchasedServerMaxRam: 1,

  CompanyWorkMoney: 1,
  CrimeMoney: 1,
  HacknetNodeMoney: 1,
  ManualHackMoney: 1,
  ScriptHackMoney: 1, // normally different per bitnode.   BN4 is 0.2
  ScriptHackMoneyGain: 1,
  CodingContractMoney: 1,

  ClassGymExpGain: 1,
  CompanyWorkExpGain: 1,
  CrimeExpGain: 1,
  FactionWorkExpGain: 1,
  HackExpGain: 1,

  FactionPassiveRepGain: 1,
  FactionWorkRepGain: 1,
  RepToDonateToFaction: 1,

  AugmentationMoneyCost: 1,
  AugmentationRepCost: 1,

  InfiltrationMoney: 1,
  InfiltrationRep: 1,

  FourSigmaMarketDataCost: 1,
  FourSigmaMarketDataApiCost: 1,

  CorporationValuation: 1,
  CorporationSoftcap: 1,

  BladeburnerRank: 1,
  BladeburnerSkillCost: 1,

  GangSoftcap: 1,
  GangUniqueAugs: 1,

  DaedalusAugsRequirement: 30,

  StaneksGiftPowerMultiplier: 1,
  StaneksGiftExtraSize: 0,

  WorldDaemonDifficulty: 1,
};

export function calculateIntelligenceBonus(intelligence, weight = 1) {
  return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
}

/**
 * Returns the chance the player has to successfully hack a server
 */
export function calculateHackingChance(server, player) {
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

/**
 * Returns the amount of hacking experience the player will gain upon
 * successfully hacking a server
 */
export function calculateHackingExpGain(server, player) {
  const baseExpGain = 3;
  const diffFactor = 0.3;
  if (server.baseDifficulty == null) {
    server.baseDifficulty = server.hackDifficulty;
  }
  let expGain = baseExpGain;
  expGain += server.baseDifficulty * diffFactor;

  return expGain * player.mults.hacking_exp * BitNodeMultipliers.HackExpGain;
}

/**
 * Returns the percentage of money that will be stolen from a server if
 * it is successfully hacked (returns the decimal form, not the actual percent value)
 */
export function calculatePercentMoneyHacked(server, player) {
  // Adjust if needed for balancing. This is the divisor for the final calculation
  const balanceFactor = 240;

  const difficultyMult = (100 - server.hackDifficulty) / 100;
  const skillMult = (player.skills.hacking - (server.requiredHackingSkill - 1)) / player.skills.hacking;
  const percentMoneyHacked =
    (difficultyMult * skillMult * player.mults.hacking_money * BitNodeMultipliers.ScriptHackMoney) / balanceFactor;
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
export function calculateHackingTime(server, player) {
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
export function calculateGrowTime(server, player) {
  const growTimeMultiplier = 3.2; // Relative to hacking time. 16/5 = 3.2
  return growTimeMultiplier * calculateHackingTime(server, player);
}

/**
 * Returns time it takes to complete a weaken operation on a server, in seconds
 */
export function calculateWeakenTime(server, player) {
  const weakenTimeMultiplier = 4; // Relative to hacking time
  return weakenTimeMultiplier * calculateHackingTime(server, player);
}

export function calculateServerGrowth(server, threads, player, cores = 1) {
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
  hackChance: (server, player) => calculateHackingChance(server, player),
  hackExp: (server, player) => calculateHackingExpGain(server, player), // needs BitNodeModifiers
  hackPercent: (server, player) => calculatePercentMoneyHacked(server, player),
  growPercent: (server, threads, player, cores = 1) => calculateServerGrowth(server, threads, player, cores),
  hackTime: (server, player) => calculateHackingTime(server, player) * 1000,
  growTime: (server, player) => calculateGrowTime(server, player) * 1000,
  weakenTime: (server, player) => calculateWeakenTime(server, player) * 1000,

  // extra info
  intelligenceBonus: (server, player) => calculateIntelligenceBonus(server, player),
  all: calculateAll,
  analyze
}

export default mine

export async function checkFormulasExe(ns) {
  let files = await ns.ls('home', 'Formulas.exe')
  return (files.length > 0)
}

export async function getHackingFormulas(ns, force = null) {
  if (force === true || (force === null && await checkFormulasExe(ns))) {
    return ns.formulas.hacking
  }
  return mine
}