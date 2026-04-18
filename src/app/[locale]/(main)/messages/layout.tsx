export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cancel main's pb-20 (reserved for fixed bottom nav) on mobile.
  // Messages pages manage their own height and must not double-count that space.
  return <div className="-mb-20 md:mb-0">{children}</div>;
}
