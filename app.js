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
let isListening = false;
let recognition = null;

const cellAliases = {
  Neutrophil: ['neutrophil', 'neutro', 'seg', 'band', 'neutrophils'],
  Lymphocyte: ['lymphocyte', 'lymph', 'lym', 'lymphocytes'],
  Monocyte: ['monocyte', 'mono', 'monocytes'],
  Eosinophil: ['eosinophil', 'eosi', 'eos', 'eosinophils'],
  Basophil: ['basophil', 'baso', 'basophils']
};

const undoAliases = ['undo', 'tolak', 'back', 'delete', 'correction'];

// Inisialisasi Speech Recognition
function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert("Browser anda tidak menyokong Speech Recognition. Sila guna Google Chrome.");
    return null;
  }

  const rec = new SpeechRecognition();
  rec.continuous = true;
  rec.interimResults = true; // BACA SERTA-MERTA TANPA DELAY
  rec.lang = 'en-US';

  rec.onstart = () => {
    isListening = true;
    updateMicUI(true);
  };

  rec.onend = () => {
    if (isListening && getTotalCount() < 100) {
      try { rec.start(); } catch (e) {}
    } else {
      isListening = false;
      updateMicUI(false);
    }
  };

  rec.onerror = (event) => {
    console.error("Speech Error:", event.error);
    if (event.error === 'not-allowed') {
      alert("Akses Mikrofon Ditolak! Sila benarkan mic dalam tetapan browser.");
    }
    isListening = false;
    updateMicUI(false);
  };

  rec.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript.trim().toLowerCase();
      processCommand(transcript);
    }
  };

  return rec;
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
    stopListening();
    showResults();
  }
}

function updateManualCount(cellType, delta) {
  if (delta === 1 && getTotalCount() >= 100) return;
  if (delta === -1 && counts[cellType] <= 0) return;

  counts[cellType] += delta;
  if (delta === 1) countHistory.push(cellType);
  else {
    const idx = countHistory.lastIndexOf(cellType);
    if (idx !== -1) countHistory.splice(idx, 1);
  }

  updateUI();

  if (getTotalCount() >= 100) {
    stopListening();
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
    const elCount = document.getElementById(`count${cell}`);
    const elPercent = document.getElementById(`percent${cell}`);
    if (elCount) elCount.innerText = count;
    if (elPercent) elPercent.innerText = `(${count}%)`;
  }
  
  const elTotal = document.getElementById('totalCounter');
  const elBar = document.getElementById('progressBar');
  const elProgressPercent = document.getElementById('progressPercent');
  
  if (elTotal) elTotal.innerText = `${total} / 100`;
  if (elBar) elBar.style.width = `${total}%`;
  if (elProgressPercent) elProgressPercent.innerText = `${total}%`;
}

function updateMicUI(active) {
  const micDot = document.getElementById('micDot');
  const micStatusText = document.getElementById('micStatusText');
  const btnStartVoice = document.getElementById('btnStartVoice');

  if (active) {
    if (micDot) micDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-animation";
    if (micStatusText) micStatusText.innerText = "AKTIFF (Mendengar...)";
    if (btnStartVoice) btnStartVoice.innerText = "Stop Voice";
  } else {
    if (micDot) micDot.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
    if (micStatusText) micStatusText.innerText = "Status: Sedia";
    if (btnStartVoice) btnStartVoice.innerText = "Mula Voice Counter";
  }
}

function toggleListening() {
  if (!recognition) recognition = initSpeech();
  if (!recognition) return;

  if (isListening) {
    stopListening();
  } else {
    if (getTotalCount() >= 100) {
      alert("Kiraan dah cukup 100! Tekan Reset untuk mula balik.");
      return;
    }
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  }
}

function stopListening() {
  isListening = false;
  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }
  updateMicUI(false);
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
  if (!tableBody) return;
  
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

  const modal = document.getElementById('resultsModal');
  if (modal) modal.classList.remove('hidden');
}

function resetCounter() {
  counts = { Neutrophil: 0, Lymphocyte: 0, Monocyte: 0, Eosinophil: 0, Basophil: 0 };
  countHistory = [];
  stopListening();
  updateUI();
  const modal = document.getElementById('resultsModal');
  if (modal) modal.classList.add('hidden');
}

// Event Listeners
document.getElementById('btnStartVoice')?.addEventListener('click', toggleListening);
document.getElementById('btnReset')?.addEventListener('click', resetCounter);
document.getElementById('btnCloseModal')?.addEventListener('click', () => document.getElementById('resultsModal')?.classList.add('hidden'));
document.getElementById('btnNewCount')?.addEventListener('click', resetCounter);

updateUI();
