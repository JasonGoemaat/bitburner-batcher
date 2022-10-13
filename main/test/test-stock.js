import { createTable } from '/lib.js'

/** @param {NS} ns */
export async function main(ns) {
  let stock = eval("window.stock = window.stock || {}")
  let symbols = ns.stock.getSymbols()
  stock.getSymbols = symbols

  let stockData = symbols.map(symbol => {
    try {
      return {
        symbol,
        askPrice: ns.stock.getAskPrice(symbol),
        bidPrice: ns.stock.getBidPrice(symbol),
        price: ns.stock.getPrice(symbol),
        volatility: ns.stock.getVolatility(symbol),
        forecast: ns.stock.getForecast(symbol),
        position: ns.stock.getPosition(symbol),
        maxShares: ns.stock.getMaxShares(symbol),
      }
    } catch (err) {
      ns.tprint(`ERROR: With symbol ${symbol}\n${err}`)
      return null
    }
  })

  stockData = stockData.filter(x => x)
  if (stockData.length === 0) {
    ns.tprint('NO STOCKS!')
    return
  }
  let lines = createTable(stockData)
  ns.tprint('Stock data:\n' + lines.join('\n'))

  // let orders = ns.stock.getOrders()
  // ns.stock.getPurchaseCost(symbol, 10, "Long|Short") // takes into account large # share, spread, commission
  // ns.stock.getSaleGain(symbol, 10, "Long|Short") // ditto for sales
  
  

  /*
      const dictAskPrices = await getStockInfoDict(ns, 'getAskPrice');
    const dictBidPrices = await getStockInfoDict(ns, 'getBidPrice');
    const dictVolatilities = !has4s ? null : await getStockInfoDict(ns, 'getVolatility');
    const dictForecasts = !has4s ? null : await getStockInfoDict(ns, 'getForecast');
    const dictPositions = mock ? null : await getStockInfoDict(ns, 'getPosition');
    */

}