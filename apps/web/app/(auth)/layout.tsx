// Shared centered-card shell for /login, /register, /logout — mirrors the
// halftone-background treatment used on the P0 landing page (app/page.tsx)
// so auth screens don't look like a different app.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="halftone pointer-events-none fixed inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
