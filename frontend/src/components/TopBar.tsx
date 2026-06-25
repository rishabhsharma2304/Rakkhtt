import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, Moon, Search, Sun } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { initials } from "@/lib/format";
import { Logo } from "./Logo";

export function TopBar() {
  const { me, activeOrg, switchOrg, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const [centreOpen, setCentreOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState("");

  const closeAll = () => {
    setCentreOpen(false);
    setUserOpen(false);
  };

  return (
    <>
      {(centreOpen || userOpen) && <div className="fixed inset-0 z-40" onClick={closeAll} />}
      <header className="topbar-surface sticky top-0 z-[60] flex items-center gap-6 border-b border-line-topbar px-[34px] py-3.5 backdrop-blur-md">
        <Link to="/" className="flex flex-shrink-0 items-center gap-3">
          <Logo />
          <span className="font-display text-[23px] font-extrabold tracking-[-0.5px] text-ink">{BRAND}</span>
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (search.trim()) nav(`/donors?search=${encodeURIComponent(search.trim())}`);
          }}
          className="relative hidden max-w-[520px] flex-1 md:block"
        >
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search donors, bags, requests…"
            className="w-full rounded-full bg-page py-2.5 pl-11 pr-4 text-sm font-medium text-ink outline-none transition focus:bg-card focus:ring-2 focus:ring-accent/40"
          />
        </form>

        <div className="ml-auto flex items-center gap-3">
          <button onClick={toggle} className="rounded-full p-2 text-muted hover:bg-hovertint" aria-label="Toggle dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Centre selector */}
          <div className="relative">
            <button
              onClick={() => {
                setCentreOpen((o) => !o);
                setUserOpen(false);
              }}
              className="flex items-center gap-2 rounded-[13px] border border-line-chip bg-page px-3 py-2 text-sm font-bold text-ink"
            >
              <Building2 size={16} className="text-accent-deep" />
              <span className="max-w-[180px] truncate">{activeOrg?.name ?? "Select centre"}</span>
              <ChevronDown size={15} className="text-muted" />
            </button>
            {centreOpen && (
              <div className="absolute right-0 top-full z-[60] mt-2 w-[290px] animate-rakRise rounded-2xl border border-line-drop bg-card p-2 shadow-droptop">
                {me?.memberships.map((o) => {
                  const sel = o.id === activeOrg?.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => {
                        closeAll();
                        if (!sel) switchOrg(o.id);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                        sel ? "bg-hovertint text-accent-deep" : "text-ink-4 hover:bg-hovertint"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${sel ? "bg-accent" : "border-2 border-line-chip"}`} />
                      <span className="flex-1 truncate">{o.name}</span>
                      <span className="text-xs text-muted">{o.id_prefix}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => {
                setUserOpen((o) => !o);
                setCentreOpen(false);
              }}
              className="flex items-center gap-2"
            >
              <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-drop-grad text-base font-bold uppercase text-white">
                {initials(me?.name)}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-sm font-bold leading-tight text-ink">{me?.name}</span>
                <span className="block text-xs capitalize text-muted">
                  {me?.is_master_user ? "Administrator" : me?.designation?.replace(/_/g, " ")}
                </span>
              </span>
              <ChevronDown size={15} className="text-muted" />
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full z-[60] mt-2 w-[210px] animate-rakRise rounded-2xl border border-line-drop bg-card p-2 shadow-droptop">
                <Link to="/settings" onClick={closeAll} className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-4 hover:bg-hovertint">My Profile</Link>
                <Link to="/settings" onClick={closeAll} className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink-4 hover:bg-hovertint">Settings</Link>
                <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-accent hover:bg-hovertint">Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
