// --- ELEMENTEN SELECTEREN ---
const wakeLockBtn = document.getElementById('wakeLockBtn');
const wakeLockStatus = document.getElementById('wakeLockStatus');
const inputGroup = document.getElementById('inputGroup');
const inputMin = document.getElementById('inputMin');
const inputSec = document.getElementById('inputSec');
const timeDisplay = document.getElementById('timeDisplay');
const actionBtn = document.getElementById('actionBtn');
const resetBtn = document.getElementById('resetBtn');
const progressCircle = document.getElementById('progressCircle');

// --- STATE ---
let wakeLock = null;
let wakeLockRequested = false; 
let timerInterval = null;
let totalSeconds = 0;
let initialTotalSeconds = 0; 
let isPaused = false;
let isRunning = false;

// --- AUDIO LOGICA (NIEUW) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let alarmInterval = null;
let alarmTimeout = null;

function playSingleBeep() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.value = 880; 
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3); // Kortere, strakke piep
}

// Start een repeterend alarm van max 30 sec
function startAlarm() {
  playSingleBeep(); // Direct de eerste piep
  
  // Herhaal de piep elke seconde
  alarmInterval = setInterval(() => {
    playSingleBeep();
  }, 1000);

  // Stop het alarm automatisch na 30 seconden (30.000 ms)
  alarmTimeout = setTimeout(() => {
    stopAlarm();
  }, 30000);
}

// Stop het alarm handmatig of automatisch
function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (alarmTimeout) {
    clearTimeout(alarmTimeout);
    alarmTimeout = null;
  }
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
  // Als het alarm nog piept, stopt een klik op de knop direct het geluid
  stopAlarm();

  if (!isRunning && !isPaused) {
    startTimer();
  } else if (isRunning && !isPaused) {
    pauseTimer();
  } else if (isPaused) {
    resumeTimer();
  }
}

function startTimer() {
  stopAlarm(); // Zeker weten dat eventueel oud alarm uit is
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

  inputGroup.classList.add('hidden');
  timeDisplay.classList.remove('hidden');
  resetBtn.classList.add('hidden');
  
  actionBtn.textContent = 'Pauze';
  actionBtn.classList.remove('btn-primary');
  actionBtn.style.backgroundColor = '#f59e0b';
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
    startAlarm(); // Start de 30-seconden pieploop
    completeTimer();
  }
}

function pauseTimer() {
  clearInterval(timerInterval);
  isPaused = true;
  actionBtn.textContent = 'Hervat';
  actionBtn.style.backgroundColor = '#10b981';
  resetBtn.classList.remove('hidden');
}

function resumeTimer() {
  isPaused = false;
  actionBtn.textContent = 'Pauze';
  actionBtn.style.backgroundColor = '#f59e0b';
  resetBtn.classList.add('hidden');
  timerInterval = setInterval(tick, 1000);
}

function completeTimer() {
  isRunning = false;
  isPaused = false;
  resetUI();
  
  // Verander knoptekst tijdelijk naar "OK" of "Stop Alarm" als het alarm afgaat
  actionBtn.textContent = 'OK';
}

function resetTimer() {
  stopAlarm(); // Stop ook het geluid bij een reset
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
resetBtn.addEventListener('click', resetTimer);

// Klikken op het hele scherm stopt het alarm ook voor het gemak
document.addEventListener('click', (e) => {
  // Voorkom dubbele triggering als we specifiek op de actieknop drukken
  if (alarmInterval && e.target !== actionBtn) {
    stopAlarm();
  }
});

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