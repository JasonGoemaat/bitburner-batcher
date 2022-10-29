// from https://raw.githubusercontent.com/zerbosh/Bitburner/main/corps/early-corp.js
// github user: zerbosh
// discord: _Jakob_
// adapted by jason goemaat to ONLY use the mechanic to buy products and sell them
// to pump up offers


/*
thejeek: RIght now, if you export 1 unit of 1000 quality to a warehouse of 999 units of 0 quality, you end up with 1000 units of 1000 quality. Broken AF
*/


/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	const CorpApi = ns.corporation
	const analyzefile = "/analyze-corp.txt";
	const corp = "corp";
	const all_divisions = ["Software", "Agriculture", "Fishing", "Chemical", "Tobacco", "Food"]
	const main_division = "Software";
	const cities = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];
	const prodMat = "AI Cores";
	const division_goals = [1,1]
	const employee_goals = [3,63]
	const storage_goals = [8,21]
	const speech_goals = [0,8]
	const dream_goals = [0,1]
	const smart_goals = [7,10]
	const project_goals = [0,1]
	const abc_goals = [0,5]
	const adv_goals = [3,25]
	const start = ns.getPlayer().playtimeSinceLastBitnode;


	await getCorp();
	let round = CorpApi.getInvestmentOffer().round - 1;

	await prep()
	// await party()
	await waitState("START")
	await takeOffer();
	await end()

	async function waitState(state, times = 1, onpoint = false) {
		for (let i = 0; i < times; i++) {
			while (CorpApi.getCorporation().state != state) { await ns.sleep(11); }
			if (onpoint) {
				while (CorpApi.getCorporation().state == state) { await ns.sleep(11); }
			}
		}
	}
	async function prep() {
		//divisions
		// while (CorpApi.getCorporation(corp).divisions.length < division_goals[round]) {
		// 	let name = all_divisions[CorpApi.getCorporation(corp).divisions.length]
		// 	CorpApi.expandIndustry(name, name);

		// }
		//upgrades && unlocks
		// while (CorpApi.getUpgradeLevel("Smart Storage") < smart_goals[round]) { await CorpApi.levelUpgrade("Smart Storage"); }
		// while (CorpApi.getUpgradeLevel("Project Insight") < project_goals[round]) { await CorpApi.levelUpgrade("Project Insight") }
		// while (CorpApi.getUpgradeLevel("Neural Accelerators") < project_goals[round]) { await CorpApi.levelUpgrade("Neural Accelerators") }
		// while (CorpApi.getUpgradeLevel("Nuoptimal Nootropic Injector Implants") < project_goals[round]) { await CorpApi.levelUpgrade("Nuoptimal Nootropic Injector Implants") }
		// while (CorpApi.getUpgradeLevel("FocusWires") < project_goals[round]) { await CorpApi.levelUpgrade("FocusWires") }
		// while (CorpApi.getUpgradeLevel("Speech Processor Implants") < speech_goals[round]) { await CorpApi.levelUpgrade("Speech Processor Implants"); }
		// while (CorpApi.getUpgradeLevel("DreamSense") < dream_goals[round]) { await CorpApi.levelUpgrade("DreamSense"); }
		// while (CorpApi.getUpgradeLevel("ABC SalesBots") < abc_goals[round]) { await CorpApi.levelUpgrade("ABC SalesBots"); }

		//prep each division & city
		for (const division of CorpApi.getCorporation().divisions) {
			// //expand to all cities in all divisions
			// while (CorpApi.getDivision(division.name).cities.length < cities.length) {
			// 	for (let city of cities) { if (!CorpApi.getDivision(division.name).cities.includes(city)) { await CorpApi.expandCity(division.name, city); } }

			// }
			// //buy some ads 
			// while (CorpApi.getHireAdVertCount(division.name) < adv_goals[round]) { await CorpApi.hireAdVert(division.name); }
			// //buy Warehouses
			// for (let city of cities) {
			// 	if (CorpApi.hasWarehouse(division.name, city) == false) { await CorpApi.purchaseWarehouse(division.name, city); }
			// }
			//prep each city to goal
			for (let city of cities) {
				//upgrade Warehouses to current goal
				// while (CorpApi.getWarehouse(division.name, city).level < storage_goals[round]) { await CorpApi.upgradeWarehouse(division.name, city); await ns.sleep(1) }
				// //upgrade Office size to goal
				// while (CorpApi.getOffice(division.name, city).size < employee_goals[round]) { CorpApi.upgradeOfficeSize(division.name, city, 3); }
				// //hire to max
				// while (CorpApi.getOffice(division.name, city).employees.length < CorpApi.getOffice(division.name, city).size) { await CorpApi.hireEmployee(division.name, city); }

				//make sure we have mats for qlt update later
				if (division.name == main_division) {
          CorpApi.setSmartSupply(division.name, city, false)
					CorpApi.buyMaterial(division.name, city, "Energy", 0.01)
					CorpApi.buyMaterial(division.name, city, "Hardware", 0.01)
				}
			}
		}
	}
	async function party() {

		for (const division of CorpApi.getCorporation().divisions) {
			for (let city of cities) {
				await CorpApi.setAutoJobAssignment(division.name, city, "Business", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Operations", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Engineer", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Management", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Research & Development", CorpApi.getOffice(division.name, city).employees.length);
			}

		}
		let done = 0;
		while (done < CorpApi.getCorporation().divisions.length) {
			done = 0;
			for (const division of CorpApi.getCorporation().divisions) {
				let d_mor = 0;
				let d_ene = 0;
				let d_hap = 0;
				for (let city of cities) {
					let tmorale = 0;
					let tenergy = 0;
					let thappiness = 0;
					CorpApi.getOffice(division.name, city).employees.forEach(x => tmorale += CorpApi.getEmployee(division.name, city, x).mor);
					CorpApi.getOffice(division.name, city).employees.forEach(x => tenergy += CorpApi.getEmployee(division.name, city, x).ene);
					CorpApi.getOffice(division.name, city).employees.forEach(x => thappiness += CorpApi.getEmployee(division.name, city, x).hap);
					tmorale = tmorale / CorpApi.getOffice(division.name, city).employees.length;
					tenergy = tenergy / CorpApi.getOffice(division.name, city).employees.length;
					thappiness = thappiness / CorpApi.getOffice(division.name, city).employees.length;
					let party = 3e6 * (round + 1);
					tmorale > 99.8 && thappiness > 99.8 ? party = 1e5 : null;
					tmorale < 100 || thappiness < 100 ? CorpApi.throwParty(division.name, city, party) : null;
					tenergy < 100 ? CorpApi.buyCoffee(division.name, city) : null;

					tmorale > 99.9 ? d_mor += 1 : null;
					tenergy > 99.9 ? d_ene += 1 : null;
					thappiness > 99.9 ? d_hap += 1 : null;
				}
				d_mor == 6 && d_ene == 6 && d_hap == 6 ? done++ : null;
			}
			await waitState("START", 1, true)
		}
	}
	async function takeOffer() {
    ns.print('INFO: takeOffer() started')
		//we buy a ton of cores to sell them later the cores we produce set the quality
		for (const division of CorpApi.getCorporation().divisions) {
			for (let city of cities) {
				await CorpApi.setAutoJobAssignment(division.name, city, "Research & Development", 0);
				//we need engineers to produce and the more the higher the qlt gained 
				await CorpApi.setAutoJobAssignment(division.name, city, "Engineer", CorpApi.getOffice(division.name, city).employees.length);
				//we leave a bit of space for so we can actually produce high qlt cores
				const amt = CorpApi.getWarehouse(division.name, city).size - CorpApi.getWarehouse(division.name, city).sizeUsed - 5;
				if (amt > 10) CorpApi.buyMaterial(division.name, city, "AI Cores", amt / 10);
			}
		}
		//wait for warehouse to fill
    ns.print('INFO: Waiting to fill warehouses')
		while (CorpApi.getWarehouse(main_division, cities[0]).sizeUsed < CorpApi.getWarehouse(main_division, cities[0]).size - 5) { await ns.sleep(100) }
		//reset buys to 0
    ns.print('INFO: Resetting buys to 0')
		for (const division of CorpApi.getCorporation().divisions) { for (let city of cities) { CorpApi.buyMaterial(division.name, city, "AI Cores", 0) } }
		//set employees for fraud
    ns.print('INFO: Setting employees to Business')
		for (const division of CorpApi.getCorporation().divisions) {
			for (let city of cities) {

				await CorpApi.setAutoJobAssignment(division.name, city, "Research & Development", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Operations", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Engineer", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Management", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Business", CorpApi.getOffice(division.name, city).employees.length);
			}
		}

    ns.print('INFO: Waiting for EXPORT')
		await waitState("EXPORT")
    ns.print('INFO: Setting material to sell')

		//we make sure that we dont sell anything early :3
		for (const division of CorpApi.getCorporation().divisions) {
			for (let city of cities) {
				CorpApi.sellMaterial(division.name, city, prodMat, "MAX", "MP");
			}
		}

    ns.print('INFO: Waiting for START')

		//we wait for 5 cycles so the game forgets all bad cycles and we wait for "START" to end to be sure that the Offer is at its peak
		await waitState("START", 5, true)

		const offer = CorpApi.getInvestmentOffer().funds;
    ns.print(`INFO: Accepting offer?  ${ns.print(offer, '$0,000.000a')}`)

		await CorpApi.acceptInvestmentOffer();
		round++
		analyze(offer);
	}
	async function end() {
		!CorpApi.hasUnlockUpgrade("Smart Supply") && CorpApi.getUnlockUpgradeCost("Smart Supply") < CorpApi.getCorporation().funds ? CorpApi.unlockUpgrade("Smart Supply") : null;

		for (const division of CorpApi.getCorporation().divisions) {
			for (let city of cities) {
				CorpApi.setSmartSupply(division.name, city, true)
				await CorpApi.setAutoJobAssignment(division.name, city, "Business", 0);
				await CorpApi.setAutoJobAssignment(division.name, city, "Research & Development", CorpApi.getOffice(division.name, city).employees.length / 3);
				await CorpApi.setAutoJobAssignment(division.name, city, "Engineer", CorpApi.getOffice(division.name, city).employees.length / 3);
				await CorpApi.setAutoJobAssignment(division.name, city, "Management", CorpApi.getOffice(division.name, city).employees.length / 3);


			}
		}
		ns.exit();
	}
	async function getCorp() {
		let player = ns.getPlayer();
		if (!player.hasCorporation) {
			if (player.bitNodeN == 3) {
				CorpApi.createCorporation(corp, false);
			} else {
				while (ns.getPlayer().money < 15e+10) {
					ns.clearLog();
					ns.print("Waiting for Money to create Corp");
					await ns.sleep(30 * 1000);
				}
				CorpApi.createCorporation(corp, true);
			}
		}
	}

	function analyze(offer) {
		const end = ns.getPlayer().playtimeSinceLastBitnode;
		const runtime = ns.tFormat(end - start);
		const result = round + ": " + offer + " after " + runtime;
		round == 1 ? ns.write(analyzefile, "\n" + result, "a") : ns.write(analyzefile, " " + result, "a");

	}
}
