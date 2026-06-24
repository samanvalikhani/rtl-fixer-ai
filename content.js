/* ============================================================
 *  راست‌چین‌ساز هوش مصنوعی — content.js  (v2.2)
 *  RTL + typography + typing fixes + digits + selection bar +
 *  export(md/txt/pdf) + shortcuts + prompt library + normalizer
 *  + voice dictation + in-chat search + focus mode + bionic +
 *  word counter.  Zero extra permissions: only DOM + storage.
 * ============================================================ */
(() => {
  "use strict";

  const SETTINGS_KEY = "rtlFixerSettings";
  const BOOKMARKS_KEY = "rtlFixerBookmarks";
  const HOST = location.hostname;
  const UI_ID = "rtlfix-ui";

  const DEFAULTS = {
    enabled: true, disabledSites: [],
    fontMode: "off", fontSize: 0, lineHeight: 0,
    typingFix: true, halfSpace: true, digits: "off",
    selectionToolbar: true, shortcuts: true,
    focusMode: false, bionic: false, counter: true,
  };
  let settings = { ...DEFAULTS };
  let lastEditable = null;

  /* ---------------- RTL detection ---------------- */
  const RTL_TEST = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  const RTL_GLOBAL = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
  const LTR_GLOBAL = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g;

  const SKIP_INSIDE = "code, pre, kbd, samp, script, style, svg, math, #" + UI_ID + ", .rtlfix-ui";
  const TEXT_SELECTOR =
    "p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, dd, dt, figcaption, summary, span, a, label, button, div";
  const INPUT_SELECTOR =
    'textarea, [contenteditable="true"], [contenteditable=""], input[type="text"], input[type="search"]';

  const touched = new Set();

  function isRTLText(t) {
    if (!t || !RTL_TEST.test(t)) return false;
    const r = (t.match(RTL_GLOBAL) || []).length;
    const l = (t.match(LTR_GLOBAL) || []).length;
    return r >= l;
  }
  function ownText(el) {
    let t = "";
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    return t;
  }
  function siteDisabled() {
    return !settings.enabled || settings.disabledSites.includes(HOST);
  }
  function markRTL(el) {
    el.classList.add("rtlfix-rtl");
    el.setAttribute("dir", "auto");
    touched.add(el);
  }
  function markInput(el) {
    if (el.dataset.rtlfixInput) return;
    el.setAttribute("dir", "auto");
    el.dataset.rtlfixInput = "1";
    touched.add(el);
  }
  function unmarkAll() {
    touched.forEach((el) => {
      el.classList.remove("rtlfix-rtl");
      if (el.dataset.rtlfixInput) delete el.dataset.rtlfixInput;
      if (el.getAttribute("dir") === "auto") el.removeAttribute("dir");
    });
    touched.clear();
  }

  /* ---------------- Digits ---------------- */
  const FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";
  function convertDigits(el) {
    if (settings.digits === "off") return;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !/[0-9۰-۹٠-٩]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (n.parentElement && n.parentElement.closest("code, pre, a")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = w.nextNode())) {
      let s = n.nodeValue;
      if (settings.digits === "fa2en")
        s = s.replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => AR.indexOf(d));
      else s = s.replace(/[0-9]/g, (d) => FA[+d]);
      if (s !== n.nodeValue) n.nodeValue = s;
    }
  }

  /* ---------------- Bionic ---------------- */
  function applyBionic(el) {
    if (el.dataset.rtlfixBionic) return;
    el.dataset.rtlfixBionic = "1";
    for (const node of [...el.childNodes]) {
      if (node.nodeType !== 3 || !RTL_TEST.test(node.nodeValue)) continue;
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((tok) => {
        if (/^\s*$/.test(tok) || tok.length < 2) { frag.appendChild(document.createTextNode(tok)); return; }
        const k = Math.ceil(tok.length / 2);
        const b = document.createElement("b");
        b.className = "rtlfix-bionic rtlfix-ui";
        b.textContent = tok.slice(0, k);
        frag.appendChild(b);
        frag.appendChild(document.createTextNode(tok.slice(k)));
      });
      node.parentNode.replaceChild(frag, node);
    }
  }

  /* ---------------- Process subtree ---------------- */
  function processSubtree(root) {
    if (siteDisabled() || !root || !root.querySelectorAll) return;
    const els = root.querySelectorAll(TEXT_SELECTOR);
    for (const el of els) {
      if (el.closest(SKIP_INSIDE)) continue;
      if (isRTLText(ownText(el))) {
        markRTL(el);
        convertDigits(el);
        if (settings.bionic) applyBionic(el);
      }
    }
    if (root.matches && root.matches(TEXT_SELECTOR) && !root.closest(SKIP_INSIDE) && isRTLText(ownText(root))) {
      markRTL(root); convertDigits(root); if (settings.bionic) applyBionic(root);
    }
    const inputs = root.querySelectorAll(INPUT_SELECTOR);
    for (const inp of inputs) if (!inp.closest(".rtlfix-ui")) markInput(inp);
    if (root.matches && root.matches(INPUT_SELECTOR) && !root.closest(".rtlfix-ui")) markInput(root);
  }

  /* ---------------- Typography ---------------- */
  function injectFontFace() {
    if (document.getElementById("rtlfix-fontface")) return;
    const u = (w) => chrome.runtime.getURL("fonts/Vazirmatn-" + w + ".woff2");
    const s = document.createElement("style");
    s.id = "rtlfix-fontface";
    s.textContent =
      `@font-face{font-family:'RTLFixer Vazirmatn';src:url('${u("Regular")}') format('woff2');font-weight:400;font-display:swap;}` +
      `@font-face{font-family:'RTLFixer Vazirmatn';src:url('${u("Medium")}') format('woff2');font-weight:500;font-display:swap;}` +
      `@font-face{font-family:'RTLFixer Vazirmatn';src:url('${u("Bold")}') format('woff2');font-weight:700;font-display:swap;}`;
    (document.head || document.documentElement).appendChild(s);
  }
  function applyTypography() {
    const de = document.documentElement;
    de.classList.toggle("rtlfix-font", settings.fontMode === "vazirmatn");
    if (settings.fontSize) { de.style.setProperty("--rtlfix-size", settings.fontSize + "px"); de.classList.add("rtlfix-size"); }
    else de.classList.remove("rtlfix-size");
    if (settings.lineHeight) { de.style.setProperty("--rtlfix-lh", String(settings.lineHeight)); de.classList.add("rtlfix-lh"); }
    else de.classList.remove("rtlfix-lh");
    de.classList.toggle("rtlfix-focus", settings.focusMode && !siteDisabled());
  }

  /* ---------------- Typing fixes ---------------- */
  const CHAR_MAP = { "\u0643": "\u06A9", "\u064A": "\u06CC", "\u0649": "\u06CC" };
  function fixChars(s) { let o = ""; for (const c of s) o += CHAR_MAP[c] || c; return o; }
  function isEditable(el) {
    if (!el) return false;
    const t = el.tagName;
    if (t === "TEXTAREA") return true;
    if (t === "INPUT") return /^(text|search|url|email|tel)$/i.test(el.type || "text");
    return !!el.isContentEditable;
  }
  function insertText(el, text) {
    if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
      const s = el.selectionStart, e = el.selectionEnd;
      el.value = el.value.slice(0, s) + text + el.value.slice(e);
      el.selectionStart = el.selectionEnd = s + text.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el && el.focus();
      document.execCommand("insertText", false, text);
    }
  }
  function onBeforeInput(e) {
    if (siteDisabled() || !settings.typingFix) return;
    if (e.inputType !== "insertText" || e.data == null) return;
    const f = fixChars(e.data);
    if (f === e.data || !isEditable(e.target)) return;
    e.preventDefault();
    insertText(e.target, f);
  }

  /* ---------------- Persian normalizer ---------------- */
  function normalizePersian(t) {
    t = fixChars(t);
    t = t.replace(/[ \t]{2,}/g, " ");
    t = t.replace(/(^|\s)(می|نمی)\s+/gu, "$1$2\u200c");
    t = t.replace(/\s+(ها|های|هایی|تر|تری|ترین|ام|ات|اش|مان|تان|شان|اید|ایم|اند)(\s|[.,،!?؛:]|$)/gu, "\u200c$1$2");
    t = t.replace(/\u200c{2,}/g, "\u200c");
    return t.replace(/[ \t]+\n/g, "\n").trim();
  }
  function normalizeFocused() {
    const el = lastEditable || document.activeElement;
    if (!isEditable(el)) { toast("اول روی کادر تایپ کلیک کن"); return; }
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      el.value = normalizePersian(el.value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const t = normalizePersian(el.innerText);
      el.focus();
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, t);
    }
    toast("متن مرتب شد ✓");
  }

  /* ---------------- Voice dictation ---------------- */
  let recog = null, dictating = false;
  function toggleDictation() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("مرورگر از دیکته پشتیبانی نمی‌کند"); return; }
    if (dictating && recog) { recog.stop(); return; }
    const el = lastEditable || document.activeElement;
    if (!isEditable(el)) { toast("اول روی کادر تایپ کلیک کن"); return; }
    recog = new SR();
    recog.lang = "fa-IR"; recog.interimResults = false; recog.continuous = true;
    recog.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++)
        if (e.results[i].isFinal) insertText(el, e.results[i][0].transcript + " ");
    };
    recog.onerror = () => { dictating = false; };
    recog.onend = () => { dictating = false; toast("دیکته پایان یافت"); };
    try { recog.start(); dictating = true; toast("در حال شنیدن… (دوباره Alt+D برای پایان)"); } catch (_) {}
  }

  /* ---------------- Toast ---------------- */
  let toastEl = null, toastT = 0;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "rtlfix-ui rtlfix-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------------- Selection toolbar ---------------- */
  let bar = null, lastText = "";
  function buildBar() {
    if (bar) return;
    bar = document.createElement("div");
    bar.id = UI_ID; bar.className = "rtlfix-bar rtlfix-ui";
    bar.innerHTML =
      '<button data-act="speak" title="خواندن">🔊</button>' +
      '<button data-act="copy" title="کپی">📋</button>' +
      '<button data-act="save" title="ذخیره">🔖</button>' +
      '<button data-act="prompt" title="ذخیره به‌عنوان پرامپت">⚡</button>';
    bar.addEventListener("mousedown", (e) => e.preventDefault());
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const a = b.dataset.act;
      if (a === "speak") speak(lastText);
      else if (a === "copy") copyText(lastText, b);
      else if (a === "save") saveBookmark(lastText, b);
      else if (a === "prompt") savePrompt(lastText, b);
    });
    document.body.appendChild(bar);
  }
  function hideBar() { if (bar) bar.classList.remove("show"); }
  function onSelect() {
    if (siteDisabled() || !settings.selectionToolbar) return;
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (!text || text.length < 2 || isEditable(document.activeElement)) { hideBar(); return; }
    lastText = text; buildBar();
    const r = sel.getRangeAt(0).getBoundingClientRect();
    bar.classList.add("show");
    let left = r.left + scrollX + r.width / 2 - bar.offsetWidth / 2;
    left = Math.max(8, Math.min(left, innerWidth - bar.offsetWidth - 8));
    bar.style.top = Math.max(scrollY + 4, r.top + scrollY - bar.offsetHeight - 8) + "px";
    bar.style.left = left + "px";
  }
  function speak(text) {
    try {
      const s = speechSynthesis;
      if (s.speaking) { s.cancel(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = isRTLText(text) ? "fa-IR" : "en-US";
      s.speak(u);
    } catch (_) {}
  }
  function copyText(text, btn) {
    const ok = () => flash(btn, "✓");
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(ok).catch(() => fb());
    else fb();
    function fb() {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      ta.remove(); ok();
    }
  }
  function flash(btn, sym) {
    if (!btn) return;
    const o = btn.textContent; btn.textContent = sym;
    setTimeout(() => (btn.textContent = o), 900);
  }
  function saveBookmark(text, btn) {
    chrome.storage.local.get(BOOKMARKS_KEY, (d) => {
      const l = d[BOOKMARKS_KEY] || [];
      l.unshift({ text: text.slice(0, 4000), host: HOST, url: location.href, ts: Date.now() });
      chrome.storage.local.set({ [BOOKMARKS_KEY]: l.slice(0, 200) }, () => flash(btn, "✓"));
    });
  }
  function savePrompt(text, btn) {
    chrome.storage.local.get("rtlFixerPrompts", (d) => {
      const l = d.rtlFixerPrompts || [];
      l.unshift({ name: text.slice(0, 40), text: text.slice(0, 8000), ts: Date.now() });
      chrome.storage.local.set({ rtlFixerPrompts: l.slice(0, 100) }, () => flash(btn, "✓"));
    });
  }

  /* ---------------- Transcript scrape / export ---------------- */
  function scrapeBlocks() {
    const root = document.querySelector("main") || document.body;
    const sel = "p,li,h1,h2,h3,h4,h5,h6,blockquote,pre";
    const out = [];
    root.querySelectorAll(sel).forEach((el) => {
      if (el.closest(".rtlfix-ui")) return;
      if (el.closest("nav,header,footer,aside")) return;
      if (el.parentElement && el.parentElement.closest(sel)) return;
      if (el.tagName === "PRE") { const c = el.innerText.trim(); if (c) out.push({ tag: "PRE", text: c }); return; }
      const t = el.innerText.replace(/\s+\n/g, "\n").trim();
      if (t) out.push({ tag: el.tagName, text: t });
    });
    const dedup = []; let prev = null;
    for (const b of out) { if (!prev || b.text !== prev.text) dedup.push(b); prev = b; }
    return dedup;
  }
  function exportConversation(format) {
    const blocks = scrapeBlocks();
    if (format === "pdf") return exportPDF(blocks);
    let text = blocks.map((b) => {
      if (b.tag === "PRE") return "```\n" + b.text + "\n```";
      if (b.tag[0] === "H") return "#".repeat(+b.tag[1]) + " " + b.text;
      if (b.tag === "LI") return "- " + b.text;
      if (b.tag === "BLOCKQUOTE") return "> " + b.text;
      return b.text;
    }).join("\n\n");
    if (!text) text = (document.body.innerText || "").trim();
    if (format === "txt") text = text.replace(/^#+\s/gm, "").replace(/^[->]\s/gm, "").replace(/```/g, "");
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    download(text, `chat-${HOST}-${stamp}.${format === "txt" ? "txt" : "md"}`);
  }
  function exportPDF(blocks) {
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const body = blocks.map((b) => {
      if (b.tag === "PRE") return "<pre>" + esc(b.text) + "</pre>";
      if (b.tag[0] === "H") return "<h" + b.tag[1] + ">" + esc(b.text) + "</h" + b.tag[1] + ">";
      if (b.tag === "LI") return "<li>" + esc(b.text) + "</li>";
      if (b.tag === "BLOCKQUOTE") return "<blockquote>" + esc(b.text) + "</blockquote>";
      return "<p>" + esc(b.text) + "</p>";
    }).join("\n");
    const w = window.open("", "_blank");
    if (!w) { toast("پنجره مسدود شد؛ pop-up را اجازه بده"); return; }
    w.document.write(
      '<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>گفتگو</title>' +
      "<style>body{font-family:Tahoma,sans-serif;max-width:820px;margin:28px auto;padding:0 16px;line-height:1.9;direction:rtl}" +
      "pre{background:#f3f3f3;padding:10px 12px;border-radius:8px;direction:ltr;text-align:left;overflow:auto;white-space:pre-wrap}" +
      "blockquote{border-right:3px solid #ccc;margin:0;padding:2px 12px;color:#444}h1,h2,h3{margin:1em 0 .3em}</style></head><body>" +
      body + "</body></html>");
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch (_) {} }, 350);
  }
  function download(text, name) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }

  /* ---------------- In-chat search ---------------- */
  let searchBox = null;
  let sRanges = [], sIdx = 0;
  function buildSearch() {
    searchBox = document.createElement("div");
    searchBox.className = "rtlfix-ui rtlfix-search";
    searchBox.innerHTML =
      '<input type="text" placeholder="جستجو در گفتگو…" dir="auto">' +
      '<span class="cnt">۰/۰</span>' +
      '<button data-a="prev" title="قبلی">▲</button>' +
      '<button data-a="next" title="بعدی">▼</button>' +
      '<button data-a="close" title="بستن">✕</button>';
    searchBox.addEventListener("mousedown", (e) => { if (e.target.tagName !== "INPUT") e.preventDefault(); });
    const input = searchBox.querySelector("input");
    input.addEventListener("input", () => doSearch(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
      else if (e.key === "Escape") closeSearch();
    });
    searchBox.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.a === "next") step(1);
      else if (b.dataset.a === "prev") step(-1);
      else closeSearch();
    });
    document.body.appendChild(searchBox);
  }
  function openSearch() {
    if (!("Highlight" in window) || !CSS.highlights) { toast("جستجو در این مرورگر پشتیبانی نمی‌شود"); return; }
    if (!searchBox) buildSearch();
    searchBox.classList.add("show");
    const inp = searchBox.querySelector("input");
    inp.focus(); inp.select();
    if (inp.value) doSearch(inp.value);
  }
  function closeSearch() {
    if (searchBox) searchBox.classList.remove("show");
    CSS.highlights.delete("rtlfix-search");
    sRanges = [];
  }
  function doSearch(q) {
    CSS.highlights.delete("rtlfix-search");
    sRanges = []; sIdx = 0;
    q = (q || "").trim();
    if (q.length < 2) { updateCount(); return; }
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        const p = n.parentElement;
        if (!p || p.closest(".rtlfix-ui, script, style")) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.toLowerCase().includes(q.toLowerCase()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const ql = q.length; let n;
    while ((n = w.nextNode())) {
      const low = n.nodeValue.toLowerCase(), ql2 = q.toLowerCase();
      let i = low.indexOf(ql2);
      while (i > -1) {
        try { const r = new Range(); r.setStart(n, i); r.setEnd(n, i + ql); sRanges.push(r); } catch (_) {}
        i = low.indexOf(ql2, i + ql);
      }
    }
    if (sRanges.length) {
      CSS.highlights.set("rtlfix-search", new Highlight(...sRanges));
      scrollTo(0);
    }
    updateCount();
  }
  function updateCount() {
    if (!searchBox) return;
    const fa = (x) => String(x).replace(/\d/g, (d) => FA[d]);
    searchBox.querySelector(".cnt").textContent =
      fa(sRanges.length ? sIdx + 1 : 0) + "/" + fa(sRanges.length);
  }
  function step(dir) {
    if (!sRanges.length) return;
    sIdx = (sIdx + dir + sRanges.length) % sRanges.length;
    scrollTo(sIdx); updateCount();
  }
  function scrollTo(i) {
    const el = sRanges[i] && sRanges[i].startContainer.parentElement;
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /* ---------------- Word counter ---------------- */
  let counter = null;
  function getText(el) {
    return (el.tagName === "TEXTAREA" || el.tagName === "INPUT") ? el.value : el.innerText || "";
  }
  function showCounter(el) {
    if (!settings.counter || siteDisabled()) return;
    if (!counter) {
      counter = document.createElement("div");
      counter.className = "rtlfix-ui rtlfix-counter";
      document.body.appendChild(counter);
    }
    updateCounter(el);
    counter.classList.add("show");
  }
  function updateCounter(el) {
    if (!counter) return;
    const t = getText(el).trim();
    const words = t ? t.split(/\s+/).length : 0;
    const fa = (x) => String(x).replace(/\d/g, (d) => FA[d]);
    counter.textContent = fa(words) + " کلمه · " + fa(getText(el).length) + " نویسه";
  }
  function hideCounter() { if (counter) counter.classList.remove("show"); }

  /* ---------------- Shortcuts ---------------- */
  function onKeyDown(e) {
    if (settings.halfSpace && e.shiftKey && e.code === "Space" && !e.ctrlKey && !e.altKey && !e.metaKey && isEditable(e.target)) {
      e.preventDefault(); insertText(e.target, "\u200c"); return;
    }
    if (e.key === "Escape" && searchBox && searchBox.classList.contains("show")) { closeSearch(); return; }
    if (!settings.shortcuts || !e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.code) {
      case "KeyR": e.preventDefault(); toggleEnabled(); break;
      case "KeyE": e.preventDefault(); exportConversation("md"); break;
      case "KeyP": e.preventDefault(); exportConversation("pdf"); break;
      case "KeyF": e.preventDefault(); openSearch(); break;
      case "KeyG": e.preventDefault(); toggleFocus(); break;
      case "KeyN": e.preventDefault(); normalizeFocused(); break;
      case "KeyD": e.preventDefault(); toggleDictation(); break;
    }
  }
  function toggleEnabled() { settings.enabled = !settings.enabled; chrome.storage.sync.set({ [SETTINGS_KEY]: settings }); }
  function toggleFocus() { settings.focusMode = !settings.focusMode; chrome.storage.sync.set({ [SETTINGS_KEY]: settings }); toast(settings.focusMode ? "حالت تمرکز روشن" : "حالت تمرکز خاموش"); }

  /* ---------------- Observer ---------------- */
  let pending = new Set(), scheduled = false;
  function collapse(set) {
    const a = [...set].filter((n) => n && n.isConnected);
    return a.filter((n) => !a.some((o) => o !== n && o.contains(n)));
  }
  function flush() { scheduled = false; const r = collapse(pending); pending = new Set(); r.forEach(processSubtree); }
  function schedule(node) {
    if (node.id === UI_ID || (node.closest && node.closest(".rtlfix-ui"))) return;
    pending.add(node);
    if (!scheduled) { scheduled = true; requestAnimationFrame(() => setTimeout(flush, 120)); }
  }
  const observer = new MutationObserver((muts) => {
    if (siteDisabled()) return;
    for (const m of muts) {
      if (m.type === "characterData") { if (m.target.parentElement) schedule(m.target.parentElement); }
      else m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) schedule(n);
        else if (n.nodeType === 3 && n.parentElement) schedule(n.parentElement);
      });
    }
  });

  /* ---------------- State / messaging ---------------- */
  function applyState() {
    injectFontFace(); applyTypography();
    if (siteDisabled()) { unmarkAll(); hideBar(); hideCounter(); }
    else processSubtree(document.body);
  }
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "sync" && c[SETTINGS_KEY]) {
      const wasBionic = settings.bionic;
      settings = Object.assign({}, DEFAULTS, c[SETTINGS_KEY].newValue || {});
      applyState();
      if (settings.bionic && !wasBionic) processSubtree(document.body);
    }
  });
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg.type === "export") { exportConversation(msg.format); reply({ ok: true }); }
    else if (msg.type === "getHost") { reply({ host: HOST }); }
    else if (msg.type === "insertPrompt") {
      const el = lastEditable || document.querySelector(INPUT_SELECTOR);
      if (el) { el.focus(); insertText(el, msg.text); reply({ ok: true }); }
      else reply({ ok: false });
    }
    return true;
  });

  /* ---------------- Boot ---------------- */
  function init() {
    chrome.storage.sync.get(SETTINGS_KEY, (d) => {
      settings = Object.assign({}, DEFAULTS, d[SETTINGS_KEY] || {});
      injectFontFace(); applyTypography();
      processSubtree(document.body);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      document.addEventListener("beforeinput", onBeforeInput, true);
      document.addEventListener("keydown", onKeyDown, true);
      document.addEventListener("selectionchange", () => setTimeout(onSelect, 10));
      document.addEventListener("scroll", hideBar, true);
      document.addEventListener("focusin", (e) => { if (isEditable(e.target)) { lastEditable = e.target; showCounter(e.target); } });
      document.addEventListener("focusout", (e) => { if (isEditable(e.target)) hideCounter(); });
      document.addEventListener("input", (e) => { if (isEditable(e.target)) { lastEditable = e.target; if (counter) updateCounter(e.target); } }, true);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
