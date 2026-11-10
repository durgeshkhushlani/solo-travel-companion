// A labelled input; keeps every form's markup and styling identical.
export default function FormField({ label, id, as: Tag = 'input', ...props }) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
      <Tag
        id={id}
        className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 font-normal"
        {...props}
      />
    </label>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}
