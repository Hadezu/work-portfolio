import { requireInput, InputError } from "./common";
export function csvRows(content: string): {
  rows: Record<string, string>[];
  positions: number[];
} {
  const text = content.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  const positions: number[] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false,
    line = 1,
    start = 1;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === undefined) throw new InputError("Malformed CSV");
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else {
        field += c;
        if (c === "\n") line++;
      }
      continue;
    }
    if (c === '"' && !field && !closed) {
      quoted = true;
      continue;
    }
    if (closed && c !== "," && c !== "\r" && c !== "\n" && c !== undefined)
      throw new InputError("Malformed CSV");
    if (c === "," || c === "\n" || c === "\r" || c === undefined) {
      row.push(field);
      field = "";
      closed = false;
      if (c !== ",") {
        if (row.length > 1 || row[0] !== "") {
          records.push(row);
          positions.push(start);
        }
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
        line++;
        start = line;
      }
    } else field += c;
  }
  const header = records.shift();
  positions.shift();
  requireInput(
    header && new Set(header).size === header.length,
    "CSV requires unique headers",
  );
  requireInput(
    records.every((r) => r.length === header.length),
    "CSV row width mismatch",
  );
  return {
    rows: records.map((r) =>
      Object.fromEntries(header.map((h, i) => [h, r[i]])),
    ),
    positions,
  };
}
export function csvEncode(
  rows: Record<string, unknown>[],
  fields = Object.keys(rows[0] ?? {}),
): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
  };
  return (
    [fields, ...rows.map((r) => fields.map((k) => r[k]))]
      .map((row) => row.map(cell).join(","))
      .join("\r\n") + "\r\n"
  );
}
export function decimal(raw: unknown): bigint {
  requireInput(typeof raw === "string", "Decimal source must be string");
  const value = raw.trim().replaceAll("\u00a0", " ");
  requireInput(
    /^(?:-?(?:\d{1,3}(?: \d{3})+|\d+)(?:,\d{1,2})?|-?\d+(?:\.\d{1,2})?)$/.test(
      value,
    ),
    "Unsupported decimal syntax",
  );
  const clean = value.replaceAll(" ", "").replace(",", ".");
  const [whole, fraction = ""] = clean.split(".");
  requireInput(
    clean.replace(/[-.]/g, "").replace(/^0+/, "").length <= 18,
    "Decimal precision",
  );
  const sign = whole.startsWith("-") ? -1n : 1n;
  return (
    sign *
    (BigInt(whole.replace("-", "")) * 100n + BigInt(fraction.padEnd(2, "0")))
  );
}
export function money(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const v = cents < 0n ? -cents : cents;
  return sign + v / 100n + "." + (v % 100n).toString().padStart(2, "0");
}
export function dateValue(raw: unknown): string {
  requireInput(typeof raw === "string", "Date must be string");
  let s = raw.trim();
  const pl = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (pl)
    s = pl[3] + "-" + pl[2].padStart(2, "0") + "-" + pl[1].padStart(2, "0");
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  requireInput(m, "Unparseable date");
  s = m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
  const d = new Date(s + "T00:00:00Z");
  requireInput(
    Number.isFinite(d.valueOf()) && d.toISOString().slice(0, 10) === s,
    "Invalid date",
  );
  return s;
}
