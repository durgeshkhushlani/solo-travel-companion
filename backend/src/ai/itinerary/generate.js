import { AiErrorCode, aiBadOutput } from '../ports.js';
import { buildItineraryPrompt, tripDays } from './prompt.js';
import { parseItinerary } from './parse.js';

// Itinerary Generator. One try, then one retry that shows the model its own parse error.
// AI_UNAVAILABLE from the llm is never retried: the service is down, asking again will not help.
export async function generateItinerary({ llm, input }) {
  const expectedDays = tripDays(input.startDate, input.endDate);
  const { system, user } = buildItineraryPrompt(input);
  const firstMessages = [{ role: 'user', content: user }];

  const first = await llm.generate({ system, messages: firstMessages, json: true });
  let firstError;
  try {
    return parseItinerary(first.text, expectedDays);
  } catch (error) {
    if (error.code !== AiErrorCode.AI_BAD_OUTPUT) throw error;
    firstError = error;
  }

  const retryMessages = [
    ...firstMessages,
    { role: 'model', content: first.text },
    {
      role: 'user',
      content: `Your answer was rejected: ${firstError.message}. Reply with corrected JSON only.`,
    },
  ];
  const second = await llm.generate({ system, messages: retryMessages, json: true });
  try {
    return parseItinerary(second.text, expectedDays);
  } catch (error) {
    if (error.code !== AiErrorCode.AI_BAD_OUTPUT) throw error;
    throw aiBadOutput('The Itinerary Generator could not produce a valid Generated Itinerary');
  }
}
