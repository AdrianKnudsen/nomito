import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Disclaimer from "../../components/Disclaimer";
import FilteredResults from "../../components/FilteredResults";
import Notice from "../../components/Notice";
import ResultPanel from "../../components/ResultPanel";
import controls from "../../../styles/controls.module.css";
import page from "../../../styles/page.module.css";
import {
  completeGuideAnswers,
  guideFilters,
  guidePairs,
  guideQuestion,
  guideStep,
  guideSummary,
  parseGuideAnswers,
  receivedQuery,
  toQuery,
  withQuery,
  type SearchParams,
} from "@/lib/filters";
import { titleFor } from "@/lib/routes";

interface GuideResultsPageProps {
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({
  searchParams,
}: GuideResultsPageProps): Promise<Metadata> {
  const answers = parseGuideAnswers(await searchParams);
  // An incomplete set redirects to /guide, and the title is announced before the switch.
  const title = completeGuideAnswers(answers)
    ? "Your recipes"
    : guideQuestion(guideStep(answers));
  return { title: `${title} · ${titleFor("/guide")}` };
}

export default async function GuideResultsPage({ searchParams }: GuideResultsPageProps) {
  const search = await searchParams;
  const answers = parseGuideAnswers(search);
  const complete = completeGuideAnswers(answers);
  // Without the first three answers the guide asks the next question instead. No call.
  if (!complete) redirect(withQuery("/guide", guidePairs(answers)));

  const pairs = guidePairs(complete);
  const query = toQuery(pairs);
  if (query !== receivedQuery(search)) redirect(withQuery("/guide/results", pairs));

  return (
    <>
      <h1 tabIndex={-1} className={page.title}>
        {guideSummary(complete)}
      </h1>
      <div className={page.panel}>
        <div className={page.actions}>
          <Link href={withQuery("/guide", pairs)} className={controls.button}>
            Change answers
          </Link>
          <Link href="/guide" className={controls.button}>
            Start over
          </Link>
        </div>
        <Disclaimer />
      </div>
      <ResultPanel>
        <Suspense
          key={`results-${query}`}
          fallback={<Notice role="status">Loading recipes...</Notice>}
        >
          {/* "Surprise me" sorts at random, so every load gives new hits. */}
          <FilteredResults filters={guideFilters(complete)} origin={{ via: "guide", ...complete }} />
        </Suspense>
      </ResultPanel>
    </>
  );
}
