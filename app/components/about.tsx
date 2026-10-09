import ScrollShimmer from "./ScrollShimmer";
import styles from "../../styles/about.module.css";

const About = () => {
  return (
    <div className={styles.textWrapper}>
      <ScrollShimmer className={styles.scrollContainer}>
        <div>
          <h1 className={styles.head}>
            Nomito — Cook Smarter with What You Have
          </h1>
          <p className={styles.infoText}>
            Nomito helps you cook with what’s already in your kitchen, so less
            food ends up in the bin and more of it ends up on your plate.
          </p>
          <p className={styles.infoText}>
            Tell Nomito what you have, and it finds recipes that need as few
            extra ingredients as possible. Staples like salt, flour and water
            are taken for granted, and every recipe you open marks what you’re
            still missing.
          </p>
          <p className={styles.infoText}>
            Using up food is half of it. The other half is eating well, so each
            recipe shows its nutrition per serving and how much of your daily
            needs it covers.
          </p>
          <p className={styles.infoText}>
            Whether you’re a student, a busy professional, or just someone who
            hates throwing food away, start with what’s in your fridge and see
            where it takes you.
          </p>
        </div>
      </ScrollShimmer>
    </div>
  );
};

export default About;
