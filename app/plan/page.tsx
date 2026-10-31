import type { Metadata } from "next";
import Form from "next/form";
import { redirect } from "next/navigation";
import Disclaimer from "../components/Disclaimer";
import PlanFraming from "../components/PlanFraming";
import SubmitOnce from "../components/SubmitOnce";
import controls from "../../styles/controls.module.css";
import page from "../../styles/page.module.css";
import {
  AVOID_OPTIONS,
  CALORIE_OPTIONS,
  DEFAULT_CALORIES,
  DEFAULT_PLAN_MEALS,
  PLAN_MEAL_OPTIONS,
  parsePlanChoices,
  planChoicesPairs,
  receivedQuery,
  toQuery,
  withQuery,
  type SearchParams,
} from "@/lib/filters";
import { titleFor } from "@/lib/routes";
import type { PlanChoices } from "@/types/filters";

export const metadata: Metadata = { title: titleFor("/plan") };

interface PlanPageProps {
  searchParams: Promise<SearchParams>;
}

/** A free form. Reads the query only to preselect "Change choices". */
export default async function PlanPage({ searchParams }: PlanPageProps) {
  const search = await searchParams;
  const choices = parsePlanChoices(search);
  const pairs = planChoicesPairs(choices);
  const query = toQuery(pairs);
  if (query !== receivedQuery(search)) redirect(withQuery("/plan", pairs));

  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        Day plan
      </h1>
      <div className={page.panel}>
        <PlanFraming />
        <Disclaimer />
        <PlanForm key={`form-${query}`} choices={choices} />
      </div>
    </>
  );
}

function PlanForm({ choices }: { choices: PlanChoices }) {
  // The defaults live in the form only, never in the parser, so the bare /plan stays canonical.
  const meals = choices.meals.length > 0 ? choices.meals : DEFAULT_PLAN_MEALS;
  const calories = choices.calories ?? DEFAULT_CALORIES;
  return (
    <Form action="/plan/results" className={page.form}>
      <fieldset className={page.fieldset}>
        <legend className={page.legend}>Meals</legend>
        {PLAN_MEAL_OPTIONS.map((option) => (
          <label key={`meal-${option.value}`} className={page.choice}>
            <input
              type="checkbox"
              name="meals"
              value={option.value}
              defaultChecked={meals.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <fieldset className={page.fieldset} aria-describedby="calorie-note">
        <legend className={page.legend}>Daily calories</legend>
        {CALORIE_OPTIONS.map((option) => (
          <label key={`calories-${option.value}`} className={page.choice}>
            <input
              type="radio"
              name="calories"
              value={option.value}
              defaultChecked={calories === option.value}
            />
            {option.label}
          </label>
        ))}
        <p id="calorie-note" className={page.fieldNote}>
          A general guide for adults; needs vary.
        </p>
      </fieldset>
      <fieldset className={page.fieldset}>
        <legend className={page.legend}>Avoid</legend>
        {AVOID_OPTIONS.map((option) => (
          <label key={`avoid-${option.value}`} className={page.choice}>
            <input
              type="checkbox"
              name="avoid"
              value={option.value}
              defaultChecked={choices.avoid.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <div className={page.formActions}>
        <SubmitOnce className={controls.buttonAccent}>Make a plan</SubmitOnce>
        <span className={page.note}>Each new plan uses quota</span>
      </div>
    </Form>
  );
}
