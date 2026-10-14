"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

interface SubmitOnceProps {
  className?: string;
  children: ReactNode;
}

/**
 * A submit button that lets one submission of the same choices through and stops repeats: a double
 * click on a slow network paid for two searches and showed one. Changed choices always go
 * through. Used on every form whose submit is paid (Make a plan, Show recipes, Apply). The guard
 * lives as long as the form: it resets when the form unmounts or remounts with a new key, Back
 * included. Pressing again with the same choices on the page they already show is stopped, unless
 * the submission redirects (a collection's "Any" time does): the redirect remounts the form.
 * Change a choice or reload to search again.
 *
 * On the button's click rather than the form's submit: the forms are rendered by server
 * components and cannot take an onSubmit function. A cancelled click cancels the submission, and
 * Enter in a field submits through a click on this button too.
 */
export default function SubmitOnce({ className, children }: SubmitOnceProps) {
  const submitted = useRef<string | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;
    // The same choices again would pay again for the same page; changed choices go through.
    const data = form
      ? new URLSearchParams(
          [...new FormData(form)].map(([key, value]): [string, string] => [key, String(value)])
        ).toString()
      : "";
    if (submitted.current === data) {
      event.preventDefault();
      return;
    }
    submitted.current = data;
  };

  return (
    <button type="submit" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
