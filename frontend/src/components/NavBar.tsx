import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Menu, X } from "lucide-react";

interface MenuItem {
  label: string;
  to: string;
  children?: MenuItem[];
}
interface MenuGroup {
  header?: string;
  items: MenuItem[];
}
interface NavEntry {
  key: string;
  label: string;
  to: string;
  groups?: MenuGroup[];
}

const NAV: NavEntry[] = [
  {
    key: "home",
    label: "Home",
    to: "/",
    groups: [
      {
        items: [
          { label: "Dashboard", to: "/" },
          { label: "Accounting", to: "/accounting" },
          { label: "Tools", to: "/tools" },
          { label: "Directory", to: "/directory" },
          { label: "Users", to: "/users" },
          { label: "Settings", to: "/settings" },
        ],
      },
    ],
  },
  { key: "camp", label: "Camp", to: "/camp" },
  {
    key: "bloodbag",
    label: "Blood Bag",
    to: "/bags",
    groups: [
      {
        header: "I. Component Preparation",
        items: [
          { label: "Bag Entry", to: "/bags" },
          { label: "Segment Blood Grouping", to: "/pipeline/component/segmentation" },
          { label: "Blood Processing", to: "/pipeline/component/processing" },
          { label: "Component Volume", to: "/pipeline/component/volume" },
          { label: "Validation", to: "/pipeline/component/validation" },
        ],
      },
      {
        header: "II. Grouping",
        items: [
          { label: "F/R Grouping", to: "/pipeline/grouping/forward-reverse" },
          { label: "Validation", to: "/pipeline/grouping/validation" },
        ],
      },
      {
        header: "III. TTI",
        items: [
          { label: "HIV / HBsAG & HCV", to: "/pipeline/tti/hiv-hbsag-hcv" },
          { label: "VDRL & MP", to: "/pipeline/tti/vdrl-mp" },
          { label: "Validation", to: "/pipeline/tti/validation" },
        ],
      },
      { header: "IV. Shift To Tested Stock", items: [{ label: "Shift To Tested Stock", to: "/stock/shift" }] },
      { header: "V. Lab", items: [{ label: "Quarantine & Discard", to: "/quarantine" }] },
    ],
  },
  { key: "donor", label: "Donor", to: "/donors" },
  { key: "qc", label: "QC", to: "/qc" },
  { key: "store", label: "Store", to: "/store" },
  { key: "reception", label: "Reception", to: "/reception" },
  {
    key: "analytics",
    label: "Analytics",
    to: "/analytics",
    groups: [
      {
        items: [
          { label: "MIS Reports", to: "/reports/mis" },
          { label: "Registers", to: "/reports/registers" },
          {
            label: "Graphs",
            to: "/analytics?tab=graphs",
            children: [
              { label: "Accounting", to: "/accounting" },
              { label: "Camp", to: "/analytics?tab=graphs&report=camp" },
              { label: "Blood Bags", to: "/analytics?tab=graphs&report=component" },
              { label: "Donor", to: "/analytics?tab=graphs&report=donor" },
              { label: "Deferred Donor", to: "/analytics?tab=graphs&report=donor-deferred" },
              { label: "Reception", to: "/analytics?tab=graphs&report=reception" },
              { label: "TTI", to: "/analytics?tab=graphs&report=tti" },
            ],
          },
          { label: "Performance Indicators", to: "/analytics?tab=pi" },
          { label: "Feedbacks", to: "/feedback" },
          { label: "Donor Recall", to: "/donor-recall" },
        ],
      },
    ],
  },
];

function isActive(pathname: string, to: string): boolean {
  const base = to.split("?")[0];
  if (base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(base + "/");
}

export function NavBar() {
  const [open, setOpen] = useState<string | null>(null);
  const [subOpen, setSubOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();

  return (
    <nav
      className="sticky z-50 bg-nav-grad shadow-nav"
      style={{ top: 71 }}
      onMouseLeave={() => setOpen(null)}
    >
      {/* Mobile bar: brand-less hamburger row (the brand lives in the TopBar) */}
      <div className="flex items-center justify-between px-5 py-3 lg:hidden">
        <span className="text-[15px] font-bold text-white/90">Menu</span>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-lg p-1.5 text-white hover:bg-white/10"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile collapsible menu */}
      {mobileOpen && (
        <div className="max-h-[70vh] overflow-y-auto border-t border-white/10 bg-nav-grad px-3 pb-4 lg:hidden">
          {NAV.map((entry) => (
            <div key={entry.key} className="py-1">
              <Link
                to={entry.to.split("?")[0]}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-[15px] font-bold ${
                  isActive(loc.pathname, entry.to) ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {entry.label}
              </Link>
              {entry.groups?.map((g, gi) => (
                <div key={gi} className="ml-2 border-l border-white/15 pl-3">
                  {g.header && <div className="px-2 pt-2 text-[11.5px] font-bold uppercase tracking-wide text-white/50">{g.header}</div>}
                  {g.items.map((it) => (
                    <div key={it.to}>
                      <Link
                        to={it.to}
                        onClick={() => setMobileOpen(false)}
                        className={`block rounded-lg px-2 py-2 text-[14px] font-semibold ${
                          isActive(loc.pathname, it.to) ? "text-white" : "text-white/70 hover:text-white"
                        }`}
                      >
                        {it.label}
                      </Link>
                      {it.children && (
                        <div className="ml-3 border-l border-white/15 pl-3">
                          {it.children.map((sub) => (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={() => setMobileOpen(false)}
                              className="block rounded-lg px-2 py-1.5 text-[13.5px] font-semibold text-white/60 hover:text-white"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Desktop horizontal nav with hover dropdowns */}
      <div className="mx-auto hidden max-w-[1320px] items-stretch px-[26px] lg:flex">
        {NAV.map((entry) => {
          const active = isActive(loc.pathname, entry.to);
          return (
            <div key={entry.key} className="relative" onMouseEnter={() => setOpen(entry.groups ? entry.key : null)}>
              <button
                onClick={() => nav(entry.to.split("?")[0])}
                className={`relative px-[18px] py-[18px] text-[15px] font-bold transition ${
                  active ? "text-white" : "text-white/[0.74] hover:text-white"
                }`}
              >
                {entry.label}
                {active && (
                  <span className="absolute inset-x-[14px] bottom-0 h-[3px] rounded-t-[3px] bg-white" />
                )}
              </button>

              {entry.groups && open === entry.key && (
                <div
                  className="absolute left-0 top-full z-50 min-w-[260px] animate-rakRise rounded-b-2xl border border-line-drop bg-card p-2.5 shadow-dropnav"
                  style={{ borderRadius: "0 0 16px 16px" }}
                >
                  {entry.groups.map((g, gi) => (
                    <div key={gi} className="mb-1 last:mb-0">
                      {g.header && (
                        <div className="px-3 py-1.5 font-display text-[13.5px] font-bold text-ink">{g.header}</div>
                      )}
                      {g.items.map((it) => {
                        const itActive = isActive(loc.pathname, it.to);
                        if (it.children) {
                          return (
                            <div
                              key={it.to}
                              className="relative"
                              onMouseEnter={() => setSubOpen(it.label)}
                              onMouseLeave={() => setSubOpen(null)}
                            >
                              <Link
                                to={it.to}
                                onClick={() => { setOpen(null); setSubOpen(null); }}
                                className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[14.5px] font-semibold text-ink-4 transition hover:bg-hovertint hover:text-accent-deep"
                              >
                                <span className="flex items-center gap-2.5">
                                  <span
                                    className={`h-[9px] w-[9px] rounded-full border-2 ${
                                      itActive ? "border-accent bg-accent" : "border-line-chip"
                                    }`}
                                  />
                                  {it.label}
                                </span>
                                <ChevronRight size={14} className="text-muted-3" />
                              </Link>
                              {subOpen === it.label && (
                                <div className="absolute left-full top-0 z-50 ml-1 min-w-[210px] animate-rakRise rounded-2xl border border-line-drop bg-card p-2.5 shadow-dropnav">
                                  {it.children.map((sub) => {
                                    const subActive = isActive(loc.pathname, sub.to) && (sub.to.split("?")[0] !== "/analytics" || loc.search.includes(sub.to.split("?")[1] ?? ""));
                                    return (
                                      <Link
                                        key={sub.to}
                                        to={sub.to}
                                        onClick={() => { setOpen(null); setSubOpen(null); }}
                                        className="group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14.5px] font-semibold text-ink-4 transition hover:bg-hovertint hover:text-accent-deep"
                                      >
                                        <span
                                          className={`h-[9px] w-[9px] rounded-full border-2 ${
                                            subActive ? "border-accent bg-accent" : "border-line-chip"
                                          }`}
                                        />
                                        {sub.label}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <Link
                            key={it.to}
                            to={it.to}
                            onClick={() => setOpen(null)}
                            className="group flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[14.5px] font-semibold text-ink-4 transition hover:bg-hovertint hover:text-accent-deep"
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className={`h-[9px] w-[9px] rounded-full border-2 ${
                                  itActive ? "border-accent bg-accent" : "border-line-chip"
                                }`}
                              />
                              {it.label}
                            </span>
                            <ChevronRight size={14} className="text-muted-3 opacity-0 group-hover:opacity-100" />
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
