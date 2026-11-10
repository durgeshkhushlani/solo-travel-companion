import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getHistory, listConversations, markRead } from '../api/messages.js';
import { errorMessage } from '../api/errors.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../hooks/useSocket.js';
import MessageList from '../components/MessageList.jsx';
import SendBox from '../components/SendBox.jsx';
import { ErrorText } from '../components/FormField.jsx';

const addOnce = (list, message) => (list.some((m) => m.id === message.id) ? list : [...list, message]);

export default function Chat() {
  const { user } = useAuth();
  const socket = useSocket();
  const [params] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(params.get('with'));
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listConversations().then((d) => setConversations(d.items)).catch((e) => setError(errorMessage(e)));
  }, []);

  const open = useCallback(async (friendId) => {
    setActiveId(friendId);
    try {
      const history = await getHistory(friendId);
      setMessages(history.items);
      await markRead(friendId);
      setConversations((cs) => cs.map((c) => (c.user.id === friendId ? { ...c, unread: 0 } : c)));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (activeId) open(activeId);
  }, [activeId, open]);

  // Live delivery: show it in the open chat, otherwise raise that conversation's Unread Badge.
  useEffect(() => {
    if (!socket) return undefined;
    const onMessage = (m) => {
      const friendId = m.senderId === user.id ? m.receiverId : m.senderId;
      const fromThem = m.senderId !== user.id;
      if (friendId === activeId) {
        setMessages((list) => addOnce(list, m));
        if (fromThem) markRead(friendId).catch(() => {});
      }
      setConversations((cs) =>
        cs.map((c) =>
          c.user.id === friendId
            ? { ...c, last: m, unread: fromThem && friendId !== activeId ? c.unread + 1 : c.unread }
            : c
        )
      );
    };
    socket.on('private:message', onMessage);
    return () => socket.off('private:message', onMessage);
  }, [socket, activeId, user.id]);

  function send(body) {
    setError('');
    socket.emit('private:message', { to: activeId, body }, (ack) => {
      if (ack?.ok) setMessages((list) => addOnce(list, ack.message));
      else setError(ack?.error ?? 'Message could not be sent.');
    });
  }

  return (
    <main className="mx-auto flex h-[80vh] max-w-4xl gap-4 p-6">
      <aside className="w-64 shrink-0 overflow-y-auto rounded bg-white shadow">
        <h1 className="p-3 text-lg font-semibold">Private Chat</h1>
        {conversations.length === 0 && <p className="p-3 text-sm text-slate-500">Add a Friend to start chatting.</p>}
        <ul>
          {conversations.map((c) => (
            <li key={c.user.id}>
              <button
                type="button"
                onClick={() => setActiveId(c.user.id)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left ${c.user.id === activeId ? 'bg-teal-50' : ''}`}
              >
                <span>
                  <span className="block font-medium">{c.user.name}</span>
                  <span className="block truncate text-xs text-slate-500">{c.last?.body ?? 'No messages yet'}</span>
                </span>
                {c.unread > 0 && (
                  <span aria-label={`${c.unread} unread`} className="rounded-full bg-red-600 px-2 text-xs text-white">{c.unread}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="flex flex-1 flex-col rounded bg-slate-100 shadow">
        <ErrorText>{error}</ErrorText>
        {activeId ? (
          <>
            <MessageList messages={messages} mine={(m) => m.senderId === user.id} text={(m) => m.body} />
            <SendBox onSend={send} disabled={!socket} />
          </>
        ) : (
          <p className="p-6 text-slate-500">Choose a Friend to start a Private Chat.</p>
        )}
      </section>
    </main>
  );
}
