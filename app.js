/* Name Splitter by SWC */
const $ = (sel) => document.querySelector(sel);

const input = $("#rawInput");
const output = $("#output");
const splitBtn = $("#splitBtn");
const copyBtn = $("#copyBtn");
const clearBtn = $("#clearBtn");
const countBadge = $("#countBadge");
const statusEl = $("#status");
const dedupe = $("#dedupe");
const trimSpaces = $("#trimSpaces");

function parseNames(raw, { doDedupe = true, doTrim = true } = {}) {
  if (typeof raw !== "string") return [];
  // Split on common separators: slash, comma, line break, vertical bar
  let parts = raw.replace(/\r\n/g, "\n").split(/[\/|,\n]+/);

  let seen = new Set();
  let names = [];
  for (let part of parts) {
    let s = doTrim ? part.trim() : part;
    if (!s) continue;
    if (doDedupe) {
      if (seen.has(s)) continue;
      seen.add(s);
    }
    names.push(s);
  }
  return names;
}

function toMultiline(arr) {
  return arr.join("\n");
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  // Fallback
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.style.position = "fixed";
  temp.style.opacity = "0";
  document.body.appendChild(temp);
  temp.focus();
  temp.select();
  try {
    const ok = document.execCommand("copy");
    document.body.removeChild(temp);
    return ok;
  } catch {
    document.body.removeChild(temp);
    return false;
  }
}

function updateCount(n) {
  countBadge.textContent = String(n);
}

function setStatus(msg) {
  statusEl.textContent = msg;
  if (msg) {
    statusEl.style.textShadow = "0 0 12px rgba(124,58,237,0.6)";
    setTimeout(() => (statusEl.style.textShadow = "none"), 900);
  }
}

async function runSplit(autoCopy = true) {
  const raw = input.value;
  const names = parseNames(raw, {
    doDedupe: dedupe.checked,
    doTrim: trimSpaces.checked,
  });
  const text = toMultiline(names);
  output.value = text;
  updateCount(names.length);
  if (autoCopy && text.length) {
    const ok = await copyToClipboard(text);
    setStatus(ok ? "Copied to clipboard" : "Could not copy automatically");
  } else {
    setStatus("Done");
  }
}

splitBtn.addEventListener("click", () => runSplit(true));
copyBtn.addEventListener("click", async () => {
  const ok = await copyToClipboard(output.value);
  setStatus(ok ? "Copied to clipboard" : "Could not copy automatically");
});
clearBtn.addEventListener("click", () => {
  input.value = "";
  output.value = "";
  updateCount(0);
  setStatus("Cleared");
});

// Quality of life: split on Enter with modifier
input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runSplit(true);
  }
});

// Preload example
window.addEventListener("DOMContentLoaded", () => {
  input.value = "陈怀广/李小华";
});
