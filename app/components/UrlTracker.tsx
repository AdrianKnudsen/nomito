"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { recordUrl } from "./navigationHistory";

/**
 * Logger hver URL appen navigerer til. Rendrer ingenting.
 *
 * `useEffect` her synkroniserer mot en ekstern logg, ikke avledet state. Ligger i sin
 * egen `Suspense` i `layout` fordi `useSearchParams` ellers tvinger hele den statiske
 * forsiden over til klientrendring.
 */
export default function UrlTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    recordUrl(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
