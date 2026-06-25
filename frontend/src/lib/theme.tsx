import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const Ctx = createContext<{ dark: boolean; toggle: () => void }>({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => localStorage.getItem("rakkhtt_dark") === "1");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("rakkhtt_dark", dark ? "1" : "0");
  }, [dark]);
  return <Ctx.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>{children}</Ctx.Provider>;
}
