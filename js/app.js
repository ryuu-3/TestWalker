/* TestWalker - main application logic */
(function () {
  "use strict";

  const t = (k, v) => TW_I18N.t(k, v);

  // ---------- Sample data (example content, not UI text) ----------
  const SAMPLE_PROC = {
    meta: { title: "ログイン機能テスト", version: "1.0" },
    testCases: [
      {
        id: "TC-001",
        title: "メールアドレスとパスワードでログイン",
        precondition: "対象ユーザーが登録済みであること",
        steps: [
          { no: 1, action: "ログイン画面を開く", expected: "メール／パスワード入力欄が表示される" },
          { no: 2, action: "メール「{{email}}」を入力する", expected: "入力値が反映される" },
          { no: 3, action: "パスワード「{{password}}」を入力しログイン", expected: "{{result}}" }
        ]
      },
      {
        id: "TC-002",
        title: "ログアウト",
        precondition: "ログイン済みであること",
        steps: [
          { no: 1, action: "メニューからログアウトを選択", expected: "ログイン画面に戻る" }
        ]
      }
    ]
  };
  const SAMPLE_DATA = {
    "TC-001": [
      { label: "正常系", email: "user@example.com", password: "Pass1234", result: "ホーム画面に遷移する" },
      { label: "誤パスワード", email: "user@example.com", password: "wrong", result: "エラーメッセージが表示される" }
    ]
  };

  // ---------- State ----------
  const STATUSES = ["pass", "fail", "blocked", "skip"];
  const SL = (s) => t("status." + s);
  let procJson = null, dataJson = null;
  let procText = "", dataText = "";
  let runs = [];          // expanded run list (testCase x dataset)
  let records = {};       // runId -> {status, actual, tester, ts}
  let storageKey = null;
  let metaInfo = { title: "", version: "" };
  let activeFilter = "all";
  let searchTerm = "";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  // ---------- Clipboard (works under file:// via execCommand fallback) ----------
  let toastEl = null, toastTimer = null;
  function showToast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1200);
  }
  function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function copyToClipboard(text) {
    if (text == null) return;
    const done = () => showToast(t("copy.copied"));
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => { if (legacyCopy(text)) done(); });
    } else {
      if (legacyCopy(text)) done();
    }
  }

  // ---------- Clear a loader input panel ----------
  function clearInput(kind) {
    if (kind === "proc") { procText = ""; procSource = ""; $("#pasteProc").value = ""; $("#fileProc").value = ""; }
    else { dataText = ""; dataSource = ""; $("#pasteData").value = ""; $("#fileData").value = ""; }
    refreshFileNames();
    clearError();
  }

  // ---------- Language selector ----------
  function buildLangSelector() {
    const sel = $("#langSel");
    sel.innerHTML = TW_I18N.langs()
      .map(l => '<option value="' + esc(l.code) + '">' + esc(l.name) + '</option>')
      .join("");
    sel.value = TW_I18N.getLang();
    sel.addEventListener("change", () => {
      TW_I18N.setLang(sel.value);
      refreshLang();
    });
  }

  function refreshLang() {
    TW_I18N.apply();
    // Re-render dynamic parts that aren't covered by data-i18n attributes.
    if (procText.trim() && !$("#runner").classList.contains("hidden")) {
      updateMetaTitle();
      render();
    }
    // Refresh "Not selected"/pasted/sample file name labels.
    refreshFileNames();
  }

  // ---------- Loader UI ----------
  let procSource = "", dataSource = "";  // "", "file:<name>", "pasted", "sample"
  function refreshFileNames() {
    $("#nameProc").textContent = sourceLabel(procSource);
    $("#nameData").textContent = sourceLabel(dataSource);
  }
  function sourceLabel(src) {
    if (!src) return t("loader.unselected");
    if (src === "pasted") return t("loader.pasted");
    if (src === "sample") return t("loader.sample");
    if (src.indexOf("file:") === 0) return src.slice(5);
    return src;
  }

  function wireDrop(dropId, fileId, pasteId, kind) {
    const drop = $(dropId), file = $(fileId), paste = $(pasteId);
    drop.addEventListener("click", (e) => {
      if (e.target === paste || e.target.tagName === "A") return;
      file.click();
    });
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, (e) => {
      e.preventDefault(); drop.classList.add("over");
    }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, (e) => {
      e.preventDefault(); if (ev === "dragleave" && drop.contains(e.relatedTarget)) return;
      drop.classList.remove("over");
    }));
    drop.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      if (f) readFile(f, kind, paste);
    });
    file.addEventListener("change", () => {
      if (file.files[0]) readFile(file.files[0], kind, paste);
    });
    paste.addEventListener("click", (e) => e.stopPropagation());
    paste.addEventListener("input", () => {
      if (kind === "proc") { procText = paste.value; procSource = paste.value.trim() ? "pasted" : ""; }
      else { dataText = paste.value; dataSource = paste.value.trim() ? "pasted" : ""; }
      refreshFileNames();
    });
  }

  function readFile(f, kind, pasteEl) {
    const reader = new FileReader();
    reader.onload = () => {
      if (kind === "proc") { procText = reader.result; procSource = "file:" + f.name; }
      else { dataText = reader.result; dataSource = "file:" + f.name; }
      if (pasteEl) pasteEl.value = reader.result;
      refreshFileNames();
    };
    reader.readAsText(f);
  }

  function showError(msg) {
    const box = $("#errBox");
    box.textContent = "⚠ " + msg;
    box.classList.remove("hidden");
  }
  function clearError() { $("#errBox").classList.add("hidden"); }

  // ---------- Build model ----------
  function build() {
    clearError();
    if (!procText.trim()) { showError(t("err.noProc")); return; }
    try { procJson = JSON.parse(procText); }
    catch (e) { showError(t("err.procParse", { msg: e.message })); return; }

    if (dataText.trim()) {
      try { dataJson = JSON.parse(dataText); }
      catch (e) { showError(t("err.dataParse", { msg: e.message })); return; }
    } else { dataJson = null; }

    const cases = procJson.testCases || procJson.cases || procJson.tests;
    if (!Array.isArray(cases) || cases.length === 0) {
      showError(t("err.noCases")); return;
    }

    runs = [];
    cases.forEach((tc, ci) => {
      const id = tc.id || ("TC-" + String(ci + 1).padStart(3, "0"));
      const datasets = dataJson && Array.isArray(dataJson[id]) && dataJson[id].length ? dataJson[id] : [null];
      datasets.forEach((ds, di) => {
        runs.push({
          runId: id + "::" + di,
          caseId: id,
          title: tc.title || tc.name || "",
          precondition: tc.precondition || tc.precond || "",
          steps: tc.steps || [],
          dataset: ds,
          dataIdx: di,
          dataLabel: ds ? (ds.label || null) : null
        });
      });
    });

    metaInfo.title = (procJson.meta && procJson.meta.title) || procJson.title || "Test";
    metaInfo.version = (procJson.meta && procJson.meta.version) || "";
    storageKey = "testwalker:" + metaInfo.title + ":" + metaInfo.version;
    loadRecords();

    updateMetaTitle();
    $("#loader").classList.add("hidden");
    $("#runner").classList.remove("hidden");
    $("#btnReport").disabled = false;
    $("#btnReset").disabled = false;
    render();
  }

  function updateMetaTitle() {
    const verStr = metaInfo.version ? " (v" + metaInfo.version + ")" : "";
    $("#metaTitle").textContent = t("header.meta", { title: metaInfo.title + verStr, count: runs.length });
  }

  // ---------- Records / storage ----------
  function loadRecords() {
    records = {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) records = JSON.parse(raw) || {};
    } catch (e) { /* ignore */ }
  }
  let saveTimer = null;
  function saveRecords() {
    try { localStorage.setItem(storageKey, JSON.stringify(records)); } catch (e) {}
    const flash = $("#savedFlash");
    flash.classList.add("show");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => flash.classList.remove("show"), 1200);
  }
  function getRec(runId) {
    if (!records[runId]) records[runId] = { status: "pending", actual: "", tester: "", ts: "", steps: {} };
    if (!records[runId].steps) records[runId].steps = {};   // back-compat for older saved data
    return records[runId];
  }

  // ---------- Placeholder substitution ----------
  function subst(text, ds, interactive) {
    if (!ds) return esc(text);
    return esc(text).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, key) => {
      if (Object.prototype.hasOwnProperty.call(ds, key)) {
        const val = ds[key];
        if (interactive) {
          return '<span class="ph copyable" data-copy="' + esc(val) + '" title="' + esc(t("copy.clickToCopy")) + '">' + esc(val) + "</span>";
        }
        return '<span class="ph">' + esc(val) + "</span>";
      }
      return '<span class="ph" title="' + esc(t("ph.undefined")) + '">' + esc(m) + "</span>";
    });
  }

  // ---------- Render ----------
  function counts() {
    const c = { total: runs.length, pending: 0, pass: 0, fail: 0, blocked: 0, skip: 0 };
    runs.forEach(r => { const s = (records[r.runId] && records[r.runId].status) || "pending"; c[s]++; });
    return c;
  }

  function renderSummary() {
    const c = counts();
    const done = c.total - c.pending;
    const pct = c.total ? Math.round(done / c.total * 100) : 0;
    const seg = (n, cls) => c.total ? '<span class="' + cls + '" style="width:' + (n / c.total * 100) + '%"></span>' : "";
    $("#summary").innerHTML =
      '<div class="stat"><div class="num">' + c.total + '</div><div class="lbl">' + esc(t("summary.total")) + '</div></div>' +
      '<div class="stat pass"><div class="num">' + c.pass + '</div><div class="lbl">' + esc(SL("pass")) + '</div></div>' +
      '<div class="stat fail"><div class="num">' + c.fail + '</div><div class="lbl">' + esc(SL("fail")) + '</div></div>' +
      '<div class="stat blocked"><div class="num">' + c.blocked + '</div><div class="lbl">' + esc(SL("blocked")) + '</div></div>' +
      '<div class="stat skip"><div class="num">' + c.skip + '</div><div class="lbl">' + esc(SL("skip")) + '</div></div>' +
      '<div class="progress-wrap">' +
        '<div class="progress-meta"><span>' + esc(t("summary.progress", { done: done, total: c.total })) + '</span><span>' + pct + '%</span></div>' +
        '<div class="progress-bar">' + seg(c.pass, "p") + seg(c.fail, "f") + seg(c.blocked, "b") + seg(c.skip, "s") + '</div>' +
      '</div>';
  }

  function matchFilter(r) {
    const st = (records[r.runId] && records[r.runId].status) || "pending";
    if (activeFilter !== "all" && st !== activeFilter) return false;
    if (searchTerm) {
      const hay = (r.caseId + " " + r.title + " " + (r.dataLabel || "")).toLowerCase();
      if (!hay.includes(searchTerm)) return false;
    }
    return true;
  }

  function runTitle(r) { return r.title || t("case.untitled"); }
  function runDataLabel(r) {
    if (!r.dataset) return null;
    return r.dataLabel || t("case.dataDefault", { n: r.dataIdx + 1 });
  }

  function stepProgress(r) {
    const total = r.steps.length;
    if (!total) return null;
    const rec = records[r.runId];
    const checked = (rec && rec.steps)
      ? r.steps.reduce((acc, s, i) => acc + (rec.steps[s.no != null ? s.no : (i + 1)] ? 1 : 0), 0)
      : 0;
    return { done: checked, total: total };
  }

  function stepsTable(r) {
    const rec = getRec(r.runId);
    if (!r.steps.length) return '<p class="hint">' + esc(t("case.noSteps")) + '</p>';
    const steps = rec.steps || {};
    let rows = "";
    r.steps.forEach((s, i) => {
      const no = s.no != null ? s.no : (i + 1);
      const act = subst(s.action || s.do || "", r.dataset, true);   // copyable: step values are used as input
      const exp = subst(s.expected || s.expect || "", r.dataset, false);  // expected results are not copy targets
      const checked = steps[no] ? " checked" : "";
      rows += '<tr><td class="no">' + esc(no) + '</td><td>' + act + '</td><td>' + exp + '</td>' +
        '<td class="chk"><input type="checkbox" class="js-step" data-run="' + esc(r.runId) + '" data-no="' + esc(no) + '"' + checked + '></td></tr>';
    });
    return '<table class="steps"><thead><tr><th>' + esc(t("step.no")) + '</th><th>' + esc(t("step.action")) +
      '</th><th>' + esc(t("step.expected")) + '</th><th class="chk">' + esc(t("step.check")) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function caseCard(r, openSet) {
    const rec = getRec(r.runId);
    const st = rec.status || "pending";
    const open = openSet.has(r.runId);
    const dl = runDataLabel(r);
    const sp0 = stepProgress(r);
    const allChecked = !sp0 || sp0.done === sp0.total;   // no steps => allowed
    const statusBtns = STATUSES.map(s => {
      const locked = (s === "pass" && !allChecked);
      return '<button class="sbtn ' + (st === s ? "on" : "") + '" data-s="' + s + '" data-run="' + esc(r.runId) + '"' +
        (locked ? ' disabled title="' + esc(t("record.passLocked")) + '"' : "") + '>' + esc(SL(s)) + '</button>';
    }).join("");
    const sp = stepProgress(r);
    const spHtml = sp ? '<span class="step-prog js-stepprog">' + esc(t("case.stepProgress", { done: sp.done, total: sp.total })) + '</span>' : "";
    return '' +
      '<div class="case st-' + st + (open ? " open" : "") + '" data-run="' + esc(r.runId) + '">' +
        '<div class="case-head js-toggle">' +
          '<span class="caret">▶</span>' +
          '<span class="case-id">' + esc(r.caseId) + '</span>' +
          '<span class="case-title">' + esc(runTitle(r)) + '</span>' +
          (dl ? '<span class="data-label">' + esc(dl) + '</span>' : "") +
          spHtml +
          '<span class="badge ' + st + '">' + esc(SL(st)) + '</span>' +
        '</div>' +
        '<div class="case-body">' +
          (r.precondition ? '<div class="precond"><b>' + esc(t("case.precondition")) + '</b>' + esc(r.precondition) + '</div>' : "") +
          stepsTable(r) +
          '<div class="record">' +
            '<div class="label">' + esc(t("record.judge")) + '</div>' +
            '<div><div class="status-btns">' + statusBtns + '</div></div>' +
            '<div class="label">' + esc(t("record.actual")) + '</div>' +
            '<div><textarea class="js-actual" data-run="' + esc(r.runId) + '" placeholder="' + esc(t("record.actualPh")) + '">' + esc(rec.actual) + '</textarea></div>' +
            '<div class="label">' + esc(t("record.tester")) + '</div>' +
            '<div><input type="text" class="js-tester" data-run="' + esc(r.runId) + '" value="' + esc(rec.tester) + '" placeholder="' + esc(t("record.testerPh")) + '">' +
              ' <span class="meta-row js-ts">' + (rec.ts ? esc(t("record.updated", { ts: rec.ts })) : "") + '</span></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function currentOpenSet() {
    const s = new Set();
    $$(".case.open").forEach(el => s.add(el.dataset.run));
    return s;
  }

  function render() {
    renderSummary();
    const openSet = currentOpenSet();
    const list = $("#caseList");
    const visible = runs.filter(matchFilter);
    if (!visible.length) {
      list.innerHTML = '<p class="hint" style="text-align:center;padding:30px">' + esc(t("runner.noMatch")) + '</p>';
      return;
    }
    list.innerHTML = visible.map(r => caseCard(r, openSet)).join("");
  }

  // ---------- Events (delegated) ----------
  function wireRunnerEvents() {
    $("#caseList").addEventListener("click", (e) => {
      const copyable = e.target.closest(".copyable");
      if (copyable) { copyToClipboard(copyable.getAttribute("data-copy")); return; }
      const toggle = e.target.closest(".js-toggle");
      if (toggle) { toggle.closest(".case").classList.toggle("open"); return; }
      const sbtn = e.target.closest(".sbtn");
      if (sbtn) {
        if (sbtn.disabled) return;   // Pass is locked until all steps are checked
        const runId = sbtn.dataset.run, s = sbtn.dataset.s;
        const rec = getRec(runId);
        rec.status = (rec.status === s) ? "pending" : s;   // toggle off if same
        rec.ts = new Date().toLocaleString();
        saveRecords();
        const card = sbtn.closest(".case");
        card.className = "case st-" + rec.status + (card.classList.contains("open") ? " open" : "");
        $$(".sbtn", card).forEach(b => b.classList.toggle("on", b.dataset.s === rec.status && rec.status !== "pending"));
        $(".badge", card).className = "badge " + rec.status;
        $(".badge", card).textContent = SL(rec.status);
        const tsEl = $(".js-ts", card); if (tsEl) tsEl.textContent = t("record.updated", { ts: rec.ts });
        renderSummary();
      }
    });

    $("#caseList").addEventListener("input", (e) => {
      const ta = e.target.closest(".js-actual");
      const ti = e.target.closest(".js-tester");
      if (!ta && !ti) return;
      const el = ta || ti;
      const rec = getRec(el.dataset.run);
      if (ta) rec.actual = el.value; else rec.tester = el.value;
      rec.ts = new Date().toLocaleString();
      const tsEl = $(".js-ts", el.closest(".case")); if (tsEl) tsEl.textContent = t("record.updated", { ts: rec.ts });
      saveRecords();
    });

    $("#caseList").addEventListener("change", (e) => {
      const cb = e.target.closest(".js-step");
      if (!cb) return;
      const runId = cb.dataset.run, no = cb.dataset.no;
      const rec = getRec(runId);
      if (cb.checked) rec.steps[no] = true; else delete rec.steps[no];
      rec.ts = new Date().toLocaleString();

      const card = cb.closest(".case");
      const r = runs.find(x => x.runId === runId);
      const sp = r && stepProgress(r);
      const allChecked = !sp || sp.done === sp.total;

      // Auto-revert Pass when steps are no longer all checked (keeps state consistent)
      if (!allChecked && rec.status === "pass") {
        rec.status = "pending";
        card.className = "case st-pending" + (card.classList.contains("open") ? " open" : "");
        $$(".sbtn", card).forEach(b => b.classList.remove("on"));
        const badge = $(".badge", card);
        badge.className = "badge pending";
        badge.textContent = SL("pending");
        renderSummary();
      }

      // Enable/disable the Pass button per the all-checked rule
      const passBtn = card.querySelector('.sbtn[data-s="pass"]');
      if (passBtn) {
        passBtn.disabled = !allChecked;
        if (allChecked) passBtn.removeAttribute("title");
        else passBtn.title = t("record.passLocked");
      }

      const spEl = $(".js-stepprog", card);
      if (spEl && sp) spEl.textContent = t("case.stepProgress", { done: sp.done, total: sp.total });
      const tsEl = $(".js-ts", card); if (tsEl) tsEl.textContent = t("record.updated", { ts: rec.ts });
      saveRecords();
    });

    $$(".chip").forEach(ch => ch.addEventListener("click", () => {
      $$(".chip").forEach(c => c.classList.remove("active"));
      ch.classList.add("active");
      activeFilter = ch.dataset.f;
      render();
    }));
    $("#search").addEventListener("input", (e) => { searchTerm = e.target.value.trim().toLowerCase(); render(); });
    $("#btnExpandAll").addEventListener("click", () => $$(".case").forEach(c => c.classList.add("open")));
    $("#btnCollapseAll").addEventListener("click", () => $$(".case").forEach(c => c.classList.remove("open")));
  }

  // ---------- HTML report ----------
  function exportReport() {
    const c = counts();
    const verStr = metaInfo.version ? " (v" + metaInfo.version + ")" : "";
    const title = metaInfo.title + verStr;
    const now = new Date().toLocaleString();
    let rows = "";
    runs.forEach(r => {
      const rec = records[r.runId] || { status: "pending", actual: "", tester: "", ts: "", steps: {} };
      const recSteps = rec.steps || {};
      const dl = runDataLabel(r);
      const sp = stepProgress(r);
      let stepsHtml = "";
      r.steps.forEach((s, i) => {
        const no = s.no != null ? s.no : (i + 1);
        stepsHtml += "<tr><td>" + esc(no) + "</td><td>" + subst(s.action || "", r.dataset) +
          "</td><td>" + subst(s.expected || "", r.dataset) + "</td><td class='ck'>" + (recSteps[no] ? "✓" : "") + "</td></tr>";
      });
      rows +=
        '<div class="rc st-' + rec.status + '">' +
        '<div class="rc-h"><span class="cid">' + esc(r.caseId) + '</span> ' + esc(runTitle(r)) +
        (dl ? ' <span class="dl">' + esc(dl) + '</span>' : "") +
        (sp ? ' <span class="sp">' + esc(t("case.stepProgress", { done: sp.done, total: sp.total })) + '</span>' : "") +
        ' <span class="bd ' + rec.status + '">' + esc(SL(rec.status)) + '</span></div>' +
        (r.precondition ? '<div class="pc">' + esc(t("report.precond", { v: r.precondition })) + '</div>' : "") +
        (stepsHtml ? '<table class="st"><tr><th>' + esc(t("step.no")) + '</th><th>' + esc(t("step.action")) +
          '</th><th>' + esc(t("step.expected")) + '</th><th>' + esc(t("step.check")) + '</th></tr>' + stepsHtml + '</table>' : "") +
        '<div class="ac"><b>' + esc(t("report.actual")) + '</b> ' + (rec.actual ? esc(rec.actual) : '<i>' + esc(t("report.empty")) + '</i>') + '</div>' +
        '<div class="mt">' + esc(t("report.metaLine", { tester: rec.tester || t("report.empty"), ts: rec.ts || t("report.empty") })) + '</div>' +
        '</div>';
    });

    const stat = (n, color, label) =>
      '<div class="s"><div class="n"' + (color ? ' style="color:' + color + '"' : "") + '>' + n + '</div><div class="l">' + esc(label) + '</div></div>';

    const html =
'<!DOCTYPE html><html lang="' + TW_I18N.getLang() + '"><head><meta charset="UTF-8"><title>' + esc(t("report.docTitle", { title: title })) + '</title><style>' +
'body{font-family:-apple-system,"Segoe UI",Meiryo,sans-serif;margin:24px;color:#1f2933;font-size:13px}' +
'h1{font-size:20px}.sum{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}' +
'.s{border:1px solid #d8dee6;border-radius:8px;padding:8px 14px;min-width:80px}.s .n{font-size:20px;font-weight:700}.s .l{font-size:11px;color:#647488}' +
'.rc{border:1px solid #d8dee6;border-left:5px solid #ccc;border-radius:8px;padding:12px;margin:10px 0}' +
'.rc.st-pass{border-left-color:#16a34a}.rc.st-fail{border-left-color:#dc2626}.rc.st-blocked{border-left-color:#d97706}.rc.st-skip{border-left-color:#6b7280}' +
'.rc-h{font-weight:600;font-size:14px}.cid{font-family:monospace;background:#f1f4f8;padding:1px 6px;border-radius:4px;font-size:12px}' +
'.dl{color:#2563eb;font-size:12px}.sp{color:#647488;font-size:12px}.pc{color:#647488;margin:6px 0;font-size:12px}' +
'table.st td.ck{text-align:center;color:#16a34a;font-weight:700;width:40px}' +
'.bd{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px}.bd.pass{background:#dcfce7;color:#16a34a}.bd.fail{background:#fee2e2;color:#dc2626}.bd.blocked{background:#fef3c7;color:#d97706}.bd.skip{background:#f1f5f9;color:#6b7280}.bd.pending{background:#eef1f5;color:#647488}' +
'table.st{border-collapse:collapse;width:100%;margin:8px 0}table.st th,table.st td{border:1px solid #d8dee6;padding:5px 8px;text-align:left;vertical-align:top}table.st th{background:#f1f4f8;font-size:11px;color:#647488}' +
'.ph{background:#e8f0fe;color:#2563eb;border-radius:3px;padding:0 3px}.ac{margin:6px 0}.mt{font-size:11px;color:#647488}' +
'@media print{.rc{break-inside:avoid}}</style></head><body>' +
'<h1>' + esc(t("report.title", { title: title })) + '</h1><div class="mt">' + esc(t("report.generatedAt", { ts: now })) + '</div>' +
'<div class="sum">' +
stat(c.total, "", t("report.total")) +
stat(c.pass, "#16a34a", SL("pass")) +
stat(c.fail, "#dc2626", SL("fail")) +
stat(c.blocked, "#d97706", SL("blocked")) +
stat(c.skip, "#6b7280", SL("skip")) +
stat(c.pending, "#647488", SL("pending")) +
'</div>' + rows + '</body></html>';

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = metaInfo.title.replace(/[^\w぀-ヿ一-龯ー-]/g, "_").slice(0, 40) || "report";
    a.href = url;
    a.download = t("report.filePrefix") + "_" + safe + "_" + new Date().toISOString().slice(0, 10) + ".html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Top-level wiring ----------
  function init() {
    TW_I18N.init();
    buildLangSelector();
    TW_I18N.apply();

    $("#sampleProc").textContent = JSON.stringify(SAMPLE_PROC, null, 2);
    $("#sampleData").textContent = JSON.stringify(SAMPLE_DATA, null, 2);
    refreshFileNames();

    wireDrop("#dropProc", "#fileProc", "#pasteProc", "proc");
    wireDrop("#dropData", "#fileData", "#pasteData", "data");
    wireRunnerEvents();

    // Clear buttons (stopPropagation so the drop panel doesn't open the file dialog)
    $("#btnClearProc").addEventListener("click", (e) => { e.stopPropagation(); clearInput("proc"); });
    $("#btnClearData").addEventListener("click", (e) => { e.stopPropagation(); clearInput("data"); });

    // Copy buttons for the JSON format samples
    $$(".copy-btn").forEach(btn => btn.addEventListener("click", () => {
      const pre = document.getElementById(btn.getAttribute("data-copy-target"));
      if (pre) copyToClipboard(pre.textContent);
    }));

    $("#btnBuild").addEventListener("click", build);
    $("#btnLoadSample").addEventListener("click", () => {
      procText = JSON.stringify(SAMPLE_PROC, null, 2);
      dataText = JSON.stringify(SAMPLE_DATA, null, 2);
      $("#pasteProc").value = procText; $("#pasteData").value = dataText;
      procSource = "sample"; dataSource = "sample";
      refreshFileNames();
      build();
    });

    $("#btnReload").addEventListener("click", () => {
      $("#runner").classList.add("hidden");
      $("#loader").classList.remove("hidden");
      $("#btnReport").disabled = true;
      $("#btnReset").disabled = true;
      $("#metaTitle").textContent = "";
    });

    $("#btnReset").addEventListener("click", () => {
      if (!confirm(t("reset.confirm"))) return;
      records = {};
      try { localStorage.removeItem(storageKey); } catch (e) {}
      render();
    });

    $("#btnReport").addEventListener("click", exportReport);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
