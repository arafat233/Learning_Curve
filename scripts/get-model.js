// Downloads the local STT model into ./models (needs Node 18+ and `tar`, built into Win10+/macOS/Linux).
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const NAME = 'sherpa-onnx-streaming-zipformer-en-20M-2023-02-17';
const URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/${NAME}.tar.bz2`;
const models = path.join(__dirname, '..', 'models');
const archive = path.join(models, NAME + '.tar.bz2');

(async () => {
  if (fs.existsSync(path.join(models, NAME))) return console.log('Model already present.');
  fs.mkdirSync(models, { recursive: true });
  const r = await fetch(URL);
  if (!r.ok) throw new Error(`Download failed: ${r.status}`);
  fs.writeFileSync(archive, Buffer.from(await r.arrayBuffer()));
  execFileSync('tar', ['-xjf', archive, '-C', models], { stdio: 'inherit' });
  fs.rmSync(archive);
  console.log('Model ready.');
})().catch((e) => { console.error(e.message); process.exit(1); });
