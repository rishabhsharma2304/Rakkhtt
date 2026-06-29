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

export interface GoogleResult {
  access_token: string | null;
  registration_required: boolean;
  registration_token: string | null;
  email: string | null;
  name: string | null;
}

export interface OnboardInput {
  registration_token: string;
  org_name: string;
  license_no?: string;
  contact?: string;
  address?: string;
  id_prefix?: string;
}

interface AuthCtx {
  me: Me | null;
  loading: boolean;
  activeOrg: OrgBrief | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<GoogleResult>;
  onboard: (input: OnboardInput) => Promise<void>;
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

  async function loginWithGoogle(credential: string): Promise<GoogleResult> {
    const { data } = await api.post<GoogleResult>("/auth/google", { credential });
    if (data.access_token) {
      // Existing account — straight in.
      setToken(data.access_token);
      await refresh();
    }
    // Otherwise the caller routes to onboarding with data.registration_token.
    return data;
  }

  async function onboard(input: OnboardInput) {
    const { data } = await api.post("/auth/onboard", input);
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
    <Ctx.Provider value={{ me, loading, activeOrg, login, loginWithGoogle, onboard, logout, switchOrg, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
