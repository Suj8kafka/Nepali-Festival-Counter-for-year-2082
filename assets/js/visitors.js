/* Shared historical visitor totals, independent of the festival application. */
(() => {
  const outputs = document.querySelectorAll("[data-total-visits]");
  if (!outputs.length) return;
  const CACHE_KEY = "utsav-total-visits";
  let hasLiveCount = false;
  let cachedCount = null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached !== null && /^\d+$/.test(cached) && Number.isSafeInteger(Number(cached))) cachedCount = Number(cached);
  } catch {}
  const display = (text, cached = false) => outputs.forEach((output) => {
    output.textContent = text;
    output.title = cached ? "Last recorded total visits" : "";
  });
  const displayCount = (count) => {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid visitor count.");
    hasLiveCount = true;
    display(count.toLocaleString());
    try { localStorage.setItem(CACHE_KEY, String(count)); } catch {}
  };
  const unavailable = () => {
    if (!hasLiveCount) display(cachedCount !== null ? cachedCount.toLocaleString() : "Unavailable", cachedCount !== null);
  };
  display(cachedCount !== null ? cachedCount.toLocaleString() : "Loading…", cachedCount !== null);
  if (location.protocol === "file:" || !navigator.onLine) {
    display(cachedCount !== null ? cachedCount.toLocaleString() : "Offline", cachedCount !== null);
    return;
  }
  const loadScript = (url) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => reject(new Error("Visitor SDK timed out.")), 8_000);
    script.src = url; script.async = true;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); reject(new Error("Visitor SDK unavailable.")); };
    document.head.appendChild(script);
  });
  const hashIP = (ip) => {
    let hash = 0;
    for (let index = 0; index < ip.length; index += 1) hash = ((hash << 5) - hash + ip.charCodeAt(index)) | 0;
    return "v" + Math.abs(hash);
  };
  async function loadTotalVisits() {
    if (!window.firebase) await loadScript("https://www.gstatic.com/firebasejs/10.5.0/firebase-app-compat.js");
    if (!window.firebase.firestore) await loadScript("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore-compat.js");
    const firebase = window.firebase;
    const config = {
      apiKey: "AIzaSyDHe5M87mhjd51czW1wbrdb_HSDP2g-bXE",
      authDomain: "website-visit-counter-f256f.firebaseapp.com",
      projectId: "website-visit-counter-f256f",
      storageBucket: "website-visit-counter-f256f.firebasestorage.app",
      messagingSenderId: "1079159075631",
      appId: "1:1079159075631:web:db618ab0b83af3a809e7da",
      measurementId: "G-093QF1PMS6",
    };
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
    const visitors = app.firestore().collection("visitors");
    // Read the existing total before attempting visitor registration. An IP
    // service or write failure must never hide an otherwise readable total.
    displayCount((await visitors.get()).size);
    try {
      const response = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) return;
      const { ip } = await response.json();
      if (!ip) return;
      const key = hashIP(ip);
      await visitors.doc(key).set({ ip: key, timestamp: Date.now() }, { merge: true });
      displayCount((await visitors.get()).size);
    } catch { /* Keep the total already read from the shared collection. */ }
  }
  const timeout = setTimeout(unavailable, 10_000);
  loadTotalVisits().catch(unavailable).finally(() => clearTimeout(timeout));
})();

