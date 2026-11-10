import { itinerarySchema } from '../../validation/itinerary.schema.js';
import { aiBadOutput } from '../ports.js';

// Models like to wrap JSON in ```json fences even when told not to.
function stripFences(text) {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : text.trim();
}

// Parse, don't validate: untrusted text in, a Generated Itinerary or an AI_BAD_OUTPUT out.
// The message says what was wrong so it can be fed back to the model on the retry.
export function parseItinerary(text, expectedDays) {
  let json;
  try {
    json = JSON.parse(stripFences(text));
  } catch {
    throw aiBadOutput('The answer was not valid JSON');
  }

  const result = itinerarySchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw aiBadOutput(
      `The JSON did not match the shape at "${issue.path.join('.')}": ${issue.message}`,
    );
  }

  const { days } = result.data;
  if (days.length !== expectedDays) {
    throw aiBadOutput(`Expected exactly ${expectedDays} days but got ${days.length}`);
  }
  if (days.some((d, i) => d.day !== i + 1)) {
    throw aiBadOutput('Days must be numbered 1, 2, 3 in order');
  }
  return result.data;
}
