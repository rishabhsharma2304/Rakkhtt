import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { useTheme } from "@/lib/theme";
import { Card, PrimaryButton, SectionBanner } from "@/components/ui";

const TABS = [
  { key: "general", label: "General" },
  { key: "pricing", label: "Blood Pricing" },
  { key: "compliance", label: "Compliance & Customisations" },
];

const GENERAL_FIELDS: { name: string; label: string; type?: string }[] = [
  { name: "name", label: "Name" },
  { name: "license_no", label: "License No" },
  { name: "id_prefix", label: "ID Prefix" },
  { name: "billing_prefix", label: "Billing Prefix" },
  { name: "contact", label: "Contact" },
  { name: "email", label: "Email", type: "email" },
  { name: "website", label: "Website" },
  { name: "address", label: "Address" },
];

const COMPLIANCE_FLAGS = [
  { key: "nabh", label: "NABH" },
  { key: "nbtc", label: "NBTC" },
  { key: "erakt_kosh", label: "e-Rakt-Kosh" },
  { key: "drugs_cosmetics_act_1940", label: "Drugs & Cosmetics Act 1940" },
];

const inputCls =
  "w-full rounded-xl border border-line-chip bg-page px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30";

export function SettingsPage() {
  const { dark, toggle } = useTheme();
  const { me } = useAuth();
  const mayEdit = canWrite(me?.role, "settings");
  const qc = useQueryClient();
  const [tab, setTab] = useState("general");
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });

  const org = data?.org ?? {};
  const orgId: string | undefined = org.id;

  const [general, setGeneral] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data) return;
    setGeneral(Object.fromEntries(GENERAL_FIELDS.map((f) => [f.name, org[f.name] ?? ""])));
    setPricing(data.blood_pricing ?? {});
    setCompliance(data.compliance_flags ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const save = useMutation({
    mutationFn: async (body: Record<string, unknown>) => (await api.put(`/orgs/${orgId}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  function saveErr() {
    const d = (save.error as any)?.response?.data?.detail;
    if (save.isError) return typeof d === "string" ? d : "Could not save (Master User privilege may be required).";
    return null;
  }

  return (
    <div className="space-y-5">
      <SectionBanner icon={<SettingsIcon size={22} />} title="Settings" subtitle="Organisation details, blood pricing, compliance & customisations" />

      <div className="rounded-card2 border border-line-card bg-card shadow-card">
        <div className="flex flex-wrap gap-1 border-b border-line-table px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-3 text-sm font-bold transition ${tab === t.key ? "text-accent" : "text-muted hover:text-ink-4"}`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ---- General ---- */}
          {tab === "general" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(general);
              }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {GENERAL_FIELDS.map((f) => (
                  <label key={f.name} className={`block ${f.name === "address" ? "sm:col-span-2" : ""}`}>
                    <span className="mb-1 block text-sm font-semibold text-ink-4">{f.label}</span>
                    {f.name === "address" ? (
                      <textarea
                        rows={2}
                        className={inputCls}
                        value={general[f.name] ?? ""}
                        onChange={(e) => setGeneral((s) => ({ ...s, [f.name]: e.target.value }))}
                      />
                    ) : (
                      <input
                        type={f.type ?? "text"}
                        className={inputCls}
                        value={general[f.name] ?? ""}
                        onChange={(e) => setGeneral((s) => ({ ...s, [f.name]: e.target.value }))}
                      />
                    )}
                  </label>
                ))}
              </div>
              <SaveRow saving={save.isPending} ok={save.isSuccess} err={saveErr()} mayEdit={mayEdit} />
            </form>
          )}

          {/* ---- Blood pricing ---- */}
          {tab === "pricing" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate({ blood_pricing: pricing });
              }}
              className="space-y-5"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Object.entries(pricing).map(([comp, price]) => (
                  <label key={comp} className="flex items-center gap-2 rounded-xl bg-fill px-3 py-2">
                    <span className="w-12 font-bold text-ink-4">{comp}</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-line-chip bg-card px-2 py-1.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30"
                      value={price}
                      onChange={(e) => setPricing((s) => ({ ...s, [comp]: Number(e.target.value) }))}
                    />
                  </label>
                ))}
              </div>
              <SaveRow saving={save.isPending} ok={save.isSuccess} err={saveErr()} mayEdit={mayEdit} />
            </form>
          )}

          {/* ---- Compliance & customisations ---- */}
          {tab === "compliance" && (
            <div className="space-y-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate({ compliance_flags: compliance });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {COMPLIANCE_FLAGS.map((f) => (
                    <label key={f.key} className="flex items-center justify-between rounded-xl bg-fill px-3 py-2.5 text-sm font-semibold text-ink-4">
                      {f.label}
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#DC2626]"
                        checked={!!compliance[f.key]}
                        onChange={(e) => setCompliance((s) => ({ ...s, [f.key]: e.target.checked }))}
                      />
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  e-Rakt-Kosh compatible · Drugs &amp; Cosmetics Act 1940 (display-only labels).
                </p>
                <SaveRow saving={save.isPending} ok={save.isSuccess} err={saveErr()} mayEdit={mayEdit} />
              </form>

              <Card className="p-5">
                <label className="flex items-center justify-between text-sm font-semibold text-ink-4">
                  Dark mode (this device)
                  <span onClick={toggle} className={`relative h-[26px] w-[45px] cursor-pointer rounded-full transition ${dark ? "bg-accent" : "bg-[#D8CCD1]"}`}>
                    <span className={`absolute top-[3.5px] h-[19px] w-[19px] rounded-full bg-white transition-all ${dark ? "left-[23px]" : "left-[3px]"}`} />
                  </span>
                </label>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveRow({ saving, ok, err, mayEdit }: { saving: boolean; ok: boolean; err: string | null; mayEdit: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <PrimaryButton type="submit" disabled={saving || !mayEdit}>{saving ? "Saving…" : "Save changes"}</PrimaryButton>
      {!mayEdit && <span className="text-sm font-semibold text-muted">Master User privilege required to edit settings.</span>}
      {mayEdit && ok && !err && <span className="text-sm font-semibold text-success">Saved.</span>}
      {mayEdit && err && <span className="text-sm font-semibold text-accent">{err}</span>}
    </div>
  );
}
