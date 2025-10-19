import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/auth";

import { Sidebar } from "./_components/sidebar";
import { TopBar } from "./_components/top-bar";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const username = session.user.name ?? "friend";

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <TopBar username={username} />
      <div className="flex min-h-[calc(100vh-3.5rem)] bg-[var(--bg)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[var(--bg)] px-6 py-8">
          <div className="mx-auto w-full max-w-5xl space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
