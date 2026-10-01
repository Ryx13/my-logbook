import { useApp } from '../state';
import { groupLabels, type Habit, type HabitGroup } from '../data/tracker';
import { Icon } from '../components/Icon';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const groups: HabitGroup[] = ['sec', 'body', 'mind', 'life'];
const uid = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Add, rename, reschedule and retire habits yourself — no code edits. */
export function Habits() {
  const { habits, upsertHabit, removeHabit } = useApp();

  const addTo = (group: HabitGroup) =>
    upsertHabit({ id: uid(), group, label: 'New habit', detail: '', days: [0, 1, 2, 3, 4, 5, 6] });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Habits</h1>
          <p className="sub">Edit the tracker itself — add exercises, change days, retire what you’ve dropped.</p>
        </div>
      </div>

      {groups.map((g) => {
        const list = habits.filter((h) => h.group === g);
        return (
          <section className="panel" key={g} style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <h2 className={`pc-${groupLabels[g].color}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot" /> {groupLabels[g].name}
              </h2>
              <button className="btn small" onClick={() => addTo(g)}>
                <Icon name="plus" size={16} /> Add
              </button>
            </div>
            {list.length === 0 && <p className="hint">No habits here yet.</p>}
            {list.map((h) => (
              <HabitRow key={h.id} habit={h} onChange={upsertHabit} onRemove={removeHabit} />
            ))}
          </section>
        );
      })}
    </>
  );
}

function HabitRow({
  habit,
  onChange,
  onRemove,
}: {
  habit: Habit;
  onChange: (h: Habit) => void;
  onRemove: (id: string) => void;
}) {
  const toggleDay = (d: number) => {
    const days = habit.days.includes(d) ? habit.days.filter((x) => x !== d) : [...habit.days, d].sort();
    onChange({ ...habit, days });
  };

  return (
    <div className="habit-editor-row">
      <div>
        <input
          className="input"
          aria-label="Habit name"
          value={habit.label}
          onChange={(e) => onChange({ ...habit, label: e.target.value })}
        />
        <label className="check" style={{ fontWeight: 400, fontSize: '0.82rem', marginTop: 6 }}>
          <input
            type="checkbox"
            checked={!!habit.noScore}
            onChange={(e) => onChange({ ...habit, noScore: e.target.checked })}
          />
          Optional (doesn’t count towards the day’s score)
        </label>
      </div>
      <input
        className="input"
        aria-label="Details (sets, reps, how)"
        placeholder="e.g. 3 × 10 · slow"
        value={habit.detail ?? ''}
        onChange={(e) => onChange({ ...habit, detail: e.target.value })}
      />
      <div className="day-toggles" role="group" aria-label="Days">
        {DAYS.map((d, i) => (
          <button
            key={i}
            className="day-toggle"
            aria-pressed={habit.days.includes(i)}
            aria-label={`Day ${i + 1}`}
            onClick={() => toggleDay(i)}
          >
            {d}
          </button>
        ))}
      </div>
      <button className="btn ghost small" aria-label={`Remove ${habit.label}`} onClick={() => onRemove(habit.id)}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}
