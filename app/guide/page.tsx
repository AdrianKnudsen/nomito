import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import controls from "../../styles/controls.module.css";
import page from "../../styles/page.module.css";
import {
  AVOID_OPTIONS,
  completeGuideAnswers,
  guideChoices,
  guidePairs,
  guideQuestion,
  guideStep,
  parseGuideAnswers,
  receivedQuery,
  toQuery,
  withoutPreviousAnswer,
  withQuery,
  type SearchParams,
} from "@/lib/filters";
import { titleFor } from "@/lib/routes";
import type { CompleteGuideAnswers, GuideAnswers } from "@/types/filters";

interface GuidePageProps {
  searchParams: Promise<SearchParams>;
}

/** Each step has its own title, so Next's route announcer reads the change of question. */
export async function generateMetadata({ searchParams }: GuidePageProps): Promise<Metadata> {
  const step = guideStep(parseGuideAnswers(await searchParams));
  return { title: `${guideQuestion(step)} · ${titleFor("/guide")}` };
}

/** One question per step. Always free: nothing here calls Spoonacular. */
export default async function GuidePage({ searchParams }: GuidePageProps) {
  const search = await searchParams;
  const answers = parseGuideAnswers(search);
  const pairs = guidePairs(answers);
  const query = toQuery(pairs);
  if (query !== receivedQuery(search)) redirect(withQuery("/guide", pairs));

  const complete = completeGuideAnswers(answers);
  const step = guideStep(answers);

  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        {guideQuestion(step)}
      </h1>
      <div className={page.panel}>
        <p className={page.note}>Step {step} of 4</p>
        {/* Without a complete set the step is 1-3; `step !== 4` says so to TypeScript too. */}
        {complete ? (
          <AvoidForm key={`form-${query}`} answers={complete} />
        ) : (
          step !== 4 && <AnswerLinks answers={answers} step={step} />
        )}
        {step !== 1 && (
          <Link
            href={withQuery("/guide", guidePairs(withoutPreviousAnswer(answers, step)))}
            className={controls.button}
          >
            Previous question
          </Link>
        )}
      </div>
    </>
  );
}

function AnswerLinks({ answers, step }: { answers: GuideAnswers; step: 1 | 2 | 3 }) {
  return (
    <ul className={page.answers}>
      {guideChoices(answers, step).map((choice) => (
        <li key={`answer-${choice.value}`}>
          <Link href={withQuery("/guide", guidePairs(choice.next))} className={controls.button}>
            {choice.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AvoidForm({ answers }: { answers: CompleteGuideAnswers }) {
  return (
    <Form action="/guide/results" className={page.form}>
      {/* The earlier answers ride along in the canonical order, so a submit lands on the
          canonical URL without a redirect. */}
      <input type="hidden" name="meal" value={answers.meal} />
      <input type="hidden" name="time" value={answers.time} />
      <input type="hidden" name="goal" value={answers.goal} />
      <fieldset className={page.fieldset}>
        <legend className={page.legend}>Anything to avoid?</legend>
        {AVOID_OPTIONS.map((option) => (
          <label key={`avoid-${option.value}`} className={page.choice}>
            <input
              type="checkbox"
              name="avoid"
              value={option.value}
              defaultChecked={answers.avoid.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <button type="submit" className={controls.button}>
        Show recipes
      </button>
    </Form>
  );
}
