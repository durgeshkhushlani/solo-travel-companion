import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/errors.js';
import FormField, { ErrorText } from '../components/FormField.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(form);
      navigate('/explore');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <ErrorText>{error}</ErrorText>
      <FormField label="Email" id="email" name="email" type="email" required value={form.email} onChange={update} />
      <FormField label="Password" id="password" name="password" type="password" required value={form.password} onChange={update} />
      <button type="submit" className="w-full rounded bg-teal-700 py-2 text-white">Log in</button>
      <p className="text-sm">
        New here? <Link to="/register" className="text-teal-700 underline">Create an account</Link>
      </p>
    </form>
  );
}
