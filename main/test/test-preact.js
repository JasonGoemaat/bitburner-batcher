/** @param {NS} ns */
async function main(ns) {
  let obj = eval('window.obj = window.obj || {}')
 
  var win, doc;

  win = window.open('', 'dialog', {});
  doc = win.document;
  
  doc.write(
      "<html><head>"

      + `<script type="module">
            import { h, Component, render } from 'https://unpkg.com/preact?module';
            import htm from 'https://unpkg.com/htm?module';
            
            // Initialize htm with Preact
            const html = htm.bind(h);
            
            function App (props) {
              return html` + '`<h1>Hello ${props.name}!</h1>;' + `
            }
            
            render(html` + '`<${App} name="World" />\`, document.body);' +
      + "</script>"
      + "</head><body>"
      + "</body></html>"
  );
  doc.close();

let s = `<script type="module">
import { h, Component, render } from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';

// Initialize htm with Preact
const html = htm.bind(h);

function App (props) {
  return html` + '`<h1>Hello ${props.name}!</h1>;' + `
}

render(html` + '`<${App} name="World" />\`, document.body);</script>'
}