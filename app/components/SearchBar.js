"use client";

import { useState } from "react";
import styles from "../../styles/searchBar.module.css";

export default function SearchBar({ onSearch }) {
  const [inputValue, setInputValue] = useState("");

  const handleSearch = () => {
    onSearch(inputValue);
  };
  return (
    <main>
      <div className={styles.searchBox}>
        <input
          type="text"
          name="search"
          placeholder="Add your ingredients here..."
          className={styles.searchInput}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />
      </div>
    </main>
  );
}
