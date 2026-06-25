import type { ReactNode } from "react";
import { BRAND, COPYRIGHT_YEAR } from "@/lib/brand";
import { NavBar } from "./NavBar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-bg min-h-screen">
      <TopBar />
      <NavBar />
      <main className="mx-auto max-w-[1320px] px-[30px] pb-[70px] pt-[30px]">{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line-card bg-card/60 py-5 text-center text-[13px] text-muted">
      <span className="font-semibold text-ink-4">{BRAND}</span> © {COPYRIGHT_YEAR} · Privacy Policy ·
      Terms of Service · Contact Us · Crafted with <span className="text-accent">♥</span>
    </footer>
  );
}
