import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
