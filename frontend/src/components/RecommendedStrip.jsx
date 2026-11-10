import { useEffect, useState } from 'react';
import { getRecommendations } from '../api/ai.js';
import PlanCard from './PlanCard.jsx';

// "Recommended for You". The AI layer is optional, so any failure hides the strip silently.
export default function RecommendedStrip() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getRecommendations()
      .then((data) => !cancelled && setItems(data.items ?? []))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;
  return (
    <section aria-label="Recommended for You" className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">Recommended for You</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ plan, reason }) => (
          <PlanCard key={plan.id} plan={plan} reason={reason} />
        ))}
      </div>
    </section>
  );
}
