import Form from "next/form";
import styles from "../../styles/searchBar.module.css";

interface SearchBarProps {
  /** The search from the URL, so the field shows it after a reload and the back button. */
  defaultValue: string;
}

/**
 * A plain GET form to /search. `next/form` makes it a client-side navigation once JS has
 * loaded; without JS it works as an ordinary form.
 */
export default function SearchBar({ defaultValue }: SearchBarProps) {
  return (
    <search className={styles.searchContainer}>
      <div className={styles.searchBox}>
        <Form action="/search" className={styles.inputButtonBox}>
          <input
            type="text"
            name="ingredients"
            placeholder="Add your ingredients here..."
            className={styles.searchInput}
            defaultValue={defaultValue}
          />
          <button
            type="submit"
            className={styles.searchButton}
            aria-label="Search"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 15L21 21"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Form>
      </div>
    </search>
  );
}
