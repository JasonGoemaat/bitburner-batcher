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
  stockData = stockData.sort((a, b) => a.forecast - b.forecast)
  if (stockData.length === 0) {
    ns.tprint('NO STOCKS!')
    return
  }
  let lines = createTable(stockData.map(x => ({
    symbol: x.symbol,
    askPrice: ns.nFormat(x.askPrice, '$0,000.00'),
    bidPrice: ns.nFormat(x.bidPrice, '$0,000.00'),
    price: ns.nFormat(x.price, '$0,000.00'),
    volatility: ns.nFormat(x.volatility, '0.00000'),
    forecast: ns.nFormat(x.forecast, '0.00000'),
    position: x.position,
    maxShares: ns.nFormat(x.maxShares, '0,000.000a'),
    buyFor: ns.nFormat(ns.stock.getPurchaseCost(x.symbol, x.maxShares, 'Long'), '$0,000.00a'),
    calcFor: ns.nFormat(x.askPrice * x.maxShares + 200000, '$0,000.00a'),
    buyHalfFor: ns.nFormat(ns.stock.getPurchaseCost(x.symbol, x.maxShares / 2, 'Long'), '$0,000.00a'),

  })), { align: { symbol: 'left' }})
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