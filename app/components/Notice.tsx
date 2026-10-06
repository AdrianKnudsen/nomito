import type { ReactNode } from "react";
import styles from "../../styles/result.module.css";

interface NoticeProps {
  /** `status` for loading, `alert` for errors, none for empty states. */
  role?: "status" | "alert";
  children: ReactNode;
}

/**
 * One surface for the loading, error and empty states. Borrows `.loading` until it gets
 * its own `.notice` styles.
 */
export default function Notice({ role, children }: NoticeProps) {
  return (
    <p className={styles.loading} role={role}>
      {children}
    </p>
  );
}
