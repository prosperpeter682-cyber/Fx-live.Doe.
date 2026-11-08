(() => {
  "use strict";

  const C = Object.assign(
    { provider: "frankfurter", refreshSeconds: 60, currencies: ["EUR"], twelveDataProxy: "", twelveDataKey: "" },
    window.CONFIG
  );

  const NAMES = {
    AUD: "Australian dollar", BGN: "Bulgarian lev", BRL: "Brazilian real", CAD: "Canadian dollar",
    CHF: "Swiss franc", CNY: "Chinese yuan", CZK: "Czech koruna", DKK: "Danish krone",
    EUR: "Euro", GBP: "British pound", HKD: "Hong Kong dollar", HUF: "Hungarian forint",
    IDR: "Indonesian rupiah", ILS: "Israeli shekel", INR: "Indian rupee", ISK: "Icelandic króna",
    JPY: "Japanese yen", KRW: "South Korean won", MXN: "Mexican peso", MYR: "Malaysian ringgit",
    NOK: "Norwegian krone", NZD: "New Zealand dollar", PHP: "Philippine peso", PLN: "Polish złoty",
    RON: "Romanian leu", SEK: "Swedish krona", SGD: "Singapore dollar", THB: "Thai baht",
    TRY: "Turkish lira", ZAR: "South African rand", NGN: "Nigerian naira", EGP: "Egyptian pound",
    KES: "Kenyan shilling", GHS: "Ghanaian cedi", AED: "UAE dirham", SAR: "Saudi riyal"
  };

  const STORE = "fxlive.v1";
  const $ = (id) => document.getElementById(id);
  const list = $("list"), statusEl = $("status"), amountEl = $("amount");
  const refreshBtn = $("refresh"), installBtn = $("install");

  // ---- saved state (so the app shows something instantly and when offline)
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (_) {}
  let state = saved.provider === C.provider ? (saved.state || {}) : {};
  let updatedAt = saved.provider === C.provider ? saved.updatedAt : null;
  let note = saved.provider === C.provider ? saved.note : "";
  if (saved.amount) amountEl.value = saved.amount;

  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        provider: C.provider, state, updatedAt, note, amount: amountEl.value
      }));
    } catch (_) {}
  }

  // ---- data providers: each returns { rates: { EUR: { price, base, series[] } }, note }
  async function fetchFrankfurter() {
    const start = new Date(Date.now() - 35 * 864e5).toISOString().slice(0, 10);
    const url = `https://api.frankfurter.dev/v1/${start}..?base=USD&symbols=${C.currencies.join(",")}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Rate service returned ${r.status}`);
    const d = await r.json();
    const days = Object.keys(d.rates).sort();
    const rates = {};
    C.currencies.forEach((c) => {
      const series = days.map((day) => d.rates[day][c]).filter((v) => v != null);
      if (!series.length) return;
      rates[c] = {
        price: series[series.length - 1],
        base: series.length > 1 ? series[series.length - 2] : null,
        series
      };
    });
    return { rates, note: `Daily reference rates from ${days[days.length - 1]} (ECB)` };
  }

  async function fetchTwelveData() {
    if (!C.twelveDataProxy && !C.twelveDataKey) {
      throw new Error("Add a Twelve Data key or proxy URL in config.js");
    }
    const symbols = C.currencies.map((c) => `USD/${c}`).join(",");
    const url = C.twelveDataProxy
      ? `${C.twelveDataProxy}?symbol=${encodeURIComponent(symbols)}`
      : `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbols)}&apikey=${encodeURIComponent(C.twelveDataKey)}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.status === "error") throw new Error(d.message || "Twelve Data returned an error");

    const today = new Date().toDateString();
    const rates = {};
    C.currencies.forEach((c) => {
      const entry = C.currencies.length === 1 ? d : d[`USD/${c}`];
      const p = entry ? parseFloat(entry.price) : NaN;
      if (!p) return;
      const old = state[c];
      const sameDay = old && old.day === today;
      rates[c] = {
        price: p,
        base: sameDay ? old.base : p,   // change is measured from the first price seen today
        day: today,
        series: ((old && old.series) || []).concat(p).slice(-60)
      };
    });
    return { rates, note: "Live rates (Twelve Data)" };
  }

  // ---- formatting
  const decimalsFor = (v) => (v >= 100 ? 2 : v >= 10 ? 3 : 4);
  function fmt(v) {
    const d = decimalsFor(v);
    return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function sparkPoints(series) {
    if (!series || series.length < 2) return "";
    const min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
    const pts = series.map((v, i) =>
      `${((i / (series.length - 1)) * 100).toFixed(1)},${(26 - ((v - min) / span) * 24).toFixed(1)}`
    ).join(" ");
    return `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  // ---- rendering
  function buildRows() {
    list.innerHTML = "";
    C.currencies.forEach((c) => {
      const li = document.createElement("li");
      li.className = "row";
      li.dataset.code = c;
      li.innerHTML = `
        <div class="who"><span class="code">${c}</span><span class="name">${NAMES[c] || ""}</span></div>
        <svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div class="quote"><span class="rate">–</span><span class="chg"></span></div>`;
      list.appendChild(li);
    });
  }

  function paintRow(code, flashFrom) {
    const e = state[code];
    const row = list.querySelector(`[data-code="${code}"]`);
    if (!e || !row) return;

    const amount = parseFloat(amountEl.value) || 0;
    row.querySelector(".rate").textContent = fmt(amount * e.price);
    row.querySelector(".spark").innerHTML = sparkPoints(e.series);

    const chg = row.querySelector(".chg");
    row.classList.remove("up", "down");
    if (e.base) {
      const pct = ((e.price - e.base) / e.base) * 100;
      const dir = pct > 0.0005 ? "up" : pct < -0.0005 ? "down" : "";
      row.classList.toggle("up", dir === "up");
      row.classList.toggle("down", dir === "down");
      chg.textContent = `${dir === "up" ? "▲" : dir === "down" ? "▼" : ""} ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`.trim();
    } else {
      chg.textContent = "";
    }

    if (flashFrom != null && flashFrom !== e.price) {
      row.classList.remove("tick-up", "tick-down");
      void row.offsetWidth; // restart the animation
      row.classList.add(e.price > flashFrom ? "tick-up" : "tick-down");
    }
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle("error", !!isError);
  }
  const clock = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });

  // ---- loading
  async function load() {
    refreshBtn.disabled = true;
    const before = {};
    Object.keys(state).forEach((c) => (before[c] = state[c].price));
    try {
      const res = C.provider === "twelvedata" ? await fetchTwelveData() : await fetchFrankfurter();
      state = Object.assign({}, state, res.rates);
      updatedAt = Date.now();
      note = res.note;
      persist();
      Object.keys(res.rates).forEach((c) => paintRow(c, before[c]));
      setStatus(`Updated ${clock(updatedAt)} · ${note}`);
    } catch (err) {
      const when = updatedAt ? ` Showing rates saved at ${clock(updatedAt)}.` : "";
      setStatus(`${err.message}.${when}`, true);
      if (!Object.keys(state).length) {
        list.innerHTML = `<li class="empty">No rates yet. Check your connection, then tap Refresh now.</li>`;
      }
    } finally {
      refreshBtn.disabled = false;
    }
  }

  // ---- timers: only poll while the app is on screen
  let timer = null;
  function start() {
    stop();
    timer = setInterval(load, Math.max(10, C.refreshSeconds) * 1000);
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else { load(); start(); }
  });

  // ---- events
  amountEl.addEventListener("input", () => {
    Object.keys(state).forEach((c) => paintRow(c));
    persist();
  });
  refreshBtn.addEventListener("click", load);

  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    installBtn.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // ---- go
  buildRows();
  Object.keys(state).forEach((c) => paintRow(c));
  if (updatedAt) setStatus(`Saved rates from ${clock(updatedAt)} · refreshing…`);
  load();
  start();
})();
