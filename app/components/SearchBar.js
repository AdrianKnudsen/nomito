import styles from "../../styles/searchBar.module.css";

const searchBar = () => {
  return (
    <main>
      <div className={styles.searchBox}>
        <input
          type="text"
          name="search"
          placeholder="Add your ingredients here..."
          className={styles.searchInput}
        ></input>
      </div>
    </main>
  );
};

export default searchBar;
