import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Assistant from './Assistant.jsx';
import * as aiApi from '../api/ai.js';
import { renderAt } from '../test/render.jsx';

vi.mock('../api/ai.js');

async function ask(text) {
  await userEvent.type(screen.getByLabelText('Ask the Travel Assistant'), text);
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
}

describe('Assistant page', () => {
  beforeEach(() => vi.resetAllMocks());

  it('posts_the_user_message_and_shows_the_reply', async () => {
    aiApi.askAssistant.mockResolvedValue({ reply: 'Try Hampi in March', steps: 1 });
    renderAt(<Assistant />);

    await ask('Where to trek?');

    expect(await screen.findByText('Try Hampi in March')).toBeInTheDocument();
    expect(aiApi.askAssistant).toHaveBeenCalledWith([{ role: 'user', content: 'Where to trek?' }]);
  });

  it('sends_the_whole_conversation_on_the_second_question', async () => {
    aiApi.askAssistant.mockResolvedValueOnce({ reply: 'Hampi', steps: 1 }).mockResolvedValueOnce({ reply: 'March', steps: 1 });
    renderAt(<Assistant />);

    await ask('Where?');
    await screen.findByText('Hampi');
    await ask('When?');

    expect(await screen.findByText('March')).toBeInTheDocument();
    expect(aiApi.askAssistant).toHaveBeenLastCalledWith([
      { role: 'user', content: 'Where?' },
      { role: 'assistant', content: 'Hampi' },
      { role: 'user', content: 'When?' },
    ]);
  });

  it('shows_a_friendly_message_when_the_assistant_is_unavailable', async () => {
    aiApi.askAssistant.mockRejectedValue({ response: { status: 503, data: { error: 'no key' } } });
    renderAt(<Assistant />);

    await ask('hello');

    expect(await screen.findByRole('alert')).toHaveTextContent(/not available/i);
  });
});
