/**
 * The four ways in, in menu order: what the home page's line map draws and says. No colours
 * here: they are wired to the lines in CSS (`styles/lineMap.module.css`), never from data.
 * The client island only imports types from this file, so `lib/routes.ts` stays out of the
 * page's client chunk.
 */

import { titleFor } from "./routes";

export type LineId = "search" | "collections" | "guide" | "plan";

export interface Line {
  readonly id: LineId;
  /** Equal to the ROUTES prefix. */
  readonly prefix: string;
  /** The board's text when the train has arrived, and the link's description. */
  readonly board: string;
  readonly stations: readonly string[];
}

/** The serialisable shape handed to the client island. */
export interface BoardLine {
  id: LineId;
  name: string;
  href: string;
  board: string;
  stations: readonly string[];
}

export const LINES: readonly Line[] = [
  {
    id: "search",
    prefix: "/search",
    board: "Type what you have. Get recipes that need the fewest extras",
    stations: ["Type what you have", "Fewest extras", "See what’s missing"],
  },
  {
    id: "collections",
    prefix: "/collections",
    board: "Ready-made lists. Narrow them by time or by what you avoid",
    stations: ["Pick a list", "Narrow by time or diet"],
  },
  {
    id: "guide",
    prefix: "/guide",
    board: "Four quick questions, then recipes that fit",
    stations: ["Four questions", "Recipes that fit"],
  },
  {
    id: "plan",
    prefix: "/plan",
    board: "Pick your meals and a calorie target. A recipe per meal",
    stations: ["Pick meals", "Set a calorie target", "A recipe per meal"],
  },
];

export const IDLE_TEXT =
  "Nomito finds recipes for the food in your fridge. Pick a line";

/** The name comes from the route table, so the menu and the map can never disagree. */
export function lineName(line: Line): string {
  return titleFor(line.prefix);
}

export function toBoardLine(line: Line): BoardLine {
  return {
    id: line.id,
    name: lineName(line),
    href: line.prefix,
    board: line.board,
    stations: line.stations,
  };
}
