import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/errors.js';
import FormField, { ErrorText } from '../components/FormField.jsx';

// Mirrors the API rules so most mistakes are caught before a request is sent.
export function validateRegistration({ name, email, password }) {
  if (!name.trim()) return 'Name is required.';
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email address.';
  if (password.length < 8 || password.length > 72) return 'Password must be 8-72 characters.';
  return '';
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const problem = validateRegistration(form);
    if (problem) return setError(problem);
    setError('');
    try {
      await register(form);
      navigate('/explore');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-10 max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <ErrorText>{error}</ErrorText>
      <FormField label="Name" id="name" name="name" value={form.name} onChange={update} />
      <FormField label="Email" id="email" name="email" type="email" value={form.email} onChange={update} />
      <FormField label="Password" id="password" name="password" type="password" value={form.password} onChange={update} />
      <button type="submit" className="w-full rounded bg-teal-700 py-2 text-white">Register</button>
      <p className="text-sm">
        Already registered? <Link to="/login" className="text-teal-700 underline">Log in</Link>
      </p>
    </form>
  );
}
