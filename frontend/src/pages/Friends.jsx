import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as friendsApi from '../api/friends.js';
import { errorMessage } from '../api/errors.js';
import { ErrorText } from '../components/FormField.jsx';

function Row({ user, children }) {
  return (
    <li className="flex items-center justify-between gap-2 p-3">
      <Link to={`/profile/${user.id}`} className="text-teal-700 hover:underline">{user.name}</Link>
      <span className="flex gap-2">{children}</span>
    </li>
  );
}

function Section({ title, empty, items, children }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      {items.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : (
        <ul className="divide-y rounded bg-white shadow">{children}</ul>
      )}
    </section>
  );
}

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [f, r, b] = await Promise.all([
        friendsApi.listFriends(), friendsApi.listFriendRequests(), friendsApi.listBlocks(),
      ]);
      setFriends(f.items);
      setIncoming(r.items);
      setBlocked(b.items);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = (fn) => async () => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Friends</h1>
      <ErrorText>{error}</ErrorText>
      <Section title="Friend Requests" empty="No Friend Requests." items={incoming}>
        {incoming.map((r) => (
          <Row key={r.friendshipId} user={r.user}>
            <button type="button" aria-label={`Accept ${r.user.name}`} className="rounded bg-teal-700 px-3 py-1 text-white" onClick={act(() => friendsApi.acceptFriendRequest(r.friendshipId))}>Accept</button>
          </Row>
        ))}
      </Section>
      <Section title="Your Friends" empty="You have no Friends yet." items={friends}>
        {friends.map((f) => (
          <Row key={f.friendshipId} user={f.user}>
            <Link to={`/chat?with=${f.user.id}`} className="rounded border px-3 py-1">Message</Link>
            <button type="button" aria-label={`Unfriend ${f.user.name}`} className="rounded border px-3 py-1" onClick={act(() => friendsApi.unfriend(f.user.id))}>Unfriend</button>
          </Row>
        ))}
      </Section>
      <Section title="Blocked Users" empty="You have not blocked anyone." items={blocked}>
        {blocked.map((u) => (
          <Row key={u.id} user={u}>
            <button type="button" aria-label={`Unblock ${u.name}`} className="rounded border px-3 py-1" onClick={act(() => friendsApi.unblockUser(u.id))}>Unblock</button>
          </Row>
        ))}
      </Section>
    </main>
  );
}
