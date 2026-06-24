const SETTINGS_KEY = "rtlFixerSettings";
const BOOKMARKS_KEY = "rtlFixerBookmarks";
const DEFAULTS = {
  enabled: true, disabledSites: [], fontMode: "off", fontSize: 0, lineHeight: 0,
  typingFix: true, halfSpace: true, digits: "off", selectionToolbar: true, shortcuts: true,
  focusMode: false, bionic: false, counter: true,
};

let settings = { ...DEFAULTS };
let host = "", tabId = null, booted = false;

const $ = (id) => document.getElementById(id);
const faNum = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

/* ---------- boot ---------- */
chrome.storage.sync.get(SETTINGS_KEY, (data) => {
  settings = Object.assign({}, DEFAULTS, data[SETTINGS_KEY] || {});
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    tabId = tabs[0] && tabs[0].id;
    if (tabId != null) {
      try {
        chrome.tabs.sendMessage(tabId, { type: "getHost" }, (res) => {
          host = chrome.runtime.lastError || !res ? "" : res.host || "";
          render(true);
        });
      } catch (_) { render(true); }
    } else render(true);
  });
});

function save() { chrome.storage.sync.set({ [SETTINGS_KEY]: settings }); }

/* ---------- render ---------- */
function render(first) {
  // hero preview
  const prev = $("preview"), sample = $("sample");
  prev.classList.toggle("on", settings.enabled);
  sample.style.fontFamily = settings.fontMode === "vazirmatn" ? "'Vazirmatn',Tahoma,sans-serif" : "";
  sample.style.fontSize = settings.fontSize ? settings.fontSize + "px" : "";
  sample.style.lineHeight = settings.lineHeight ? settings.lineHeight : "";

  // status
  $("status").classList.toggle("live", settings.enabled);
  $("statusText").textContent = settings.enabled ? "فعال" : "خاموش";
  $("statusSub").textContent = settings.enabled ? "راست‌چین روشن است" : "همه‌چیز غیرفعال است";
  $("enabled").checked = settings.enabled;

  // site chip
  const supported = !!host;
  $("siteHost").textContent = supported ? host : "صفحه‌ی پشتیبانی‌نشده";
  const onHere = settings.enabled && supported && !settings.disabledSites.includes(host);
  const st = $("siteState");
  st.textContent = !supported ? "—" : onHere ? "فعال" : "خاموش";
  st.className = "s " + (onHere ? "on" : "off");
  $("siteChip").disabled = !settings.enabled || !supported;

  // typography
  $("font").checked = settings.fontMode === "vazirmatn";
  $("sizeOn").checked = settings.fontSize > 0;
  $("size").disabled = !settings.fontSize;
  $("size").value = settings.fontSize || 17;
  $("sizeVal").textContent = faNum($("size").value);
  $("lhOn").checked = settings.lineHeight > 0;
  $("lh").disabled = !settings.lineHeight;
  $("lh").value = Math.round((settings.lineHeight || 1.9) * 10);
  $("lhVal").textContent = faNum(($("lh").value / 10).toFixed(1)).replace(".", "٫");

  // typing + tools
  $("typingFix").checked = settings.typingFix;
  $("halfSpace").checked = settings.halfSpace;
  $("selectionToolbar").checked = settings.selectionToolbar;
  $("shortcuts").checked = settings.shortcuts;
  $("focusMode").checked = settings.focusMode;
  $("bionic").checked = settings.bionic;
  $("counter").checked = settings.counter;
  document.querySelectorAll("#digits button").forEach((b) =>
    b.classList.toggle("active", b.dataset.v === settings.digits));

  // export
  $("expMd").disabled = !supported;
  $("expTxt").disabled = !supported;
  $("expPdf").disabled = !supported;
  if (!supported && !first) $("expHint").textContent = "";
  booted = true;
}

function flipPreview() {
  const s = $("sample");
  s.style.setProperty("--flipdir", settings.enabled ? "14px" : "-14px");
  s.classList.remove("flip"); void s.offsetWidth; s.classList.add("flip");
}

/* ---------- wiring ---------- */
$("enabled").addEventListener("change", (e) => { settings.enabled = e.target.checked; save(); render(); flipPreview(); });
$("siteChip").addEventListener("click", () => {
  if (!host || !settings.enabled) return;
  const s = new Set(settings.disabledSites);
  s.has(host) ? s.delete(host) : s.add(host);
  settings.disabledSites = [...s]; save(); render();
});
$("font").addEventListener("change", (e) => { settings.fontMode = e.target.checked ? "vazirmatn" : "off"; save(); render(); flipPreview(); });
$("sizeOn").addEventListener("change", (e) => { settings.fontSize = e.target.checked ? (+$("size").value || 17) : 0; save(); render(); });
$("size").addEventListener("input", (e) => { settings.fontSize = +e.target.value; $("sizeVal").textContent = faNum(e.target.value); $("sample").style.fontSize = e.target.value + "px"; save(); });
$("lhOn").addEventListener("change", (e) => { settings.lineHeight = e.target.checked ? (+$("lh").value / 10) : 0; save(); render(); });
$("lh").addEventListener("input", (e) => { settings.lineHeight = +e.target.value / 10; $("lhVal").textContent = faNum((e.target.value / 10).toFixed(1)).replace(".", "٫"); $("sample").style.lineHeight = settings.lineHeight; save(); });
$("typingFix").addEventListener("change", (e) => { settings.typingFix = e.target.checked; save(); });
$("halfSpace").addEventListener("change", (e) => { settings.halfSpace = e.target.checked; save(); });
$("selectionToolbar").addEventListener("change", (e) => { settings.selectionToolbar = e.target.checked; save(); });
$("shortcuts").addEventListener("change", (e) => { settings.shortcuts = e.target.checked; save(); });
$("focusMode").addEventListener("change", (e) => { settings.focusMode = e.target.checked; save(); });
$("bionic").addEventListener("change", (e) => { settings.bionic = e.target.checked; save(); });
$("counter").addEventListener("change", (e) => { settings.counter = e.target.checked; save(); });
document.querySelectorAll("#digits button").forEach((b) =>
  b.addEventListener("click", () => { settings.digits = b.dataset.v; save(); render(); }));

$("expMd").addEventListener("click", () => doExport("md"));
$("expTxt").addEventListener("click", () => doExport("txt"));
$("expPdf").addEventListener("click", () => doExport("pdf"));
function doExport(format) {
  if (tabId == null || !host) return;
  chrome.tabs.sendMessage(tabId, { type: "export", format }, () => {
    if (chrome.runtime.lastError) $("expHint").textContent = "این صفحه پشتیبانی نمی‌شود.";
    else { $("expHint").textContent = "فایل دانلود شد ✓"; setTimeout(() => ($("expHint").textContent = ""), 2200); }
  });
}

/* ---------- tab bar ---------- */
document.querySelectorAll(".tabbar button").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".tabbar button").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const w = t.dataset.screen;
    $("screen-settings").hidden = w !== "settings";
    $("screen-marks").hidden = w !== "marks";
    $("screen-prompts").hidden = w !== "prompts";
    $("screen-about").hidden = w !== "about";
    if (w === "marks") renderMarks();
    if (w === "prompts") renderPrompts();
  }));

/* ---------- bookmarks ---------- */
function svg(p) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}
function renderMarks() {
  chrome.storage.local.get(BOOKMARKS_KEY, (data) => {
    const list = data[BOOKMARKS_KEY] || [];
    const wrap = $("marksList");
    wrap.innerHTML = "";
    $("marksEmpty").hidden = list.length > 0;
    list.forEach((m, i) => {
      const div = document.createElement("div");
      div.className = "mark";
      const body = document.createElement("p");
      body.className = "body";
      body.textContent = m.text;
      const meta = document.createElement("div");
      meta.className = "meta";
      const hostEl = document.createElement("span");
      hostEl.className = "host";
      hostEl.textContent = m.host || "";
      const acts = document.createElement("div");
      acts.className = "acts";
      const copy = document.createElement("button");
      copy.title = "کپی";
      copy.innerHTML = svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>');
      copy.addEventListener("click", () => {
        navigator.clipboard.writeText(m.text).then(() => {
          copy.innerHTML = svg('<path d="M5 12l5 5 9-11"/>');
          setTimeout(() => (copy.innerHTML = svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>')), 1000);
        });
      });
      const del = document.createElement("button");
      del.title = "حذف";
      del.innerHTML = svg('<path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M6 7l1 13h10l1-13"/>');
      del.addEventListener("click", () => {
        list.splice(i, 1);
        chrome.storage.local.set({ [BOOKMARKS_KEY]: list }, renderMarks);
      });
      acts.append(copy, del);
      meta.append(hostEl, acts);
      div.append(body, meta);
      wrap.appendChild(div);
    });
  });
}

/* ---------- prompts ---------- */
const PROMPTS_KEY = "rtlFixerPrompts";
$("pAdd").addEventListener("click", () => {
  const text = $("pText").value.trim();
  if (!text) return;
  const name = ($("pName").value.trim() || text.slice(0, 40));
  chrome.storage.local.get(PROMPTS_KEY, (d) => {
    const l = d[PROMPTS_KEY] || [];
    l.unshift({ name, text, ts: Date.now() });
    chrome.storage.local.set({ [PROMPTS_KEY]: l.slice(0, 100) }, () => {
      $("pName").value = ""; $("pText").value = ""; renderPrompts();
    });
  });
});
function renderPrompts() {
  chrome.storage.local.get(PROMPTS_KEY, (d) => {
    const l = d[PROMPTS_KEY] || [];
    const wrap = $("promptsList");
    wrap.innerHTML = "";
    $("promptsEmpty").hidden = l.length > 0;
    l.forEach((p, i) => {
      const div = document.createElement("div");
      div.className = "prompt";
      const nm = document.createElement("p"); nm.className = "pn"; nm.textContent = p.name;
      const bd = document.createElement("p"); bd.className = "pb"; bd.textContent = p.text;
      const meta = document.createElement("div"); meta.className = "meta";
      const ins = document.createElement("button"); ins.className = "ins"; ins.textContent = "درج در چت";
      ins.addEventListener("click", () => {
        if (tabId == null || !host) { ins.textContent = "صفحه‌ی چت نیست"; setTimeout(() => (ins.textContent = "درج در چت"), 1400); return; }
        chrome.tabs.sendMessage(tabId, { type: "insertPrompt", text: p.text }, (res) => {
          ins.textContent = chrome.runtime.lastError || !res || !res.ok ? "نشد" : "درج شد ✓";
          setTimeout(() => (ins.textContent = "درج در چت"), 1400);
        });
      });
      const acts = document.createElement("div"); acts.className = "acts";
      const copy = document.createElement("button"); copy.title = "کپی";
      copy.innerHTML = svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>');
      copy.addEventListener("click", () => navigator.clipboard.writeText(p.text).then(() => {
        copy.innerHTML = svg('<path d="M5 12l5 5 9-11"/>');
        setTimeout(() => (copy.innerHTML = svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h8"/>')), 1000);
      }));
      const del = document.createElement("button"); del.title = "حذف";
      del.innerHTML = svg('<path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M6 7l1 13h10l1-13"/>');
      del.addEventListener("click", () => { l.splice(i, 1); chrome.storage.local.set({ [PROMPTS_KEY]: l }, renderPrompts); });
      acts.append(copy, del);
      meta.append(ins, acts);
      div.append(nm, bd, meta);
      wrap.appendChild(div);
    });
  });
}
