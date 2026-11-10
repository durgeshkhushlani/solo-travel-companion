import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getUser, updateMe } from '../api/users.js';
import * as friendsApi from '../api/friends.js';
import { errorMessage } from '../api/errors.js';
import { useAuth } from '../context/AuthContext.jsx';
import FormField, { ErrorText } from '../components/FormField.jsx';

const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

function ProfileEditor({ profile, onSaved }) {
  const [form, setForm] = useState({
    name: profile.name, bio: profile.bio ?? '', travelStyle: profile.travelStyle ?? '',
    photoUrl: profile.photoUrl ?? '', interests: profile.interests.join(', '),
  });
  const [error, setError] = useState('');
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function save(e) {
    e.preventDefault();
    try {
      const { user } = await updateMe({
        name: form.name, bio: form.bio, travelStyle: form.travelStyle || undefined,
        photoUrl: form.photoUrl || undefined, interests: splitList(form.interests),
      });
      onSaved(user);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <ErrorText>{error}</ErrorText>
      <FormField label="Name" id="name" name="name" value={form.name} onChange={change} />
      <FormField label="Bio" id="bio" name="bio" as="textarea" rows={3} value={form.bio} onChange={change} />
      <FormField label="Interests" id="interests" name="interests" value={form.interests} onChange={change} />
      <FormField label="Travel Style" id="travelStyle" name="travelStyle" value={form.travelStyle} onChange={change} />
      <FormField label="Photo URL" id="photoUrl" name="photoUrl" value={form.photoUrl} onChange={change} />
      <button type="submit" className="rounded bg-teal-700 px-4 py-2 text-white">Save profile</button>
    </form>
  );
}

// Friend, Friend Request and Block controls for someone else's Profile.
function SocialButtons({ userId }) {
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([friendsApi.listFriends(), friendsApi.listBlocks()])
      .then(([f, b]) => {
        setIsFriend(f.items.some((x) => x.user.id === userId));
        setIsBlocked(b.items.some((x) => x.id === userId));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [userId]);

  const run = (fn, after) => async () => {
    setError('');
    try {
      await fn();
      after();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="space-y-2">
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap gap-2">
        {isFriend ? (
          <button type="button" className="rounded border px-3 py-1" onClick={run(() => friendsApi.unfriend(userId), () => setIsFriend(false))}>Unfriend</button>
        ) : requested ? (
          <span className="text-sm text-slate-600">Friend Request sent</span>
        ) : (
          <button type="button" className="rounded bg-teal-700 px-3 py-1 text-white" onClick={run(() => friendsApi.sendFriendRequest(userId), () => setRequested(true))}>Add Friend</button>
        )}
        {isBlocked ? (
          <button type="button" className="rounded border px-3 py-1" onClick={run(() => friendsApi.unblockUser(userId), () => setIsBlocked(false))}>Unblock</button>
        ) : (
          <button type="button" className="rounded border border-red-700 px-3 py-1 text-red-700" onClick={run(() => friendsApi.blockUser(userId), () => setIsBlocked(true))}>Block</button>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user: me, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    getUser(id).then((d) => setProfile(d.user)).catch((err) => setError(errorMessage(err)));
  }, [id]);
  useEffect(load, [load]);

  if (!profile) return error ? <ErrorText>{error}</ErrorText> : <p className="p-6">Loading...</p>;
  const isSelf = me?.id === profile.id;

  function saved(user) {
    setProfile(user);
    setUser?.(user);
    setEditing(false);
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{profile.name}</h1>
      {profile.travelStyle && <p className="text-sm">Travel Style: {profile.travelStyle}</p>}
      {profile.bio && <p>{profile.bio}</p>}
      <p className="text-sm text-slate-600">
        Interests: {profile.interests.length ? profile.interests.join(', ') : 'none yet'}
      </p>
      {isSelf && !editing && (
        <button type="button" onClick={() => setEditing(true)} className="rounded border px-3 py-1">Edit profile</button>
      )}
      {isSelf && editing && <ProfileEditor profile={profile} onSaved={saved} />}
      {me && !isSelf && <SocialButtons userId={profile.id} />}
    </main>
  );
}
