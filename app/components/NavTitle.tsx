"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { navTitle } from "@/lib/routes";

/**
 * The part of the nav title that reads the query. In its own Suspense in NavBar: without one,
 * useSearchParams fails `next build` on the static pages.
 */
export default function NavTitle() {
  const pathname = usePathname();
  const via = useSearchParams().getAll("via");
  return navTitle(pathname, via);
}
