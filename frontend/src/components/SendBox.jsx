import { useState } from 'react';

export default function SendBox({ onSend, disabled = false, label = 'Message' }) {
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    onSend(body);
    setText('');
  }

  return (
    <form onSubmit={submit} className="flex gap-2 border-t p-3">
      <input
        aria-label={label}
        className="flex-1 rounded border border-slate-300 px-3 py-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" disabled={disabled} className="rounded bg-teal-700 px-4 py-2 text-white disabled:opacity-50">
        Send
      </button>
    </form>
  );
}
