import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">Connect, Explore, Travel Together</h1>
      <p className="text-slate-600">Find a Travel Plan, join a Host and meet your next Companions.</p>
      <Link to="/explore" className="inline-block rounded bg-teal-700 px-5 py-2 text-white">
        Open the Explore Feed
      </Link>
    </main>
  );
}
