// Database Julat Rujukan
const referenceRanges = {
  Cattle:   { Neutrophil: [15, 45], Lymphocyte: [45, 75], Monocyte: [2, 7], Eosinophil: [2, 20], Basophil: [0, 2] },
  Sheep:    { Neutrophil: [10, 50], Lymphocyte: [40, 75], Monocyte: [0, 6], Eosinophil: [0, 10], Basophil: [0, 3] },
  Goats:    { Neutrophil: [10, 50], Lymphocyte: [40, 75], Monocyte: [0, 6], Eosinophil: [0, 10], Basophil: [0, 2] },
  Pigs:     { Neutrophil: [28, 47], Lymphocyte: [39, 62], Monocyte: [2, 10], Eosinophil: [1, 11], Basophil: [0, 2] },
  Dogs:     { Neutrophil: [60, 77], Lymphocyte: [12, 30], Monocyte: [3, 10], Eosinophil: [2, 10], Basophil: [0, 1] },
  Cats:     { Neutrophil: [35, 75], Lymphocyte: [20, 55], Monocyte: [1, 4], Eosinophil: [2, 12], Basophil: [0, 1] },
  Horses:   { Neutrophil: [35, 75], Lymphocyte: [15, 50], Monocyte: [2, 10], Eosinophil: [2, 12], Basophil: [0, 3] },
  Elephant: { Neutrophil: [22, 50], Lymphocyte: [40, 60], Monocyte: [1.7, 5], Eosinophil: [6, 15], Basophil: [0.3, 2] },
  Camel:    { Neutrophil: [38.7, 38.7], Lymphocyte: [46, 46], Monocyte: [5.7, 5.7], Eosinophil: [9.5, 9.5], Basophil: [1, 1] },
  Rabbit:   { Neutrophil: [17, 52], Lymphocyte: [42, 80], Monocyte: [5, 8], Eosinophil: [0.3, 0.3], Basophil: [0, 5] },
  Fowl:     { Neutrophil: [29.5, 37.3], Lymphocyte: [48.9, 58.5], Monocyte: [9.7, 10.2], Eosinophil: [1.7, 1.7], Basophil: [0.7, 2] },
  Man:      { Neutrophil: [55, 70], Lymphocyte: [25, 70], Monocyte: [3, 7], Eosinophil: [1, 4], Basophil: [0, 1] }
};

let counts = { Neutrophil: 0, Lymphocyte: 0, Monocyte: 0, Eosinophil: 0, Basophil: 0 };
let countHistory = [];
let model, recognizer, audioContext, mediaStream, audioProcessor;
let isOfflineEngineReady = false;
let isListening = false;

const cellAliases = {
  Neutrophil: ['neutrophil', 'neutro', 'seg', 'band'],
  Lymphocyte: ['lymphocyte', 'lymph', 'lym'],
  Monocyte: ['monocyte', 'mono'],
  Eosinophil: ['eosinophil', 'eosi', 'eos'],
  Basophil: ['basophil', 'baso']
};

const undoAliases = ['undo', 'tolak', 'back', 'delete'];

// Function muat turun fail dengan penunjuk peratusan %
async function fetchWithProgress(url, onProgress) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

  const contentLength = response.headers.get('content-length');
  if (!contentLength) return await response.blob();

  const total = parseInt(contentLength, 10);
  let loaded = 0;
  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    
    const percent = Math.round((loaded / total) * 100);
    onProgress(percent);
  }

  return new Blob(chunks);
}

// Inisialisasi Vosk dengan Peratusan Download
async function initOfflineVosk() {
  const micStatusText = document.getElementById('micStatusText');
  const micDot = document.getElementById('micDot');
  micStatusText.innerText = "Memuatkan Model Offline: 0%";

  try {
    const modelUrl = 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip';
    
    // Download fail berserta peratusan %
    const modelBlob = await fetchWithProgress(modelUrl, (percent) => {
      micStatusText.innerText = `Memuatkan Model Offline: ${percent}%`;
    });

    micStatusText.innerText = "Menyediakan Enjin AI...";

    model = await Vosk.createModel(modelBlob);
    recognizer = new model.KaldiRecognizer(16000);
    
    recognizer.setGrammar(["neutrophil", "neutro", "lymphocyte", "lymph", "monocyte", "mono", "eosinophil", "eosi", "basophil", "baso", "undo", "tolak"]);

    recognizer.on("result", (message) => {
      const text = message.result.text;
      if (text) processCommand(text);
    });

    recognizer.on("partialresult", (message) => {
      const text = message.result.partial;
      if (text) processCommand(text);
    });

    isOfflineEngineReady = true;
    micStatusText.innerText = "Sedia (Offline)";
    micDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
  } catch (err) {
    console.error(err);
    micStatusText.innerText = "Ralat Muat Turun Model";
    micDot.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
  }
}

async function startOfflineListening() {
  if (!isOfflineEngineReady) {
    await initOfflineVosk();
  }

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  audioContext = new AudioContext();
  
  const source = audioContext.createMediaStreamSource(mediaStream);
  audioProcessor = audioContext.createScriptProcessor(4096, 1, 1);

  audioProcessor.onaudioprocess = (event) => {
    try {
      recognizer.acceptWaveform(event.inputBuffer);
    } catch (e) {}
  };

  source.connect(audioProcessor);
  audioProcessor.connect(audioContext.destination);

  isListening = true;
  document.getElementById('micStatusText').innerText = "AKTIFF (Offline Recording)";
  document.getElementById('micDot').className = "w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-animation";
}

function stopOfflineListening() {
  if (audioProcessor) audioProcessor.disconnect();
  if (audioContext) audioContext.close();
  if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
  
  isListening = false;
  if (isOfflineEngineReady) {
    document.getElementById('micStatusText').innerText = "Sedia (Offline)";
  } else {
    document.getElementById('micStatusText').innerText = "Tidak Aktif";
  }
  document.getElementById('micDot').className = "w-2.5 h-2.5 rounded-full bg-slate-500";
}

function processCommand(transcript) {
  if (getTotalCount() >= 100) return;

  if (undoAliases.some(alias => transcript.includes(alias))) {
    handleUndo();
    return;
  }

  for (const [cellType, aliases] of Object.entries(cellAliases)) {
    if (aliases.some(alias => transcript.includes(alias))) {
      addCount(cellType);
      playBeep();
      break;
    }
  }
}

function addCount(cellType) {
  if (getTotalCount() >= 100) return;
  counts[cellType]++;
  countHistory.push(cellType);
  updateUI();

  if (getTotalCount() >= 100) {
    stopOfflineListening();
    showResults();
  }
}

function updateManualCount(cellType, delta) {
  if (delta === 1 && getTotalCount() >= 100) return;
  if (delta === -1 && counts[cellType] <= 0) return;

  counts[cellType] += delta;
  if (delta === 1) countHistory.push(cellType);
  updateUI();

  if (getTotalCount() >= 100) {
    stopOfflineListening();
    showResults();
  }
}

function handleUndo() {
  if (countHistory.length === 0) return;
  const last = countHistory.pop();
  if (counts[last] > 0) counts[last]--;
  updateUI();
}

function getTotalCount() {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

function updateUI() {
  const total = getTotalCount();
  for (const [cell, count] of Object.entries(counts)) {
    document.getElementById(`count${cell}`).innerText = count;
    document.getElementById(`percent${cell}`).innerText = `(${count}%)`;
  }
  document.getElementById('totalCounter').innerText = `${total} / 100`;
  document.getElementById('progressBar').style.width = `${total}%`;
  document.getElementById('progressPercent').innerText = `${total}%`;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 800;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

function showResults() {
  const species = document.getElementById('speciesSelect').value;
  const tableBody = document.getElementById('resultsTableBody');
  tableBody.innerHTML = '';

  const ref = referenceRanges[species] || {};

  for (const [cell, count] of Object.entries(counts)) {
    const range = ref[cell] || [0, 0];
    let statusText = 'Normal';
    let statusBg = 'bg-emerald-100 text-emerald-800';

    if (count > range[1]) {
      statusText = 'High';
      statusBg = 'bg-rose-100 text-rose-800';
    } else if (count < range[0]) {
      statusText = 'Low';
      statusBg = 'bg-blue-100 text-blue-800';
    }

    tableBody.innerHTML += `
      <tr>
        <td class="p-3 font-semibold">${cell}</td>
        <td class="p-3 text-center font-bold">${count}%</td>
        <td class="p-3 text-center">${range[0]} – ${range[1]}%</td>
        <td class="p-3 text-center"><span class="px-2 py-1 rounded text-xs font-bold ${statusBg}">${statusText}</span></td>
      </tr>
    `;
  }

  document.getElementById('resultsModal').classList.remove('hidden');
}

function resetCounter() {
  counts = { Neutrophil: 0, Lymphocyte: 0, Monocyte: 0, Eosinophil: 0, Basophil: 0 };
  countHistory = [];
  stopOfflineListening();
  updateUI();
  document.getElementById('resultsModal').classList.add('hidden');
}

document.getElementById('btnStartVoice').addEventListener('click', () => {
  if (isListening) stopOfflineListening();
  else startOfflineListening();
});
document.getElementById('btnReset').addEventListener('click', resetCounter);
document.getElementById('btnCloseModal').addEventListener('click', () => document.getElementById('resultsModal').classList.add('hidden'));
document.getElementById('btnNewCount').addEventListener('click', resetCounter);

updateUI();