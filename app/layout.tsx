import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Khand } from "next/font/google";
import "../styles/globals.css";
import styles from "../styles/app.module.css";
import NavBar from "./components/NavBar";
import UrlTracker from "./components/UrlTracker";

const khand = Khand({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-khand",
});

export const metadata: Metadata = {
  title: { default: "Nomito", template: "%s · Nomito" },
  description:
    "Cook smarter with what you have. Nomito finds recipes from the ingredients already in your kitchen.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={khand.variable}>
        <div className={styles.backgroundImg} aria-hidden="true" />
        <NavBar />
        {/* The one main landmark for every page; the nav stays outside it. */}
        <main className={styles.main}>{children}</main>
        <Suspense fallback={null}>
          <UrlTracker />
        </Suspense>
      </body>
    </html>
  );
}
