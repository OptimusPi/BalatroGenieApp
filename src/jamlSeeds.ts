// Read / strip / write the top-level `seeds:` list in a JAML filter.
//
// `seeds` is a first-class JamlConfig field, but we manage it in the editor text
// ourselves so the search can (1) re-score the seeds already saved in the filter
// before sweeping, and (2) write the best finds back into `seeds: [...]`. We
// always strip it before handing the JAML to the engine and set config.seeds
// programmatically, so parsing never depends on the serializer accepting the key.

const STRIP_QUOTES = /^["']|["']$/g;
const ZONE_KEY = /^\s*(must|should|mustNot)\s*:/;

/** Extract the seed strings from a `seeds:` block (flow `[A, B]` or `- ` list). */
export function parseSeeds(jaml: string): string[] {
  const lines = jaml.split(/\r?\n/);
  const seeds: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(/^\s*seeds\s*:\s*(.*)$/);
    if (!header) continue;

    const inline = header[1].trim();
    if (inline.startsWith("[")) {
      // Flow form — may span lines until the closing bracket.
      let buf = inline;
      let j = i;
      while (!buf.includes("]") && j + 1 < lines.length) {
        j++;
        buf += " " + lines[j].trim();
      }
      const inner = buf.slice(buf.indexOf("[") + 1, buf.lastIndexOf("]"));
      for (const tok of inner.split(",")) {
        const s = tok.trim().replace(STRIP_QUOTES, "").toUpperCase();
        if (s) seeds.push(s);
      }
    } else {
      // Block form — following indented `- SEED` items.
      for (let k = i + 1; k < lines.length; k++) {
        const item = lines[k].match(/^\s*-\s*(.+?)\s*$/);
        if (!item) break;
        const s = item[1].replace(STRIP_QUOTES, "").toUpperCase();
        if (s) seeds.push(s);
      }
    }
    break; // only the first seeds: block counts
  }

  return [...new Set(seeds)];
}

/** Return the JAML with any `seeds:` block removed. */
export function stripSeeds(jaml: string): string {
  const lines = jaml.split(/\r?\n/);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(/^\s*seeds\s*:\s*(.*)$/);
    if (!header) {
      out.push(lines[i]);
      continue;
    }
    const inline = header[1].trim();
    if (inline.startsWith("[")) {
      let buf = inline;
      while (!buf.includes("]") && i + 1 < lines.length) {
        i++;
        buf += lines[i];
      }
    } else {
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) i++;
    }
    // drop the seeds: header line itself
  }

  return out.join("\n");
}

/** Replace (or insert) the `seeds:` block with a compact flow list. */
export function writeSeeds(jaml: string, seeds: string[]): string {
  const base = stripSeeds(jaml).replace(/\n{3,}/g, "\n\n").trimEnd();
  if (seeds.length === 0) return base + "\n";

  const flow = `seeds: [${seeds.join(", ")}]`;
  const lines = base.split(/\r?\n/);
  const zoneIdx = lines.findIndex((l) => ZONE_KEY.test(l));
  if (zoneIdx === -1) return base + "\n" + flow + "\n";

  lines.splice(zoneIdx, 0, flow);
  return lines.join("\n") + "\n";
}

/** Best-effort filename from the filter's `name:` field. */
export function readName(jaml: string): string | null {
  const m = jaml.match(/^\s*name\s*:\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1].replace(STRIP_QUOTES, "").trim() || null;
}
