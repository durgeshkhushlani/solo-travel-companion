import { useEffect, useRef } from 'react';

// Shared by Private Chat and the Travel Assistant: `mine(m)` says which side a message is on.
export default function MessageList({ messages, mine, text }) {
  const end = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  return (
    <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-3" aria-label="Messages">
      {messages.map((m, i) => (
        <li
          key={m.id ?? i}
          className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
            mine(m) ? 'self-end bg-teal-700 text-white' : 'self-start bg-white shadow'
          }`}
        >
          {text(m)}
        </li>
      ))}
      <li ref={end} aria-hidden="true" />
    </ul>
  );
}
