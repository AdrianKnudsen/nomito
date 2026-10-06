import type { ReactNode } from "react";
import styles from "../../styles/result.module.css";

interface NoticeProps {
  /** `status` for lasting, `alert` for feil, ingen for tomme tilstander. */
  role?: "status" | "alert";
  children: ReactNode;
}

/**
 * Felles flate for laster, feil og tom tilstand. Låner `.loading` til fase 5b gir den
 * sin egen `.notice`-form.
 */
export default function Notice({ role, children }: NoticeProps) {
  return (
    <p className={styles.loading} role={role}>
      {children}
    </p>
  );
}
