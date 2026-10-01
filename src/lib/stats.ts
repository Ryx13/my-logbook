import type { Entry, Format, Project } from '../data/types';

/**
 * A small, safe expression language for statistics — no eval(), just a tiny
 * parser. It runs over your entries and returns a number.
 *
 * Shape:
 *   count(<selector>)
 *   sum|avg|min|max(<selector>.<field>)
 *   pct(<selector> where <cond>)            → % of that project/format matching
 *   <selector>                              → same as count(<selector>)
 *
 * selector:  <project>[.<formatKey>] [where <condition>]
 * condition: <field> <op> <value> [and|or ...]   ops: == != > < >= <=
 * value:     number | true | false | 'text' | empty
 *
 * Examples:
 *   count(sec.lab-attempt where rooted == true)
 *   avg(sec.durationMin)
 *   pct(body.finisher where clean == true)
 *   mind.observation
 */

type Ctx = { entries: Entry[]; projects: Project[]; formats: Format[] };

const FUNCS = new Set(['count', 'sum', 'avg', 'min', 'max', 'pct']);

export function evaluateStat(src: string, ctx: Ctx): { value: number | null; display: string; error?: string } {
  try {
    const trimmed = src.trim();
    const m = trimmed.match(/^([a-z]+)\s*\((.*)\)$/is);
    let fn = 'count';
    let body = trimmed;
    if (m && FUNCS.has(m[1].toLowerCase())) {
      fn = m[1].toLowerCase();
      body = m[2];
    }

    // Split selector path from an optional field (for sum/avg/min/max) by taking
    // the condition off first.
    let path = body;
    let cond = '';
    const wi = body.toLowerCase().indexOf(' where ');
    if (wi >= 0) {
      path = body.slice(0, wi);
      cond = body.slice(wi + 7);
    }
    const parts = path.split('.').map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return { value: null, display: '—', error: 'Name a project' };

    const project = ctx.projects.find(
      (p) => p.id === parts[0] || p.name.toLowerCase() === parts[0].toLowerCase(),
    );
    if (!project) return { value: null, display: '—', error: `Unknown project "${parts[0]}"` };

    const projFormats = ctx.formats.filter((f) => f.projectId === project.id);
    let formatKey: string | undefined;
    let field: string | undefined;
    if (parts[1]) {
      const asFormat = projFormats.find(
        (f) => f.key === parts[1] || f.name.toLowerCase() === parts[1].toLowerCase(),
      );
      if (asFormat) {
        formatKey = asFormat.key ?? asFormat.id;
        field = parts[2];
      } else {
        field = parts[1];
      }
    }

    let rows = ctx.entries.filter((e) => e.projectId === project.id);
    if (formatKey) rows = rows.filter((e) => (e.formatKey ?? e.formatId) === formatKey);
    const total = rows.length;
    if (cond) rows = rows.filter((e) => matchCond(cond, e));

    if (fn === 'count') return num(rows.length);
    if (fn === 'pct') return pct(rows.length, total);

    if (!field) return { value: null, display: '—', error: `${fn}() needs a field` };
    const vals = rows.map((e) => metric(e, field!)).filter((v): v is number => typeof v === 'number');
    if (!vals.length) return { value: 0, display: fn === 'avg' ? '0' : '0' };
    if (fn === 'sum') return num(vals.reduce((a, b) => a + b, 0));
    if (fn === 'avg') return num(Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10);
    if (fn === 'min') return num(Math.min(...vals));
    if (fn === 'max') return num(Math.max(...vals));
    return { value: null, display: '—', error: `Unknown function ${fn}` };
  } catch (e: any) {
    return { value: null, display: '—', error: e?.message ?? 'Could not evaluate' };
  }
}

const num = (n: number) => ({ value: n, display: String(n) });
const pct = (a: number, b: number) => ({ value: b ? a / b : 0, display: b ? `${Math.round((a / b) * 100)}%` : '—' });

function metric(e: Entry, field: string): number | undefined {
  if (field === 'durationMin') return e.durationMin;
  const v = e.values[field];
  return typeof v === 'number' ? v : undefined;
}

/** Evaluate a condition like `rooted == true and difficulty == 'Hard'`. */
function matchCond(cond: string, e: Entry): boolean {
  const ors = splitTop(cond, 'or');
  return ors.some((orPart) =>
    splitTop(orPart, 'and').every((clause) => matchClause(clause.trim(), e)),
  );
}

function splitTop(s: string, kw: 'and' | 'or'): string[] {
  const re = new RegExp(`\\s+${kw}\\s+`, 'i');
  return s.split(re);
}

function matchClause(clause: string, e: Entry): boolean {
  const m = clause.match(/^(\S+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!m) {
    // bare field → truthy
    const v = fieldValue(e, clause);
    return !!v;
  }
  const [, field, op, rawVal] = m;
  const left = fieldValue(e, field);
  const right = parseValue(rawVal.trim());
  if (right === '__empty__') {
    const isEmpty = left === undefined || left === null || left === '' || (Array.isArray(left) && left.length === 0);
    return op === '==' ? isEmpty : !isEmpty;
  }
  switch (op) {
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    case '>':
      return Number(left) > Number(right);
    case '<':
      return Number(left) < Number(right);
    case '>=':
      return Number(left) >= Number(right);
    case '<=':
      return Number(left) <= Number(right);
    default:
      return false;
  }
}

function fieldValue(e: Entry, field: string): unknown {
  if (field === 'durationMin') return e.durationMin;
  return e.values[field];
}

function parseValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'empty') return '__empty__';
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const q = raw.match(/^'(.*)'$|^"(.*)"$/);
  if (q) return q[1] ?? q[2];
  return raw;
}
