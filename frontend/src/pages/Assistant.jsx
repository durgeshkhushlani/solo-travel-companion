import { useState } from 'react';
import { askAssistant } from '../api/ai.js';
import { errorMessage } from '../api/errors.js';
import MessageList from '../components/MessageList.jsx';
import SendBox from '../components/SendBox.jsx';
import { ErrorText } from '../components/FormField.jsx';

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The API is stateless: every call carries the whole conversation so far.
  async function send(content) {
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setError('');
    setBusy(true);
    try {
      const { reply } = await askAssistant(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(
        err?.response?.status === 503
          ? 'The Travel Assistant is not available right now.'
          : errorMessage(err)
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex h-[80vh] max-w-2xl flex-col p-6">
      <h1 className="mb-2 text-2xl font-semibold">Travel Assistant</h1>
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-1 flex-col overflow-hidden rounded bg-slate-100 shadow">
        {messages.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Ask about Travel Plans, destinations or packing.</p>
        )}
        <MessageList messages={messages} mine={(m) => m.role === 'user'} text={(m) => m.content} />
        {busy && <p className="px-3 pb-2 text-sm text-slate-500">Thinking...</p>}
        <SendBox onSend={send} disabled={busy} label="Ask the Travel Assistant" />
      </div>
    </main>
  );
}
