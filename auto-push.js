const fs = require('fs');
const {execSync} = require('child_process');

const DIR = __dirname;
const DEBOUNCE = 2500;
const IGNORE = ['.git', 'auto-push.js'];

let timer = null;

function push() {
  try {
    execSync('git add .', {cwd: DIR});
    const diff = execSync('git diff --cached --stat', {cwd: DIR}).toString().trim();
    if (!diff) return;
    const msg = `auto: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
    execSync(`git commit -m "${msg}"`, {cwd: DIR});
    execSync('git push', {cwd: DIR});
    console.log(`[${new Date().toLocaleTimeString()}] pushed`);
  } catch (e) {
    console.error('push failed:', e.message);
  }
}

fs.watch(DIR, {recursive: true}, (_, filename) => {
  if (!filename || IGNORE.some(i => filename.includes(i))) return;
  clearTimeout(timer);
  timer = setTimeout(push, DEBOUNCE);
  console.log(`changed: ${filename}`);
});

console.log('watching for changes... (Ctrl+C to stop)');
