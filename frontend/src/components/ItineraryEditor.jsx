// Edits the Itinerary: a list of Itinerary Days (title + one activity per line).
export function renumber(days) {
  return days.map((d, i) => ({ ...d, day: i + 1 }));
}

export default function ItineraryEditor({ days, onChange }) {
  const patch = (index, changes) =>
    onChange(days.map((d, i) => (i === index ? { ...d, ...changes } : d)));
  const add = () => onChange(renumber([...days, { day: 0, title: '', activities: [] }]));
  const remove = (index) => onChange(renumber(days.filter((_, i) => i !== index)));

  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">Itinerary</legend>
      {days.length === 0 && <p className="text-sm text-slate-500">No Itinerary Days yet.</p>}
      {days.map((d, i) => (
        <div key={i} className="space-y-2 rounded border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Day {d.day}</span>
            <input
              aria-label={`Day ${d.day} title`}
              className="flex-1 rounded border border-slate-300 px-2 py-1"
              value={d.title}
              onChange={(e) => patch(i, { title: e.target.value })}
            />
            <button type="button" onClick={() => remove(i)} className="text-sm text-red-700">
              Remove day {d.day}
            </button>
          </div>
          <textarea
            aria-label={`Day ${d.day} activities`}
            placeholder="One activity per line"
            rows={3}
            className="w-full rounded border border-slate-300 px-2 py-1"
            value={d.activities.join('\n')}
            onChange={(e) => patch(i, { activities: e.target.value.split('\n') })}
          />
        </div>
      ))}
      <button type="button" onClick={add} className="rounded border border-teal-700 px-3 py-1 text-teal-700">
        Add day
      </button>
    </fieldset>
  );
}
