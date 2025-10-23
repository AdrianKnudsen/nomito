import React, { useEffect } from "react";
import styles from "../../styles/about.module.css";

const About = () => {
  useEffect(() => {
    const wrapper = document.querySelector(`.${styles.scrollContainer}`);
    if (!wrapper) return;
    const handleScroll = () => {
      const scrollTop = wrapper.scrollTop;
      const scrollHeight = wrapper.scrollHeight - wrapper.clientHeight;
      const scrollRatio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      const shimmerShift = scrollRatio * 100;
      wrapper.parentElement.style.setProperty(
        "--shimmer-shift",
        `${shimmerShift}%`
      );
    };
    wrapper.addEventListener("scroll", handleScroll);
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={styles.textWrapper}>
      <div className={styles.scrollContainer}>
        <div className={styles.textContent}>
          <h1 className={styles.head}>
            Nomito - Cook Smarter with What You Have.
          </h1>
          <p className={styles.infoText}>
            Welcome to Nomito, your personal cooking companion that helps you
            make the most out of what’s already in your kitchen.
            <br />
            <br />
            Just tell Nomito what ingredients you have, and it will instantly
            suggest delicious recipes you can make — no wasted food, no
            last-minute grocery runs, and no stress.
            <br />
            <br />
            Nomito is all about simplicity, creativity, and sustainability.
            <br />
            Whether you’re a student, a busy professional, or just someone who
            hates throwing away food, Nomito helps you turn everyday ingredients
            into something special.
            <br />
            <br />
            Start exploring, experiment with flavors, and discover new ways to
            cook smarter — all with Nomito.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
