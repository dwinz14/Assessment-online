// Konfigurasi
const UJIAN_MENIT = 45; // durasi utama (menit)
const TAMBAHAN_MENIT = 1; // grace period (menit)
const GOOGLE_FORM_EMBED_URL = "https://docs.google.com/forms/d/e/1FAIpQLSfiKg_Ap6CugF2Zz6nGTXZOWm_HmTvB4lWZT4ITt-B2soKeYQ/viewform?usp=header"; // GANTI INI
/* ============================ */

/* ELEMENTS */
const landing = document.getElementById("landing");
const testArea = document.getElementById("testArea");
const formContainer = document.getElementById("formContainer");
const headerTimer = document.getElementById("headerTimer");
const timerVisual = document.getElementById("timerVisual");
const progressFill = document.getElementById("progressFill");
const finishedCard = document.getElementById("finishedCard");

const btnStart = document.getElementById("btnStart");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalOk = document.getElementById("modalOk");
const modalTitle = document.getElementById("modalTitle");
const modalMsg = document.getElementById("modalMsg");

// Back button warning modal elements
const backModalBackdrop = document.getElementById("backModalBackdrop");
const backModalOk = document.getElementById("backModalOk");
const backModalTitle = document.getElementById("backModalTitle");
const backModalMsg = document.getElementById("backModalMsg");

document.getElementById("metaDur").textContent = UJIAN_MENIT;
document.getElementById("metaGrace").textContent = TAMBAHAN_MENIT;

let tickInterval = null;

/* UTIL: format seconds -> MM:SS */
function formatMMSS(sec) {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/* URL param helpers */
function getStartFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const s = params.get("start");
  return s ? parseInt(s, 10) : null;
}
function setStartInUrl(ts) {
  const url = new URL(window.location.href);
  url.searchParams.set("start", String(ts));
  url.searchParams.delete("status"); // status inferred by times
  history.replaceState({}, "", url.toString());
}
function setStatusInUrl(status) {
  const url = new URL(window.location.href);
  url.searchParams.set("status", status);
  history.replaceState({}, "", url.toString());
}

/* Prevent back navigation from test page */
function lockBackNavigation() {
  // Clear browser history and push multiple states
  history.replaceState(null, "", window.location.href);
  for (let i = 0; i < 50; i++) {
    history.pushState({ page: "test", lock: i }, "", window.location.href);
  }

  history.pushState({ page: "test" }, "", window.location.href);
  window.addEventListener("popstate", (e) => {
    // Completely prevent back navigation during test
    e.preventDefault();
    // Show warning modal when back button is pressed
    showBackModal();
    // Keep user on current page by pushing state again
    history.pushState({ page: "test" }, "", window.location.href);
  });
}

/* Modal show/hide */
function showModal(title, msg) {
  modalTitle.textContent = title;
  modalMsg.textContent = msg;
  modalBackdrop.style.display = "flex";
  modalBackdrop.setAttribute("aria-hidden", "false");
}
function hideModal() {
  modalBackdrop.style.display = "none";
  modalBackdrop.setAttribute("aria-hidden", "true");
}

/* Back button warning modal show/hide */
function showBackModal() {
  backModalBackdrop.style.display = "flex";
  backModalBackdrop.setAttribute("aria-hidden", "false");
}
function hideBackModal() {
  backModalBackdrop.style.display = "none";
  backModalBackdrop.setAttribute("aria-hidden", "true");
}

/* Inject form iframe */
function injectForm() {
  formContainer.innerHTML = `<iframe src="${GOOGLE_FORM_EMBED_URL}" title="Soal Ujian (Google Form)"></iframe>`;
  formContainer.style.display = "block";
}

/* Show Test UI */
function enterTestView() {
  landing.style.display = "none";
  testArea.style.display = "block";
  finishedCard.style.display = "none";
  injectForm();
  lockBackNavigation();
}

/* Show finished */
function enterFinishedView() {
  finishedCard.style.display = "block";
  formContainer.style.display = "none";
  document.querySelector(".site-header").style.display = "none";
}

/* Timer loop */
function startTimerLoop() {
  const startTs = getStartFromUrl();
  if (!startTs) return;

  const utamaFinish = startTs + UJIAN_MENIT * 60 * 1000;
  const tambahanFinish = utamaFinish + TAMBAHAN_MENIT * 60 * 1000;

  // clear any existing interval
  if (tickInterval) clearInterval(tickInterval);

  tickInterval = setInterval(() => {
    const now = Date.now();

    // compute overall progress percentage for progress bar
    const totalDuration = (UJIAN_MENIT + TAMBAHAN_MENIT) * 60 * 1000;
    const elapsed = Math.max(0, now - startTs);
    const pct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
    progressFill.style.width = pct + "%";

    if (now < utamaFinish) {
      // in main phase
      const remain = Math.round((utamaFinish - now) / 1000);
      const mmss = formatMMSS(remain);
      headerTimer.textContent = mmss;
      timerVisual.textContent = mmss;

      // color transitions: >10min green, 5-10min normal, <5min warning, <1min danger
      if (remain > 600) {
        timerVisual.className = "timer-pill timer-normal";
      } else if (remain > 300) {
        timerVisual.className = "timer-pill";
      } else if (remain > 60) {
        timerVisual.className = "timer-pill timer-warning";
      } else {
        timerVisual.className = "timer-pill timer-danger";
      }
    } else if (now >= utamaFinish && now < tambahanFinish) {
      // in grace period
      const remain = Math.round((tambahanFinish - now) / 1000);
      const mmss = formatMMSS(remain);
      headerTimer.textContent = mmss;
      timerVisual.textContent = mmss;
      timerVisual.className = "timer-pill timer-danger";
      setStatusInUrl("tambahan");

      // show modal only once per start timestamp
      const warnedKey = "cbt_warned_" + startTs;
      if (!localStorage.getItem(warnedKey)) {
        showModal("Waktu Utama Habis", "⏰ Waktu utama sudah habis. Silakan segera kirim jawaban dalam waktu tambahan.");
        localStorage.setItem(warnedKey, "1");
      }
    } else {
      // time totally finished
      clearInterval(tickInterval);
      headerTimer.textContent = "00:00";
      timerVisual.textContent = "00:00";
      enterFinishedView();
    }
  }, 300);
}

/* Start test (called on button) */
function startTestFlow() {
  if (getStartFromUrl()) {
    // already started in this tab (maybe page reload)
    enterTestView();
    startTimerLoop();
    return;
  }

  const ts = Date.now();
  setStartInUrl(ts);
  // mark started -> optional check later
  localStorage.setItem("cbt_started_" + ts, "1");

  enterTestView();
  startTimerLoop();
}

/* Boot on load */
(function boot() {
  // wire buttons
  btnStart.addEventListener("click", startTestFlow);
  modalOk.addEventListener("click", hideModal);
  backModalOk.addEventListener("click", hideBackModal); // Ensure this line is added only once

  // If the page already has start param -> go straight to test view
  const startTs = getStartFromUrl();
  if (startTs) {
    enterTestView();
    startTimerLoop();
  } else {
    // show landing
    landing.style.display = "block";
    testArea.style.display = "none";
  }

  // When user focuses back to tab, re-evaluate timer (helps if clock changes)
  window.addEventListener("focus", () => {
    if (getStartFromUrl()) startTimerLoop();
  });
})();
