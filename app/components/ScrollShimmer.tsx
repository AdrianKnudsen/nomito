"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollShimmerProps {
  className: string;
  tabIndex?: number;
  role?: string;
  "aria-labelledby"?: string;
  children: ReactNode;
}

/**
 * A scroll container that writes its scroll position to `--shimmer-shift` on its
 * parent, where the shimmer pseudo-elements live.
 *
 * A component rather than a hook, so the content can render on the server and only this
 * thin wrapper ends up in the client bundle.
 *
 * `tabIndex`, `role` and `aria-labelledby` are optional and have no defaults, so a container
 * that does not pass them renders the same attributes as before.
 */
export default function ScrollShimmer({
  className,
  tabIndex,
  role,
  "aria-labelledby": ariaLabelledBy,
  children,
}: ScrollShimmerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper) return;

    const handleScroll = () => {
      const scrollHeight = wrapper.scrollHeight - wrapper.clientHeight;
      const scrollRatio = scrollHeight > 0 ? wrapper.scrollTop / scrollHeight : 0;
      wrapper.parentElement?.style.setProperty(
        "--shimmer-shift",
        `${scrollRatio * 100}%`
      );
    };

    handleScroll();
    wrapper.addEventListener("scroll", handleScroll);
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      tabIndex={tabIndex}
      role={role}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </div>
  );
}
