"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousUrlMatches } from "./navigationHistory";

interface BackLinkProps {
  /** The search page the recipe belongs to. History is the browser back button's job. */
  href: string;
  className?: string;
}

/** The only part of the recipe view that needs the client: the router. */
export default function BackLink({ href, className }: BackLinkProps) {
  const router = useRouter();

  // Same destination as the link, but from the router cache: a new search costs quota, a
  // step back does not. Only when the previous page *is* that search, so Back never sends
  // anyone somewhere other than the link shows. Cmd/Ctrl-click etc. keep the link's
  // normal behaviour.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const modified =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified || event.button !== 0 || !previousUrlMatches(href)) return;
    event.preventDefault();
    router.back();
  };

  // No prefetch: the link points at the search results, and prefetching them is a new
  // Spoonacular search on every view of the recipe.
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={handleClick}
    >
      Back
    </Link>
  );
}
