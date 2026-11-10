// The text an Embedder turns into an Embedding. Same wording for plans and users so the two
// land close together in the vector space; fields that are empty are left out.
const line = (label, value) => (value ? `${label}: ${value}` : null);
const join = (lines) => lines.filter(Boolean).join('\n');

export function planEmbeddingText(plan) {
  return join([
    line('Trip', plan.title),
    line('Destination', plan.destination),
    line('Interests', plan.interests?.join(', ')),
    line('About', plan.description),
  ]);
}

export function profileEmbeddingText(user) {
  return join([
    line('Travel style', user.travelStyle),
    line('Interests', user.interests?.join(', ')),
    line('About', user.bio),
  ]);
}
