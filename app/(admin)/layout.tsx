export const metadata = {
  title: {
    default: "Panel",
    template: "%s — Panel Polar",
  },
  robots: { index: false, follow: false },
};

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
