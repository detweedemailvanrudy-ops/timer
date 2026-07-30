// --- ELEMENTEN SELECTEREN ---
const wakeLockBtn = document.getElementById('wakeLockBtn');
const wakeLockStatus = document.getElementById('wakeLockStatus');
const inputGroup = document.getElementById('inputGroup');
const inputMin = document.getElementById('inputMin');
const inputSec = document.getElementById('inputSec');
const timeDisplay = document.getElementById('timeDisplay');
const actionBtn = document.getElementById('actionBtn');
const resetBtn = document.getElementById('resetBtn'); // Nieuw
const progressCircle = document.getElementById('progressCircle');

// --- STATE ---
let wakeLock = null;
let wakeLockRequested = false; 
let timerInterval = null;
let totalSeconds = 0;
let initialTotalSeconds = 0; 
let isPaused = false;
let isRunning = false;

// Web Audio API piepje
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = 880; 
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.6);
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
      console.warn(`Wake Lock mislukt: ${err.message}`);
      updateWakeLockUI(false);
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) wakeLock.release();
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
  localStorage.setItem('wakeLockPref_v2', wakeLockRequested);
  if (wakeLockRequested) requestWakeLock(); else releaseWakeLock();
});

document.addEventListener('visibilitychange', async () => {
  if (wakeLockRequested && wakeLock === null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
});

// --- TIMER LOGICA ---

function updateProgress(secondsLeft) {
  if (initialTotalSeconds === 0) return;
  const percentage = (secondsLeft / initialTotalSeconds) * 100;
  progressCircle.style.strokeDashoffset = 100 - percentage;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(totalSeconds);
  updateProgress(totalSeconds);
}

function handleActionButton() {
  if (!isRunning && !isPaused) {
    startTimer();
  } else if (isRunning && !isPaused) {
    pauseTimer();
  } else if (isPaused) {
    resumeTimer();
  }
}

function startTimer() {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const mins = parseInt(inputMin.value, 10) || 0;
  const secs = parseInt(inputSec.value, 10) || 0;
  totalSeconds = (mins * 60) + secs;

  if (totalSeconds <= 0) return;

  initialTotalSeconds = totalSeconds;
  isRunning = true;
  isPaused = false;
  
  localStorage.setItem('savedMin_v2', inputMin.value);
  localStorage.setItem('savedSec_v2', inputSec.value);

  // UI instellen voor lopende timer
  inputGroup.classList.add('hidden');
  timeDisplay.classList.remove('hidden');
  resetBtn.classList.add('hidden'); // Verberg reset-knop als hij loopt
  
  actionBtn.textContent = 'Pauze';
  actionBtn.classList.remove('btn-primary');
  actionBtn.style.backgroundColor = '#f59e0b'; // Oranje
  actionBtn.style.color = 'white';

  updateDisplay();
  progressCircle.style.transition = 'none'; 
  progressCircle.style.strokeDashoffset = 0;
  setTimeout(() => progressCircle.style.transition = 'stroke-dashoffset 1s linear', 50);

  timerInterval = setInterval(tick, 1000);
}

function tick() {
  totalSeconds--;
  updateDisplay();

  if (totalSeconds <= 0) {
    clearInterval(timerInterval);
    playBeep();
    completeTimer();
  }
}

function pauseTimer() {
  clearInterval(timerInterval);
  isPaused = true;
  actionBtn.textContent = 'Hervat';
  actionBtn.style.backgroundColor = '#10b981'; // Groen
  
  // Toon het reset knopje alleen tijdens pauze
  resetBtn.classList.remove('hidden');
}

function resumeTimer() {
  isPaused = false;
  actionBtn.textContent = 'Pauze';
  actionBtn.style.backgroundColor = '#f59e0b';
  
  // Verberg het reset knopje weer als we verdergaan
  resetBtn.classList.add('hidden');
  
  timerInterval = setInterval(tick, 1000);
}

function completeTimer() {
  isRunning = false;
  isPaused = false;
  resetUI();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  isPaused = false;
  resetUI();
}

function resetUI() {
  inputGroup.classList.remove('hidden');
  timeDisplay.classList.add('hidden');
  resetBtn.classList.add('hidden');
  
  actionBtn.textContent = 'Start';
  actionBtn.classList.add('btn-primary');
  actionBtn.style.backgroundColor = ''; 
  actionBtn.style.color = '';
  
  progressCircle.style.transition = 'none';
  progressCircle.style.strokeDashoffset = 0;
}

// Events
actionBtn.addEventListener('click', handleActionButton);
resetBtn.addEventListener('click', resetTimer); // Klik op het kleine knopje = reset

// --- INSTELLINGEN LADEN ---
function loadPreferences() {
  const savedMin = localStorage.getItem('savedMin_v2');
  const savedSec = localStorage.getItem('savedSec_v2');
  const savedWakeLock = localStorage.getItem('wakeLockPref_v2');

  if (savedMin !== null) inputMin.value = savedMin;
  if (savedSec !== null) inputSec.value = savedSec;
  
  if (savedWakeLock === 'true') {
    wakeLockRequested = true;
    requestWakeLock();
  }
}

loadPreferences();