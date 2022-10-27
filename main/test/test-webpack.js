/*
Showing how we can use window.webpackJsonp to get the modules making up the game
and access things like the global Player and AllServers
*/

/* 

  Thanks to this answer on stackoverflow by daymannovaes
    https://stackoverflow.com/a/70600070/369792

*/


function getWebpackInternals() {
  let w = eval('window')
  return new Promise((resolve) => {
    const id = 'fakeId' + Math.random();
    w['webpackJsonp'].push(["web", {
      [id]: function (module, __webpack_exports__, __webpack_require__) {
        resolve([module, __webpack_exports__, __webpack_require__])
      }
    }, [[id]]]);
  });
}
/** @param {NS} ns */
export async function main(ns) {
  // get webpack internals
  let internals = await getWebpackInternals()

  // // I know the index(1) and property (a) of the Player object
  // let player = internals[2].c[1].exports.a
  // ns.tprint(JSON.stringify(player.augmentations))

  // we'll store getWebpackInternals on the window object if you want to use it
  // in the console, and create a 'findExports' function on the windows object
  // as a helper.  Pass it a function that takes an export
  let w = eval('window')
  w.getWebpackInternals = getWebpackInternals

  // find exports using a filter function that accepts an export
  w.findExports = (fn) => {
    let results = []
    Object.entries(internals[2].c).forEach(x => {
      let id = x[0]
      let module = x[1]
      let exports = module.exports
      if (exports) {
        Object.entries(exports).forEach(y => {
          // call function with the export value.  For instance, the global
          // 'Player' object is internals[2].c[1].exports.a
          //    internals is the result of getWebpackInternals()
          //    internals[2].c is what we're after, with { 1: {module}, 2: {module}, 3: {module} }
          //    x is like ['1', {module}]
          //    id is the '1',
          //    module is the module object
          //    exports is module.exports
          //    y is the mapping of each export name to the export value, i.e.
          //    ['a', {Player}]
          // The function should return 'true' if we want the export returned.
          // For example to find the player we might use this:
          //    findExports(export => export.achievements)
          let [name, value] = y
          if (fn(value)) {
            results.push({ id, module, exports, name, value })
          }
        })
      }
    })
    return results
  }

  // find modules using a filter function that accepts a module
  w.findModules = (fn) => {
    let results = []
    Object.entries(internals[2].c).forEach(x => {
      if (x && x[0] && x[1] && typeof(x[1]) === 'object' && x[1].exports) {
        let id = x[0]
        let module = x[1]
        let exports = module.exports
        if (fn(module)) {
          results.push(module)
        }
      }
    })
    return results
  }

  // this list should have one entry, the Player export
  w.PLAYER_EXPORTS = w.findExports(x => x && typeof (x) === 'object' && x.achievements)
  w.PLAYER = w.PLAYER_EXPORTS[0].value


  // this finds 5 modules that export exactly 10 functions (like 'Server' module)
  // length is 10 in steam version on 2022-10-22, 11 in dev version
  var modules = findModules(m => m && Object.entries(m.exports).filter(x => typeof(x[1]) === 'function').length === 11)
  w.ALL_SERVERS_EXPORTS = modules

  // I happen to know that the first one, with { i:24, l: true } is the one, but I
  // can maybe tell by looking at the export signatures.
  // There are 7 functions that take a single argument and three that don't:
  //    1. prestigeAllServers()
  //    2. GetAllServers()
  //    3. createUniqueRandomIp()
  // One of them that takes a single argument has a unique signature in chrome
  // devtools: `k(t=!1)` - this corresponds to the function that has a default:
  //    saveAllServers(excludeRunningScripts = false):
  // I am looking for `mods[0].exports.c()` which is GetAllServers() and returns the array.
  // the functions are not in the same order as in the file though, it is the first export
  // in the source file, but the third function after two that take arguments.  In devtools
  // however it shows the [[location]] is the first in main.bundle.js.  However I can see
  // the function in devtools with:
  //    `${mods[0].exports.c}`
  // which displays:
  //    'function h(){const t=[];for(const e of Object.keys(u))t.push(u[e]);return t}'
  // 'u' here is all servers but isn't exported
  // I can get the 'text' of the function from the bundles, so I can look for other functions
  // to make sure I have the right module at least, i.e. one of the functions has
  // text in it like 'throw console.warn("Hostname of the server thats being added: "'
  // I can do these then:
  // w.ALLS = modules[0].exports.c()
  // w.n00dles = w.ALLS.find(x => x.hostname === 'n00dles')
  // w.n00dles.maxRam = 1073741824
  // w.n00dles.moneyMax = 1.9e12


  // this list should have one entry, the AllServers export
  // ALLSERVERS_EXPORTS[0].value['n00dles'].moneyMax = 1.9e12
  // not exported w.ALLSERVERS_EXPORTS = w.findExports(x => x && typeof(x) === 'object' && x.length >= 60 && x[0].hostname)
  // w.ALLSERVERS_2 = w.findExports(x => x && typeof(x) === 'object' && x['n00dles'])

}