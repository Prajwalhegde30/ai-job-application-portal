/**
 * Auth layout — minimal centered layout for login/register pages.
 * No sidebar, no header. Just a clean centered card.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
