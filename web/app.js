// ---------- TOKEN VALIDATION
const isValidToken = (t) =>
  t.length === 2 &&
  /^[A-Z0-9]{2}$/.test(t);

// ---------- PARSERS
function parseMatrix(text) {
  const rows = text
    .trim()
    .split(/\n+/)
    .map((r) => r.trim().split(/\s+/).filter(Boolean));
  if (!rows.length) throw new Error("Matrix is empty.");
  const cols = rows[0].length;
  rows.forEach((row, i) => {
    if (row.length !== cols)
      throw new Error(`Matrix row ${i + 1} has ${row.length} tokens but row 1 has ${cols}.`);
    row.forEach((tok) => {
      if (!isValidToken(tok))
        throw new Error(`Invalid token "${tok}" — must be 2 uppercase alphanumeric chars.`);
    });
  });
  return rows;
}

function parseSequences(text) {
  const lines = text.trim().split(/\n+/).filter(Boolean);
  if (!lines.length) throw new Error("Need at least one sequence.");
  return lines.map((line, i) => {
    const parts = line.split(",");
    if (parts.length !== 2)
      throw new Error(`Sequence ${i + 1}: expected "tokens, reward" (comma-separated).`);
    const tokens = parts[0].trim().split(/\s+/).filter(Boolean);
    const reward = parseInt(parts[1].trim(), 10);
    if (tokens.length < 2)
      throw new Error(`Sequence ${i + 1}: needs at least 2 tokens.`);
    tokens.forEach((t) => {
      if (!isValidToken(t))
        throw new Error(`Sequence ${i + 1}: invalid token "${t}".`);
    });
    if (!Number.isFinite(reward))
      throw new Error(`Sequence ${i + 1}: reward must be a number.`);
    return { tokens, reward };
  });
}

// Parse raw .txt format (same as inputs/file1.txt):
//   buffer
//   rows cols
//   matrix...
//   num_seqs
//   seq / reward / seq / reward ...
function parseRawTxt(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  let p = 0;
  const buffer = parseInt(lines[p++], 10);
  if (!Number.isFinite(buffer) || buffer < 2)
    throw new Error("Line 1: buffer size must be >= 2.");
  const dim = lines[p++].split(/\s+/).map(Number);
  if (dim.length !== 2) throw new Error("Line 2: expected 'rows cols'.");
  const [rows, cols] = dim;
  const matrix = [];
  for (let i = 0; i < rows; i++) {
    const row = lines[p++].split(/\s+/);
    if (row.length !== cols)
      throw new Error(`Matrix row ${i + 1}: expected ${cols} tokens, got ${row.length}.`);
    row.forEach((t) => {
      if (!isValidToken(t)) throw new Error(`Invalid token "${t}".`);
    });
    matrix.push(row);
  }
  const numSeqs = parseInt(lines[p++], 10);
  const sequences = [];
  for (let i = 0; i < numSeqs; i++) {
    const tokens = lines[p++].split(/\s+/);
    tokens.forEach((t) => {
      if (!isValidToken(t)) throw new Error(`Sequence ${i + 1}: invalid token "${t}".`);
    });
    const reward = parseInt(lines[p++], 10);
    if (!Number.isFinite(reward))
      throw new Error(`Sequence ${i + 1}: reward must be a number.`);
    sequences.push({ tokens, reward });
  }
  return { buffer, matrix, sequences };
}

// ---------- SOLVER (ported from main.cpp)
function solve(matrix, buffer, sequences) {
  const n = matrix.length;
  const u = matrix[0].length;
  const seqStrs = sequences.map((s) => ({
    str: s.tokens.join(" "),
    reward: s.reward,
  }));

  let maxReward = -Infinity;
  let maxPath = [];

  function calcReward(path) {
    let pathStr = "";
    for (const idx of path) {
      if (pathStr) pathStr += " ";
      pathStr += matrix[Math.floor(idx / u)][idx % u];
    }
    let total = 0;
    for (const { str, reward } of seqStrs) {
      if (pathStr.includes(str)) total += reward;
    }
    return total;
  }

  const visited = Array.from({ length: n }, () => new Array(u).fill(false));
  const path = [];

  function search(x, y, horizontal) {
    visited[x][y] = true;
    path.push(x * u + y);

    if (path.length === buffer) {
      const r = calcReward(path);
      if (r > maxReward || maxPath.length === 0) {
        maxReward = r;
        maxPath = path.slice();
      }
    } else if (!horizontal) {
      for (let i = 0; i < n; i++) {
        if (i !== x && !visited[i][y]) search(i, y, true);
      }
    } else {
      for (let j = 0; j < u; j++) {
        if (j !== y && !visited[x][j]) search(x, j, false);
      }
    }

    visited[x][y] = false;
    path.pop();
  }

  for (let j = 0; j < u; j++) search(0, j, false);

  return { reward: maxReward === -Infinity ? 0 : maxReward, path: maxPath, n, u };
}

// ---------- UI
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// Tabs
$$(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    $$(".tab").forEach((t) => t.classList.remove("active"));
    $$(".tab-pane").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    $(`.tab-pane[data-pane="${tab.dataset.tab}"]`).classList.add("active");
  })
);

// File upload
$("#file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    window._uploadedText = ev.target.result;
    $("#file-status").textContent = `Loaded: ${file.name} (${ev.target.result.length} bytes)`;
  };
  reader.readAsText(file);
});

// Randomize generator
$("#rnd-generate").addEventListener("click", () => {
  try {
    const tokens = $("#rnd-tokens").value.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 1) throw new Error("Provide at least 1 unique token.");
    const unique = new Set(tokens);
    if (unique.size !== tokens.length) throw new Error("Tokens must be unique.");
    tokens.forEach((t) => {
      if (!isValidToken(t)) throw new Error(`Invalid token "${t}".`);
    });
    const buffer = +$("#rnd-buffer").value;
    const w = +$("#rnd-w").value;
    const h = +$("#rnd-h").value;
    const nseq = +$("#rnd-nseq").value;
    const maxlen = Math.max(2, +$("#rnd-maxlen").value);
    const pick = () => tokens[Math.floor(Math.random() * tokens.length)];

    // matrix
    const rows = [];
    for (let i = 0; i < h; i++) {
      const r = [];
      for (let j = 0; j < w; j++) r.push(pick());
      rows.push(r.join(" "));
    }

    // sequences (unique)
    const seen = new Set();
    const seqs = [];
    let attempts = 0;
    while (seqs.length < nseq && attempts < 1000) {
      attempts++;
      const len = 2 + Math.floor(Math.random() * (maxlen - 1));
      const toks = [];
      for (let j = 0; j < len; j++) toks.push(pick());
      const key = toks.join(" ");
      if (seen.has(key)) continue;
      seen.add(key);
      const reward = 1 + Math.floor(Math.random() * 99);
      seqs.push(`${key}, ${reward}`);
    }

    $("#form-buffer").value = buffer;
    $("#form-matrix").value = rows.join("\n");
    $("#form-seqs").value = seqs.join("\n");

    // switch to form tab so user can see/edit
    $$(".tab").forEach((t) => t.classList.remove("active"));
    $$(".tab-pane").forEach((p) => p.classList.remove("active"));
    $('.tab[data-tab="form"]').classList.add("active");
    $('.tab-pane[data-pane="form"]').classList.add("active");

    $("#rnd-status").textContent = `Generated. Switched to FORM tab. Press BREACH to solve.`;
    $("#rnd-status").style.color = "var(--green)";
  } catch (err) {
    $("#rnd-status").textContent = err.message;
    $("#rnd-status").style.color = "var(--red)";
  }
});

// Collect input from the currently-active tab
function collectInput() {
  const active = $(".tab.active").dataset.tab;
  if (active === "paste") {
    const raw = $("#paste-raw").value.trim();
    if (!raw) throw new Error("Paste input is empty.");
    return parseRawTxt(raw);
  }
  if (active === "file") {
    if (!window._uploadedText) throw new Error("No file uploaded.");
    return parseRawTxt(window._uploadedText);
  }
  // form tab (also used by randomize result)
  const buffer = parseInt($("#form-buffer").value, 10);
  if (!Number.isFinite(buffer) || buffer < 2)
    throw new Error("Buffer size must be >= 2.");
  const matrix = parseMatrix($("#form-matrix").value);
  const sequences = parseSequences($("#form-seqs").value);
  return { buffer, matrix, sequences };
}

// Render output
function renderResult(input, result, elapsedMs) {
  $("#output-panel").hidden = false;
  $("#out-reward").textContent = result.reward;
  $("#out-time").textContent = `${elapsedMs.toFixed(1)} ms`;
  $("#out-buffer").textContent = `${result.path.length}/${input.buffer}`;

  const { matrix } = input;
  const n = matrix.length;
  const u = matrix[0].length;
  const pathSet = new Map();
  result.path.forEach((idx, i) => pathSet.set(idx, i));

  // matrix grid
  const mview = $("#matrix-view");
  mview.style.gridTemplateColumns = `repeat(${u}, 1fr)`;
  mview.innerHTML = "";
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < u; j++) {
      const idx = i * u + j;
      const cell = document.createElement("div");
      cell.className = "cell";
      if (pathSet.has(idx)) {
        cell.classList.add("on-path");
        const step = document.createElement("span");
        step.className = "step";
        step.textContent = pathSet.get(idx) + 1;
        cell.appendChild(step);
      }
      const txt = document.createElement("span");
      txt.textContent = matrix[i][j];
      cell.appendChild(txt);
      mview.appendChild(cell);
    }
  }

  // buffer
  const bview = $("#buffer-view");
  bview.innerHTML = "";
  for (let i = 0; i < input.buffer; i++) {
    const slot = document.createElement("div");
    slot.className = "buffer-slot";
    if (i < result.path.length) {
      const idx = result.path[i];
      slot.textContent = matrix[Math.floor(idx / u)][idx % u];
    } else {
      slot.textContent = "··";
      slot.style.color = "var(--text-dim)";
    }
    bview.appendChild(slot);
  }

  // sequences
  const pathStr = result.path
    .map((idx) => matrix[Math.floor(idx / u)][idx % u])
    .join(" ");
  const sview = $("#seq-view");
  sview.innerHTML = "";
  input.sequences.forEach((s) => {
    const seqStr = s.tokens.join(" ");
    const matched = pathStr.includes(seqStr);
    const row = document.createElement("div");
    row.className = "seq-row" + (matched ? " matched" : "");
    row.innerHTML = `
      <span class="check">${matched ? "✓" : "○"}</span>
      <span class="seq-tokens">${seqStr}</span>
      <span class="seq-reward">+${s.reward}</span>
    `;
    sview.appendChild(row);
  });

  // store for download
  window._lastSolution = { input, result, elapsedMs };
}

// Solve button
$("#solve-btn").addEventListener("click", () => {
  const errBox = $("#error-box");
  errBox.textContent = "";
  try {
    const input = collectInput();
    const t0 = performance.now();
    const result = solve(input.matrix, input.buffer, input.sequences);
    const t1 = performance.now();
    renderResult(input, result, t1 - t0);
    // scroll to output
    $("#output-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    errBox.textContent = "!! " + err.message;
    $("#output-panel").hidden = true;
  }
});

// Reset
$("#reset-btn").addEventListener("click", () => {
  $("#error-box").textContent = "";
  $("#output-panel").hidden = true;
});

// Download
$("#download-btn").addEventListener("click", () => {
  const s = window._lastSolution;
  if (!s) return;
  const { input, result, elapsedMs } = s;
  const u = input.matrix[0].length;
  const lines = [];
  lines.push(String(result.reward));
  lines.push(result.path.map((idx) => input.matrix[Math.floor(idx / u)][idx % u]).join(" "));
  result.path.forEach((idx) => {
    lines.push(`${(idx % u) + 1}, ${Math.floor(idx / u) + 1}`);
  });
  lines.push(`${elapsedMs.toFixed(1)} ms`);
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "breach_solution.txt";
  a.click();
  URL.revokeObjectURL(a.href);
});
