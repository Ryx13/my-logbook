import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import type { Field, FieldType } from '../data/types';
import { formatById, projectById } from '../data/derive';
import { useApp } from '../state';
import { Icon } from '../components/Icon';

const TYPES: [FieldType, string][] = [
  ['text', 'Short text'],
  ['longtext', 'Long text'],
  ['number', 'Number'],
  ['duration', 'Duration'],
  ['select', 'Pick one'],
  ['tags', 'Tags'],
  ['checkbox', 'Yes / no'],
  ['rating', 'Rating'],
  ['link', 'Link'],
  ['checklist', 'Checklist'],
  ['entryref', 'Link to entry'],
  ['computed', 'Calculated'],
];

export function FormatEditor() {
  const { id = '' } = useParams();
  const { notify } = useApp();
  const format = formatById(id);
  const [fields, setFields] = useState<Field[]>(format?.fields ?? []);
  if (!format) return <p className="empty">That format doesn't exist.</p>;
  const project = projectById(format.projectId);
  const dirty = JSON.stringify(fields) !== JSON.stringify(format.fields);

  const update = (i: number, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <div className={`pc-${project?.color}`}>
      <p className="hint" style={{ marginBottom: 8 }}>
        <Link to={`/projects/${project?.id}`}>{project?.name}</Link> / Formats
      </p>
      <div className="page-head">
        <div>
          <h1>{format.name}</h1>
          <p className="sub">
            Version {format.version}. Existing entries keep the version they were written under.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost" onClick={() => setFields(format.fields)} disabled={!dirty}>
            Discard
          </button>
          <button
            className="btn primary"
            disabled={!dirty}
            onClick={() => notify(`Would save as version ${format.version + 1}`)}
          >
            Save as version {format.version + 1}
          </button>
        </div>
      </div>

      <div className="grid-2">
        <section>
          <div className="field-editor">
            {fields.map((f, i) => (
              <div key={f.id} className="field-editor-row">
                <span className="grip" aria-hidden>
                  <Icon name="grip" size={16} />
                </span>
                <input
                  className="input"
                  value={f.name}
                  aria-label="Field name"
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <select
                  className="select"
                  value={f.type}
                  aria-label="Field type"
                  onChange={(e) => update(i, { type: e.target.value as FieldType })}
                >
                  {TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <label className="check req" style={{ fontWeight: 400, fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => update(i, { required: e.target.checked })}
                  />
                  Required
                </label>
                <button
                  className="btn ghost small"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() =>
              setFields((fs) => [...fs, { id: `new${fs.length}`, name: 'New field', type: 'text' }])
            }
          >
            <Icon name="plus" size={16} /> Add field
          </button>
          {fields.some((f) => f.type === 'computed') && (
            <div className="panel" style={{ marginTop: 20 }}>
              <h3 style={{ marginBottom: 8 }}>Calculated fields</h3>
              {fields
                .filter((f) => f.type === 'computed')
                .map((f) => (
                  <div key={f.id}>
                    <label className="label" htmlFor={`expr-${f.id}`}>
                      {f.name}
                    </label>
                    <input
                      id={`expr-${f.id}`}
                      className="input code"
                      value={f.expr ?? ''}
                      onChange={(e) => update(fields.indexOf(f), { expr: e.target.value })}
                    />
                    <p className="hint" style={{ marginTop: 6 }}>
                      Uses other fields in this format by their id. Runs in a sandboxed expression language, never as code.
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>

        <aside className="stack">
          <section className="panel">
            <h2 style={{ marginBottom: 14 }}>Version history</h2>
            <ul className="version-list">
              {[...format.history].reverse().map((v) => (
                <li key={v.version}>
                  <span className="v">v{v.version}</span>
                  <span>
                    {v.note}
                    <span className="when" style={{ display: 'block' }}>
                      {new Date(v.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </span>
                </li>
              ))}
              {dirty && (
                <li>
                  <span className="v">v{format.version + 1}</span>
                  <span className="hint">Unsaved changes</span>
                </li>
              )}
            </ul>
          </section>
          <p className="notice">
            Removing a field hides it from new entries. Old entries still show it, because they were written under an
            earlier version.
          </p>
        </aside>
      </div>
    </div>
  );
}
