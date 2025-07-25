import styles from "../../styles/nav.module.css";
import Image from "next/image";

const NavBar = () => {
  return (
    <nav className={styles.navContainer}>
      <div className={styles.nav}>
        <Image
          className={styles.logo}
          src="/images/NomitoLogo.png"
          alt="logo-img"
          width={100}
          height={100}
        />
        <div className={styles.title}>Recipe Finder</div>

        <button className={styles.menuButton} aria-label="Open menu">
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
      </div>
    </nav>
  );
};

export default NavBar;
