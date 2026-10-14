"use client";

import Link, { useLinkStatus } from "next/link";
import { useRef, type MouseEvent } from "react";

interface NewPlanLinkProps {
  href: string;
  className?: string;
}

/**
 * "New plan", which navigates once and swallows further presses: every press used to start a paid
 * plan while only one was shown. The ref guard holds from the click until the navigation has
 * committed, and the parent's slot holds the rest, since the link only renders once the plan has
 * arrived. The pending label is in the DOM for a few milliseconds at most, as the link is swapped
 * out right after the press.
 */
export default function NewPlanLink({ href, className }: NewPlanLinkProps) {
  const started = useRef(false);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Cmd/Ctrl-click and the like open a new tab and leave this page alone.
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified || event.button !== 0) return;
    if (started.current) {
      event.preventDefault();
      return;
    }
    started.current = true;
  };

  // No prefetch: every plan is paid for.
  return (
    <Link href={href} prefetch={false} className={className} onClick={handleClick}>
      <NewPlanLabel />
    </Link>
  );
}

/** useLinkStatus only works in a child of the Link. */
function NewPlanLabel() {
  const { pending } = useLinkStatus();
  return pending ? "Making a new plan…" : "New plan";
}
