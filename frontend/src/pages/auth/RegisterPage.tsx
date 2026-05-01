import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../api/auth";
import { saveAuth } from "../../store/authStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(form.email, form.username, form.password);
      saveAuth(data.user, data.access, data.refresh);
      navigate("/jobs");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { email?: string[]; username?: string[] } } })?.response?.data?.email?.[0] ||
        (err as { response?: { data?: { username?: string[] } } })?.response?.data?.username?.[0] ||
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg">SkillMap</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
        <p className="text-gray-400 text-sm mb-8">
          Know exactly what to learn next
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: "email", label: "Email", type: "email", placeholder: "you@example.com" },
            { id: "username", label: "Username", type: "text", placeholder: "yourhandle" },
            { id: "password", label: "Password", type: "password", placeholder: "Min. 8 characters" },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id}>
              <label className="block text-sm text-gray-400 mb-1.5" htmlFor={id}>
                {label}
              </label>
              <input
                id={id}
                type={type}
                value={form[id as keyof typeof form]}
                onChange={update(id as keyof typeof form)}
                required
                placeholder={placeholder}
                minLength={id === "password" ? 8 : undefined}
                className="w-full bg-surface-secondary border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
          ))}

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? "Creating account…" : "Get started free"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
