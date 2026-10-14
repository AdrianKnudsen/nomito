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
            Short on ideas? Collections are ready-made lists, like quick dinners
            or budget meals, that you can narrow down by time or diet. Help me
            choose asks four quick questions and suggests recipes that fit. Day
            plan suggests recipes for a day of meals around a rough calorie
            target — a starting point, not a nutrition plan.
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
          {/* tabIndex so "Read more" lands focus here: Next focuses the hash target after a
              navigation, and focus() is a no-op on an element that cannot take it. */}
          <section
            id="disclaimer"
            tabIndex={-1}
            aria-labelledby="disclaimer-heading"
            className={styles.disclaimer}
          >
            <h2 id="disclaimer-heading" className={styles.head}>
              Disclaimer
            </h2>
            <p className={styles.infoText}>
              Nomito shows recipes from Spoonacular, a third-party service. Ingredients,
              nutrition, allergens, diets, cooking times and prices are estimated automatically
              and may be wrong or incomplete. Nomito does not check them and cannot take
              responsibility for allergic reactions, health effects or anything else that comes
              from using a recipe. Always read the ingredient list and the labels on what you
              buy, and talk to a doctor or dietitian if you have an allergy or special dietary
              needs. Prices are rough estimates and vary by shop and country. Nomito is a recipe
              app: everything it suggests is for inspiration, not dietary, medical or nutritional
              advice.
            </p>
          </section>
        </div>
      </ScrollShimmer>
    </div>
  );
};

export default About;
