import { useEffect, useMemo, useRef, useState } from 'react';
import type { Field, FieldValue } from '../data/types';
import { formats, projects } from '../data/mock';
import { formatsFor } from '../data/derive';
import { useApp } from '../state';
import { Icon } from './Icon';

/**
 * Fast capture. Two taps to pick project + format, fields prefilled from the
 * last entry where the format says so, one tap to save. On a phone this is a
 * bottom sheet; on desktop it floats bottom-right.
 */
export function CaptureSheet() {
  const { capture, closeCapture, addEntry, entries, notify } = useApp();
  const [projectId, setProjectId] = useState(capture.projectId ?? projects[0]?.id);
  const projectFormats = formatsFor(projectId);
  const [formatId, setFormatId] = useState(capture.formatId ?? projectFormats[0]?.id);
  const format = formats.find((f) => f.id === formatId) ?? projectFormats[0];

  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [manualMin, setManualMin] = useState('');
  const firstInput = useRef<HTMLInputElement | null>(null);

  // Prefill from the last entry of this format when the field asks for it.
  useEffect(() => {
    if (!format) return;
    const last = entries.find((e) => e.formatId === format.id);
    const next: Record<string, FieldValue> = {};
    format.fields.forEach((f) => {
      if (f.prefill === 'last' && last) next[f.id] = last.values[f.id] ?? null;
    });
    setValues(next);
    setSeconds(0);
    setRunning(false);
    setManualMin('');
  }, [format, entries]);

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCapture();
    window.addEventListener('keydown', onKey);
    firstInput.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCapture]);

  const pickProject = (id: string) => {
    setProjectId(id);
    setFormatId(formatsFor(id)[0]?.id);
  };

  const set = (id: string, v: FieldValue) => setValues((prev) => ({ ...prev, [id]: v }));

  const missing = format?.fields.filter(
    (f) => f.required && (values[f.id] === undefined || values[f.id] === '' || values[f.id] === null),
  );

  const save = () => {
    if (!format || missing?.length) return;
    const minutes = manualMin ? Number(manualMin) : Math.round(seconds / 60);
    addEntry({
      id: `local-${Date.now()}`,
      projectId,
      formatId: format.id,
      formatKey: format.key ?? format.id,
      formatVersion: format.version,
      at: new Date().toISOString(),
      durationMin: format.timed ? minutes : 0,
      values,
    });
    closeCapture();
    notify(`Logged to ${projects.find((p) => p.id === projectId)?.name}`);
  };

  const clock = `${String(Math.floor(seconds / 3600)).padStart(1, '0')}:${String(
    Math.floor((seconds % 3600) / 60),
  ).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <>
      <div className="scrim" onClick={closeCapture} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="capture-title">
        <div className="sheet-head">
          <div className="sheet-head-row">
            <h2 id="capture-title">Log an entry</h2>
            <button className="btn ghost small" onClick={closeCapture} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="chip-row" role="group" aria-label="Project">
            {projects.map((p) => (
              <button
                key={p.id}
                className={`chip pc-${p.color}`}
                aria-pressed={p.id === projectId}
                onClick={() => pickProject(p.id)}
              >
                <span className="dot" />
                {p.name}
              </button>
            ))}
          </div>
          {projectFormats.length > 1 && (
            <div className="seg" role="group" aria-label="Format">
              {projectFormats.map((f) => (
                <button key={f.id} aria-pressed={f.id === format?.id} onClick={() => setFormatId(f.id)}>
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {format && (
          <div className="sheet-body">
            {format.timed && (
              <div className="timer">
                <span className="clock" aria-live="off">
                  {clock}
                </span>
                <input
                  className="input"
                  style={{ width: 110 }}
                  inputMode="numeric"
                  placeholder="or minutes"
                  aria-label="Duration in minutes"
                  value={manualMin}
                  onChange={(e) => setManualMin(e.target.value.replace(/\D/g, ''))}
                />
                <button className="btn" onClick={() => setRunning((r) => !r)}>
                  <Icon name={running ? 'pause' : 'play'} size={16} />
                  {running ? 'Pause' : 'Start'}
                </button>
              </div>
            )}

            {format.fields.map((f, i) => (
              <FieldInput
                key={f.id}
                field={f}
                value={values[f.id]}
                values={values}
                onChange={(v) => set(f.id, v)}
                inputRef={i === 0 ? firstInput : undefined}
              />
            ))}
          </div>
        )}

        <div className="sheet-foot">
          <span className="hint">
            {missing?.length
              ? `Still needed: ${missing.map((m) => m.name).join(', ')}`
              : `${format?.name} v${format?.version}. Saved on this device first.`}
          </span>
          <button className="btn primary" onClick={save} disabled={!!missing?.length}>
            Save entry
          </button>
        </div>
      </div>
    </>
  );
}

function FieldInput({
  field,
  value,
  values,
  onChange,
  inputRef,
}: {
  field: Field;
  value: FieldValue | undefined;
  values: Record<string, FieldValue>;
  onChange: (v: FieldValue) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = `f-${field.id}`;
  const label = (
    <label className="label" htmlFor={id}>
      {field.name}
      {field.required && <span className="hint"> required</span>}
    </label>
  );

  switch (field.type) {
    case 'longtext':
      return (
        <div>
          {label}
          <textarea
            id={id}
            className="textarea"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case 'number':
      return (
        <div>
          {label}
          <input
            id={id}
            ref={inputRef}
            className="input"
            inputMode="decimal"
            value={value === undefined || value === null ? '' : String(value)}
            placeholder={field.unit}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          />
          {field.prefill === 'last' && value !== undefined && value !== null && (
            <span className="hint">Filled from your last entry</span>
          )}
        </div>
      );
    case 'select':
      return (
        <div>
          <span className="label" id={id}>
            {field.name}
            {field.required && <span className="hint"> required</span>}
          </span>
          <div className="seg" role="group" aria-labelledby={id} style={{ flexWrap: 'wrap' }}>
            {field.options?.map((o) => (
              <button key={o} aria-pressed={value === o} onClick={() => onChange(o)}>
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    case 'checkbox':
      return (
        <label className="check">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.name}
        </label>
      );
    case 'rating':
      return (
        <div>
          <span className="label" id={id}>
            {field.name}
          </span>
          <div className="rating" role="group" aria-labelledby={id}>
            {Array.from({ length: field.max ?? 5 }, (_, i) => i + 1).map((n) => (
              <button key={n} aria-pressed={value === n} onClick={() => onChange(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      );
    case 'tags':
      return (
        <div>
          {label}
          <input
            id={id}
            ref={inputRef}
            className="input"
            placeholder="Comma separated"
            value={Array.isArray(value) ? value.join(', ') : ''}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
      );
    case 'computed':
      return <Computed field={field} values={values} />;
    default:
      return (
        <div>
          {label}
          <input
            id={id}
            ref={inputRef}
            className="input"
            type={field.type === 'link' ? 'url' : 'text'}
            placeholder={field.type === 'link' ? 'https://' : field.type === 'duration' ? 'h:mm' : ''}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}

/** Wireframe stand-in for the expression engine: handles "a * b" only. */
function Computed({ field, values }: { field: Field; values: Record<string, FieldValue> }) {
  const result = useMemo(() => {
    const m = field.expr?.match(/^(\w+)\s*\*\s*(\w+)$/);
    if (!m) return null;
    const a = Number(values[m[1]]);
    const b = Number(values[m[2]]);
    return Number.isFinite(a * b) && values[m[1]] != null && values[m[2]] != null ? a * b : null;
  }, [field.expr, values]);
  return (
    <div className="computed">
      <span>
        {field.name} <code className="hint">= {field.expr}</code>
      </span>
      <strong>{result ?? '—'}</strong>
    </div>
  );
}

