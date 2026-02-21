/* ─────────────────────────────────────────────────────────────────────────────
   Designer – App layout
   Wraps designer pages in a full-height container with no CRM chrome
   ───────────────────────────────────────────────────────────────────────────── */

export default function DesignerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-screen w-screen overflow-hidden">{children}</div>;
}
