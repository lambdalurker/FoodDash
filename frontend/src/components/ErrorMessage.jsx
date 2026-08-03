export default function ErrorMessage({ error }) {
  if (!error || (Array.isArray(error) && error.length === 0)) return null;

  const messages = Array.isArray(error)
    ? error
    : typeof error === 'string'
    ? [error]
    : [error?.message || 'An unexpected error occurred.'];

  return (
    <div className="error-box" role="alert">
      {messages.map((msg, i) => (
        <p key={i}>{msg}</p>
      ))}
    </div>
  );
}
