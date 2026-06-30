import { useEffect, useRef } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";

declare global {
  interface Window {
    google?: any;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Renders the official "Sign in with Google" button. On success Google returns a
 * credential (an ID token) which we hand to the backend via onCredential.
 */
export function GoogleSignInButton({
  clientId,
  onCredential,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the latest callback without re-initialising GIS on every render.
  const cb = useRef(onCredential);
  cb.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: { credential: string }) => cb.current(resp.credential),
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "pill",
        });
      })
      .catch(() => {
        /* button simply won't render; email/password fallback remains */
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return <div ref={ref} className="flex justify-center" />;
}
