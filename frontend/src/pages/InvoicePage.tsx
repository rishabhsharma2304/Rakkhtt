import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, MapPin, Phone, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { GhostButton, PrimaryButton, LoadingState, ErrorState, StatusPill } from "@/components/ui";
import { fmtDate, fmtINR } from "@/lib/format";
import { BRAND } from "@/lib/brand";

interface InvoiceItem {
  name: string;
  component: string | null;
  qty: number;
  unit_price: number;
  line_total: number;
}
interface InvoiceDetail {
  id: string;
  invoice_no: string;
  date: string;
  name: string | null;
  direction: string;
  amount_inr: number;
  created_by: string | null;
  created_at: string | null;
  org: { name: string; address: string | null; contact: string | null; email: string | null; license_no: string | null };
  request: { request_id: string; patient_name: string | null; blood_group: string | null; component: string | null; qty: number } | null;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  service_charge: number;
  total: number;
}

export function InvoicePage() {
  const { id, requestId } = useParams<{ id: string; requestId: string }>();
  const navigate = useNavigate();
  // Two entry points share this page: /invoices/:id (from Accounting) and
  // /reception/blood-request/invoice/:requestId (clicking a Reception row).
  const fromReception = !!requestId;
  const { data, isLoading, error } = useQuery({
    queryKey: fromReception ? ["request-invoice", requestId] : ["invoice-detail", id],
    queryFn: async () =>
      (await api.get<InvoiceDetail>(
        fromReception ? `/reception/blood-request/${requestId}/invoice` : `/invoices/${id}/detail`,
      )).data,
    enabled: fromReception ? !!requestId : !!id,
  });

  if (isLoading) return <LoadingState message="Loading invoice…" />;
  if (error || !data) return <ErrorState error={error} fallback="This invoice could not be found." />;

  const inv = data;

  return (
    <div className="space-y-5">
      {/* print rules: when printing, show only the invoice sheet */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-sheet, #invoice-sheet * { visibility: visible !important; }
          #invoice-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* toolbar — hidden in print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={() => navigate(fromReception ? "/reception" : "/accounting")} className="!py-2 !px-4">
          <ArrowLeft size={16} /> {fromReception ? "Back to Reception" : "Back to Accounting"}
        </GhostButton>
        <PrimaryButton onClick={() => window.print()} className="!py-2 !px-4">
          <Printer size={16} /> Print Invoice
        </PrimaryButton>
      </div>

      {/* invoice sheet */}
      <div id="invoice-sheet" className="mx-auto max-w-[820px] rounded-card2 border border-line-card bg-card p-8 shadow-card sm:p-10">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-line-table pb-6">
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase leading-tight text-ink sm:text-[28px]">
              {inv.org.name}
            </h1>
            {inv.org.license_no && (
              <p className="mt-1 text-xs font-semibold text-muted">Lic. No. — {inv.org.license_no}</p>
            )}
          </div>
          <div className="space-y-1.5 text-sm text-ink-3">
            {inv.org.address && (
              <p className="flex max-w-[260px] items-start gap-2">
                <MapPin size={15} className="mt-0.5 flex-shrink-0 text-accent" /> {inv.org.address}
              </p>
            )}
            {inv.org.contact && (
              <p className="flex items-center gap-2">
                <Phone size={15} className="flex-shrink-0 text-accent" /> {inv.org.contact}
              </p>
            )}
            {inv.org.email && (
              <p className="flex items-center gap-2">
                <Mail size={15} className="flex-shrink-0 text-accent" /> {inv.org.email}
              </p>
            )}
          </div>
        </div>

        <h2 className="mt-6 text-center font-display text-xl font-extrabold tracking-wide text-ink">INVOICE</h2>

        {/* billed-to + invoice meta */}
        <div className="mt-5 flex flex-wrap justify-between gap-6">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-wide text-muted">Billed To</p>
            <p className="mt-1 text-lg font-bold text-ink">{inv.name || inv.request?.patient_name || "—"}</p>
            {inv.request?.blood_group && (
              <p className="mt-0.5 text-sm text-muted">Blood Group: {inv.request.blood_group}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
            <Meta label="Invoice No" value={inv.invoice_no} />
            <Meta label="Date" value={fmtDate(inv.date)} />
            {inv.request && <Meta label="Request ID" value={inv.request.request_id} />}
            <Meta
              label="Direction"
              value={<StatusPill tone={inv.direction === "received" ? "good" : "info"}>{inv.direction}</StatusPill>}
            />
            {inv.created_by && <Meta label="Created By" value={inv.created_by} />}
          </div>
        </div>

        {/* line items */}
        <div className="mt-7 overflow-x-auto rounded-xl border border-line-table">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-fill text-left text-[12.5px] font-bold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Price (INR)</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i} className="border-t border-line-table text-ink-3">
                  <td className="px-4 py-3 font-semibold text-ink">{it.name}</td>
                  <td className="px-4 py-3 text-center">{it.qty}</td>
                  <td className="px-4 py-3 text-right">{fmtINR(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* totals */}
        <div className="mt-5 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <Row label="Sub Total" value={fmtINR(inv.subtotal)} />
            <Row label="Discount" value={fmtINR(inv.discount)} />
            <Row label="Service Charge" value={fmtINR(inv.service_charge)} />
            <div className="mt-2 flex items-center justify-between border-t border-line-table pt-3">
              <span className="font-display text-lg font-extrabold text-ink">Total</span>
              <span className="font-display text-lg font-extrabold text-accent">{fmtINR(inv.total)}</span>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-line-table pt-4 text-center text-xs text-muted">
          Generated by {BRAND} · This is a computer-generated invoice.
        </p>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-bold text-ink">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-ink-3">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
