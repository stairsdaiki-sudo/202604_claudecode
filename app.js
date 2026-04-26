const STORAGE_KEY = "simple-alarm-app:alarms";

const currentTimeEl = document.getElementById("current-time");
const currentDateEl = document.getElementById("current-date");
const alarmTimeInput = document.getElementById("alarm-time");
const alarmLabelInput = document.getElementById("alarm-label");
const addAlarmBtn = document.getElementById("add-alarm");
const alarmListEl = document.getElementById("alarm-list");
const emptyMessageEl = document.getElementById("empty-message");
const ringingOverlay = document.getElementById("ringing-overlay");
const ringingLabel = document.getElementById("ringing-label");
const stopRingingBtn = document.getElementById("stop-ringing");

let alarms = loadAlarms();
let lastTriggerKey = "";
let audioCtx = null;
let oscillator = null;
let gainNode = null;

function loadAlarms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAlarms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDate(date) {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} (${days[date.getDay()]})`;
}

function renderClock() {
  const now = new Date();
  currentTimeEl.textContent = formatTime(now);
  currentDateEl.textContent = formatDate(now);
}

function renderAlarms() {
  alarmListEl.innerHTML = "";
  if (alarms.length === 0) {
    emptyMessageEl.classList.remove("hidden");
    return;
  }
  emptyMessageEl.classList.add("hidden");

  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time));
  for (const alarm of sorted) {
    const li = document.createElement("li");
    li.className = "alarm-item" + (alarm.enabled ? "" : " disabled");

    const info = document.createElement("div");
    const timeEl = document.createElement("span");
    timeEl.className = "alarm-time";
    timeEl.textContent = alarm.time;
    info.appendChild(timeEl);

    if (alarm.label) {
      const labelEl = document.createElement("span");
      labelEl.className = "alarm-label";
      labelEl.textContent = alarm.label;
      info.appendChild(labelEl);
    }

    const actions = document.createElement("div");
    actions.className = "alarm-actions";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "toggle";
    toggle.checked = alarm.enabled;
    toggle.addEventListener("change", () => {
      alarm.enabled = toggle.checked;
      saveAlarms();
      renderAlarms();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.type = "button";
    deleteBtn.textContent = "✕";
    deleteBtn.setAttribute("aria-label", "削除");
    deleteBtn.addEventListener("click", () => {
      alarms = alarms.filter((a) => a.id !== alarm.id);
      saveAlarms();
      renderAlarms();
    });

    actions.appendChild(toggle);
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(actions);
    alarmListEl.appendChild(li);
  }
}

function addAlarm() {
  const time = alarmTimeInput.value;
  if (!time) {
    alert("時刻を選択してください。");
    return;
  }
  const normalized = time.length === 5 ? `${time}:00` : time;
  const label = alarmLabelInput.value.trim();

  alarms.push({
    id: crypto.randomUUID(),
    time: normalized,
    label,
    enabled: true,
  });
  saveAlarms();
  renderAlarms();
  alarmLabelInput.value = "";
}

function checkAlarms() {
  const now = new Date();
  const current = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const minuteKey = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  for (const alarm of alarms) {
    if (!alarm.enabled) continue;
    const alarmMinute = alarm.time.slice(0, 5);
    if (alarmMinute !== minuteKey) continue;

    const triggerKey = `${alarm.id}:${minuteKey}`;
    if (triggerKey === lastTriggerKey) continue;

    if (now.getSeconds() === 0 || alarm.time === current) {
      lastTriggerKey = triggerKey;
      triggerAlarm(alarm);
      break;
    }
  }
}

function triggerAlarm(alarm) {
  ringingLabel.textContent = alarm.label || "時間です";
  ringingOverlay.classList.remove("hidden");
  startBeep();
}

function startBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode).connect(audioCtx.destination);
    oscillator.start();

    const now = audioCtx.currentTime;
    for (let i = 0; i < 30; i++) {
      const t = now + i * 0.6;
      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.exponentialRampToValueAtTime(0.4, t + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    }
  } catch (e) {
    console.warn("音声再生に失敗しました", e);
  }
}

function stopBeep() {
  try {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  } catch {
    /* noop */
  }
}

stopRingingBtn.addEventListener("click", () => {
  ringingOverlay.classList.add("hidden");
  stopBeep();
});

addAlarmBtn.addEventListener("click", addAlarm);

renderClock();
renderAlarms();
setInterval(() => {
  renderClock();
  checkAlarms();
}, 500);
