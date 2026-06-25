import { useMemo, useState, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ChevronsUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { api, fetchList, type ListParams } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import {
  EmptyState,
  ExportButtons,
  FilterBar,
  GhostButton,
  Modal,
  PrimaryButton,
  type FilterDef,
} from "./ui";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  render?: (row: T) => ReactNode;
}

// ---- form field definition for the built-in create/edit modal ----
export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "email" | "tel" | "checkbox";
  options?: { value: string; label: string }[];
  /** Populate a select from a list endpoint (value=id, label=optionLabel field). */
  optionsPath?: string;
  optionLabel?: string;
  required?: boolean;
  placeholder?: string;
  full?: boolean; // span both grid columns
  /** Default value used when creating a new row (e.g. lock a tab's category). */
  default?: string | number | boolean;
}

export interface CrudConfig {
  name: string; // singular entity name, e.g. "Hospital"
  fields: Field[];
  canCreate?: boolean; // default true
  canEdit?: boolean; // default true
  canDelete?: boolean; // default true
  /** Transform cleaned form values just before submit (e.g. derive flags). */
  transform?: (values: Record<string, any>) => Record<string, any>;
}

interface Props<T> {
  path: string;
  columns: Column<T>[];
  searchPlaceholder?: string;
  defaultSort?: string;
  defaultOrder?: "asc" | "desc";
  filters?: Record<string, unknown>;
  filterFields?: FilterDef[];
  emptyMessage?: string;
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  crud?: CrudConfig;
}

const PAGE_SIZES = [10, 25, 50];

function errMsg(err: unknown): string {
  const detail = (err as any)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return "Could not save. Please check the fields and try again.";
}

function initialValues(fields: Field[], row?: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    let v = row ? row[f.name] : f.default ?? "";
    if (v == null) v = f.type === "checkbox" ? false : "";
    if (f.type === "date" && typeof v === "string") v = v.slice(0, 10);
    out[f.name] = v;
  }
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

export function DataTable<T extends Record<string, any>>({
  path,
  columns,
  searchPlaceholder = "Search…",
  defaultSort = "created_at",
  defaultOrder = "desc",
  filters = {},
  filterFields,
  emptyMessage,
  rowKey,
  onRowClick,
  crud,
}: Props<T>) {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [order, setOrder] = useState<"asc" | "desc">(defaultOrder);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // create/edit modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  // RBAC: hide mutation affordances the active role can't perform (resource = REST path).
  // The backend still re-checks and returns 403, so this is purely a UX courtesy.
  const { me } = useAuth();
  const mayWrite = canWrite(me?.role, path);
  const canCreate = mayWrite && !!crud && crud.canCreate !== false;
  const canEdit = mayWrite && !!crud && crud.canEdit !== false;
  const canDelete = mayWrite && !!crud && crud.canDelete !== false;

  const params: ListParams = { page, page_size: pageSize, search, sort, order, ...filters, ...filterValues };
  const { data, isLoading } = useQuery({
    queryKey: ["list", path, params],
    queryFn: () => fetchList<T>(path, params),
    placeholderData: keepPreviousData,
  });

  // relational select options (value=id, label=optionLabel)
  const optionPaths = useMemo(
    () => Array.from(new Set((crud?.fields ?? []).map((f) => f.optionsPath).filter(Boolean))) as string[],
    [crud],
  );
  const { data: optionsMap } = useQuery({
    queryKey: ["crud-options", optionPaths],
    enabled: optionPaths.length > 0,
    queryFn: async () => {
      const map: Record<string, any[]> = {};
      for (const p of optionPaths) {
        const res = await fetchList(p, { page_size: 500, sort: "name", order: "asc" });
        map[p] = res.items;
      }
      return map;
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  const saveMut = useMutation({
    mutationFn: async (vals: Record<string, any>) => {
      const body = crud?.transform ? crud.transform(vals) : vals;
      if (editing?.id) return (await api.patch(`${path}/${editing.id}`, body)).data;
      return (await api.post(path, body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["list", path] });
      closeForm();
    },
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => (await api.delete(`${path}/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["list", path] }),
  });

  function toggleSort(col: Column<T>) {
    if (!col.sortable) return;
    if (sort === col.key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(col.key);
      setOrder("asc");
    }
  }

  function openNew() {
    setEditing(null);
    setForm(initialValues(crud!.fields));
    saveMut.reset();
    setFormOpen(true);
  }
  function openEdit(row: Record<string, any>) {
    setEditing(row);
    setForm(initialValues(crud!.fields, row));
    saveMut.reset();
    setFormOpen(true);
  }
  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveMut.mutate(cleanValues(crud!.fields, form));
  }
  function onDelete(row: Record<string, any>) {
    if (window.confirm(`Delete this ${crud!.name.toLowerCase()}? This cannot be undone from the UI.`)) {
      delMut.mutate(row.id);
    }
  }

  function exportCsv() {
    const header = columns.map((c) => c.label).join(",");
    const rows = items.map((r) =>
      columns.map((c) => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(","),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${path.replace(/\//g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // append an Actions column when CRUD edit/delete is enabled
  const actionCol: Column<T> = {
    key: "__actions",
    label: "Actions",
    align: "right",
    render: (row) => (
      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        {canEdit && (
          <button onClick={() => openEdit(row)} className="rounded-lg p-1.5 text-info hover:bg-hovertint" title="Edit">
            <Pencil size={15} />
          </button>
        )}
        {canDelete && (
          <button onClick={() => onDelete(row)} className="rounded-lg p-1.5 text-accent hover:bg-hovertint" title="Delete">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    ),
  };
  const allColumns = crud && (canEdit || canDelete) ? [...columns, actionCol] : columns;

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

  const inputBase =
    "w-full rounded-xl border border-line-chip bg-page px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          Show
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-line-chip bg-card px-2 py-1 text-ink"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          entries
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <PrimaryButton onClick={openNew} className="!px-3 !py-1.5 text-xs">
              <Plus size={14} /> New {crud!.name}
            </PrimaryButton>
          )}
          <ExportButtons onExcel={exportCsv} onPrint={() => window.print()} />
          <div className="ml-1 flex items-center gap-2 text-sm">
            <span className="text-muted">Search:</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="rounded-lg border border-line-chip bg-card px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>
      </div>

      {filterFields && filterFields.length > 0 && (
        <FilterBar
          filters={filterFields}
          values={filterValues}
          onChange={(name, value) => {
            setFilterValues((v) => ({ ...v, [name]: value }));
            setPage(1);
          }}
          onClear={() => {
            setFilterValues({});
            setPage(1);
          }}
        />
      )}

      {/* table */}
      <div className="overflow-x-auto rounded-xl border border-line-table">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fill">
              {allColumns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  className={`whitespace-nowrap px-4 py-3 text-[12.5px] font-bold uppercase tracking-wide text-muted ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  } ${c.sortable ? "cursor-pointer select-none" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable &&
                      (sort === c.key ? (
                        order === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      ) : (
                        <ChevronsUpDown size={13} className="opacity-40" />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={allColumns.length} className="py-12 text-center text-sm text-muted">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length}>
                  <EmptyState message={emptyMessage} />
                </td>
              </tr>
            ) : (
              items.map((row, i) => (
                <tr
                  key={rowKey ? rowKey(row) : row.id ?? i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-t border-line-table transition hover:bg-rowtint ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {allColumns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 text-ink-3 ${
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {c.render ? c.render(row) : (row[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3 text-sm text-muted">
        <span>
          Showing {from} to {to} of {total} entries
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
          >
            Previous
          </button>
          <span className="rounded-lg bg-accent px-3 py-1.5 font-bold text-white">{page}</span>
          <button
            disabled={page >= lastPage}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold text-ink-4 disabled:opacity-40 hover:bg-hovertint"
          >
            Next
          </button>
        </div>
      </div>

      {/* create / edit modal */}
      {crud && (
        <Modal
          open={formOpen}
          onClose={closeForm}
          title={`${editing ? "Edit" : "New"} ${crud.name}`}
          footer={
            <>
              <GhostButton type="button" onClick={closeForm} className="!py-2 !px-4">Cancel</GhostButton>
              <PrimaryButton type="submit" form="crud-form" disabled={saveMut.isPending} className="!py-2 !px-4">
                {saveMut.isPending ? "Saving…" : editing ? "Save changes" : "Create"}
              </PrimaryButton>
            </>
          }
        >
          <form id="crud-form" onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {crud.fields.map((f) => (
              <label key={f.name} className={`block ${f.full ? "sm:col-span-2" : ""}`}>
                {f.type !== "checkbox" && (
                  <span className="mb-1 block text-sm font-semibold text-ink-4">
                    {f.label}
                    {f.required && <span className="text-accent"> *</span>}
                  </span>
                )}
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
                ) : f.type === "checkbox" ? (
                  <span className="flex items-center gap-2 pt-6 text-sm font-semibold text-ink-4">
                    <input
                      type="checkbox"
                      checked={!!form[f.name]}
                      onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.checked }))}
                      className="h-4 w-4 accent-[#DC2626]"
                    />
                    {f.label}
                  </span>
                ) : (
                  <input
                    className={inputBase}
                    type={
                      f.type === "number"
                        ? "number"
                        : f.type === "date"
                          ? "date"
                          : f.type === "email"
                            ? "email"
                            : f.type === "tel"
                              ? "tel"
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
      )}
    </div>
  );
}
