import { useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, ChevronDown, ChevronUp, ChevronsUpDown, Clock, Copy,
  Download, Edit2, MapPin, Phone, Plus, QrCode, Share2, X,
} from "lucide-react";
import { api, fetchList } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { BarChart, Donut } from "@/components/charts";
import { Card, PrimaryButton } from "@/components/ui";

// ── Types ──────────────────────────────────────────────────────────────────────
type View = "picker" | "detail" | "bags" | "add";
type DetailTab =
  | "details"
  | "site-inspection"
  | "camp-duty"
  | "post-camp"
  | "donors-list"
  | "digital-donors"
  | "documents";

// ── Constants ──────────────────────────────────────────────────────────────────
const BAG_TYPES = ["DB-SAGM-350", "DB-SAGM-450", "TB-SAGM-350", "TB-SAGM-450", "SB-350"];
const BAG_VOL: Record<string, number> = {
  "DB-SAGM-350": 350, "DB-SAGM-450": 450,
  "TB-SAGM-350": 350, "TB-SAGM-450": 450, "SB-350": 350,
};
const SITE_ITEMS = [
  "Premises for blood donation camp shall have sufficient area (permanent or mobile van) and shall be located in a hygienic place.",
  "Continuous and uninterrupted electrical supply for equipment used in the camp.",
  "Adequate lighting for required activities.",
  "Hand-washing facility for staff.",
  "Reliable communication system to the central office of the controller/ organiser of the camp.",
  "Furniture and equipment arranged within the available space.",
  "Provision for pre-donation counselling.",
  "Facilities for medical examination of the donors.",
  "Refreshment facilities for donors and staff.",
  "Proper disposal of waste.",
];
const REJECTION_CASES = [
  "Anaemia",
  "Under Weight / Under Age",
  "Medical / Surgical Cases",
  "High Risk History",
  "Others",
];
const AGE_GROUPS = ["18-20", "21-30", "31-40", "41-50", "51-60", "61-65"];
const PIPELINE_STAGES = [
  "Segment\nBlood\nGrouping",
  "Blood\nProcessing",
  "Volume\nMeasurement",
  "Validation",
];

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        checked ? "bg-accent" : "bg-line-chip"
      }`}
    >
      <span
        className={`pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ── Social buttons ─────────────────────────────────────────────────────────────
function SocialButtons() {
  return (
    <div className="flex items-center gap-2">
      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white hover:brightness-110 flex-shrink-0">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.021.502 3.926 1.384 5.6L0 24l6.585-1.294A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm.029 21.818a9.846 9.846 0 01-5.017-1.376l-.36-.214-3.732.979 1-3.645-.234-.374A9.819 9.819 0 012.18 12c0-5.42 4.41-9.83 9.85-9.83 5.44 0 9.85 4.41 9.85 9.83s-4.41 9.818-9.85 9.818z" opacity=".15" />
        </svg>
      </button>
      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877F2] text-white hover:brightness-110 flex-shrink-0">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>
      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1DA1F2] text-white hover:brightness-110 flex-shrink-0">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
        </svg>
      </button>
    </div>
  );
}

// ── Illustrations ──────────────────────────────────────────────────────────────
function CampPickerIllustration() {
  return (
    <svg viewBox="0 0 340 260" className="w-full max-w-xs" fill="none">
      <circle cx="170" cy="130" r="120" fill="#F9D6E0" opacity=".4" />
      <circle cx="100" cy="160" r="60" fill="#FBCFE8" opacity=".5" />
      {/* Truck body */}
      <rect x="60" y="130" width="140" height="70" rx="8" fill="#3B82F6" />
      <rect x="60" y="130" width="55" height="70" rx="8" fill="#2563EB" />
      <rect x="62" y="135" width="48" height="40" rx="4" fill="#BFDBFE" />
      {/* Wheels */}
      <circle cx="100" cy="205" r="18" fill="#1E3A5F" />
      <circle cx="100" cy="205" r="9" fill="#93C5FD" />
      <circle cx="180" cy="205" r="18" fill="#1E3A5F" />
      <circle cx="180" cy="205" r="9" fill="#93C5FD" />
      {/* Boxes */}
      <rect x="230" y="145" width="35" height="30" rx="4" fill="#F59E0B" />
      <rect x="260" y="160" width="30" height="25" rx="4" fill="#FCD34D" />
      <rect x="240" y="175" width="32" height="25" rx="4" fill="#F59E0B" />
      {/* Pins */}
      <circle cx="210" cy="80" r="14" fill="#DC2626" />
      <path d="M210 94 L210 110" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="210" cy="80" r="5" fill="white" />
      <circle cx="250" cy="60" r="10" fill="#EC4899" />
      <path d="M250 70 L250 82" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
      <circle cx="250" cy="60" r="3.5" fill="white" />
      {/* Plants */}
      <rect x="30" y="175" width="12" height="25" rx="3" fill="#6EE7B7" />
      <ellipse cx="36" cy="165" rx="14" ry="18" fill="#34D399" />
      <ellipse cx="26" cy="170" rx="10" ry="13" fill="#6EE7B7" />
      {/* Ground */}
      <ellipse cx="170" cy="215" rx="120" ry="8" fill="#FDE68A" opacity=".4" />
    </svg>
  );
}

function StaffIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-40" fill="none">
      <circle cx="100" cy="100" r="88" fill="#DBEAFE" opacity=".5" />
      <rect x="70" y="100" width="60" height="70" rx="10" fill="#3B82F6" />
      <circle cx="100" cy="80" r="25" fill="#FDE68A" />
      <rect x="80" y="115" width="40" height="30" rx="4" fill="white" opacity=".9" />
      <line x1="88" y1="120" x2="112" y2="120" stroke="#3B82F6" strokeWidth="2" />
      <line x1="88" y1="127" x2="105" y2="127" stroke="#93C5FD" strokeWidth="2" />
      <rect x="60" y="130" width="12" height="35" rx="4" fill="#3B82F6" />
      <rect x="128" y="130" width="12" height="35" rx="4" fill="#3B82F6" />
    </svg>
  );
}

function PostCampIllustration() {
  return (
    <svg viewBox="0 0 160 200" className="w-32" fill="none">
      <circle cx="80" cy="100" r="75" fill="#DBEAFE" opacity=".4" />
      <rect x="50" y="90" width="60" height="80" rx="6" fill="#93C5FD" opacity=".5" />
      <rect x="55" y="60" width="50" height="75" rx="6" fill="white" stroke="#BFDBFE" />
      <line x1="62" y1="75" x2="98" y2="75" stroke="#93C5FD" strokeWidth="2" />
      <line x1="62" y1="83" x2="90" y2="83" stroke="#BFDBFE" strokeWidth="2" />
      <line x1="62" y1="91" x2="94" y2="91" stroke="#BFDBFE" strokeWidth="2" />
      <line x1="62" y1="99" x2="88" y2="99" stroke="#BFDBFE" strokeWidth="2" />
      <circle cx="100" cy="125" r="28" fill="#3B82F6" />
      <rect x="94" y="115" width="12" height="20" rx="3" fill="white" />
      <rect x="88" y="128" width="24" height="11" rx="3" fill="#1E40AF" />
    </svg>
  );
}

// ── CampPicker ─────────────────────────────────────────────────────────────────
function CampPicker({
  onDetail,
  onBags,
}: {
  onDetail: (c: any) => void;
  onBags: (c: any) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "name">("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const PAGE_SIZE = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["bag-camps", page, search, sort, order],
    queryFn: () => fetchList("/camps", { page, page_size: PAGE_SIZE, search, sort, order }),
    placeholderData: keepPreviousData,
  });
  const camps = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleSort(col: "date" | "name") {
    if (sort === col) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSort(col); setOrder("desc"); }
  }

  function pageNums(): (number | "...")[] {
    if (lastPage <= 7) return Array.from({ length: lastPage }, (_, i) => i + 1);
    const near = [Math.max(1, page - 1), page, Math.min(lastPage, page + 1)].filter(
      (n) => n > 1 && n < lastPage,
    );
    const nums: (number | "...")[] = [1];
    if (near[0] > 2) nums.push("...");
    nums.push(...near);
    if (near[near.length - 1] < lastPage - 1) nums.push("...");
    nums.push(lastPage);
    return nums;
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-ink">Bag Entry</h2>
        <div className="flex items-center gap-2">
          <PrimaryButton>
            <Plus size={15} /> Add Inhouse Blood Bags
          </PrimaryButton>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:brightness-110">
            <Clock size={16} />
          </button>
        </div>
      </div>

      {/* two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.65fr]">
        {/* illustration */}
        <div className="hidden items-center justify-center lg:flex">
          <CampPickerIllustration />
        </div>

        {/* table card */}
        <Card className="p-6">
          <h3 className="mb-5 font-display text-xl font-bold text-ink">Choose A Camp</h3>

          {/* search */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm font-semibold text-muted">Search:</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 rounded-lg border border-line-chip bg-page px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          {/* table */}
          <div className="overflow-hidden rounded-xl border border-line-table">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-fill">
                  <th
                    className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-muted"
                    onClick={() => toggleSort("date")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Date
                      {sort === "date" ? (
                        order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      ) : (
                        <ChevronsUpDown size={12} className="opacity-40" />
                      )}
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-muted"
                    onClick={() => toggleSort("name")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Camp Name
                      {sort === "name" ? (
                        order === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      ) : (
                        <ChevronsUpDown size={12} className="opacity-40" />
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-center text-[12px] font-bold uppercase tracking-wide text-muted">
                    Inward
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-sm text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : camps.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-sm text-muted">
                      No camps found.
                    </td>
                  </tr>
                ) : (
                  camps.map((c: any) => (
                    <tr key={c.id} className="border-t border-line-table hover:bg-rowtint">
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-ink-3">
                        {fmtDate(c.date)}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => onDetail(c)}
                          className="text-left font-semibold text-accent hover:underline capitalize"
                        >
                          {c.name}
                        </button>
                        {c.location_text && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                            <MapPin size={11} className="text-accent flex-shrink-0" />
                            {c.location_text}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => onBags(c)}
                          className="rounded-full bg-accent px-4 py-2 text-[12px] font-bold text-white hover:brightness-110"
                        >
                          Add Blood Bags Here
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-line-chip px-3 py-1.5 text-sm font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
            >
              Previous
            </button>
            {pageNums().map((n, i) =>
              n === "..." ? (
                <span key={`e${i}`} className="px-1 text-sm text-muted">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`h-8 w-8 rounded-lg text-sm font-bold transition ${
                    page === n
                      ? "bg-accent text-white"
                      : "border border-line-chip text-ink-4 hover:bg-hovertint"
                  }`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              disabled={page >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              className="rounded-lg border border-line-chip px-3 py-1.5 text-sm font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
            >
              Next
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── CampDetailView ─────────────────────────────────────────────────────────────
function CampDetailView({
  camp,
  onBack,
}: {
  camp: any;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("details");

  const TABS: { key: DetailTab; label: string; teal?: boolean }[] = [
    { key: "details", label: "Details" },
    { key: "site-inspection", label: "Site Inspection" },
    { key: "camp-duty", label: "Camp Duty" },
    { key: "post-camp", label: "Post Camp Report" },
    { key: "donors-list", label: "Donor's List" },
    { key: "digital-donors", label: "Digital Donors" },
    { key: "documents", label: "Documents", teal: true },
  ];

  return (
    <div className="space-y-4">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-display text-xl font-bold text-ink">Bag Entry</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:brightness-110">
            <Edit2 size={15} />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:brightness-110">
            <Copy size={15} />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:brightness-110">
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* dark camp header */}
      <div className="rounded-2xl bg-[#1C2138] p-6 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold capitalize leading-tight">{camp.name}</h1>
            <div className="mt-1.5 flex items-center gap-4 text-sm text-white/60">
              <span className="capitalize">{camp.type === "inhouse" ? "In-house" : "Other Camp"}</span>
              <span>{fmtDate(camp.date, "MMM. d, yyyy")}</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {camp.organiser && (
              <div className="flex items-center justify-end gap-2 text-white/80">
                <Phone size={13} className="text-white/50 flex-shrink-0" />
                <span>
                  <span className="font-semibold text-white">Contact Person</span> :{" "}
                  {camp.organiser}
                </span>
              </div>
            )}
            {camp.location_text && (
              <div className="flex items-center justify-end gap-2 text-white/80">
                <MapPin size={13} className="text-white/50 flex-shrink-0" />
                <span>
                  <span className="font-semibold text-white">Location</span> :{" "}
                  {camp.location_text}
                </span>
              </div>
            )}
            <div className="mt-2 flex justify-end">
              <SocialButtons />
            </div>
          </div>
        </div>
      </div>

      {/* tab navigation + content */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-0.5 border-b border-line-table px-2 pt-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.key
                  ? "bg-accent text-white"
                  : t.teal
                  ? "text-info hover:bg-hovertint"
                  : "text-ink-4 hover:bg-hovertint"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === "details" && <DetailsTab camp={camp} />}
          {tab === "site-inspection" && <SiteInspectionTab />}
          {tab === "camp-duty" && <CampDutyTab />}
          {tab === "post-camp" && <PostCampTab camp={camp} />}
          {tab === "donors-list" && <DonorsListTab camp={camp} />}
          {tab === "digital-donors" && <DigitalDonorsTab />}
          {tab === "documents" && <DocumentsTab />}
        </div>
      </Card>
    </div>
  );
}

// ── OrgHeader (reused in sub-tabs) ─────────────────────────────────────────────
function OrgHeader() {
  return (
    <div className="mb-6 flex items-start justify-between border-b border-line-table pb-4">
      <div className="text-base font-bold uppercase tracking-wide text-ink">
        Alaknanda Charitable Blood Centre
      </div>
      <div className="flex items-center gap-1.5 text-sm text-ink-4">
        <Phone size={13} /> 9568803926
      </div>
    </div>
  );
}

// ── DetailsTab ─────────────────────────────────────────────────────────────────
function DetailsTab({ camp }: { camp: any }) {
  const { data: bagsData } = useQuery({
    queryKey: ["bags-for-camp", camp.id],
    queryFn: () => fetchList("/bags", { camp_id: camp.id, page_size: 500 }),
  });
  const bags = bagsData?.items ?? [];

  const { data: donationsData } = useQuery({
    queryKey: ["donations-for-camp", camp.id],
    queryFn: () => fetchList("/donations", { camp_id: camp.id, page_size: 500 }),
  });
  const donations = donationsData?.items ?? [];

  const donorIds = useMemo(
    () => [...new Set(donations.map((d: any) => d.donor_id))],
    [donations],
  );

  const { data: allDonorsData } = useQuery({
    queryKey: ["donors-details", donorIds.join(",")],
    queryFn: () => fetchList("/donors", { page_size: 1000 }),
    enabled: donorIds.length > 0,
  });
  const donorMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const d of allDonorsData?.items ?? []) m[d.id] = d;
    return m;
  }, [allDonorsData]);

  // Blood groups donut — bags don't carry blood_group so show pending
  const bgData = [{ label: "Pending Grouping", value: bags.length, color: "#60A5FA" }];

  // Bag usage donut
  const bagTypeCounts: Record<string, number> = {};
  for (const b of bags) bagTypeCounts[b.bag_type] = (bagTypeCounts[b.bag_type] || 0) + 1;
  const bagColors = ["#F9A8D4", "#C084FC", "#60A5FA", "#34D399", "#FB923C"];
  const bagUsageData = Object.entries(bagTypeCounts).map(([label, value], i) => ({
    label,
    value,
    color: bagColors[i % bagColors.length],
  }));

  // Age & gender
  const maleGroups: Record<string, number> = Object.fromEntries(AGE_GROUPS.map((g) => [g, 0]));
  const femaleGroups: Record<string, number> = Object.fromEntries(AGE_GROUPS.map((g) => [g, 0]));
  for (const don of donations) {
    const donor = donorMap[don.donor_id];
    if (!donor) continue;
    const ageVal =
      donor.age ||
      (donor.dob
        ? Math.floor((Date.parse(new Date().toISOString()) - Date.parse(donor.dob)) / (365.25 * 86400000))
        : null);
    if (!ageVal) continue;
    const g = (donor.gender || "male").toLowerCase();
    let grp = "61-65";
    if (ageVal <= 20) grp = "18-20";
    else if (ageVal <= 30) grp = "21-30";
    else if (ageVal <= 40) grp = "31-40";
    else if (ageVal <= 50) grp = "41-50";
    else if (ageVal <= 60) grp = "51-60";
    if (g === "female") femaleGroups[grp] = (femaleGroups[grp] || 0) + 1;
    else maleGroups[grp] = (maleGroups[grp] || 0) + 1;
  }
  const ageBarData = AGE_GROUPS.map((g) => ({
    label: g,
    value: maleGroups[g] + femaleGroups[g],
    color: "#60A5FA",
  }));
  const totalMale = Object.values(maleGroups).reduce((s, v) => s + v, 0);
  const totalFemale = Object.values(femaleGroups).reduce((s, v) => s + v, 0);
  const pendingForms = donations.filter((d: any) => d.status === "pending").length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Blood Groups */}
      <div className="rounded-xl border border-line-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-ink">Blood Groups</h4>
          <div className="flex items-center gap-1.5">
            {bags.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-bold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {bags.length} Blood Grouping Are Pending
              </span>
            )}
            <button className="rounded-lg bg-accent px-3 py-1 text-[11px] font-bold text-white">
              PDF
            </button>
            <button className="rounded-lg border border-line-chip p-1.5 text-muted hover:bg-hovertint">
              <Download size={12} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <Donut
            data={bgData}
            size={150}
            hole={28}
            centerValue={bags.length > 0 ? "Pending\nGrouping" : "0"}
            centerLabel={String(bags.length)}
          />
          <div className="flex-1 min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-table">
                  <th className="pb-2 text-left font-semibold text-ink">Blood Groups</th>
                  <th className="pb-2 text-right font-semibold text-ink">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line-table">
                  <td className="py-1.5 text-muted">Pending Grouping</td>
                  <td className="py-1.5 text-right font-bold text-ink">{bags.length}</td>
                </tr>
                <tr>
                  <td className="pt-2 font-semibold text-ink">Total</td>
                  <td className="pt-2 text-right font-bold text-ink">{bags.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Age & Gender */}
      <div className="rounded-xl border border-line-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-ink">Age & Gender</h4>
          <div className="flex items-center gap-1.5">
            {pendingForms > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-1 text-[11px] font-bold text-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {pendingForms} Donor Forms Are Pending
              </span>
            )}
            <button className="rounded-lg bg-accent px-3 py-1 text-[11px] font-bold text-white">
              PDF
            </button>
            <button className="rounded-lg border border-line-chip p-1.5 text-muted hover:bg-hovertint">
              <Download size={12} />
            </button>
          </div>
        </div>
        <BarChart data={ageBarData} height={140} gradientClass="bg-bar-graph" />
        <div className="mt-2 flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#60A5FA]" /> Male
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-[#FB7185]" /> Female
          </span>
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line-table text-[12px]">
          <table className="w-full">
            <thead className="bg-fill">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-ink">Gender</th>
                {AGE_GROUPS.map((g) => (
                  <th key={g} className="px-2 py-2 text-center font-semibold text-ink">
                    {g}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-ink">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line-table">
                <td className="px-3 py-1.5">Male</td>
                {AGE_GROUPS.map((g) => (
                  <td key={g} className="px-2 py-1.5 text-center">
                    {maleGroups[g]}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right font-bold">{totalMale}</td>
              </tr>
              <tr className="border-t border-line-table">
                <td className="px-3 py-1.5">Female</td>
                {AGE_GROUPS.map((g) => (
                  <td key={g} className="px-2 py-1.5 text-center">
                    {femaleGroups[g]}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right font-bold">{totalFemale}</td>
              </tr>
              <tr className="border-t border-line-table bg-fill font-bold">
                <td className="px-3 py-1.5">Total</td>
                {AGE_GROUPS.map((g) => (
                  <td key={g} className="px-2 py-1.5 text-center">
                    {(maleGroups[g] || 0) + (femaleGroups[g] || 0)}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right">{totalMale + totalFemale}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bag Usage */}
      {bags.length > 0 && (
        <div className="rounded-xl border border-line-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-ink">Bag Usage</h4>
            <div className="flex items-center gap-1.5">
              <button className="rounded-lg bg-accent px-3 py-1 text-[11px] font-bold text-white">
                PDF
              </button>
              <button className="rounded-lg border border-line-chip p-1.5 text-muted hover:bg-hovertint">
                <Download size={12} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Donut
              data={bagUsageData.length ? bagUsageData : [{ label: "None", value: 1, color: "#F3E5EA" }]}
              size={150}
              hole={28}
              centerValue={bagUsageData[0]?.label ?? "—"}
              centerLabel={String(bags.length)}
            />
            <div className="flex-1 min-w-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-table">
                    <th className="pb-2 text-left font-semibold text-ink">Bag Type</th>
                    <th className="pb-2 text-right font-semibold text-ink">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {bagUsageData.map((d) => (
                    <tr key={d.label} className="border-b border-line-table">
                      <td className="py-1.5 text-muted">{d.label}</td>
                      <td className="py-1.5 text-right font-bold text-ink">{d.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-2 font-semibold text-ink">Total</td>
                    <td className="pt-2 text-right font-bold text-ink">{bags.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SiteInspectionTab ──────────────────────────────────────────────────────────
function SiteInspectionTab() {
  const today = new Date();
  const [checks, setChecks] = useState<boolean[]>(SITE_ITEMS.map(() => true));
  const [inspDate] = useState(
    `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`,
  );

  return (
    <div className="rounded-xl border border-line-card p-6">
      <OrgHeader />
      <div className="mb-6 grid grid-cols-1 gap-4 border-b border-line-table pb-6 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-info">Date of inspection</label>
          <input
            defaultValue={inspDate}
            className="w-full border-b border-line-chip bg-transparent py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-info">Counsellor</label>
          <div className="flex cursor-pointer items-center gap-2 border-b border-line-chip py-1.5">
            <span className="flex-1 text-sm text-muted">— Select staff —</span>
            <ChevronDown size={14} className="text-muted" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-info">Remark</label>
          <input className="w-full border-b border-line-chip bg-transparent py-1.5 text-sm outline-none focus:border-accent" />
        </div>
        <div className="flex justify-end sm:col-start-3">
          <button className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-white">
            PDF
          </button>
        </div>
      </div>

      <div className="divide-y divide-line-table">
        {SITE_ITEMS.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-4">
            <span className="text-sm text-ink">
              <span className="font-bold">{i + 1}.</span> {item}
            </span>
            <div className="mt-0.5 flex-shrink-0">
              <Toggle
                checked={checks[i]}
                onChange={(v) =>
                  setChecks((c) => c.map((x, j) => (j === i ? v : x)))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <PrimaryButton>Save Site Inspection</PrimaryButton>
      </div>
    </div>
  );
}

// ── CampDutyTab ────────────────────────────────────────────────────────────────
function CampDutyTab() {
  const [incharge, setIncharge] = useState({
    camp_incharge: "", material_return_duty: "", hb_done_by: "", inhouse_driver: "",
    senior_technician: "", counsellor: "", routine_shift: "", night_shift: "",
    leaving_time: "09:30", remarks: "",
  });
  const [items, setItems] = useState<{ name: string; qty: string }[]>([]);
  const [newItem, setNewItem] = useState({ name: "", qty: "" });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const INCHARGE_FIELDS = [
    { key: "camp_incharge", label: "Camp Incharge" },
    { key: "material_return_duty", label: "Material Return Duty" },
    { key: "hb_done_by", label: "HB Done By" },
    { key: "inhouse_driver", label: "Inhouse Driver" },
    { key: "senior_technician", label: "Senior Technician" },
    { key: "counsellor", label: "Counsellor" },
    { key: "routine_shift", label: "Routine Shift" },
    { key: "night_shift", label: "Night Shift" },
  ] as const;

  return (
    <div className="space-y-8 rounded-xl border border-line-card p-6">
      <OrgHeader />

      {/* 1. Camp Staff & Vehicle */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-ink">1. Camp Staff & Vehicle</h3>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <button className="w-full rounded-lg bg-[#3B4BC8] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">
              None selected
            </button>
            <button className="w-full rounded-lg bg-[#3B4BC8] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">
              None selected
            </button>
          </div>
          <div className="flex items-center justify-center">
            <StaffIllustration />
          </div>
        </div>
      </div>

      {/* 2. Assign Incharge */}
      <div>
        <h3 className="mb-4 text-center text-lg font-bold text-ink">2. Assign Incharge</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {INCHARGE_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-semibold text-info">{f.label}</label>
              <input
                value={(incharge as any)[f.key]}
                onChange={(e) => setIncharge((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.label}
                className="w-full rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-semibold text-info">Leaving Time</label>
            <input
              value={incharge.leaving_time}
              onChange={(e) => setIncharge((s) => ({ ...s, leaving_time: e.target.value }))}
              className="w-full rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-info">Remarks</label>
            <textarea
              value={incharge.remarks}
              onChange={(e) => setIncharge((s) => ({ ...s, remarks: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>
      </div>

      {/* 3. Camp Items */}
      <div>
        <h3 className="mb-4 text-lg font-bold text-ink">3. Camp Items</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none">
            <option>Optional Item</option>
          </select>
          <input
            value={newItem.name}
            onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))}
            placeholder="Item Name"
            className="flex-1 min-w-0 rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
          <input
            value={newItem.qty}
            onChange={(e) => setNewItem((s) => ({ ...s, qty: e.target.value }))}
            placeholder="Quantity"
            className="w-28 rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            onClick={() => {
              if (newItem.name) {
                setItems((prev) => [...prev, newItem]);
                setNewItem({ name: "", qty: "" });
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white hover:brightness-110"
          >
            <Plus size={15} />
          </button>
          <button
            onClick={() => setNewItem({ name: "", qty: "" })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
          >
            <X size={15} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-info text-white hover:brightness-110">
            <Edit2 size={14} />
          </button>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-line-table">
          <table className="w-full text-sm">
            <thead className="bg-fill">
              <tr>
                <th className="w-10 px-3 py-2.5">
                  <input type="checkbox" className="h-4 w-4 accent-[#DC2626]" />
                </th>
                <th className="px-4 py-2.5 text-left font-semibold text-ink">Name</th>
                <th className="px-4 py-2.5 text-right font-semibold text-ink">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-muted">
                    No items added.
                  </td>
                </tr>
              ) : (
                items.map((it, i) => (
                  <tr key={i} className="border-t border-line-table">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(i)}
                        onChange={(e) =>
                          setSelectedItems((s) => {
                            const ns = new Set(s);
                            e.target.checked ? ns.add(i) : ns.delete(i);
                            return ns;
                          })
                        }
                        className="h-4 w-4 accent-[#DC2626]"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-ink">{it.name}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-ink">{it.qty}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center">
        <PrimaryButton>Save Camp Duty</PrimaryButton>
      </div>
      <p className="text-center text-xs text-muted">
        ⊕ Please choose the staff and camp items as per the guidelines of{" "}
        <span className="font-semibold text-ink-4">Drugs & Cosmetics Act 1940</span>…
      </p>
    </div>
  );
}

// ── PostCampTab ────────────────────────────────────────────────────────────────
function PostCampTab({ camp }: { camp: any }) {
  const today = new Date();
  const fmtToday = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`;
  const [form, setForm] = useState({
    report_date: fmtDate(camp.date, "MM/dd/yyyy"),
    first_donation_time: `${fmtDate(camp.date, "MM/dd/yyyy")} 10:00`,
    total_collection: "",
    transport_box_no: "",
    send_time: `${fmtToday} 13:00`,
    send_temp: "",
    receive_time: `${fmtToday} 13:00`,
    receive_temp: "",
    remarks: "",
  });
  const [rejections, setRejections] = useState<Record<string, { male: number; female: number }>>(
    Object.fromEntries(REJECTION_CASES.map((c) => [c, { male: 0, female: 0 }])),
  );

  const totalMale = REJECTION_CASES.reduce((s, c) => s + (rejections[c]?.male || 0), 0);
  const totalFemale = REJECTION_CASES.reduce((s, c) => s + (rejections[c]?.female || 0), 0);

  const PC_FIELDS = [
    { key: "report_date", label: "Report Date" },
    { key: "first_donation_time", label: "Time of 1st Donation" },
    { key: "total_collection", label: "Total Collection" },
    { key: "transport_box_no", label: "Transport Box No.", placeholder: "Transport Box No." },
    { key: "send_time", label: "Time of Sending Units from Camp" },
    { key: "send_temp", label: "Temperature at Time of Sending (in °C)", placeholder: "In °C" },
    { key: "receive_time", label: "Time of Receiving Units from Camp" },
    { key: "receive_temp", label: "Temperature at Time of Receiving (in °C)", placeholder: "In °C" },
  ] as const;

  return (
    <div className="rounded-xl border border-line-card p-6">
      <OrgHeader />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[180px_1fr]">
        <div className="flex items-start justify-center pt-4">
          <PostCampIllustration />
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-ink">Post Camp Details</h3>
            <button className="rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-white">
              PDF
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {PC_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-info">{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={(f as any).placeholder}
                  className="w-full border-b border-line-chip bg-transparent py-1.5 text-sm outline-none focus:border-accent"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-info">Remarks</label>
              <input
                value={form.remarks}
                onChange={(e) => setForm((s) => ({ ...s, remarks: e.target.value }))}
                placeholder="Remarks (If Any)"
                className="w-full border-b border-line-chip bg-transparent py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line-table">
            <table className="w-full text-sm">
              <thead className="bg-fill">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink">Case</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-ink">Male</th>
                  <th className="px-4 py-2.5 text-center font-semibold text-ink">Female</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink">Total</th>
                </tr>
              </thead>
              <tbody>
                {REJECTION_CASES.map((c) => (
                  <tr key={c} className="border-t border-line-table">
                    <td className="px-4 py-2 text-info">{c}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        value={rejections[c].male}
                        onChange={(e) =>
                          setRejections((r) => ({
                            ...r,
                            [c]: { ...r[c], male: Number(e.target.value) },
                          }))
                        }
                        className="w-16 rounded border border-line-chip bg-page px-2 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min={0}
                        value={rejections[c].female}
                        onChange={(e) =>
                          setRejections((r) => ({
                            ...r,
                            [c]: { ...r[c], female: Number(e.target.value) },
                          }))
                        }
                        className="w-16 rounded border border-line-chip bg-page px-2 py-1 text-center text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-bold">
                      {(rejections[c].male || 0) + (rejections[c].female || 0)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line-table bg-fill font-bold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="px-4 py-2.5 text-center">{totalMale}</td>
                  <td className="px-4 py-2.5 text-center">{totalFemale}</td>
                  <td className="px-4 py-2.5 text-right">{totalMale + totalFemale}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <PrimaryButton>Save Post Camp Report</PrimaryButton>
      </div>
    </div>
  );
}

// ── DonorsListTab ──────────────────────────────────────────────────────────────
function DonorsListTab({ camp }: { camp: any }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: bagsData } = useQuery({
    queryKey: ["donors-list-bags", camp.id, page, search],
    queryFn: () =>
      fetchList("/bags", { camp_id: camp.id, page, page_size: PAGE_SIZE, search }),
    placeholderData: keepPreviousData,
  });
  const bags = bagsData?.items ?? [];
  const total = bagsData?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const donorIds = useMemo(() => [...new Set(bags.map((b: any) => b.donor_id).filter(Boolean))], [bags]);
  const { data: allDonorsData } = useQuery({
    queryKey: ["donors-bulk-list", donorIds.join(",")],
    queryFn: () => fetchList("/donors", { page_size: 1000 }),
    enabled: donorIds.length > 0,
  });
  const donorMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const d of allDonorsData?.items ?? []) m[d.id] = d;
    return m;
  }, [allDonorsData]);

  function exportCsv() {
    const rows = bags.map((b: any) => {
      const d = donorMap[b.donor_id];
      return `"${b.bag_no}","${d?.name || ""}","${d?.contact || ""}","${d?.dob || ""}"`;
    });
    const blob = new Blob([["Donor ID,Name,Contact,DOB", ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "donor-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-line-card p-6">
      <OrgHeader />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span className="font-semibold">Search:</span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="rounded-lg border border-line-chip bg-page px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted">Download Donor List</span>
          <button className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white">PDF</button>
          <button
            onClick={exportCsv}
            className="rounded-lg bg-excel px-3 py-1.5 text-xs font-bold text-white"
          >
            Excel
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line-table">
        <table className="w-full text-sm">
          <thead className="bg-fill">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-ink">
                Donor ID <ChevronsUpDown size={11} className="inline opacity-40" />
              </th>
              <th className="px-4 py-3 text-left font-semibold text-ink">
                Donor Name <ChevronsUpDown size={11} className="inline opacity-40" />
              </th>
            </tr>
          </thead>
          <tbody>
            {bags.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-10 text-center text-sm text-muted">
                  No donors found for this camp.
                </td>
              </tr>
            ) : (
              bags.map((b: any) => {
                const donor = donorMap[b.donor_id];
                return (
                  <tr key={b.id} className="border-t border-line-table hover:bg-rowtint">
                    <td className="px-4 py-3">
                      <button className="font-semibold text-accent hover:underline">
                        {b.bag_no}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {donor ? (
                        <div>
                          <div className="font-semibold uppercase text-ink">{donor.name}</div>
                          {donor.contact && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                              <Phone size={10} /> {donor.contact}
                            </div>
                          )}
                          {donor.dob && (
                            <div className="mt-0.5 text-xs text-muted">
                              🎂 {fmtDate(donor.dob, "d MMMM yyyy")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to{" "}
          {Math.min(page * PAGE_SIZE, total)} of {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
          >
            Previous
          </button>
          <span className="rounded-lg bg-accent px-3 py-1.5 font-bold text-white">{page}</span>
          <button
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DigitalDonorsTab ───────────────────────────────────────────────────────────
function DigitalDonorsTab() {
  return (
    <div className="rounded-xl border border-line-card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-ink">Donor List</h3>
        <div className="flex items-center gap-2">
          <PrimaryButton>
            <Plus size={15} /> Add
          </PrimaryButton>
          <button className="inline-flex items-center gap-2 rounded-btn border border-line-chip bg-card px-4 py-2.5 text-sm font-bold text-ink hover:bg-hovertint">
            <QrCode size={15} /> Share QR Code
          </button>
          <button className="inline-flex items-center gap-2 rounded-btn border border-line-chip bg-card px-4 py-2.5 text-sm font-bold text-ink hover:bg-hovertint">
            <Share2 size={15} /> Share Link
          </button>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <span className="font-semibold">Search:</span>
        <input className="rounded-lg border border-line-chip bg-page px-3 py-1.5 text-sm outline-none" />
      </div>
      <div className="overflow-hidden rounded-xl border border-line-table">
        <table className="w-full text-sm">
          <thead className="bg-fill">
            <tr>
              {["Donation Date", "Name", "Token No.", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-ink">
                  {h} <ChevronsUpDown size={11} className="inline opacity-40" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="py-10 text-center text-sm text-muted">
                No data available in table
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end gap-1">
        <button className="rounded-lg border border-line-chip px-3 py-1.5 text-sm font-semibold text-ink-4 hover:bg-hovertint">
          Previous
        </button>
        <button className="rounded-lg border border-line-chip px-3 py-1.5 text-sm font-semibold text-ink-4 hover:bg-hovertint">
          Next
        </button>
      </div>
    </div>
  );
}

// ── DocumentsTab ───────────────────────────────────────────────────────────────
function DocumentsTab() {
  const [showEntries, setShowEntries] = useState(25);
  const [search, setSearch] = useState("");
  return (
    <div className="rounded-xl border border-line-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-ink">Documents</h3>
        <PrimaryButton>
          <Plus size={15} /> Add
        </PrimaryButton>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          Show
          <select
            value={showEntries}
            onChange={(e) => setShowEntries(Number(e.target.value))}
            className="rounded-lg border border-line-chip bg-card px-2 py-1 text-ink"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          entries
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-info">Search:</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-line-chip bg-page px-3 py-1.5 text-sm outline-none"
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line-table">
        <table className="w-full text-sm">
          <thead className="bg-fill">
            <tr>
              {["Date / Time", "Name", "Description", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-ink">
                  {h} {h !== "Actions" && <ChevronsUpDown size={11} className="inline opacity-40" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="py-10 text-center text-sm text-muted">
                No data available in table
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>Showing 0 to 0 of 0 entries</span>
        <div className="flex items-center gap-1">
          <button className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 hover:bg-hovertint">
            Previous
          </button>
          <button className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 hover:bg-hovertint">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CampBagsView ───────────────────────────────────────────────────────────────
function CampBagsView({
  camp,
  onBack,
  onAdd,
}: {
  camp: any;
  onBack: () => void;
  onAdd: () => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showEntries, setShowEntries] = useState(100);
  const [sort, setSort] = useState("collection_date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const { data, isLoading } = useQuery({
    queryKey: ["camp-bags-view", camp.id, page, search, sort, order, showEntries],
    queryFn: () =>
      fetchList("/bags", {
        camp_id: camp.id,
        page,
        page_size: showEntries,
        search,
        sort,
        order,
      }),
    placeholderData: keepPreviousData,
  });
  const bags = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / showEntries));

  function toggleSort(col: string) {
    if (sort === col) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSort(col); setOrder("asc"); }
  }

  return (
    <div className="space-y-4">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-display text-xl font-bold text-ink">Bag Entry</h2>
        </div>
        <PrimaryButton onClick={onAdd}>
          <Plus size={15} /> Add Blood Bags
        </PrimaryButton>
      </div>

      <Card className="p-6">
        <h3 className="mb-6 font-display text-xl font-bold capitalize text-ink">
          {camp.name}'s Blood Bags
        </h3>

        {/* progress stepper */}
        <div className="mb-8 flex items-start px-4">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={i} className="flex flex-1 items-start">
              <div className="flex flex-col items-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent bg-white text-sm font-bold text-accent">
                  {i + 1}
                </div>
                <div className="whitespace-pre-line text-center text-[11px] font-semibold text-accent">
                  {stage}
                </div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="mx-1 mt-4 flex-1 border-t-2 border-accent" />
              )}
            </div>
          ))}
        </div>

        {/* toolbar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted">
            Show
            <select
              value={showEntries}
              onChange={(e) => setShowEntries(Number(e.target.value))}
              className="rounded-lg border border-line-chip bg-card px-2 py-1 text-ink"
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            entries
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="font-semibold">Search:</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="rounded-lg border border-line-chip bg-page px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line-table">
          <table className="w-full text-sm">
            <thead className="bg-fill">
              <tr>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-semibold text-ink"
                  onClick={() => toggleSort("bag_no")}
                >
                  Donor ID <ChevronsUpDown size={11} className="inline opacity-40" />
                </th>
                <th
                  className="cursor-pointer px-4 py-3 text-left font-semibold text-ink"
                  onClick={() => toggleSort("bag_type")}
                >
                  Bag Type <ChevronsUpDown size={11} className="inline opacity-40" />
                </th>
                <th className="px-4 py-3 text-right font-semibold text-ink">
                  Bag Volume (in mL)
                </th>
                <th className="px-4 py-3 text-center font-semibold text-ink">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-muted">
                    Loading…
                  </td>
                </tr>
              ) : bags.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-muted">
                    No bags entered for this camp yet.
                  </td>
                </tr>
              ) : (
                bags.map((b: any) => (
                  <tr key={b.id} className="border-t border-line-table hover:bg-rowtint">
                    <td className="px-4 py-3 font-semibold text-accent">{b.bag_no}</td>
                    <td className="px-4 py-3 text-ink-3">{b.bag_type}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">
                      {b.gross_volume_ml ?? BAG_VOL[b.bag_type] ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white hover:brightness-110">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <span>
            Showing {total === 0 ? 0 : (page - 1) * showEntries + 1} to{" "}
            {Math.min(page * showEntries, total)} of {total} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
            >
              Previous
            </button>
            <span className="rounded-lg bg-accent px-3 py-1.5 font-bold text-white">{page}</span>
            <button
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── AddBagsView ────────────────────────────────────────────────────────────────
interface PendingBag {
  id: string;
  donorText: string;
  bagType: string;
  volume: number;
  segmentNo: string;
  datetime: string;
}

function AddBagsView({ camp, onBack }: { camp: any; onBack: () => void }) {
  const qc = useQueryClient();
  const donorInputRef = useRef<HTMLInputElement>(null);

  const [showBloodGroup, setShowBloodGroup] = useState(false);
  const [editDateTime, setEditDateTime] = useState(false);
  const [lessQty, setLessQty] = useState("No");
  const [bagType, setBagType] = useState("Automatic Detection");
  const [donorText, setDonorText] = useState("");
  const [segmentNo, setSegmentNo] = useState("");
  const [pendingBags, setPendingBags] = useState<PendingBag[]>([]);
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());

  const saveMut = useMutation({
    mutationFn: async (bags: PendingBag[]) => {
      for (const b of bags) {
        const resolvedType =
          b.bagType === "Automatic Detection" ? "DB-SAGM-450" : b.bagType;
        await api.post("/bags", {
          bag_no: b.segmentNo || b.donorText || `AUTO-${Date.now()}`,
          bag_type: resolvedType,
          camp_id: camp.id,
          collection_date: String(camp.date).slice(0, 10),
          gross_volume_ml: b.volume,
          segment_no: b.segmentNo || undefined,
          status: "collected",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camp-bags-view", camp.id] });
      qc.invalidateQueries({ queryKey: ["list", "/bags"] });
      setPendingBags([]);
      onBack();
    },
  });

  function addBag() {
    if (!donorText.trim()) return;
    const resolvedType =
      bagType === "Automatic Detection" ? "DB-SAGM-450" : bagType;
    const baseVol = BAG_VOL[resolvedType] ?? 450;
    const vol = lessQty === "Yes" ? Math.floor(baseVol * 0.7) : baseVol;
    const now = new Date();
    const dtStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setPendingBags((prev) => [
      ...prev,
      { id: `${now.getTime()}-${prev.length}`, donorText, bagType: resolvedType, volume: vol, segmentNo, datetime: dtStr },
    ]);
    setDonorText("");
    setSegmentNo("");
    donorInputRef.current?.focus();
  }

  const summary: Record<string, number> = {};
  for (const b of pendingBags) summary[b.bagType] = (summary[b.bagType] || 0) + 1;

  return (
    <div className="space-y-4">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="font-display text-lg font-bold text-ink">
            Bag Entry{" "}
            <span className="text-sm font-normal text-muted">
              ({camp.name} ( {fmtDate(camp.date)} ))
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <span className="font-semibold text-ink-4">Show Blood Group</span>
            <Toggle checked={showBloodGroup} onChange={setShowBloodGroup} />
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="font-semibold text-ink-4">Edit Date/Time</span>
            <Toggle checked={editDateTime} onChange={setEditDateTime} />
          </label>
        </div>
      </div>

      <Card className="p-6">
        {/* entry form row */}
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">Less Quantity</label>
            <select
              value={lessQty}
              onChange={(e) => setLessQty(e.target.value)}
              className="rounded-lg border border-line-chip bg-page px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">Bag type</label>
            <select
              value={bagType}
              onChange={(e) => setBagType(e.target.value)}
              className="rounded-lg border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="Automatic Detection">Automatic Detection</option>
              {BAG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1 block text-[11px] font-semibold text-muted">
              Donor ID{" "}
              <span className="text-[10px] font-normal">(Press enter to +)</span>
            </label>
            <input
              ref={donorInputRef}
              value={donorText}
              onChange={(e) => setDonorText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addBag(); }
              }}
              placeholder="Donor ID"
              className="w-full rounded-lg border-b-2 border-accent bg-transparent px-2 py-1.5 text-sm font-semibold outline-none"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-[11px] font-semibold text-muted">Segment No.</label>
            <input
              value={segmentNo}
              onChange={(e) => setSegmentNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addBag(); }
              }}
              placeholder="Segment No."
              className="w-full rounded-lg border-b-2 border-line-chip bg-transparent px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={addBag}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-success text-white hover:brightness-110"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => { setDonorText(""); setSegmentNo(""); }}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white hover:brightness-110"
          >
            <X size={16} />
          </button>
        </div>

        {/* pending bags table */}
        <div className="overflow-hidden rounded-xl border border-line-table">
          <table className="w-full text-sm">
            <thead className="bg-fill">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 accent-[#DC2626]" />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Donor Id</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Bag Type</th>
                <th className="px-4 py-3 text-right font-semibold text-info">Volume (in mL)</th>
                <th className="px-4 py-3 text-left font-semibold text-ink">Inward Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {pendingBags.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center gap-3 py-12">
                      {/* mini illustration */}
                      <svg viewBox="0 0 120 100" className="w-28 opacity-70" fill="none">
                        <circle cx="60" cy="45" r="40" fill="#DBEAFE" opacity=".5" />
                        <rect x="35" y="25" width="50" height="65" rx="5" fill="white" stroke="#BFDBFE" strokeWidth="1.5" />
                        <line x1="44" y1="38" x2="76" y2="38" stroke="#93C5FD" strokeWidth="2" />
                        <line x1="44" y1="46" x2="70" y2="46" stroke="#BFDBFE" strokeWidth="2" />
                        <line x1="44" y1="54" x2="72" y2="54" stroke="#BFDBFE" strokeWidth="2" />
                        <line x1="44" y1="62" x2="66" y2="62" stroke="#BFDBFE" strokeWidth="2" />
                        <circle cx="80" cy="72" r="18" fill="#22C55E" />
                        <path d="M72 72 L77 77 L88 66" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingBags.map((b) => (
                  <tr key={b.id} className="border-t border-line-table hover:bg-rowtint">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checkedRows.has(b.id)}
                        onChange={(e) =>
                          setCheckedRows((s) => {
                            const ns = new Set(s);
                            e.target.checked ? ns.add(b.id) : ns.delete(b.id);
                            return ns;
                          })
                        }
                        className="h-4 w-4 accent-[#DC2626]"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-accent">{b.donorText}</td>
                    <td className="px-4 py-3 text-ink-3">{b.bagType}</td>
                    <td className="px-4 py-3 text-right font-bold text-ink">{b.volume}</td>
                    <td className="px-4 py-3 text-muted">{b.datetime}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* summary section */}
        <div className="mt-5">
          <h4 className="mb-3 font-bold text-ink">Blood Bag's Summary</h4>
          <div className="overflow-hidden rounded-xl border border-line-table" style={{ maxWidth: 340 }}>
            <table className="w-full text-sm">
              <thead className="bg-fill">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-ink">Bag Type</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-ink">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(summary).length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-xs text-muted">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  Object.entries(summary).map(([type, count]) => (
                    <tr key={type} className="border-t border-line-table">
                      <td className="px-4 py-2 text-ink-3">{type}</td>
                      <td className="px-4 py-2 text-right font-bold text-ink">{count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pendingBags.length > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <PrimaryButton
                onClick={() => saveMut.mutate(pendingBags)}
                disabled={saveMut.isPending}
              >
                {saveMut.isPending ? "Saving…" : `Save All Bags (${pendingBags.length})`}
              </PrimaryButton>
              <button
                onClick={() => setPendingBags([])}
                className="inline-flex items-center gap-2 rounded-btn border border-line-chip bg-card px-4 py-2.5 text-sm font-bold text-ink hover:bg-hovertint"
              >
                Clear
              </button>
              {saveMut.isError && (
                <span className="text-sm font-semibold text-accent">Error saving. Try again.</span>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── BagsPage (main) ────────────────────────────────────────────────────────────
export function BagsPage() {
  const [view, setView] = useState<View>("picker");
  const [camp, setCamp] = useState<any>(null);

  return (
    <div className="space-y-5">
      {view === "picker" && (
        <CampPicker
          onDetail={(c) => { setCamp(c); setView("detail"); }}
          onBags={(c) => { setCamp(c); setView("bags"); }}
        />
      )}

      {view === "detail" && camp && (
        <CampDetailView
          camp={camp}
          onBack={() => setView("picker")}
        />
      )}

      {view === "bags" && camp && (
        <CampBagsView
          camp={camp}
          onBack={() => setView("picker")}
          onAdd={() => setView("add")}
        />
      )}

      {view === "add" && camp && (
        <AddBagsView
          camp={camp}
          onBack={() => setView("bags")}
        />
      )}
    </div>
  );
}
