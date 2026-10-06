"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollShimmerProps {
  className: string;
  children: ReactNode;
}

/**
 * Scroll-container som skriver scrollposisjonen til `--shimmer-shift` på forelderen, der
 * shimmer-pseudoelementene bor.
 *
 * En komponent framfor en hook, slik at innholdet kan rendres på serveren og bare denne
 * tynne wrapperen havner i klientbundelen.
 */
export default function ScrollShimmer({ className, children }: ScrollShimmerProps) {
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
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
