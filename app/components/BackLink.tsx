"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { previousUrlMatches } from "./navigationHistory";

interface BackLinkProps {
  /**
   * Where the link goes: the search, the origin's results, or for a random list the free form in
   * front of it. Used whenever history cannot be: a new tab, a reload, a shared link.
   */
  href: string;
  /**
   * The list the recipe was opened from. When it is the previous URL in the app, Back steps back
   * to it instead. The same as `href` unless the list is random.
   */
  historyHref: string;
  className?: string;
}

/** A client component for the router: Back steps through history when it can. */
export default function BackLink({ href, historyHref, className }: BackLinkProps) {
  const router = useRouter();

  // A step back serves the list from the router cache: no call, and the same recipes. Only when
  // the previous page *is* that list. Otherwise the link is followed, which for a random list is
  // its free form rather than a new list that costs quota. Cmd/Ctrl-click etc. keep the link's
  // normal behaviour.
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const modified =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified || event.button !== 0 || !previousUrlMatches(historyHref)) return;
    event.preventDefault();
    router.back();
  };

  // No prefetch: for the search and a fixed list the link points at a page that searches, and
  // prefetching it can be a new Spoonacular search on every view of the recipe.
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
