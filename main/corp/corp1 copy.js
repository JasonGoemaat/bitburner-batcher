/** @param {NS} ns */
export async function main(ns) {
  
}

/*

buy 10 (own 100) water = 0.500 - 0.500 / 1.600k
buy 10 (own 100) energy = 0.100 - 0.600 / 1.600k
buy 10 (own 100) plants = 0.500 - 1.100 / 1.600k
buy 10 (own 100) hardware = 0.600 - 1.700 / 1.600k
buy 10 (own 100) chemicals = 0.500 - 2.200 / 1.600k
buy 10 (own 100) robots = 5.000 - 7.200 / 1.600k
buy 10 (own 100) AI Cores = 1.000 - 8.200 / 1.600k (.002 multiplier at level 4 displayed)
buy 10 (own 100) real estate = 0.050 - 8.250 / 1.600k (0.004 multiplier at level 5 displayed)

20000 (2000 buy) real estate = 1000 storage ?  oh, no, 100 storage..  The 10 numbers are for BUY I think, so buying 10 gives you 100
because a cycle is 10 seconds and buy is per second




Real estate: 10000   (T5 multiplier - Chemical) gives 1.743 (0.743) multiplier, takes 50 storage
Real estate: 100000  (T5 multiplier - Chemical) gives 2.632 (1.632) multiplier, takes 500 storage
Real estate: 1000000 (T5 multiplier - Chemical) gives 4.004 (3.004) multiplier, takes 5000 storage
Costs $87k each
1000 - 1.222
2000 - 1.342
3000 - 1.426
4000 - 1.493
5000 - 1.549
6000 - 1.597
7000 - 1.639
8000 - 1.677
9000 - 1.711
10000 - 1.743
20000 - 1.969
30000 - 2.117
40000 - 2.230
50000 - 2.322
60000 - 2.399 (300 storage)
70000 - 2.467 (350 storage)
80000 - 2.528 (400 storage)
90000 - 2.582 (450 storage)
100000 - 2.632
110000 - 2.678
120000 - 2.721

Robots are T5 also, but take up 100x the space and aren't much cheaper (73.262k vs. 86.900k)
Also super hard to off-load, I'm only selling 135 or 400 per second at $1.  
I offloaded my real estate fast at $1, not sure how much I could have gotten
But then again, I can up the multiplier by .5 for 2000 robots (1000 storage)
and after I have 40000 real estate (200 storage) I'd have to buy 80000 more for over 40x the cost
of the robots, but it would still take much less storage (400 extra vs. 1000 for the 2000 robots)
It depends on how much storage will cost to add...

1000 - 1.222 (500 storage)
2000 - 1.341 (1000 storage)
3000 - 1.426 (1500 storage)
1.493 (2000)
5000 1.549 (2500)
6000 1.597 (3000)
7000 - 1.637 (3500 storage)
8000 - 1.677
9000 - 1.711
10000 - 1.743 (5000 storage)


Hardware (0.060 storage, $8000) and AI cores (0.100 storage, $14500) are both T4

Hardware (1000 each)


Warehouse Upgrade Cost:
  This is actually additive?  Does Array(amt).keys() where amt is number and adds this formula for each:
    CorporationConstants.WarehouseUpgradeBaseCost (1e9) * Math.pow(1.07, warehouse.level + 1 + index)



NOTE: developing Pain-away in Hi-med with 1t investment in each

*/