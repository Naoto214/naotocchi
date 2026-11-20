// Python Playwright exposes touchscreen.tap but no touchMove. Launch the same
// WebKit driver, then send the WPE inspector protocol's native touch commands
// to the single page proxy which Playwright is already automating.
const readline = require('node:readline');
const path = require('node:path');
const [driver, executablePath] = process.argv.slice(2);
const {webkit} = require(driver);
const {Browser} = require(path.join(driver, 'lib/coreBundle')).server;

async function main() {
  let native;
  const newContext = Browser.prototype.newContext;
  Browser.prototype.newContext = function(...args) {
    native = this;
    return newContext.apply(this, args);
  };
  const server = await webkit.launchServer({host:'127.0.0.1', executablePath});
  process.stdout.write(JSON.stringify({endpoint:server.wsEndpoint()})+'\n');
  const lines = readline.createInterface({input:process.stdin});
  try {
    for await (const line of lines) {
      try {
        const pages = [...native._wkPages.values()];
        if (pages.length !== 1) throw Error('Expected exactly one page proxy');
        const command = JSON.parse(line);
        await pages[0]._pageProxySession.send('Input.dispatchTouchEvent', command);
        process.stdout.write('{"ok":true}\n');
      } catch (error) {
        process.stdout.write(JSON.stringify({error:String(error)})+'\n');
      }
    }
  } finally {
    await server.close();
  }
}
main().catch(error=>{process.stderr.write(String(error)+'\n');process.exitCode=1;});
