const { spawn } = require('child_process');
const path = require('path');

const electron = require('electron');
const cwd = path.resolve(__dirname, '..');
const SMOKE_TIMEOUT_MS = 45000;

const child = spawn(electron, ['.'], {
  cwd,
  env: {
    ...process.env,
    AI_INTERVIEW_SMOKE: '1',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});

let output = '';
const collect = (d) => {
  output += d.toString();
  process.stdout.write(d);
};
child.stdout.on('data', collect);
child.stderr.on('data', collect);

const timer = setTimeout(() => {
  child.kill();
  console.error('Smoke test timed out.');
  process.exit(1);
}, SMOKE_TIMEOUT_MS);

child.on('exit', (code) => {
  clearTimeout(timer);
  if (code !== 0) {
    console.error(output);
    process.exit(code || 1);
  }
  console.log('Smoke test passed.');
});
