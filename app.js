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
const STRICT_ID = /\b[STFGM]\d{7}[A-Z]\b/; // S1234567A etc.
const LAX_ID = /\b[A-Za-z]\d{6,8}[A-Za-z]\b/; // broader fallback
const ID_REGEX = new RegExp(`${STRICT_ID.source}|${LAX_ID.source}`, "g");
const WHOLE_ID_REGEX = new RegExp(`^(?:${STRICT_ID.source}|${LAX_ID.source})$`);

/* NEW normalise spaces including full width */
function normaliseSpaces(s) {
  return s
    .replace(/\u3000/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Split any chunk into [name pieces and ID pieces], preserving order
function explodeInlineIds(s) {
  return s
    .split(new RegExp("(" + ID_REGEX.source + ")", "g"))
    .map((x) => normaliseSpaces(x))
    .filter(Boolean);
}

/* NEW: normalise company terms  MOVED OUT OF parseNames */
function normaliseCompanyTerms(s) {
  const rules = [
    [/(\b)pte\.?\s*ltd\b/i, "$1Pte Ltd"],
    [/(\b)ltd\b/i, "$1Ltd"],
    [/(\b)llp\b/i, "$1LLP"],
    [/(\b)plc\b/i, "$1PLC"],
    [/(\b)llc\b/i, "$1LLC"],
    [/(\b)inc\.?\b/i, "$1Inc"],
    [/(\b)co\.?\b/i, "$1Co"],
    [/(\b)limited\b/i, "$1Limited"],
    [/(\b)bhd\b/i, "$1Bhd"],
  ];
  for (const [re, rep] of rules) s = s.replace(re, rep);
  return s;
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

  // Normalise variants like 故: or 故： to a standard form "故 "
  s = s.replace(/(故|已故)[:：]\s*/g, "$1 ");

  // Break before common list markers like 1) or 2.
  // Supports full-width right parenthesis too
  s = s.replace(/\s*\d+[.)）]\s+(?=[A-Za-z\u4E00-\u9FFF])/gu, "\n");

  // Hard break before every new 故 or 已故, tolerate spaces after the marker, normalise to one space
  s = s.replace(/\s+故(?=\s*[A-Za-z\u4E00-\u9FFF])/g, "\n故 ");
  s = s.replace(/\s+已故(?=\s*[A-Za-z\u4E00-\u9FFF])/g, "\n已故 ");

  // Split Chinese names separated by spaces
  s = s.replace(/([\u4E00-\u9FFF])\s+(?=[\u4E00-\u9FFF])/gu, (_, prev) => {
    return prev === "故" ? "故 " : prev + "\n";
  });

  // Cosmetic space after 故 before Latin or Chinese
  s = s.replace(/故(?=[A-Za-z\u4E00-\u9FFF])/g, "故 ");

  s = s.trim();
  return s;
}

/* Capitalise names, uppercase IDs */
function smartCapitalize(name) {
  const trimmed = name.trim();
  if (WHOLE_ID_REGEX.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  // Prepass: inside parentheses, force short alphabetic tokens to uppercase
  let s = trimmed.replace(
    /\(([a-zA-Z]{2,5})\)/g,
    (_, w) => `(${w.toUpperCase()})`
  );
  // Title case English words, but preserve short all caps tokens
  s = s.replace(/\b[a-zA-Z][a-zA-Z'\u2019]*\b/g, (word) => {
    if (/^[A-Z]{2,5}$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  return s;
}

/* Handle deceased names and standard spacing */
function manageNames(s) {
  if (typeof s !== "string") return "";

  // 1. Add space after 故 if missing (before Latin or Chinese)
  s = s.replace(/^(故)(?=[A-Za-z\u4E00-\u9FFF])/u, "$1 ");

  // 2. Normalise multiple spaces
  s = s.replace(/\s{2,}/g, " ").trim();

  // 3. Capitalise if not Chinese-only
  const hasLatin = /[A-Za-z]/.test(s);
  if (hasLatin) {
    s = smartCapitalize(s);
  }

  return s;
}

function parseNames(raw, { doDedupe = true, doTrim = true } = {}) {
  if (typeof raw !== "string") return [];

  // Split on common separators, or before Name markers
  let parts = raw
    .replace(/\r\n/g, "\n")
    .split(
      /(?:[\/|,;；，、\n]+)|(?=Name#\d+)|(?=\bName\s*#?\s*\d+\s*[-:–—：])/g
    );

  const seen = new Set();
  const names = [];

  for (let part of parts) {
    for (let chunk of explodeInlineIds(part)) {
      let s = doTrim ? normaliseSpaces(chunk) : chunk;
      if (!s) continue;

      // Remove leading Name number labels like Name#12 or Name 12 optionally with dash or colon
      s = s.replace(/^\s*Name\s*#?\s*\d+\s*[-:–—：]?\s*/i, "").trim();
      if (!s) continue;

      // Only add a space after 故 or 已故 when followed by Latin
      s = s
        .replace(/^(故|已故)(?=[A-Za-z\u4E00-\u9FFF])/u, "$1 ")
        .replace(/\s{2,}/g, " ")
        .trim();

      // Capitalise names and uppercase IDs
      s = manageNames(s);

      // Normalise company terms  NEW USE
      s = normaliseCompanyTerms(s);

      // Case insensitive dedupe for ASCII without touching Chinese
      const dedupeKey = s.replace(/[A-Z]/g, (c) => c.toLowerCase());
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

async function runSplit(autoCopy = true) {
  const raw = preprocessRaw(input.value);
  let names = parseNames(raw, {
    doDedupe: dedupe.checked,
    doTrim: trimSpaces.checked,
  });

  // Disable pairing so each 故 or 已故 stands on its own line
  // names = postFormatDeceased(names);

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
