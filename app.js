// --- ELEMENTEN SELECTEREN ---
const wakeLockBtn = document.getElementById('wakeLockBtn');
const wakeLockStatus = document.getElementById('wakeLockStatus');
const inputGroup = document.getElementById('inputGroup');
const inputMin = document.getElementById('inputMin');
const inputSec = document.getElementById('inputSec');
const timeDisplay = document.getElementById('timeDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// --- STATE ---
let wakeLock = null;
let wakeLockRequested = false; // Voorkeur van gebruiker
let timerInterval = null;
let totalSeconds = 0;
let isPaused = false;

// Web Audio API piepje bij einde timer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = 880; // A5 noot
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
}

// --- SCREEN WAKE LOCK LOGICA ---
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      updateWakeLockUI(true);
      
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
        updateWakeLockUI(false);
      });
    } catch (err) {
      console.warn(`Wake Lock kon niet geactiveerd worden: ${err.message}`);
      updateWakeLockUI(false);
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
  updateWakeLockUI(false);
}

function updateWakeLockUI(isActive) {
  if (isActive) {
    wakeLockBtn.classList.add('active');
    wakeLockStatus.textContent = 'AAN';
  } else {
    wakeLockBtn.classList.remove('active');
    wakeLockStatus.textContent = 'UIT';
  }
}

wakeLockBtn.addEventListener('click', () => {
  wakeLockRequested = !wakeLockRequested;
  localStorage.setItem('wakeLockPref', wakeLockRequested);

  if (wakeLockRequested) {
    requestWakeLock();
  } else {
    releaseWakeLock();
  }
});

// Wake Lock herstellen bij terugkeren naar de tab/app
document.addEventListener('visibilitychange', async () => {
  if (wakeLockRequested && wakeLock === null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

// --- TIMER LOGICA ---
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(totalSeconds);
}

function startTimer() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (!isPaused) {
    const mins = parseInt(inputMin.value, 10) || 0;
    const secs = parseInt(inputSec.value, 10) || 0;
    totalSeconds = (mins * 60) + secs;

    if (totalSeconds <= 0) return;

    // Sla de ingevoerde tijd op als voorkeur
    localStorage.setItem('savedMin', inputMin.value);
    localStorage.setItem('savedSec', inputSec.value);
  }

  isPaused = false;
  
  // UI wisselen naar actieve stand
  inputGroup.classList.add('hidden');
  timeDisplay.classList.remove('hidden');
  startBtn.classList.add('hidden');
  pauseBtn.classList.remove('hidden');
  resetBtn.classList.remove('hidden');

  updateDisplay();

  timerInterval = setInterval(() => {
    totalSeconds--;
    updateDisplay();

    if (totalSeconds <= 0) {
      clearInterval(timerInterval);
      playBeep();
      resetTimerUI();
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  isPaused = true;
  pauseBtn.classList.add('hidden');
  startBtn.classList.remove('hidden');
  startBtn.textContent = 'Hervat';
}

function resetTimerUI() {
  clearInterval(timerInterval);
  isPaused = false;
  
  inputGroup.classList.remove('hidden');
  timeDisplay.classList.add('hidden');
  startBtn.classList.remove('hidden');
  startBtn.textContent = 'Start';
  pauseBtn.classList.add('hidden');
  resetBtn.classList.add('hidden');
}

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimerUI);

// --- INSTELLINGEN LADEN UIT LOCALSTORAGE ---
function loadPreferences() {
  const savedMin = localStorage.getItem('savedMin');
  const savedSec = localStorage.getItem('savedSec');
  const savedWakeLock = localStorage.getItem('wakeLockPref');

  if (savedMin !== null) inputMin.value = savedMin;
  if (savedSec !== null) inputSec.value = savedSec;
  
  if (savedWakeLock === 'true') {
    wakeLockRequested = true;
    requestWakeLock();
  }
}

loadPreferences();