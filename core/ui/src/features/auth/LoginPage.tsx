import { FormEvent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login, setAccessToken } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { useAppShellStore } from "../../stores/appShellStore";

function toInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const setCurrentUser = useAppShellStore((state) => state.setCurrentUser);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await login(username.trim(), password);
      setAccessToken(response.accessToken);
      setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType,
        user: response.user
      });
      setCurrentUser({
        name: response.user.username,
        role: response.user.role.replace(/_/g, " "),
        initials: toInitials(response.user.username)
      });
      navigate(redirectTo, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">
            BatchSphere Security
          </span>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight text-slate-950">
            Sign in before you touch warehouse, QC, or master-data workflows.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            This phase introduces real application identity. The current bootstrap account is intended for development
            only and will later link into employee and HRMS data.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl border border-white/70 bg-white/90 px-5 py-5 shadow-card backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Role-aware</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Route protection now aligns the frontend with backend roles instead of placeholder access.
              </p>
            </article>
            <article className="rounded-3xl border border-white/70 bg-white/90 px-5 py-5 shadow-card backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Token-based</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                API calls carry bearer tokens so identity is consistent across GRN, sampling, and master data.
              </p>
            </article>
            <article className="rounded-3xl border border-white/70 bg-white/90 px-5 py-5 shadow-card backdrop-blur">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">HRMS-ready</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                User identity will later attach to employee records without replacing the auth layer.
              </p>
            </article>
          </div>
        </section>

        <section className="panel self-center px-8 py-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-400">Development Access</p>
          <h2 className="mt-3 text-2xl font-semibold text-ink">Sign in to BatchSphere</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use the seeded admin account for now. This will later move behind proper user provisioning.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Username</span>
              <input
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="admin"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="Admin@123"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-ink/50"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
