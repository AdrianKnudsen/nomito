import Link from "next/link";
import Notice from "./components/Notice";
import page from "../styles/page.module.css";

export default function NotFound() {
  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        Page not found
      </h1>
      <Notice>
        This page doesn&apos;t exist. <Link href="/">Go to the start page</Link>
      </Notice>
    </>
  );
}
