// Self-contained, read-only crash-inbox viewer. Served as a string (no static-file
// build step needed) at GET /api/error-report/view. It holds NO secret: it prompts
// for the admin key and sends it as the `x-admin-key` header when fetching reports,
// so the key never lands in a URL/server access log.
export const errorReportViewHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Crash inbox</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         background: #0f172a; color: #e2e8f0; }
  header { position: sticky; top: 0; background: #0f172a; padding: 16px;
           border-bottom: 1px solid #1e293b; }
  h1 { margin: 0 0 12px; font-size: 1.1rem; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; }
  input, button { font: inherit; padding: 8px 10px; border-radius: 8px;
                  border: 1px solid #334155; background: #172132; color: #e2e8f0; }
  input:focus { outline: none; border-color: #3b82f6; }
  button { background: #2563eb; border-color: #2563eb; cursor: pointer; font-weight: 600; }
  #key { flex: 1; min-width: 160px; }
  #filter { flex: 1; min-width: 160px; }
  #limit { width: 90px; }
  #status { margin: 10px 0 0; font-size: 0.85rem; color: #94a3b8; }
  main { padding: 16px; display: flex; flex-direction: column; gap: 12px; max-width: 820px; margin: 0 auto; }
  .card { background: #172132; border: 1px solid #1e293b; border-left: 4px solid #3b82f6; border-radius: 12px; padding: 14px; }
  .card.boundary { border-left-color: #f87171; }
  .card.window { border-left-color: #fbbf24; }
  .card.manual { border-left-color: #34d399; }
  .top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
  .id { font-family: ui-monospace, Menlo, monospace; font-weight: 700; color: #3b82f6;
        background: rgba(59,130,246,0.14); padding: 2px 8px; border-radius: 999px; }
  .badge { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8;
           border: 1px solid #334155; padding: 1px 7px; border-radius: 999px; }
  .time { font-size: 0.78rem; color: #94a3b8; margin-left: auto; }
  .row { font-size: 0.82rem; margin: 3px 0; word-break: break-word; }
  .row b { color: #94a3b8; font-weight: 600; }
  .note { margin-top: 8px; padding: 8px; background: rgba(52,211,153,0.10); border-radius: 8px; font-size: 0.85rem; }
  pre { margin: 8px 0 0; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 8px;
        font-size: 0.72rem; white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow: auto; }
  summary { cursor: pointer; font-size: 0.78rem; color: #94a3b8; margin-top: 8px; }
</style>
</head>
<body>
<header>
  <h1>Crash inbox</h1>
  <div class="bar">
    <input id="key" type="password" placeholder="Admin key (ADMIN_REPORT_KEY)" />
    <input id="limit" type="number" value="100" min="1" max="1000" />
    <button id="load">Load</button>
    <input id="filter" placeholder="Filter: #id, email, screen, status…" />
  </div>
  <p id="status">Enter your admin key and press Load.</p>
</header>
<main id="list"></main>
<script>
  var KEY_STORE = "ft_admin_key";
  var reports = [];
  var keyEl = document.getElementById("key");
  var limitEl = document.getElementById("limit");
  var filterEl = document.getElementById("filter");
  var statusEl = document.getElementById("status");
  var listEl = document.getElementById("list");

  keyEl.value = sessionStorage.getItem(KEY_STORE) || "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function render() {
    var q = filterEl.value.trim().toLowerCase();
    var rows = reports.filter(function (r) {
      if (!q) return true;
      var hay = [r.errorId, r.userEmail, r.userId, r.componentOrScreen, r.route,
                 r.apiUrl, r.httpStatus, r.source, r.message, r.backendError, r.userNote]
                 .join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    statusEl.textContent = rows.length + " of " + reports.length + " report(s)";
    listEl.innerHTML = rows.map(function (r) {
      var call = [r.httpMethod, r.apiUrl].filter(Boolean).join(" ");
      return '<div class="card ' + esc(r.source) + '">' +
        '<div class="top">' +
          '<span class="id">#' + esc(r.errorId) + '</span>' +
          '<span class="badge">' + esc(r.source) + '</span>' +
          '<span class="time">' + esc(new Date(r.createdAt).toLocaleString()) + '</span>' +
        '</div>' +
        (r.userEmail || r.userId ? '<div class="row"><b>User:</b> ' + esc(r.userEmail || r.userId) + '</div>' : '') +
        (r.componentOrScreen ? '<div class="row"><b>Screen:</b> ' + esc(r.componentOrScreen) + '</div>' : '') +
        (r.route ? '<div class="row"><b>Route:</b> ' + esc(r.route) + '</div>' : '') +
        (call ? '<div class="row"><b>API:</b> ' + esc(call) + (r.httpStatus != null ? ' &middot; ' + esc(r.httpStatus) : '') + '</div>' : '') +
        (r.backendError ? '<div class="row"><b>Server:</b> ' + esc(r.backendError) + '</div>' : '') +
        (r.message ? '<div class="row"><b>Message:</b> ' + esc(r.message) + '</div>' : '') +
        (r.userNote ? '<div class="note"><b>Tester said:</b> ' + esc(r.userNote) + '</div>' : '') +
        (r.stack ? '<details><summary>Stack</summary><pre>' + esc(r.stack) + '</pre></details>' : '') +
        '</div>';
    }).join("");
  }

  function load() {
    var key = keyEl.value.trim();
    if (!key) { statusEl.textContent = "Enter your admin key first."; return; }
    sessionStorage.setItem(KEY_STORE, key);
    statusEl.textContent = "Loading…";
    var limit = Number(limitEl.value) || 100;
    fetch("/api/error-report?limit=" + limit, { headers: { "x-admin-key": key } })
      .then(function (res) {
        if (res.status === 403) throw new Error("Forbidden — wrong or unset admin key.");
        if (!res.ok) throw new Error("Request failed (" + res.status + ")");
        return res.json();
      })
      .then(function (body) {
        reports = (body && body.data) || [];
        render();
      })
      .catch(function (err) { statusEl.textContent = err.message; });
  }

  document.getElementById("load").addEventListener("click", load);
  filterEl.addEventListener("input", render);
  keyEl.addEventListener("keydown", function (e) { if (e.key === "Enter") load(); });
</script>
</body>
</html>`;
