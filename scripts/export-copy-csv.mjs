import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DEFAULT_EN_PATH = "src/copy/en.json";
const DEFAULT_ES_PATH = "src/copy/es.json";
const CLIENTS_DIR = "src/config/clients";
const DEFAULT_OUT_PATH = "translations-en-es.csv";

function appendPath(base, key, isArrayIndex = false) {
  if (isArrayIndex) {
    return `${base}[${key}]`;
  }
  return base ? `${base}.${key}` : key;
}

function flattenStringLeaves(value, path = "", out = new Map()) {
  if (typeof value === "string") {
    out.set(path, value);
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenStringLeaves(item, appendPath(path, index, true), out);
    });
    return out;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, nested]) => {
      flattenStringLeaves(nested, appendPath(path, key), out);
    });
  }

  return out;
}

function toCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildStatus(enValue, esValue) {
  if (enValue === undefined) return "missing_en";
  if (esValue === undefined) return "missing_es";
  if (enValue === esValue) return "same_text";
  return "ok";
}

function safeClientLabel(clientId, fileBase) {
  return String(clientId || fileBase || "unknown").trim().toLowerCase();
}

function normalizeClientOverrideKey(path) {
  if (!path) return path;
  return path
    .replace(/(^|\.)(en|es)(?=\.|$)/g, "$1")
    .replace(/\.\./g, ".")
    .replace(/\.$/, "");
}

function formatOverrideEntries(entries) {
  if (!entries || !entries.length) return "";
  return entries.map((entry) => `[${entry.client}] ${entry.value}`).join(" || ");
}

function collectClientOverrides() {
  const clientFiles = readdirSync(resolve(CLIENTS_DIR)).filter((name) => name.endsWith(".json"));

  const byKey = new Map();
  const clients = new Set();

  for (const fileName of clientFiles) {
    const clientPath = resolve(CLIENTS_DIR, fileName);
    const fileBase = fileName.replace(/\.json$/, "");
    const clientJson = JSON.parse(readFileSync(clientPath, "utf8"));
    const clientId = safeClientLabel(clientJson.clientId, fileBase);
    if (clientId !== "default") {
      clients.add(clientId);
    }
    const strings = flattenStringLeaves(clientJson);

    for (const [rawPath, value] of strings.entries()) {
      if (typeof value !== "string") continue;

      const langMatch = rawPath.match(/(^|\.)(en|es)(?=\.|$)/);
      if (!langMatch) continue;
      const lang = langMatch[2];
      const key = normalizeClientOverrideKey(rawPath);
      if (!key) continue;

      const record = byKey.get(key) ?? { en: [], es: [] };
      if (clientId !== "default") {
        record[lang].push({ client: clientId, value });
      }
      byKey.set(key, record);
    }
  }

  return { byKey, clients: Array.from(clients).sort((a, b) => a.localeCompare(b)) };
}

const args = process.argv.slice(2);
const cleanMode = args.includes("--clean");
const outputArg = args.find((arg) => !arg.startsWith("--"))?.trim();
const outputPath = outputArg ? resolve(outputArg) : resolve(DEFAULT_OUT_PATH);
const enPath = resolve(DEFAULT_EN_PATH);
const esPath = resolve(DEFAULT_ES_PATH);

const enJson = JSON.parse(readFileSync(enPath, "utf8"));
const esJson = JSON.parse(readFileSync(esPath, "utf8"));

const enStrings = flattenStringLeaves(enJson);
const esStrings = flattenStringLeaves(esJson);
const { byKey: clientOverrides, clients } = await collectClientOverrides();
const allKeys = Array.from(new Set([...enStrings.keys(), ...esStrings.keys(), ...clientOverrides.keys()])).sort((a, b) =>
  a.localeCompare(b),
);

const clientColumns = clients.flatMap((client) => [`${client}_en`, `${client}_es`]);
const lines = [[
  "key",
  "default_en",
  "default_es",
  ...clientColumns,
  "client_overrides_en",
  "client_overrides_es",
  "status",
].join(",")];
for (const key of allKeys) {
  const enValueRaw = enStrings.get(key);
  const esValueRaw = esStrings.get(key);
  const enValue = cleanMode && enValueRaw !== undefined ? cleanText(enValueRaw) : enValueRaw;
  const esValue = cleanMode && esValueRaw !== undefined ? cleanText(esValueRaw) : esValueRaw;
  const status = buildStatus(enValue, esValue);
  const overrideRecord = clientOverrides.get(key);
  const overrideEnRaw = formatOverrideEntries(overrideRecord?.en ?? []);
  const overrideEsRaw = formatOverrideEntries(overrideRecord?.es ?? []);
  const overrideEn = cleanMode ? cleanText(overrideEnRaw) : overrideEnRaw;
  const overrideEs = cleanMode ? cleanText(overrideEsRaw) : overrideEsRaw;
  const perClientCells = clients.flatMap((client) => {
    const clientEnRaw = (overrideRecord?.en ?? [])
      .filter((entry) => entry.client === client)
      .map((entry) => entry.value)
      .join(" || ");
    const clientEsRaw = (overrideRecord?.es ?? [])
      .filter((entry) => entry.client === client)
      .map((entry) => entry.value)
      .join(" || ");
    const clientEn = cleanMode ? cleanText(clientEnRaw) : clientEnRaw;
    const clientEs = cleanMode ? cleanText(clientEsRaw) : clientEsRaw;
    return [clientEn, clientEs];
  });
  lines.push([
    key,
    enValue ?? "",
    esValue ?? "",
    ...perClientCells,
    overrideEn,
    overrideEs,
    status,
  ].map(toCsvCell).join(","));
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `\uFEFF${lines.join("\n")}\n`, "utf8");

console.log(`Wrote ${allKeys.length} rows to ${outputPath}${cleanMode ? " (clean mode)" : ""}`);
