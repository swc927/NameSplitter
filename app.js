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

/* NEW robust ID patterns */
// Common SG style first, with sensible fallback
const STRICT_ID = /\b[STFGM]\d{7}[A-Z]\b/;                  // S1234567A etc.
const LAX_ID = /\b[A-Za-z]\d{6,8}[A-Za-z]\b/;               // broader fallback
const ID_REGEX = new RegExp(`${STRICT_ID.source}|${LAX_ID.source}`, "g");
const WHOLE_ID_REGEX = new RegExp(`^(?:${STRICT_ID.source}|${LAX_ID.source})$`);

/* NEW normalise spaces including full width */
function normaliseSpaces(s) {
  return s
    .replace(/\u3000/g, " ")        // full width space to space
    .replace(/\s{2,}/g, " ")        // collapse multiples
    .trim();
}

// Split any chunk into [name pieces and ID pieces], preserving order
function explodeInlineIds(s) {
  return s
    .split(new RegExp("(" + ID_REGEX.source + ")", "g"))
    .map(x => normaliseSpaces(x))
    .filter(Boolean);
}

/* Strip common form labels line only */
function preprocessRaw(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.replace(/\r\n/g, "\n");

  s = s.replace(
    /^\s*(NRIC|FIN)\s*or\s*UEN(?:\s*\(for\s*Tax\s*Exemption\s*purposes\))?\s*:\s*$/gim,
    ""
  );
  s = s.replace(/^\s*(?:NRIC|FIN|UEN)[^:\n]*:\s*$/gim, "");
  s = s.replace(/\n{3,}/g, "\n\n").trim();

    // Insert a newline before a standalone 故 prefix that starts a name
  // example: "… Eng 故Teoh …" becomes "… Eng \n故Teoh …"
  s = s.replace(/(^|\s)(故)(?=[A-Za-z\u4E00-\u9FFF])/gu, "$1\n$2");

  // If two Chinese names are separated by spaces, split them onto new lines
  // example: "李成兴 李茹茵" becomes "李成兴\n李茹茵"
  s = s.replace(/([\u4E00-\u9FFF])\s+(?=[\u4E00-\u9FFF])/gu, "$1\n");

  return s;
}

/* Capitalise names, uppercase IDs */
function smartCapitalize(name) {
  const trimmed = name.trim();

  // Uppercase if the entire token is an ID
  if (WHOLE_ID_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Prepass: inside parentheses, force short alphabetic tokens to uppercase, e.g. (sm) → (SM)
  let s = trimmed.replace(/\(([a-zA-Z]{2,5})\)/g, (_, w) => `(${w.toUpperCase()})`);

  // Title case English words, but preserve short all caps tokens
  s = s.replace(/\b[a-zA-Z][a-zA-Z']*\b/g, word => {
    if (/^[A-Z]{2,5}$/.test(word)) return word;           // keep acronyms like SM, PWC
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return s;
}


function parseNames(raw, { doDedupe = true, doTrim = true } = {}) {
  if (typeof raw !== "string") return [];

  // Split on slash, comma, Chinese comma, ideographic comma, line break, vertical bar, or before "Name#number"
  let parts = raw
    .replace(/\r\n/g, "\n")
    /* NEW include ideographic comma 、 */
    .split(/(?:[\/|,，、\n]+)|(?=Name#\d+)|(?=\bName\s*#?\s*\d+\s*[-:–—])/g);

  /* NEW smarter dedupe key that is case insensitive for ASCII */
  const seen = new Set();
  const names = [];

  for (let part of parts) {
    for (let chunk of explodeInlineIds(part)) {
      let s = doTrim ? normaliseSpaces(chunk) : chunk;
      if (!s) continue;

      // Remove leading Name#123 markers
      s = s.replace(/^\s*Name\s*#?\s*\d+\s*[-:–—]?\s*/i, "").trim();
      if (!s) continue;

      /* CHANGED: only add a space after 故 when followed by Latin
         so 已故王小明 remains tight, while 故 John gets a space */
      s = s
        .replace(/^(故)(?=[A-Za-z])/u, "$1 ")
        .replace(/\s{2,}/g, " ")
        .trim();

      // Auto capitalise names and uppercase IDs
      s = smartCapitalize(s);

      // Case insensitive dedupe on ASCII without touching Chinese
      const dedupeKey = s.replace(/[A-Z]/g, c => c.toLowerCase());
      if (doDedupe) {
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
      }

      names.push(s);
    }
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

/* runSplit stays the same except for preprocessRaw */
async function runSplit(autoCopy = true) {
  const raw = preprocessRaw(input.value);
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

input.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runSplit(true);
  }
});

input.addEventListener("paste", () => {
  setTimeout(() => runSplit(true), 0);
});

window.addEventListener("DOMContentLoaded", () => {
  input.value = "";
});
