
let externalWindow = null

export function openWindow(url) {
  if (!externalWindow || !externalWindow.self) {
    externalWindow = window.open(url, '_blank',
    `popup=true,width=1920,height=1000,left=0,top=0`);
    let ew = eval('window.ew = window.ew || []')
    ew.push(externalWindow)
    console.log('added external window:', externalWindow)
    console.log(`available as ew[${ew.length - 1}]`)
  } else {
    console.log('existing external window:', externalWindow)
  }
}

export function log(id, lines) {
  if (externalWindow) {
    // console.log('posint message:')
    externalWindow.postMessage({
      command: 'log',
      id,
      lines
    }, '*')
    return true
  }
  return false
}

export function table(id, data) {
  if (externalWindow) {
    externalWindow.postMessage({
      command: 'table',
      id,
      data
    }, '*')
    return true
  }
  return false
}