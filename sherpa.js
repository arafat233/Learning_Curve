// --- sherpa-onnx streaming STT (on-device, keyless, real interim + endpoints) ---
const path = require('path');
let sherpaRec = null;
const sherpaStreams = {};   // who -> stream
const SHERPA_DIR = path.join(__dirname, 'models', 'sherpa-onnx-streaming-zipformer-en-20M-2023-02-17');
function getSherpaRec() {
  if (sherpaRec) return sherpaRec;
  sherpaRec = new (require('sherpa-onnx-node').OnlineRecognizer)({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      transducer: {
        encoder: path.join(SHERPA_DIR, 'encoder-epoch-99-avg-1.int8.onnx'),
        decoder: path.join(SHERPA_DIR, 'decoder-epoch-99-avg-1.onnx'),
        joiner: path.join(SHERPA_DIR, 'joiner-epoch-99-avg-1.int8.onnx'),
      },
      tokens: path.join(SHERPA_DIR, 'tokens.txt'),
      numThreads: 2, provider: 'cpu',
    },
    enableEndpoint: true,
  });
  return sherpaRec;
}
// Renderer streams 16kHz PCM here per speaker; we emit interim + final on endpoint.
const register = ({ ipcMain, getWin }) => ipcMain.on('sherpa-pcm', (evt, { who, samples, drives }) => {
  try {
    const rec = getSherpaRec();
    if (!sherpaStreams[who]) sherpaStreams[who] = rec.createStream();
    const st = sherpaStreams[who];
    st.acceptWaveform({ sampleRate: 16000, samples: Float32Array.from(samples) });
    while (rec.isReady(st)) rec.decode(st);
    const text = rec.getResult(st).text;
    const ended = rec.isEndpoint(st);
    if (text || ended) evt.sender.send('sherpa-result', { who, text, ended, drives });
    if (ended) rec.reset(st);
  } catch (e) { if (!getWin().isDestroyed()) evt.sender.send('answer-error', 'sherpa: ' + e.message); }
});
module.exports = { register, SHERPA_DIR };
