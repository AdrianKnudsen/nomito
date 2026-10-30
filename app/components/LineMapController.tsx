"use client";

import {
  useEffect,
  useReducer,
  useRef,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { FLIP_POOL, layoutBoard } from "../../lib/board";
import type { BoardLine, LineId } from "../../lib/lines";
import controls from "../../styles/controls.module.css";
import styles from "../../styles/lineMap.module.css";

interface LineMapControllerProps {
  lines: readonly BoardLine[];
  idle: string;
  children: ReactNode;
}

// How many cells the board renders: the largest cols x rows over the base form, the 48rem form
// and the container steps in lineMap.module.css (the base form is the largest). Recompute it
// with the text check whenever a form changes.
const BOARD_CELLS = 90;

const FLIP_STEP_MS = 55;

/**
 * How long until the board's own fade-in (a CSS animation with a delay) starts showing it, so
 * the text enters together with the rest of the opening and the delay is written only in CSS.
 * No such animation (reduced motion, already finished, no styles yet) means no wait.
 */
function boardEntryDelay(board: Element): number {
  const now = document.timeline.currentTime;
  if (typeof now !== "number") return 0;
  const animation = board
    .getAnimations()
    .find((candidate) => candidate instanceof CSSAnimation);
  if (!animation) return 0;
  const delay = animation.effect?.getTiming().delay ?? 0;
  // A null start time means the animation is pending: it starts about now.
  const start =
    typeof animation.startTime === "number" ? animation.startTime : now;
  return Math.max(0, start + Number(delay) - now);
}

type Input = "pointer" | "focus" | "touch";
type Drawing = "wide" | "tall";
type Phase = "running" | "arrived";

interface State {
  selected: LineId | null;
  phase: Phase | null;
  input: Input | null;
  tour: Drawing | null;
  /** From --map-board-stations on the drawing at tour start, for showing station names off the map. */
  boardStations: boolean;
  /** The last station the train stood at on this trip; the board holds it until the next. */
  station: number | null;
}

type Action =
  | {
      type: "select";
      id: LineId;
      input: Input;
      tour: Drawing;
      boardStations: boolean;
      /** Reduced motion, or nothing to run along: go straight to arrived. */
      instant: boolean;
    }
  | { type: "input"; input: Input }
  | { type: "station"; index: number }
  | { type: "arrive" };

const INITIAL_STATE: State = {
  selected: null,
  phase: null,
  input: null,
  tour: null,
  boardStations: false,
  station: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select":
      return {
        selected: action.id,
        phase: action.instant ? "arrived" : "running",
        input: action.input,
        tour: action.tour,
        boardStations: action.boardStations,
        // A new selection ends whatever stop the old trip was at.
        station: null,
      };
    case "station":
      return { ...state, station: action.index };
    case "input":
      return state.input === action.input
        ? state
        : { ...state, input: action.input };
    case "arrive":
      return state.phase === "running"
        ? { ...state, phase: "arrived", station: null }
        : state;
  }
}

/**
 * What the board says, worked out during render. Where the drawing names its own stations
 * the board has the line text from the start; where it does not (the tall one) the board
 * shows the line name, then each station from the moment the train stands at it until the
 * next one (the approved sketch does the same), then the line text.
 */
function boardText(
  state: State,
  lines: readonly BoardLine[],
  idle: string
): string {
  if (state.selected === null) return idle;
  const line = lines.find((candidate) => candidate.id === state.selected);
  if (!line) throw new Error(`No board line for "${state.selected}"`);
  if (!state.boardStations || state.phase === "arrived") return line.board;
  return state.station === null
    ? line.name
    : (line.stations[state.station] ?? line.name);
}

// The ids the drawings carry, written out here because lib/lines.ts imports the route table
// and the island only takes types from it, so that stays out of the page's client chunk.
// The Record makes a missing or extra id a compile error.
const LINE_ID_SET: Record<LineId, true> = {
  search: true,
  collections: true,
  guide: true,
  plan: true,
};
const LINE_IDS: readonly string[] = Object.keys(LINE_ID_SET);

function isLineId(value: string | null): value is LineId {
  return value !== null && LINE_IDS.includes(value);
}

function isDrawing(value: string | null): value is Drawing {
  return value === "wide" || value === "tall";
}

// User units per ms along the track, and the least a stretch between stops may take.
const TRAIN_SPEED = 0.42;
const MIN_STRETCH_MS = 200;

/** Soft start and stop per stretch. */
function ease(k: number): number {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}

function readCssProperty(el: Element, name: string): string {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  if (raw === "") throw new Error(`${name} is not set on the element`);
  return raw;
}

/** A unitless custom property CSS owns, read as a number. */
function readCssNumber(el: Element, name: string): number {
  const raw = readCssProperty(el, name);
  const value = Number(raw);
  if (Number.isNaN(value)) throw new Error(`${name} is not a number: "${raw}"`);
  return value;
}

/** A duration custom property CSS owns, in milliseconds ("650ms" and "0.65s" both work). */
function readCssMs(el: Element, name: string): number {
  const raw = readCssProperty(el, name);
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(raw);
  if (!match) throw new Error(`${name} is not a duration in ms or s: "${raw}"`);
  return match[2] === "s" ? Number(match[1]) * 1000 : Number(match[1]);
}

const stopCache = new WeakMap<SVGPathElement, number[]>();

/**
 * The distance along the track to each tick, found once per track. A coarse scan every 2 units
 * locates the nearest sample, a fine scan around it settles the stop well inside 1 unit.
 * Scanning every half unit on each selection was too slow, so the result is cached.
 */
function stopDistances(
  path: SVGPathElement,
  ticks: readonly SVGPathElement[]
): number[] {
  const cached = stopCache.get(path);
  if (cached) return cached;

  const total = path.getTotalLength();
  const stops = ticks.map((tick) => {
    const at = tick.getAttribute("data-at") ?? "";
    const [x, y] = at.split(",").map(Number);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      throw new Error(`Tick without a usable data-at: "${at}"`);
    }
    const gap = (d: number) => {
      const point = path.getPointAtLength(d);
      return (point.x - x) ** 2 + (point.y - y) ** 2;
    };

    let coarseBest = 0;
    for (let d = 0; d <= total; d += 2) {
      if (gap(d) < gap(coarseBest)) coarseBest = d;
    }
    let best = coarseBest;
    const end = Math.min(total, coarseBest + 2);
    for (let d = Math.max(0, coarseBest - 2); d <= end; d += 0.05) {
      if (gap(d) < gap(best)) best = d;
    }
    return best;
  });

  stopCache.set(path, stops);
  return stops;
}

type TripPhase =
  | { kind: "move"; from: number; to: number; duration: number }
  | { kind: "dwell"; station: number; duration: number };

function buildPlan(
  stops: readonly number[],
  total: number,
  dwell: number
): TripPhase[] {
  const points = [0, ...stops, total];
  const plan: TripPhase[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    plan.push({
      kind: "move",
      from,
      to,
      duration: Math.max(MIN_STRETCH_MS, Math.abs(to - from) / TRAIN_SPEED),
    });
    if (i < stops.length) {
      plan.push({ kind: "dwell", station: i, duration: dwell });
    }
  }
  return plan;
}

interface Trip {
  svg: SVGSVGElement;
  frame: number;
  lit: Element | null;
}

function clearLit(trip: Trip) {
  trip.lit?.removeAttribute("data-lit");
  trip.lit = null;
}

function stopTrip(trip: Trip) {
  cancelAnimationFrame(trip.frame);
  clearLit(trip);
}

// The DOM writes the island makes outside React: cx and cy on the train, data-lit on a
// station name, the board's cells (their text and flap animations) and --map-drawn on the
// dock. The first three and the last are presentation hooks CSS reads.
function place(path: SVGPathElement, train: SVGCircleElement, distance: number) {
  const point = path.getPointAtLength(distance);
  train.setAttribute("cx", String(point.x));
  train.setAttribute("cy", String(point.y));
}

function runTrip(
  trip: Trip,
  plan: readonly TripPhase[],
  path: SVGPathElement,
  train: SVGCircleElement,
  stations: readonly Element[],
  onStation: (index: number) => void,
  onDone: () => void
) {
  let index = 0;
  let entered = -1;
  let phaseStart: number | null = null;

  const frame = (now: number) => {
    if (phaseStart === null) phaseStart = now;

    while (index < plan.length) {
      const phase = plan[index];
      if (entered !== index) {
        entered = index;
        if (phase.kind === "dwell") {
          onStation(phase.station);
          const station = stations[phase.station];
          if (station) {
            station.setAttribute("data-lit", "");
            trip.lit = station;
          }
        }
      }

      const elapsed = now - phaseStart;
      if (elapsed < phase.duration) {
        if (phase.kind === "move") {
          const k = ease(elapsed / phase.duration);
          place(path, train, phase.from + (phase.to - phase.from) * k);
        }
        trip.frame = requestAnimationFrame(frame);
        return;
      }

      if (phase.kind === "move") place(path, train, phase.to);
      else clearLit(trip);
      phaseStart += phase.duration;
      index++;
    }

    onDone();
  };

  trip.frame = requestAnimationFrame(frame);
}

/**
 * The root of the line map: holds the selection and the trip, and lets CSS mark the chosen
 * line in both drawings from attributes on this element. Takes the drawings as children from
 * the server, as ScrollShimmer does, so none of their markup is in the client bundle.
 */
export default function LineMapController({
  lines,
  idle,
  children,
}: LineMapControllerProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const tripRef = useRef<Trip | null>(null);
  // A pointer press in progress, from pointerdown until the click that follows it (or a
  // cancel). `line` is the line the press started on, if any; a touch press on a line is the
  // mark that makes the next click on that same line pick instead of navigate (spec 7.3).
  const pressRef = useRef<{ line: LineId | null; touch: boolean } | null>(null);
  // Mirrors state.selected for the handlers: two events can land before a render.
  const selectedRef = useRef<LineId | null>(null);

  const text = boardText(state, lines, idle);

  // A press that never produced a click must not be left standing to swallow a later focus.
  // On the document, because the end of a press can land outside the map, and a Tab that
  // moves focus into the map starts outside it. A mouse or pen press is over once the button
  // is up; a touch press stays until its click (the browser focuses and clicks after
  // pointerup), and is otherwise ended by a cancel (a swipe) or by the next key press.
  useEffect(() => {
    const clearPress = () => {
      pressRef.current = null;
    };
    const clearMousePress = () => {
      if (pressRef.current && !pressRef.current.touch) pressRef.current = null;
    };
    document.addEventListener("keydown", clearPress, true);
    document.addEventListener("pointercancel", clearPress, true);
    document.addEventListener("pointerup", clearMousePress, true);
    return () => {
      document.removeEventListener("keydown", clearPress, true);
      document.removeEventListener("pointercancel", clearPress, true);
      document.removeEventListener("pointerup", clearMousePress, true);
    };
  }, []);

  // The one effect that touches the cells: it paints the derived text onto them. The text
  // itself is never state. A new text clears the timers of the previous one, so it replaces
  // a flip in progress; cells that already show the right character stand still.
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const cells = Array.from(board.children);

    const timers = new Set<number>();
    const later = (action: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        action();
      }, ms);
      timers.add(id);
    };
    const cancelFlips = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();
    };

    // Null while the module's styles are not applied yet (seen in dev after history.back()):
    // the board then waits and the ResizeObserver below paints once the styles arrive. A
    // value that is set but not a number still throws.
    const readShape = () => {
      const props = getComputedStyle(board);
      if (
        props.getPropertyValue("--board-cols").trim() === "" ||
        props.getPropertyValue("--board-rows").trim() === ""
      ) {
        return null;
      }
      return {
        cols: readCssNumber(board, "--board-cols"),
        rows: readCssNumber(board, "--board-rows"),
      };
    };

    // Writes every cell at once, also clearing the ones the current form hides.
    const paintNow = (target: string) => {
      cells.forEach((cell, i) => {
        cell.textContent = target[i] ?? "";
      });
    };

    let shape = readShape();

    if (shape === null) {
      // Nothing to paint yet; see readShape.
    } else if (readCssNumber(board, "--map-motion") === 0) {
      paintNow(layoutBoard(text, shape.cols, shape.rows));
    } else {
      const { cols, rows } = shape;
      const target = layoutBoard(text, cols, rows);
      const entry = boardEntryDelay(board);
      cells.forEach((cell, i) => {
        const wanted = target[i] ?? "";
        if (cell.textContent === wanted) return;
        const start = entry + (i % cols) * 12 + Math.floor(i / cols) * 40;
        const flip = (remaining: number) => {
          cell.animate(
            [
              { transform: "scaleY(1)" },
              { transform: "scaleY(0.15)" },
              { transform: "scaleY(1)" },
            ],
            { duration: 70, easing: "linear" }
          );
          // Math.random runs only here, in a timer, never during render.
          cell.textContent =
            remaining > 0
              ? FLIP_POOL[Math.floor(Math.random() * FLIP_POOL.length)]
              : wanted;
          if (remaining > 0) later(() => flip(remaining - 1), FLIP_STEP_MS);
        };
        later(() => flip(3 + (i % 5)), start);
      });
    }

    // A changed form (a container step, a new root size) lays the text out again, without flipping.
    const observer = new ResizeObserver(() => {
      const next = readShape();
      if (next === null) return;
      if (shape && next.cols === shape.cols && next.rows === shape.rows) return;
      shape = next;
      cancelFlips();
      paintNow(layoutBoard(text, shape.cols, shape.rows));
    });
    observer.observe(board);

    return () => {
      observer.disconnect();
      cancelFlips();
    };
  }, [text]);

  // The wide drawing letterboxes when the glass is too low for its full height, so it can be
  // narrower than its box, and CSS cannot read that. The island reports the width it is
  // actually drawn at, for the board to line up under it. No style prop on the dock in
  // render, so React never overwrites it. Display none (a width of 0) removes it again.
  useEffect(() => {
    const svg = rootRef.current?.querySelector<SVGSVGElement>(
      'svg[data-drawing="wide"]'
    );
    const dock = dockRef.current;
    if (!svg || !dock) return;

    // The board's height feeds back into the drawing's height, so a write inside the
    // callback changes the observed size in the same frame and Chromium reports "loop
    // completed with undelivered notifications". The write waits for the next frame, and a
    // change under half a unit is not written, which ends the damped back and forth.
    let pending: number | null = null;
    let latest = 0;
    let written: number | null = null;

    const write = () => {
      pending = null;
      if (written !== null && Math.abs(latest - written) < 0.5) return;
      written = latest;
      dock.style.setProperty("--map-drawn", `${latest}px`);
    };

    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.contentBoxSize[0];
      const view = svg.viewBox.baseVal;
      if (!box || box.inlineSize === 0 || view.height === 0) {
        if (pending !== null) cancelAnimationFrame(pending);
        pending = null;
        written = null;
        dock.style.removeProperty("--map-drawn");
        return;
      }
      // preserveAspectRatio is the default, meet: the drawing fits inside its box.
      latest = Math.min(
        box.inlineSize,
        (box.blockSize * view.width) / view.height
      );
      if (pending === null) pending = requestAnimationFrame(write);
    });
    observer.observe(svg);

    return () => {
      observer.disconnect();
      if (pending !== null) cancelAnimationFrame(pending);
      dock.style.removeProperty("--map-drawn");
    };
  }, []);

  // A trip that is running in a drawing that has since been hidden ends at once (spec 1.3).
  // Only the display is read, never a size.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new ResizeObserver(() => {
      const trip = tripRef.current;
      if (!trip || getComputedStyle(trip.svg).display !== "none") return;
      stopTrip(trip);
      tripRef.current = null;
      dispatch({ type: "arrive" });
    });
    root.querySelectorAll("svg").forEach((svg) => observer.observe(svg));

    return () => {
      observer.disconnect();
      if (tripRef.current) stopTrip(tripRef.current);
      tripRef.current = null;
    };
  }, []);

  const select = (target: EventTarget, input: Input) => {
    const root = rootRef.current;
    if (!root || !(target instanceof Element)) return;

    const lineEl = target.closest("svg [data-line]");
    const svg = target.closest("svg");
    if (!lineEl || !svg) return;
    const id = lineEl.getAttribute("data-line");
    const tour = svg.getAttribute("data-drawing");
    if (!isLineId(id) || !isDrawing(tour)) return;

    if (id === selectedRef.current) {
      dispatch({ type: "input", input });
      return;
    }

    // Everything that can throw is read before any state changes, so a bad token leaves
    // the previous selection and trip as they were.
    const boardStations = readCssNumber(svg, "--map-board-stations") === 1;
    const path = lineEl.querySelector<SVGPathElement>("[data-track]");
    const train = svg.querySelector<SVGCircleElement>("[data-train]");
    const animated =
      readCssNumber(root, "--map-motion") !== 0 && path && train;
    const plan =
      animated && path
        ? buildPlan(
            stopDistances(
              path,
              Array.from(lineEl.querySelectorAll<SVGPathElement>("[data-at]"))
            ),
            path.getTotalLength(),
            readCssMs(svg, "--map-dwell")
          )
        : null;

    // A trip already running finishes unless another line is chosen; that is this case.
    selectedRef.current = id;
    if (tripRef.current) {
      stopTrip(tripRef.current);
      tripRef.current = null;
    }

    if (!plan || !path || !train) {
      dispatch({ type: "select", id, input, tour, boardStations, instant: true });
      return;
    }

    const stations = Array.from(lineEl.querySelectorAll("[data-station]"));
    const trip: Trip = { svg, frame: 0, lit: null };
    tripRef.current = trip;
    place(path, train, 0);
    dispatch({ type: "select", id, input, tour, boardStations, instant: false });
    runTrip(
      trip,
      plan,
      path,
      train,
      stations,
      (index) => dispatch({ type: "station", index }),
      () => {
        tripRef.current = null;
        dispatch({ type: "arrive" });
      }
    );
  };

  // Only a mouse or a pen picks by hovering; a touch has no hover to read.
  const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    select(event.target, "pointer");
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // A second finger must not overwrite the first finger's press.
    if (!event.isPrimary) return;
    const raw =
      event.target instanceof Element
        ? (event.target.closest("svg [data-line]")?.getAttribute("data-line") ??
          null)
        : null;
    pressRef.current = {
      line: isLineId(raw) ? raw : null,
      touch: event.pointerType === "touch",
    };
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    // Removed after the next click, whichever line it lands on.
    pressRef.current = null;
    // detail 0 is a keyboard or assistive click; it always follows the link.
    if (event.detail === 0 || !press?.touch || press.line === null) return;
    if (!(event.target instanceof Element)) return;
    const clicked = event.target
      .closest("svg [data-line]")
      ?.getAttribute("data-line");
    if (clicked !== press.line) return;
    event.preventDefault();
    select(event.target, "touch");
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    // Focus a mouse or pen press caused (Chromium focuses on mousedown) is not keyboard focus.
    if (press && !press.touch) return;
    // The touch case of the same rule: a tap's focus comes before the click that picks, and
    // must not set the input to "focus" first.
    if (press?.touch) return;
    select(event.target, "focus");
  };

  const openLine =
    state.input === "touch" && state.selected !== null
      ? lines.find((candidate) => candidate.id === state.selected)
      : undefined;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-selected={state.selected ?? undefined}
      data-state={state.phase ?? undefined}
      data-input={state.input ?? undefined}
      data-tour={state.tour ?? undefined}
      onPointerOver={handlePointerOver}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
      onFocus={handleFocus}
    >
      <div ref={dockRef} className={styles.dock}>
        <div ref={boardRef} className={styles.board} aria-hidden="true">
          {Array.from({ length: BOARD_CELLS }, (_, n) => (
            <span key={`board-${n}`} className={styles.cell} />
          ))}
        </div>
        <div className={styles.openSlot}>
          {openLine && (
            <Link
              href={openLine.href}
              prefetch={false}
              className={controls.button}
            >
              Open {openLine.name}
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
