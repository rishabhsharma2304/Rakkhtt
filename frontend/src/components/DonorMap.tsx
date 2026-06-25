import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { componentColor } from "@/lib/format";

// Self-contained scatter "map" of real seeded donor lat/lng. Avoids external tile
// servers (CSP/offline-safe). TODO(phase-2): swap for Leaflet + OSM tiles when an
// internet-connected deployment is available, per the design spec.
const GROUP_COLOR: Record<string, string> = {
  "O+": "#DC2626", "O-": "#9F1239", "A+": "#FB7185", "A-": "#F59E0B",
  "B+": "#9F1239", "B-": "#DC2626", "AB+": "#F59E0B", "AB-": "#FB7185",
};

export function DonorMap() {
  const { data } = useQuery({ queryKey: ["donor-locations"], queryFn: async () => (await api.get("/reports/donor-locations")).data });
  const pts: any[] = data?.points ?? [];
  if (!pts.length) return <p className="py-10 text-center text-muted">No geolocated donors.</p>;

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const W = 600, H = 340, pad = 16;
  const x = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2);
  const y = (lat: number) => H - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (H - pad * 2);

  return (
    <div className="overflow-hidden rounded-xl border border-line-table bg-[#FBF5F7]">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Donor location scatter">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#EBDFE3" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {pts.map((p, i) => (
          <circle key={i} cx={x(p.lng)} cy={y(p.lat)} r={5} fill={GROUP_COLOR[p.blood_group] ?? componentColor()} opacity={0.78}>
            <title>{p.name} · {p.blood_group}</title>
          </circle>
        ))}
      </svg>
      <p className="px-3 py-2 text-xs text-muted">{pts.length} geolocated donors · clustered region (synthetic)</p>
    </div>
  );
}
