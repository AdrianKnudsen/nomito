"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { recordUrl } from "./navigationHistory";

/**
 * Logs every URL the app navigates to. Renders nothing.
 *
 * `useEffect` here syncs with an external log, not derived state. It sits in its own
 * `Suspense` in `layout` because `useSearchParams` would otherwise force the whole static
 * home page into client rendering.
 */
export default function UrlTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    recordUrl(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
