import TopNav from "@/components/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
    </div>
  );
}

