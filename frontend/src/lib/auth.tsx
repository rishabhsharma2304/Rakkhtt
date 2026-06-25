import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "./api";

export interface OrgBrief {
  id: string;
  name: string;
  id_prefix: string;
}
export interface Me {
  id: string;
  name: string;
  email: string;
  designation: string;
  role: string;
  is_master_user: boolean;
  active_org_id: string;
  memberships: OrgBrief[];
}

interface AuthCtx {
  me: Me | null;
  loading: boolean;
  activeOrg: OrgBrief | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as any);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<Me>("/auth/me");
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.access_token);
    await refresh();
  }

  function logout() {
    clearToken();
    setMe(null);
    location.href = "/login";
  }

  async function switchOrg(orgId: string) {
    const { data } = await api.post(`/auth/switch-org/${orgId}`);
    setToken(data.access_token);
    await refresh();
    // org scope changed — reload to refetch every query against the new tenant
    location.reload();
  }

  const activeOrg = me?.memberships.find((o) => o.id === me.active_org_id) || me?.memberships[0] || null;

  return (
    <Ctx.Provider value={{ me, loading, activeOrg, login, logout, switchOrg, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
