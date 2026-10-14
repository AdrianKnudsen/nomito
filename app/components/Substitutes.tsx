"use client";

import {
  startTransition,
  useActionState,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import { getSubstitutes } from "@/app/recipe/[id]/actions";
import styles from "../../styles/recipeDetails.module.css";
import type { SubstitutesState } from "@/types/filters";

const INITIAL: SubstitutesState = { status: "idle" };

// Hydrated or not, without useEffect: false on the server and in the HTML, true once React runs.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

interface SubstitutesProps {
  id: number;
  /** For the accessible name: the ingredient's name, or its original line if it has none. */
  name: string;
}

/**
 * Substitutes for one missing ingredient, looked up on demand. One per distinct ingredient id: a
 * recipe can list the same ingredient twice, and two of these would pay twice.
 */
export default function Substitutes({ id, name }: SubstitutesProps) {
  const [state, dispatch, isPending] = useActionState(getSubstitutes, INITIAL);
  const [open, setOpen] = useState(false);
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const regionId = useId();

  const lookUp = () => startTransition(() => dispatch(id));

  // isPending is read from the last render, so a press while a lookup runs never starts another.
  const handleClick = () => {
    if (!open) {
      setOpen(true);
      if (state.status !== "ok" && !isPending) lookUp();
      return;
    }
    // After an error the obvious press is a retry, not a close.
    if (state.status === "error" && !isPending) {
      lookUp();
      return;
    }
    setOpen(false);
  };

  return (
    <>
      {/* Hidden until hydration: without JS it would do nothing, and a <form action> fallback
          would POST to the page and re-render it with another /information call. */}
      <button
        type="button"
        hidden={!hydrated}
        className={styles.substitutesButton}
        aria-expanded={open}
        aria-controls={regionId}
        aria-label={name ? `Substitutes for ${name}` : "Substitutes for this ingredient"}
        onClick={handleClick}
      >
        Substitutes
      </button>
      <div id={regionId} className={styles.substitutes}>
        {/* Never hidden, so the live region is in the accessibility tree before anything is
            put in it, and the wait and the answer are both announced. Its content exists only
            while the panel is open. Not role="status": in this app that means a loading state. */}
        <div aria-live="polite">
          {open && <SubstitutesResult state={state} isPending={isPending} />}
        </div>
        {/* Unmounted while a retry runs, so the same error again mounts a new node and is
            announced again. */}
        {open && state.status === "error" && !isPending && <p role="alert">{state.message}</p>}
      </div>
    </>
  );
}

function SubstitutesResult({ state, isPending }: { state: SubstitutesState; isPending: boolean }) {
  if (isPending) return <p>Looking…</p>;
  if (state.status !== "ok") return null;
  if (state.substitutes.length === 0) return <p>No substitutes known</p>;
  return (
    <ul>
      {state.substitutes.map((text, i) => (
        <li key={`subs-${i}`}>{text}</li>
      ))}
    </ul>
  );
}
