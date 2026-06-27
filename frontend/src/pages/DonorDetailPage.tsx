import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, parseISO } from "date-fns";
import { ArrowLeft, Calendar, Droplet, MapPin, Phone, User } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Card, LoadingState, StatusPill } from "@/components/ui";

// ── helpers ──────────────────────────────────────────────────────────────────

function rhLabel(bg?: string | null) {
  if (!bg) return "—";
  const g = bg.replace(/[+-]$/, "");
  if (bg.endsWith("+")) return `${g} Rh Pos`;
  if (bg.endsWith("-")) return `${g} Rh Neg`;
  return bg;
}

function cap(s?: string | null) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
        value ? "bg-blue-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`pointer-events-none mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-line-table py-3 last:border-0">
      <dt className="w-44 flex-shrink-0 text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink-3">{value ?? "—"}</dd>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DonorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"details" | "questionnaire" | "bag" | "donations">("details");

  const { data, isLoading } = useQuery({
    queryKey: ["donor-detail", id],
    queryFn: () => api.get(`/donors/${id}/detail`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <LoadingState message="Loading donor profile…" />;
  if (!data) return null;

  const {
    donor,
    bag,
    camp,
    latest_donation: donation,
    components,
    grouping,
    tti,
    pipeline_records,
    all_donations,
    all_bags,
  } = data;

  const nextDate = donor.last_donation_date
    ? fmtDate(
        addDays(parseISO(donor.last_donation_date), 90).toISOString(),
        "MMM d, yyyy"
      )
    : "—";

  const TABS = [
    { key: "details", label: "Details" },
    { key: "questionnaire", label: "Questionnaire" },
    { key: "bag", label: "Blood Bag" },
    { key: "donations", label: "Donations" },
  ] as const;

  const headerInfo = [
    {
      icon: <User size={13} />,
      label: "Age, Sex",
      value: donor.age ? `${donor.age}, ${donor.gender ?? "—"}` : "—",
    },
    { icon: <Phone size={13} />, label: "Number", value: donor.contact ?? "—" },
    {
      icon: <Droplet size={13} />,
      label: "Blood Group",
      value: rhLabel(donor.blood_group),
    },
    {
      icon: <MapPin size={13} />,
      label: "Address",
      value: donor.address ?? "—",
    },
    {
      icon: <MapPin size={13} />,
      label: "Camp",
      value: camp ? (
        <span className="inline-flex items-center rounded-md bg-accent/70 px-2 py-0.5 text-xs font-semibold text-white">
          {camp.name}
        </span>
      ) : (
        "—"
      ),
    },
    {
      icon: <Calendar size={13} />,
      label: "Donation",
      value: donation ? fmtDate(donation.date, "yyyy-MM-dd") : "—",
    },
    {
      icon: <Calendar size={13} />,
      label: "Next Donation Date",
      value: nextDate,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate("/donors")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to Donors
      </button>

      {/* Dark header */}
      <div className="rounded-card2 bg-[#0f172a] p-7 text-white">
        <div className="mb-5">
          <h1 className="font-display text-[30px] font-extrabold tracking-tight leading-tight">
            {donor.name}
          </h1>
          <p className="mt-1 text-sm font-mono text-white/40">{bag?.bag_no ?? "—"}</p>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {headerInfo.map(({ icon, label, value }, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="flex-shrink-0 text-white/30">{icon}</span>
              <span className="text-white/50">{label} :</span>
              <span className="font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <Card className="px-5 py-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
                tab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink-4"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Tab content */}
      {tab === "details" && (
        <DetailsTab
          donor={donor}
          donation={donation}
          camp={camp}
          bag={bag}
          components={components}
          grouping={grouping}
          tti={tti}
          pipeline_records={pipeline_records}
        />
      )}
      {tab === "questionnaire" && (
        <QuestionnaireTab donation={donation} />
      )}
      {tab === "bag" && (
        <BloodBagTab
          bag={bag}
          donor={donor}
          components={components}
          grouping={grouping}
          tti={tti}
        />
      )}
      {tab === "donations" && (
        <DonationsTab
          donor={donor}
          all_donations={all_donations}
          all_bags={all_bags}
          tti={tti}
        />
      )}
    </div>
  );
}

// ── Details Tab ───────────────────────────────────────────────────────────────

function DetailsTab({ donor, donation, camp, bag, components, grouping, tti, pipeline_records }: any) {
  const s = donation?.screening_json ?? {};

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Left column */}
      <div className="space-y-5">
        {/* Donor Details */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-bold text-ink">Donor Details</h3>
            {s.registered_by && (
              <span className="rounded-lg bg-info/10 px-2 py-1 text-xs font-bold text-info">
                Registered By {s.registered_by}
              </span>
            )}
          </div>
          <dl>
            <InfoRow
              label="Date of Birth"
              value={donor.dob ? fmtDate(donor.dob, "dd/MM/yyyy") : "—"}
            />
            <InfoRow label="Blood Group" value={donor.blood_group ?? "—"} />
            <InfoRow label="Contact" value={donor.contact ?? "—"} />
            <InfoRow label="Govt ID" value={donor.govt_id ?? "—"} />
            <InfoRow label="Address" value={donor.address ?? "—"} />
            <InfoRow
              label="Deferral Status"
              value={
                donor.deferral_status === "none" ? (
                  <StatusPill tone="good">Eligible</StatusPill>
                ) : donor.deferral_status === "permanent" ? (
                  <StatusPill tone="danger">Permanent</StatusPill>
                ) : (
                  <StatusPill tone="warn">{cap(donor.deferral_status)}</StatusPill>
                )
              }
            />
          </dl>
          <button className="mt-4 w-full rounded-xl bg-info/10 py-2.5 text-sm font-semibold text-info transition hover:bg-info/20">
            Add Adverse Reaction Details
          </button>
        </Card>

        {/* Medical Details */}
        <Card className="p-6">
          <h3 className="font-display text-[17px] font-bold text-ink mb-4">Medical Details</h3>
          {!donation ? (
            <p className="py-3 text-sm text-muted">No screening data recorded yet.</p>
          ) : (
            <dl>
              <InfoRow
                label="Haemoglobin"
                value={s.hb != null ? `${s.hb} g/dL` : "—"}
              />
              <InfoRow
                label="Weight"
                value={s.weight != null ? `${s.weight} Kg` : "—"}
              />
              <InfoRow label="Blood Pressure" value={s.bp ?? "—"} />
              <InfoRow
                label="Temperature"
                value={s.temperature ? `${s.temperature}°F` : "—"}
              />
              <InfoRow label="Pulse" value={s.pulse ?? "—"} />
              <InfoRow label="HB Done By" value={s.hb_done_by ?? "—"} />
            </dl>
          )}
        </Card>
      </div>

      {/* Right column — Timeline */}
      <DonorTimeline
        donor={donor}
        donation={donation}
        camp={camp}
        bag={bag}
        components={components}
        grouping={grouping}
        tti={tti}
        pipeline_records={pipeline_records}
      />
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function DonorTimeline({ donor, donation, camp, bag, components, grouping, tti, pipeline_records }: any) {
  type Ev = { side: "left" | "right"; title: string; date?: string; body: string };
  const events: Ev[] = [];

  if (donation) {
    events.push({
      side: "left",
      title: "Appeared for donation",
      date: donation.date,
      body: `${donor.name} appeared for blood donation${camp ? ` at ${camp.name}` : ""}.`,
    });
  }

  const s = donation?.screening_json ?? {};
  if (s.hb || s.hb_done_by) {
    events.push({
      side: "right",
      title: "Medical Screening",
      date: donation?.date,
      body: [
        s.hb && `Hb: ${s.hb} g/dL`,
        s.bp && `BP: ${s.bp}`,
        s.weight && `Weight: ${s.weight} kg`,
        s.hb_done_by && `Done by ${s.hb_done_by}`,
      ]
        .filter(Boolean)
        .join(", ") + ".",
    });
  }

  if (bag) {
    events.push({
      side: "left",
      title: "Donated Blood",
      date: bag.collection_date,
      body: `${donor.name} donated blood. Bag no: ${bag.bag_no}${bag.bag_type ? `, type: ${bag.bag_type}` : ""}.`,
    });
  }

  if (components?.length > 0) {
    const proc = pipeline_records?.find(
      (p: any) => p.pipeline === "component" && p.stage === "processing"
    );
    const cStr = components
      .map((c: any) => `${c.type}${c.volume_ml ? ` (${c.volume_ml} ml)` : ""}`)
      .join(", ");
    events.push({
      side: "right",
      title: "Components Prepared",
      date: proc?.completed_at ?? components[0]?.created_at,
      body: `${cStr} prepared${proc?.done_by ? ` by ${proc.done_by}` : ""}.`,
    });
  }

  if (grouping) {
    const gStr = `${grouping.abo ?? ""}${
      grouping.rh === "positive" ? "+" : grouping.rh === "negative" ? "-" : ""
    }`;
    events.push({
      side: "left",
      title: "Blood Grouping",
      date: grouping.created_at,
      body: `Blood group: ${rhLabel(gStr)}${grouping.validated_by ? `, validated by ${grouping.validated_by}` : ""}${grouping.discrepancy ? " — discrepancy noted" : ""}.`,
    });
  }

  if (tti) {
    const status = tti.any_reactive ? "Reactive" : "Non-Reactive";
    events.push({
      side: "right",
      title: "TTI Screening",
      date: tti.created_at,
      body: `TTI ${status}. HIV: ${cap(tti.hiv)}, HBsAg: ${cap(tti.hbsag)}, HCV: ${cap(tti.hcv)}, VDRL: ${cap(tti.vdrl)}.`,
    });
  }

  return (
    <Card className="p-6">
      <h3 className="font-display text-[17px] font-bold text-ink mb-6">Timeline</h3>
      {events.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          No timeline events yet.
        </p>
      ) : (
        <div className="relative">
          {/* vertical centre line */}
          <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-line-table" />

          <div className="space-y-5">
            {events.map((ev, i) => (
              <div key={i} className="flex items-start gap-2">
                {/* Left half */}
                <div className="w-[calc(50%-28px)] min-h-[4px]">
                  {ev.side === "left" && (
                    <div className="rounded-xl border border-line-card bg-fill p-3.5 shadow-card">
                      <p className="mb-0.5 text-[13px] font-bold text-ink">{ev.title}</p>
                      {ev.date && (
                        <p className="mb-2 text-[11px] text-muted">
                          {fmtDate(ev.date, "dd MMM yyyy")}
                        </p>
                      )}
                      <p className="text-[12px] leading-relaxed text-ink-3">{ev.body}</p>
                    </div>
                  )}
                </div>

                {/* Centre chip */}
                <div className="z-10 flex w-14 flex-shrink-0 items-start justify-center pt-3">
                  <span className="rounded-full bg-cyan-500 px-1.5 py-1 text-center text-[9px] font-bold leading-tight text-white">
                    {ev.date ? (
                      <>
                        {fmtDate(ev.date, "MMM")}
                        <br />
                        {fmtDate(ev.date, "yyyy")}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                {/* Right half */}
                <div className="w-[calc(50%-28px)] min-h-[4px]">
                  {ev.side === "right" && (
                    <div className="rounded-xl border border-line-card bg-fill p-3.5 shadow-card">
                      <p className="mb-0.5 text-[13px] font-bold text-ink">{ev.title}</p>
                      {ev.date && (
                        <p className="mb-2 text-[11px] text-muted">
                          {fmtDate(ev.date, "dd MMM yyyy")}
                        </p>
                      )}
                      <p className="text-[12px] leading-relaxed text-ink-3">{ev.body}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button className="rounded-full bg-cyan-500 px-7 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-600">
              Send Donor Report
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Questionnaire Tab ─────────────────────────────────────────────────────────

// Defined at module scope (not inside QuestionnaireTab) so it keeps a stable
// component identity — otherwise React remounts the subtree on every keystroke,
// breaking toggle animation and stealing focus from the text inputs.
function Q({
  label,
  field,
  form,
  set,
}: {
  label: string;
  field: string;
  form: Record<string, any>;
  set: (k: string, v: any) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-table py-4">
      <span className="text-sm text-ink-3">{label}</span>
      <Toggle value={!!form[field]} onChange={(v) => set(field, v)} />
    </div>
  );
}

function QuestionnaireTab({ donation }: { donation: any }) {
  const qc = useQueryClient();
  const initial = donation?.screening_json ?? {};
  const [form, setForm] = useState({
    q_donated_before: initial.q_donated_before ?? false,
    q_num_donations: initial.q_num_donations ?? "",
    q_last_donation: initial.q_last_donation ?? "",
    q_difficulty: initial.q_difficulty ?? false,
    q_difficulty_desc: initial.q_difficulty_desc ?? "",
    q_advised_not: initial.q_advised_not ?? false,
    q_feeling_well: initial.q_feeling_well ?? false,
    q_eaten_4hrs: initial.q_eaten_4hrs ?? false,
    q_heavy_work: initial.q_heavy_work ?? false,
    q_medicine: initial.q_medicine ?? false,
    q_pregnant: initial.q_pregnant ?? false,
    q_child_under_1: initial.q_child_under_1 ?? false,
    q_defer_reason: initial.q_defer_reason ?? "",
  });

  const set = (k: string, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const merged = { ...initial, ...form };
      return (
        await api.patch(`/donations/${donation.id}`, { screening_json: merged })
      ).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["donor-detail"] }),
  });

  const inputBase =
    "w-full rounded-xl border border-line-chip bg-fill px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30";

  if (!donation) {
    return (
      <Card className="p-10 text-center text-sm text-muted">
        No donation on record — questionnaire unavailable.
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Org header */}
      <div className="mb-6 border-b border-line-table pb-4 text-center">
        <h3 className="font-display text-lg font-extrabold uppercase tracking-widest text-ink">
          Blood Centre
        </h3>
        <p className="mt-1 text-xs text-muted">Pre-Donation Donor Questionnaire</p>
      </div>

      <Q label="Have you donated blood previously?" field="q_donated_before" form={form} set={set} />
      {form.q_donated_before && (
        <div className="flex flex-wrap items-start gap-4 border-b border-line-table py-3 pl-4">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-muted">
              If yes, how many times?
            </label>
            <input
              className={inputBase + " mt-1"}
              value={form.q_num_donations}
              onChange={(e) => set("q_num_donations", e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-muted">
              Date of last donation
            </label>
            <input
              type="date"
              className={inputBase + " mt-1"}
              value={form.q_last_donation}
              onChange={(e) => set("q_last_donation", e.target.value)}
            />
          </div>
        </div>
      )}
      <Q
        label="Did you experience any ailment, difficulty or discomfort during previous donations?"
        field="q_difficulty"
        form={form}
        set={set}
      />
      {form.q_difficulty && (
        <div className="border-b border-line-table py-3 pl-4">
          <label className="text-xs font-semibold text-muted">
            What was the difficulty?
          </label>
          <input
            className={inputBase + " mt-1"}
            value={form.q_difficulty_desc}
            onChange={(e) => set("q_difficulty_desc", e.target.value)}
          />
        </div>
      )}
      <Q
        label="Have you ever been advised not to donate blood?"
        field="q_advised_not"
        form={form}
        set={set}
      />
      <Q label="Are you feeling well today?" field="q_feeling_well" form={form} set={set} />
      <Q
        label="Have you eaten anything in the last 4 hours?"
        field="q_eaten_4hrs"
        form={form}
        set={set}
      />
      <Q
        label="After donating blood, do you have to engage in heavy work, drive heavy vehicles, or work at heights today?"
        field="q_heavy_work"
        form={form}
        set={set}
      />
      <Q
        label="Have you taken any medicine in the last 7 days, especially an antibiotic?"
        field="q_medicine"
        form={form}
        set={set}
      />

      <div className="border-b border-line-table py-4">
        <p className="mb-2 text-sm text-ink-3">
          Have you had / have any of the following?
        </p>
        <button className="w-full rounded-xl bg-info/80 py-2.5 text-sm font-semibold text-white">
          None selected
        </button>
      </div>

      <div className="border-b border-line-table py-4">
        <p className="mb-2 text-sm text-ink-3">
          Do you or your sexual partner belong to any of the below categories?
        </p>
        <button className="w-full rounded-xl bg-info/80 py-2.5 text-sm font-semibold text-white">
          None selected
        </button>
      </div>

      <Q
        label="Are you pregnant or have you had an abortion in the last 6 months?"
        field="q_pregnant"
        form={form}
        set={set}
      />
      <Q
        label="Do you have a child less than 1 year of age? Are you breastfeeding?"
        field="q_child_under_1"
        form={form}
        set={set}
      />

      <div className="border-b border-line-table py-4">
        <p className="mb-2 text-sm text-ink-3">
          If other, choose a defer reason
        </p>
        <select
          className={inputBase}
          value={form.q_defer_reason}
          onChange={(e) => set("q_defer_reason", e.target.value)}
        >
          <option value="">— Select —</option>
          <option value="low_hb">Low Haemoglobin</option>
          <option value="illness">Recent Illness</option>
          <option value="bp">Blood Pressure Issue</option>
          <option value="weight">Underweight</option>
          <option value="medicine">On Medication</option>
          <option value="pregnancy">Pregnancy / Post-partum</option>
          <option value="travel">Recent Travel</option>
        </select>
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="rounded-btn bg-accent px-10 py-3 text-sm font-bold text-white shadow-primary transition hover:brightness-110 disabled:opacity-50"
        >
          {mut.isPending ? "Saving…" : "Save Donor Questionnaire"}
        </button>
      </div>
    </Card>
  );
}

// ── Blood Bag Tab ─────────────────────────────────────────────────────────────

function BloodBagTab({ bag, donor, components, grouping, tti }: any) {
  if (!bag) {
    return (
      <Card className="p-10 text-center text-sm text-muted">
        No blood bag on record for this donor.
      </Card>
    );
  }

  const grpStr = grouping
    ? `${grouping.abo ?? ""}${
        grouping.rh === "positive" ? "+" : grouping.rh === "negative" ? "-" : ""
      }`
    : null;

  const ttiStatusEl = (v?: string | null) => {
    if (!v) return <span className="text-muted">—</span>;
    const reactive = v === "reactive";
    return (
      <span className={`font-semibold ${reactive ? "text-accent" : "text-success"}`}>
        {reactive ? "Reactive" : "Non Reactive"}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Segment + Lot cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card2 bg-indigo-600 p-5 text-white">
          <div className="text-xs font-bold uppercase tracking-wider text-white/60">
            Segment No.
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold">
            {bag.segment_no ?? "—"}
          </div>
        </div>
        <div className="rounded-card2 bg-violet-500 p-5 text-white">
          <div className="text-xs font-bold uppercase tracking-wider text-white/60">
            Lot No.
          </div>
          <div className="mt-2 font-display text-3xl font-extrabold text-white/50">
            —
          </div>
        </div>
      </div>

      {/* Bag details + TTI */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-display text-[17px] font-bold text-ink mb-4">
            Bag Details
          </h3>
          <dl>
            <InfoRow label="Donor ID (Bag No.)" value={bag.bag_no} />
            <InfoRow
              label="Collection Date"
              value={fmtDate(bag.collection_date, "dd MMM yyyy")}
            />
            <InfoRow label="Bag Type" value={bag.bag_type} />
            <InfoRow
              label="Bag Volume"
              value={bag.gross_volume_ml ? `${bag.gross_volume_ml} mL` : "—"}
            />
            <InfoRow
              label="Blood Group"
              value={grpStr ? rhLabel(grpStr) : donor.blood_group ?? "—"}
            />
            <InfoRow
              label="Grouping Status"
              value={
                grouping ? (
                  <span
                    className={`font-semibold ${
                      grouping.validated ? "text-success" : "text-warning"
                    }`}
                  >
                    {grouping.validated ? "Validated" : "Pending validation"}
                    {grouping.validated_by ? ` by ${grouping.validated_by}` : ""}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Segment No." value={bag.segment_no} />
            <InfoRow
              label="Bag Status"
              value={
                <span className="capitalize font-semibold text-ink-3">
                  {bag.status}
                </span>
              }
            />
          </dl>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-bold text-ink">
              TTI Results
            </h3>
            {tti && (
              <span className="rounded-lg bg-info/10 px-2 py-1 text-xs font-bold text-info">
                {(tti.method ?? "rapid").toUpperCase()} Method
              </span>
            )}
          </div>
          {!tti ? (
            <p className="py-6 text-sm text-muted">No TTI results yet.</p>
          ) : (
            <dl>
              <InfoRow
                label="Testing Date"
                value={
                  <span className="font-semibold text-info">
                    {fmtDate(tti.created_at, "dd MMM yyyy, h:mm a")}
                  </span>
                }
              />
              <InfoRow label="HIV" value={ttiStatusEl(tti.hiv)} />
              <InfoRow label="HBsAg" value={ttiStatusEl(tti.hbsag)} />
              <InfoRow label="HCV" value={ttiStatusEl(tti.hcv)} />
              <InfoRow label="VDRL" value={ttiStatusEl(tti.vdrl)} />
              <InfoRow
                label="MP"
                value={
                  <span
                    className={`font-semibold ${
                      tti.mp === "reactive" ? "text-accent" : "text-success"
                    }`}
                  >
                    {tti.mp === "reactive"
                      ? "Reactive"
                      : tti.mp === "nonreactive"
                      ? "Negative"
                      : "—"}
                  </span>
                }
              />
              <InfoRow
                label="Overall"
                value={
                  <span
                    className={`font-bold ${
                      tti.any_reactive ? "text-accent" : "text-success"
                    }`}
                  >
                    {tti.any_reactive ? "⚠ Reactive" : "✓ Non-Reactive"}
                  </span>
                }
              />
            </dl>
          )}
        </Card>
      </div>

      {/* Grouping tables */}
      {grouping && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[17px] font-bold text-ink">
                Forward Grouping
              </h3>
              {grouping.validated_by && (
                <span className="rounded-lg bg-success/10 px-2 py-1 text-xs font-bold text-success">
                  By {grouping.validated_by}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-fill">
                    {["Tested On", "Anti-A", "Anti-B", "Anti-D", "Result"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line-table">
                    <td className="px-3 py-3 text-ink-3">
                      {fmtDate(grouping.created_at, "dd MMM yyyy")}
                    </td>
                    <td className="px-3 py-3">
                      {grouping.forward_result === "O" ? "0" : "4+"}
                    </td>
                    <td className="px-3 py-3">
                      {grouping.forward_result === "O"
                        ? "0"
                        : grouping.forward_result === "AB"
                        ? "4+"
                        : "0"}
                    </td>
                    <td className="px-3 py-3">
                      {grouping.rh === "positive" ? "4+" : "0"}
                    </td>
                    <td className="px-3 py-3 font-semibold text-info">
                      {grpStr ? rhLabel(grpStr) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-[17px] font-bold text-ink">
                Reverse Grouping
              </h3>
              {grouping.validated_by && (
                <span className="rounded-lg bg-success/10 px-2 py-1 text-xs font-bold text-success">
                  By {grouping.validated_by}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-fill">
                    {["Tested On", "A1 Cell", "B Cell", "O Cell", "Result"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line-table">
                    <td className="px-3 py-3 text-ink-3">
                      {fmtDate(grouping.created_at, "dd MMM yyyy")}
                    </td>
                    <td className="px-3 py-3">
                      {grouping.reverse_result === "O" ? "4+" : "0"}
                    </td>
                    <td className="px-3 py-3">
                      {grouping.reverse_result === "O" ||
                      grouping.reverse_result === "B"
                        ? "4+"
                        : "0"}
                    </td>
                    <td className="px-3 py-3">—</td>
                    <td className="px-3 py-3 font-semibold text-info">
                      {grouping.reverse_result ?? "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Components */}
      {components?.length > 0 && (
        <div>
          <h3 className="font-display text-[17px] font-bold text-ink mb-3">
            Components
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((c: any) => (
              <Card key={c.id} className="p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-[16px] font-extrabold text-ink">
                      {c.type}
                    </div>
                    {c.volume_ml && (
                      <div className="text-xs text-muted">{c.volume_ml} mL</div>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${
                      c.status === "tested"
                        ? "bg-success"
                        : c.status === "quarantine"
                        ? "bg-accent"
                        : c.status === "issued"
                        ? "bg-info"
                        : "bg-muted"
                    }`}
                  >
                    {cap(c.status)}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-muted">
                  {c.prepared_date && (
                    <div>
                      Prepared:{" "}
                      <span className="font-semibold text-ink-3">
                        {fmtDate(c.prepared_date)}
                      </span>
                    </div>
                  )}
                  {c.expiry_date && (
                    <div>
                      Expires:{" "}
                      <span className="font-semibold text-ink-3">
                        {fmtDate(c.expiry_date)}
                      </span>
                    </div>
                  )}
                  {c.blood_group && (
                    <div>
                      Group:{" "}
                      <span className="font-bold text-accent-deep">
                        {c.blood_group}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Donations Tab ─────────────────────────────────────────────────────────────

function DonationsTab({
  donor,
  all_donations,
  all_bags,
  tti,
}: {
  donor: any;
  all_donations: any[];
  all_bags: any[];
  tti: any;
}) {
  const ttiLabel = tti
    ? tti.any_reactive
      ? "Reactive"
      : "Non-Reactive"
    : "Pending";

  // Build date → bag lookup for volume display
  const bagByDate: Record<string, any> = {};
  for (const b of all_bags ?? []) {
    const d =
      typeof b.collection_date === "string"
        ? b.collection_date.slice(0, 10)
        : "";
    if (d && !bagByDate[d]) bagByDate[d] = b;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
      {/* Stat cards */}
      <div className="flex flex-row gap-4 lg:flex-col">
        <Card className="flex flex-1 flex-col items-center gap-2 p-5 text-center">
          <div className="text-3xl">🩸</div>
          <div className="font-display text-3xl font-extrabold text-ink">
            {donor.total_donations ?? 0}
          </div>
          <div className="text-xs text-muted">Total Donations</div>
        </Card>
        <Card className="flex flex-1 flex-col items-center gap-2 p-5 text-center">
          <div
            className={`text-2xl font-bold ${
              ttiLabel === "Non-Reactive"
                ? "text-success"
                : ttiLabel === "Reactive"
                ? "text-accent"
                : "text-muted"
            }`}
          >
            {ttiLabel === "Non-Reactive" ? "✓" : ttiLabel === "Reactive" ? "⚠" : "?"}
          </div>
          <div
            className={`font-display text-xl font-extrabold ${
              ttiLabel === "Non-Reactive"
                ? "text-success"
                : ttiLabel === "Reactive"
                ? "text-accent"
                : "text-muted"
            }`}
          >
            {ttiLabel}
          </div>
          <div className="text-xs text-muted">TTI Status</div>
        </Card>
      </div>

      {/* History table */}
      <Card className="p-6">
        <h3 className="font-display text-[17px] font-bold text-ink mb-4">
          Donation History
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-fill">
                {["Date", "Donor Name", "Blood Group", "Volume", "Camp / Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[12px] font-bold uppercase tracking-wide text-muted"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {(all_donations ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-sm text-muted"
                  >
                    No donations recorded.
                  </td>
                </tr>
              ) : (
                (all_donations ?? []).map((d: any) => {
                  const dateKey =
                    typeof d.date === "string" ? d.date.slice(0, 10) : "";
                  const b = bagByDate[dateKey];
                  return (
                    <tr
                      key={d.id}
                      className="border-t border-line-table hover:bg-rowtint"
                    >
                      <td className="px-4 py-3 font-semibold text-info">
                        {fmtDate(d.date, "dd-MM-yyyy")}
                      </td>
                      <td className="px-4 py-3 font-bold text-ink">
                        {donor.name}
                      </td>
                      <td className="px-4 py-3 font-bold text-accent-deep">
                        {donor.blood_group ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {b?.gross_volume_ml ? `${b.gross_volume_ml} mL` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            d.status === "completed"
                              ? "bg-success/10 text-success"
                              : d.status === "deferred"
                              ? "bg-accent/10 text-accent"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {cap(d.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
