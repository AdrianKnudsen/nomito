import type { Metadata } from "next";
import ScrollShimmer from "../components/ScrollShimmer";
import page from "../../styles/page.module.css";
import styles from "../../styles/aboutPage.module.css";
import { titleFor } from "@/lib/routes";

export const metadata: Metadata = {
  title: titleFor("/about"),
  description:
    "What Nomito is, where its recipe data comes from, how it handles privacy, and credits.",
};

/** Static: the text is fixed, so nothing here fetches. */
export default function AboutPage() {
  return (
    <>
      <h1 id="about-heading" tabIndex={-1} className={page.title}>
        About Nomito
      </h1>
      <div className={styles.card}>
        <ScrollShimmer
          className={styles.scrollContainer}
          tabIndex={0}
          role="region"
          aria-labelledby="about-heading"
        >
          <div className={styles.prose}>
            <section aria-labelledby="what-heading">
              <h2 id="what-heading">What Nomito is</h2>
              <p>
                Nomito helps you cook with what’s already in your kitchen, so less food ends up in
                the bin and more of it ends up on your plate.
              </p>
              <p>
                Tell Nomito what you have, and it finds recipes that need as few extra ingredients
                as possible. Staples like salt, flour and water are taken for granted, and every
                recipe you open from that search marks what you’re still missing.
              </p>
              <p>
                Short on ideas? Collections are ready-made lists, like quick & easy meals or budget
                meals, that you can adjust by time or by what you avoid. Help me choose asks four
                quick questions and suggests recipes that fit. Day plan suggests recipes for each
                meal you pick, sized from a rough calorie target — a starting point, not a
                nutrition plan.
              </p>
              <p>
                Using up food is half of it. The other half is eating well, so each recipe shows
                its nutrition per serving, with an estimated daily value based on a 2,000 kcal
                reference diet.
              </p>
              <p>
                Nomito is a personal, non-commercial project by [[NAME]]. It has no accounts, no
                ads and nothing to buy.
              </p>
            </section>

            {/* tabIndex on each anchor section so a link to /about#disclaimer, /about#privacy or
                /about#credits lands focus here: Next focuses the hash target after a navigation,
                and focus() is a no-op on an element that cannot take it. */}
            <section id="disclaimer" tabIndex={-1} aria-labelledby="disclaimer-heading">
              <h2 id="disclaimer-heading">Recipe data and disclaimer</h2>
              <p>
                Nomito shows recipes from Spoonacular, a third-party service. Ingredients,
                nutrition, allergens, diets, cooking times and prices are estimated automatically
                and may be wrong or incomplete. Nomito does not check them and cannot take
                responsibility for allergic reactions, health effects or anything else that comes
                from using a recipe.
              </p>
              <p>
                Always read the ingredient list and the labels on what you buy, and talk to a
                doctor or dietitian if you have an allergy or special dietary needs.
              </p>
              <p>
                Prices are rough estimates and vary by shop and country. Nomito is a recipe app:
                everything it suggests is for inspiration, not dietary, medical or nutritional
                advice.
              </p>
            </section>

            <section id="privacy" tabIndex={-1} aria-labelledby="privacy-heading">
              <h2 id="privacy-heading">Privacy</h2>
              <p>
                [[NAME]] runs Nomito as a private individual and is responsible for Nomito. You can
                reach [[NAME]] at <a href="mailto:[[EMAIL]]">[[EMAIL]]</a>.
              </p>

              <h3>What is recorded</h3>
              <p>
                Nomito has no accounts and does not use cookies, local storage, analytics or
                third-party scripts. Nomito itself does not store your searches.
              </p>
              <p>
                Nomito is hosted by [[HOST]], which records the requests made to the site: your IP
                address, the approximate location derived from it, your browser, and the address of
                the page (URL) you asked for. For a search or a recipe, that URL contains the
                ingredients and choices you entered.
              </p>

              <h3>Why, and on what basis</h3>
              <p>
                [[HOST_ROLE_SENTENCE]] You can ask for the assessment behind this. You don’t have to
                give Nomito any personal data, but the site cannot be served without these records.
                Nomito makes no automated decisions about you.
              </p>
              <p>
                To find recipes, Nomito’s server sends the ingredients and choices you enter to
                Spoonacular. Your IP address is not sent to Spoonacular: recipe images are loaded
                through Nomito’s own server.
              </p>

              <h3>Who else receives it, and for how long</h3>
              <p>[[HOST_SENTENCE]] [[RETENTION_SENTENCE]]</p>

              <h3>Your rights</h3>
              <p>
                You can object at any time to this processing, on grounds relating to your
                situation. Write to <a href="mailto:[[EMAIL]]">[[EMAIL]]</a>.
              </p>
              <p>
                You can ask for access to the personal data about you, and to have it corrected,
                deleted or restricted. Write to <a href="mailto:[[EMAIL]]">[[EMAIL]]</a>.{" "}
                [[HOST_RIGHTS_SENTENCE]] You can also complain to Datatilsynet, the Norwegian Data
                Protection Authority, at <a href="https://www.datatilsynet.no/">datatilsynet.no</a>,
                or the data protection authority where you live.
              </p>
              <p>Last updated [[DATE]].</p>
            </section>

            <section id="credits" tabIndex={-1} aria-labelledby="credits-heading">
              <h2 id="credits-heading">Credits</h2>
              <p>
                Recipes, nutrition, cost estimates used to sort budget meals and ingredient
                substitutes come from the{" "}
                <a href="https://spoonacular.com/food-api">spoonacular API</a>. Nomito is not made
                by or affiliated with Spoonacular.
              </p>
              <p>
                Every recipe credits its original source by name, with a link to the original
                recipe, whenever Spoonacular gives one.
              </p>
              <p>
                Recipes shared under a Creative Commons license also show that license, with a
                link to its terms.
              </p>
              <p>[[PHOTO_CREDIT]]</p>
            </section>
          </div>
        </ScrollShimmer>
      </div>
    </>
  );
}
