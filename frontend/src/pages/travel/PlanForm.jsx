import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPlan, getPlan, updatePlan } from '../../api/plans.js';
import { generateItinerary } from '../../api/ai.js';
import { errorMessage } from '../../api/errors.js';
import { toDateInput } from '../../utils/format.js';
import FormField, { ErrorText } from '../../components/FormField.jsx';
import ItineraryEditor, { renumber } from '../../components/ItineraryEditor.jsx';

const EMPTY = {
  title: '', destination: '', description: '', coverUrl: '',
  startDate: '', endDate: '', interests: '', maxCompanions: '',
};

const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

export function validatePlan(form) {
  if (!form.title.trim()) return 'Title is required.';
  if (!form.destination.trim()) return 'Destination is required.';
  if (!form.startDate || !form.endDate) return 'Start and end dates are required.';
  if (form.endDate < form.startDate) return 'End date cannot be before the start date.';
  if (form.maxCompanions !== '' && !(Number(form.maxCompanions) >= 1)) {
    return 'Max Companions must be at least 1.';
  }
  return '';
}

function toBody(form, days) {
  return {
    title: form.title.trim(),
    destination: form.destination.trim(),
    description: form.description,
    coverUrl: form.coverUrl || undefined,
    startDate: form.startDate,
    endDate: form.endDate,
    interests: splitList(form.interests),
    maxCompanions: form.maxCompanions === '' ? null : Number(form.maxCompanions),
    itinerary: renumber(days.map((d) => ({ ...d, activities: d.activities.filter((a) => a.trim()) }))),
  };
}

export default function PlanForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [days, setDays] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPlan(id)
      .then(({ plan }) => {
        setForm({
          title: plan.title, destination: plan.destination, description: plan.description ?? '',
          coverUrl: plan.coverUrl ?? '', startDate: toDateInput(plan.startDate),
          endDate: toDateInput(plan.endDate), interests: plan.interests.join(', '),
          maxCompanions: plan.maxCompanions ?? '',
        });
        setDays(plan.itinerary);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function generate() {
    setError('');
    setNotice('');
    if (!form.destination.trim() || !form.startDate || !form.endDate || form.endDate < form.startDate) {
      return setError('Fill in the destination and valid dates first.');
    }
    setGenerating(true);
    try {
      const data = await generateItinerary({
        destination: form.destination.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        interests: splitList(form.interests),
      });
      setDays(renumber(data.itinerary));
      setNotice('Itinerary generated. Review and edit it before saving.');
    } catch (err) {
      const unavailable = [502, 503].includes(err?.response?.status);
      setNotice(
        unavailable
          ? 'The Itinerary Generator is unavailable right now. You can still add days by hand.'
          : errorMessage(err)
      );
    } finally {
      setGenerating(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const problem = validatePlan(form);
    if (problem) return setError(problem);
    setError('');
    try {
      const body = toBody(form, days);
      const { plan } = id ? await updatePlan(id, body) : await createPlan(body);
      navigate(`/plans/${plan.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{id ? 'Edit Travel Plan' : 'Create Travel Plan'}</h1>
      <ErrorText>{error}</ErrorText>
      <FormField label="Title" id="title" name="title" value={form.title} onChange={change} />
      <FormField label="Destination" id="destination" name="destination" value={form.destination} onChange={change} />
      <FormField label="Description" id="description" name="description" as="textarea" rows={3} value={form.description} onChange={change} />
      <FormField label="Cover Photo URL" id="coverUrl" name="coverUrl" value={form.coverUrl} onChange={change} />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date" id="startDate" name="startDate" type="date" value={form.startDate} onChange={change} />
        <FormField label="End date" id="endDate" name="endDate" type="date" value={form.endDate} onChange={change} />
      </div>
      <FormField label="Interests" id="interests" name="interests" placeholder="food, trekking" value={form.interests} onChange={change} />
      <FormField label="Max Companions" id="maxCompanions" name="maxCompanions" type="number" min="1" placeholder="Leave empty for no limit" value={form.maxCompanions} onChange={change} />
      <ItineraryEditor days={days} onChange={setDays} />
      <button type="button" onClick={generate} disabled={generating} className="rounded border border-teal-700 px-3 py-2 text-teal-700 disabled:opacity-50">
        {generating ? 'Generating...' : 'Generate itinerary'}
      </button>
      {notice && <p role="status" className="text-sm text-slate-700">{notice}</p>}
      <div>
        <button type="submit" className="rounded bg-teal-700 px-4 py-2 text-white">
          {id ? 'Save changes' : 'Create Travel Plan'}
        </button>
      </div>
    </form>
  );
}
