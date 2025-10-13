import { useState, useEffect } from "react";
import styles from "../../styles/nav.module.css";
import Image from "next/image";

const ANIMATION_DURATION = 1000;

export default function NavBar({
  onShowSearchBar,
  onSetTitle,
  navTitle,
  setShowSearchBar,
  setShowAbout,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showMenuContent, setShowMenuContent] = useState(false);

  useEffect(() => {
    let timeout;
    if (expanded) {
      setShowMenuContent(true);
    } else {
      timeout = setTimeout(() => setShowMenuContent(false), ANIMATION_DURATION);
    }
    return () => clearTimeout(timeout);
  }, [expanded]);

  return (
    <nav className={styles.navContainer}>
      <div
        className={`${styles.nav} ${expanded ? styles.navExpanded : ""}`}
        style={{
          height: expanded ? "20rem" : "6.2em",
          transition: "height 1s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "auto",
        }}
      >
        <Image
          className={styles.logo}
          src="/images/NomitoLogo.png"
          alt="logo-img"
          width={100}
          height={100}
          onClick={() => {
            onSetTitle && onSetTitle("Home");
            setExpanded(false);
            setShowSearchBar && setShowSearchBar(false);
            setShowAbout && setShowAbout(true);
          }}
        />
        <div className={styles.title}>{navTitle}</div>
        <button
          className={styles.menuButton}
          aria-label="Open menu"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 21 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.44067 14.9583H19.524M1.44067 8.5H19.524M1.44067 2.04167H19.524"
              stroke="white"
              strokeWidth="2.58333"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {showMenuContent && (
          <div className={styles.menuContent}>
            <ul>
              <li
                onClick={() => {
                  onShowSearchBar();
                  setExpanded(false);
                }}
              >
                Recipes by Ingredients
              </li>
              <li
                onClick={() => {
                  onSetTitle && onSetTitle("Placeholder");
                  setExpanded(false);
                }}
              >
                Placeholder
              </li>
              <li
                onClick={() => {
                  onSetTitle && onSetTitle("Placeholder");
                  setExpanded(false);
                }}
              >
                Placeholder
              </li>
              <li
                onClick={() => {
                  onSetTitle && onSetTitle("Placeholder");
                  setExpanded(false);
                }}
              >
                Placeholder
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
