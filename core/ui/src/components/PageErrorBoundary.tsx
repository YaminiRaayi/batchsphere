import { useEffect, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";

type PageErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorFallbackProps = {
  error: unknown;
  resetErrorBoundary: () => void;
};

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const message = error instanceof Error ? error.message : "Unexpected UI error";

  useEffect(() => {
    toast.error(message);
  }, [message]);

  return (
    <section className="panel max-w-3xl px-6 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-redoxide">
        Route Error
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">
        This screen failed to render.
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate">
        {message}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={resetErrorBoundary} className="btn-primary">
          Retry screen
        </button>
        <button type="button" onClick={() => window.location.assign("/")} className="btn-ghost">
          Go to dashboard
        </button>
      </div>
    </section>
  );
}

export function PageErrorBoundary({ children }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
