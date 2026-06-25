import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetchList } from "@/lib/api";
import { GhostButton, Modal, PrimaryButton } from "./ui";
import type { Field } from "./DataTable";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  path: string; // POST target
  fields: Field[];
  /** Prefilled / locked values merged into the payload (e.g. camp_id, collection_date). */
  initial?: Record<string, any>;
  /** Transform cleaned values just before submit. */
  transform?: (values: Record<string, any>) => Record<string, any>;
  /** Query keys to invalidate on success (defaults to ["list", path]). */
  invalidate?: unknown[][];
  submitLabel?: string;
  onSuccess?: (created: any) => void;
}

function errMsg(err: unknown): string {
  const detail = (err as any)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg).join("; ");
  return "Could not save. Please check the fields and try again.";
}

function blankForm(fields: Field[], initial: Record<string, any> = {}): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) out[f.name] = initial[f.name] ?? f.default ?? (f.type === "checkbox" ? false : "");
  return out;
}

function cleanValues(fields: Field[], values: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    let v = values[f.name];
    if (f.type === "checkbox") {
      out[f.name] = !!v;
      continue;
    }
    if (v === "" || v === undefined || v === null) continue;
    if (f.type === "number") v = Number(v);
    out[f.name] = v;
  }
  return out;
}

const inputBase =
  "w-full rounded-xl border border-line-chip bg-page px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30";

export function EntityForm({
  open,
  onClose,
  title,
  path,
  fields,
  initial,
  transform,
  invalidate,
  submitLabel = "Create",
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, any>>(() => blankForm(fields, initial));

  // reset the form whenever it (re)opens so prefilled values stay fresh
  useEffect(() => {
    if (open) {
      setForm(blankForm(fields, initial));
      saveMut.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const optionPaths = useMemo(
    () => Array.from(new Set(fields.map((f) => f.optionsPath).filter(Boolean))) as string[],
    [fields],
  );
  const { data: optionsMap } = useQuery({
    queryKey: ["crud-options", optionPaths],
    enabled: open && optionPaths.length > 0,
    queryFn: async () => {
      const map: Record<string, any[]> = {};
      for (const p of optionPaths) {
        const res = await fetchList(p, { page_size: 500, sort: "name", order: "asc" });
        map[p] = res.items;
      }
      return map;
    },
  });

  const saveMut = useMutation({
    mutationFn: async (vals: Record<string, any>) => {
      // `initial` prefills visible fields (editable) AND supplies locked extras
      // (keys with no matching field, e.g. camp_id) that are always forced in.
      const fieldNames = new Set(fields.map((f) => f.name));
      const lockedExtras = Object.fromEntries(
        Object.entries(initial ?? {}).filter(([k]) => !fieldNames.has(k)),
      );
      const body = { ...lockedExtras, ...vals };
      return (await api.post(path, transform ? transform(body) : body)).data;
    },
    onSuccess: (created) => {
      for (const key of invalidate ?? [["list", path]]) qc.invalidateQueries({ queryKey: key });
      onSuccess?.(created);
      onClose();
    },
  });

  function fieldOptions(f: Field): { value: string; label: string }[] {
    if (f.options) return f.options;
    if (f.optionsPath) {
      return (optionsMap?.[f.optionsPath] ?? []).map((it: any) => ({
        value: String(it.id),
        label: String(it[f.optionLabel ?? "name"] ?? it.id),
      }));
    }
    return [];
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <GhostButton type="button" onClick={onClose} className="!py-2 !px-4">Cancel</GhostButton>
          <PrimaryButton type="submit" form="entity-form" disabled={saveMut.isPending} className="!py-2 !px-4">
            {saveMut.isPending ? "Saving…" : submitLabel}
          </PrimaryButton>
        </>
      }
    >
      <form
        id="entity-form"
        onSubmit={(e) => {
          e.preventDefault();
          saveMut.mutate(cleanValues(fields, form));
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {fields.map((f) => (
          <label key={f.name} className={`block ${f.full ? "sm:col-span-2" : ""}`}>
            <span className="mb-1 block text-sm font-semibold text-ink-4">
              {f.label}
              {f.required && <span className="text-accent"> *</span>}
            </span>
            {f.type === "select" ? (
              <select
                className={inputBase}
                value={form[f.name] ?? ""}
                required={f.required}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              >
                <option value="">Select…</option>
                {fieldOptions(f).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                className={inputBase}
                rows={3}
                value={form[f.name] ?? ""}
                required={f.required}
                placeholder={f.placeholder}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              />
            ) : (
              <input
                className={inputBase}
                type={
                  f.type === "number" ? "number"
                    : f.type === "date" ? "date"
                      : f.type === "email" ? "email"
                        : f.type === "tel" ? "tel"
                          : "text"
                }
                value={form[f.name] ?? ""}
                required={f.required}
                placeholder={f.placeholder}
                onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
              />
            )}
          </label>
        ))}
        {saveMut.isError && (
          <p className="text-sm font-semibold text-accent sm:col-span-2">{errMsg(saveMut.error)}</p>
        )}
      </form>
    </Modal>
  );
}
