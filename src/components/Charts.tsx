import { useState } from 'react';
import type { Project } from '../data/types';
import { habitGrid, lastDays, formatDuration } from '../data/derive';
import { useApp } from '../state';

/** Consistency grid: one row per project, one cell per day. Derived, never ticked. */
export function HabitGrid({ days = 28 }: { days?: number }) {
  const { entries } = useApp();
  const rows = habitGrid(days, entries);
  const range = lastDays(days);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div className="habit" role="table" aria-label={`Days with an entry, last ${days} days`}>
      {rows.map(({ project, cells, streak }) => (
        <div key={project.id} role="row" style={{ display: 'contents' }}>
          <span role="rowheader" className={`habit-name pc-${project.color}`}>
            <span className="dot" />
            {project.name}
          </span>
          <span className={`habit-cells pc-${project.color}`}>
            {cells.map((on, i) => (
              <span
                key={i}
                role="cell"
                title={`${project.name}, ${fmt(range[i])}: ${on ? 'logged' : 'nothing logged'}`}
                aria-label={`${fmt(range[i])} ${on ? 'logged' : 'not logged'}`}
                className={`habit-cell${on ? ' on' : ''}${i === cells.length - 1 ? ' today' : ''}`}
              />
            ))}
          </span>
          <span role="cell" className="habit-streak">
            {streak ? `${streak}d` : 'None'}
          </span>
        </div>
      ))}
      <div className="habit-axis" aria-hidden>
        <span>{fmt(range[0])}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Horizontal bars, e.g. time per project this week. */
export function Bars({ rows }: { rows: { project: Project; minutes: number }[] }) {
  const max = Math.max(...rows.map((r) => r.minutes), 1);
  return (
    <div className="bars">
      {rows.map(({ project, minutes }) => (
        <div key={project.id} className={`bar-row pc-${project.color}`}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <span className="dot" /> {project.name}
          </span>
          <div className="bar-track" title={`${project.name}: ${formatDuration(minutes) || 'no time'}`}>
            <div className="bar-fill" style={{ width: `${(minutes / max) * 100}%` }} />
          </div>
          <span className="v">{formatDuration(minutes) || '0m'}</span>
        </div>
      ))}
    </div>
  );
}

/** Single-series line with crosshair tooltip. */
export function LineChart({
  data,
  color = 'var(--p4)',
  unit = '',
  height = 180,
}: {
  data: { label: string; value: number }[];
  color?: string;
  unit?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = height;
  const pad = { l: 34, r: 12, t: 12, b: 24 };
  const vals = data.map((d) => d.value);
  const lo = Math.floor(Math.min(...vals) / 10) * 10;
  const hi = Math.ceil(Math.max(...vals) / 10) * 10;
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ');

  return (
    <div className="chart-wrap">
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Trend from ${data[0].value} to ${data[data.length - 1].value}${unit}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        <g className="grid">
          {ticks.map((t) => (
            <line key={t} x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t) => (
            <text key={t} x={pad.l - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          ))}
          {data.map((d, i) =>
            i % 2 === (data.length - 1) % 2 ? (
              <text key={d.label} x={x(i)} y={H - 6} textAnchor="middle">
                {d.label}
              </text>
            ) : null,
          )}
        </g>
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--line-strong)" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r={5} fill={color} stroke="var(--surface)" strokeWidth={2} />
          </>
        )}
        <circle
          cx={x(data.length - 1)}
          cy={y(data[data.length - 1].value)}
          r={4}
          fill={color}
          stroke="var(--surface)"
          strokeWidth={2}
        />
      </svg>
      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}
        >
          {data[hover].label}: <b>{data[hover].value}</b>
          {unit}
        </div>
      )}
    </div>
  );
}
