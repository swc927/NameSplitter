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

/* NEW: strip common form labels like
   NRIC or UEN (for Tax Exemption purposes):
   and similar variants sitting on their own line */
function preprocessRaw(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.replace(/\r\n/g, "\n");

  // Remove the exact middle label line, case insensitive, start of line only
  s = s.replace(
    /^\s*(NRIC|FIN)\s*or\s*UEN(?:\s*\(for\s*Tax\s*Exemption\s*purposes\))?\s*:\s*$/gim,
    ""
  );

  // Optional hardening remove any stray lines that are only a label followed by colon
  // and contain NRIC or UEN words with no value on the same line
  s = s.replace(/^\s*(?:NRIC|FIN|UEN)[^:\n]*:\s*$/gim, "");

  // Neaten multiple blank lines
  s = s.replace(/\n{3,}/g, "\n\n").trim();

  return s;
}

function smartCapitalize(name) {
  // Only change English letters, ignore Chinese or symbols
  return name.replace(/\b[a-zA-Z][a-zA-Z']*\b/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

function parseNames(raw, { doDedupe = true, doTrim = true } = {}) {
  if (typeof raw !== "string") return [];
  // Split on common separators: slash, comma, Chinese comma, line break, vertical bar
  let parts = raw
  .replace(/\r\n/g, "\n")
  // Split on slash, comma, Chinese comma, line break, vertical bar, or before "Name#number"
  .split(/(?:[\/|,，\n]+)|(?=Name#\d+)/g);

  let seen = new Set();
  let names = [];
  for (let part of parts) {
    let s = doTrim ? part.trim() : part;
    if (!s) continue;

    s = s.replace(/^Name#\d+\s*/g, "").trim();
    if (!s) continue;

    s = s
      .replace(/^(故)\s*/u, "$1 ")
      .replace(/\s{2,}/g, " ")
      .trim();

     s = smartCapitalize(s);

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

/* CHANGED: runSplit now pre cleans the input */
async function runSplit(autoCopy = true) {
  const raw = preprocessRaw(input.value); // was input.value
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

// Quality of life split on Enter with modifier
input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runSplit(true);
  }
});

// Auto split right after a paste
input.addEventListener("paste", () => {
  setTimeout(() => runSplit(true), 0);
});

// Preload example
window.addEventListener("DOMContentLoaded", () => {
  input.value = "";
});
