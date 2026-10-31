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

// The keys that scroll a scroller; one of them during a tour hands the scroll to the user.
const SCROLL_KEYS: readonly string[] = [
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
];

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
  /** Set once the island has mounted: the sticky dock only applies when its height is known. */
  ready: boolean;
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
  | { type: "arrive" }
  | { type: "ready" };

const INITIAL_STATE: State = {
  selected: null,
  phase: null,
  input: null,
  tour: null,
  boardStations: false,
  station: null,
  ready: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select":
      return {
        ...state,
        selected: action.id,
        phase: action.instant ? "arrived" : "running",
        input: action.input,
        tour: action.tour,
        boardStations: action.boardStations,
        // A new selection ends whatever stop the old trip was at.
        station: null,
      };
    case "ready":
      return state.ready ? state : { ...state, ready: true };
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

/** A custom property in percent, as a fraction ("50%" gives 0.5). */
function readCssFraction(el: Element, name: string): number {
  const raw = readCssProperty(el, name);
  const match = /^(\d*\.?\d+)%$/.exec(raw);
  if (!match) throw new Error(`${name} is not a percentage: "${raw}"`);
  return Number(match[1]) / 100;
}

/** A duration custom property CSS owns, in milliseconds ("650ms" and "0.65s" both work). */
function readCssMs(el: Element, name: string): number {
  const raw = readCssProperty(el, name);
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(raw);
  if (!match) throw new Error(`${name} is not a duration in ms or s: "${raw}"`);
  return match[2] === "s" ? Number(match[1]) * 1000 : Number(match[1]);
}

/** An element's block scroll padding as CSS resolves it, in px. */
function readScrollPadding(el: Element): { top: number; bottom: number } {
  const style = getComputedStyle(el);
  const top = parseFloat(style.scrollPaddingTop);
  const bottom = parseFloat(style.scrollPaddingBottom);
  if (!Number.isFinite(top) || !Number.isFinite(bottom)) {
    throw new Error(
      `scroll-padding-block is not a length: "${style.scrollPaddingTop} ${style.scrollPaddingBottom}"`
    );
  }
  return { top, bottom };
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

/** What the scroller needs to follow the train, and where the following has got to. */
interface Follow {
  scroller: HTMLElement;
  dock: HTMLElement;
  /** How far down the visible window the train is held, as a fraction of its height. */
  anchor: number;
  /** How long the scroller takes to catch up with a train that starts out of view, in ms. */
  catchup: number;
  /** "start" until the first frame has seen where the train is. */
  stage: "start" | "catching" | "following";
  from: number;
  startedAt: number;
}

interface Trip {
  svg: SVGSVGElement;
  frame: number;
  lit: Element | null;
  /** Null when the drawing does not follow, or once the user has scrolled during the tour. */
  follow: Follow | null;
}

/**
 * Holds the train on an anchor line in the part of the scroller that can be seen (below the
 * dock where it is stuck, down to the scroller's bottom). If the train starts out of view
 * (after an arrival the scroller can be at the bottom while the next train leaves the top) the
 * scroller first catches up, eased over a set time toward where the train's centre is on the
 * line; the target is worked out again each frame because the train keeps moving. After that,
 * above the line nothing scrolls, and once the train passes it the scroller moves so its centre
 * stays on the line. Then it never scrolls up, and the scroller's own ends stop it. Runs in
 * the same frame as the train's move, so the two stay together.
 *
 * While something in the scroller has a visible focus ring (:focus-visible, so not the focus a
 * tap gives in some browsers), the scroll may move only as far as keeps that ring inside the
 * window: the follow is limited, never reversed to bring focus back. The train can then pass
 * the anchor line and leave the window; that is the price of keeping the keyboard user's ring
 * in view.
 */
function keepInView(follow: Follow, train: SVGCircleElement, now: number) {
  const { scroller, dock, anchor, catchup } = follow;
  const trainBox = train.getBoundingClientRect();
  const area = scroller.getBoundingClientRect();
  const stuck = getComputedStyle(dock).position === "sticky";
  const covered = stuck
    ? Math.max(area.top, dock.getBoundingClientRect().bottom)
    : area.top;
  const line = covered + (area.bottom - covered) * anchor;
  const centre = (trainBox.top + trainBox.bottom) / 2;
  const current = scroller.scrollTop;

  if (follow.stage === "start") {
    const outside = trainBox.top < covered || trainBox.bottom > area.bottom;
    follow.stage = outside && catchup > 0 ? "catching" : "following";
    follow.from = current;
    follow.startedAt = now;
  }

  let next = current;
  if (follow.stage === "catching") {
    const furthest = Math.max(0, scroller.scrollHeight - area.height);
    const target = Math.min(furthest, Math.max(0, current + centre - line));
    const k = (now - follow.startedAt) / catchup;
    if (k >= 1) {
      next = target;
      follow.stage = "following";
    } else {
      next = follow.from + (target - follow.from) * ease(k);
    }
  } else if (centre > line) {
    next = current + centre - line;
  }

  // Scrolling down moves the focused link up, so the room down is how far its ring is from
  // the top of the window, and the room up is how far it is from the bottom. The edges are the
  // ones the browser uses when it scrolls to the link itself: the scroller's scroll padding
  // (which holds the sticky dock as well as the ring's room) and the link's scroll margin. Read
  // each frame, because the dock grows when Open appears. Any focus in the scroller counts, not
  // only the map's links, except Open while the dock is stuck: it does not move with the scroll.
  const focused = document.activeElement;
  if (
    focused instanceof Element &&
    scroller.contains(focused) &&
    !(stuck && dock.contains(focused)) &&
    focused.matches(":focus-visible")
  ) {
    const box = focused.getBoundingClientRect();
    const margins = getComputedStyle(focused);
    const padding = readScrollPadding(scroller);
    const roomDown = Math.max(
      0,
      box.top - parseFloat(margins.scrollMarginTop) - (area.top + padding.top)
    );
    const roomUp = Math.max(
      0,
      area.bottom -
        padding.bottom -
        (box.bottom + parseFloat(margins.scrollMarginBottom))
    );
    next = Math.min(Math.max(next, current - roomUp), current + roomDown);
  }

  // A write of the same value is not free: it can halt a scroll the stop listeners did not see
  // (a scrollbar drag in some browsers).
  if (next !== current) scroller.scrollTop = next;
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
// station name, the board's cells (their text and flap animations), --map-drawn on the dock,
// --dock-block on the scroller, and the scroller's scrollTop while the train is followed. The
// cells and scrollTop are not hooks CSS reads.
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
  // The train's step and the scroller's follow-up share a frame.
  const move = (distance: number, now: number) => {
    place(path, train, distance);
    if (trip.follow) keepInView(trip.follow, train, now);
  };

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
          move(phase.from + (phase.to - phase.from) * k, now);
        }
        trip.frame = requestAnimationFrame(frame);
        return;
      }

      if (phase.kind === "move") move(phase.to, now);
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
  // Where the mouse or pen last moved to, so a pointerover that comes from the content
  // scrolling under a resting pointer can be told from one the pointer caused.
  const lastMoveRef = useRef<{ x: number; y: number } | null>(null);

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

  // Records where the mouse or pen last moved, for the hover check in handlePointerOver.
  useEffect(() => {
    const record = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "mouse" || event.pointerType === "pen") {
        lastMoveRef.current = { x: event.clientX, y: event.clientY };
      }
    };
    document.addEventListener("pointermove", record, true);
    return () => document.removeEventListener("pointermove", record, true);
  }, []);

  // The user taking over the scroll ends the following for the rest of that tour; the tour
  // itself runs on, and the next selection follows again. Not the scroll event: the island's
  // own scrolling fires it too.
  useEffect(() => {
    const scroller = rootRef.current?.parentElement;
    if (!scroller) return;

    const stopFollowing = () => {
      if (tripRef.current) tripRef.current.follow = null;
    };
    const stopOnScrollKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.includes(event.key)) stopFollowing();
    };
    scroller.addEventListener("wheel", stopFollowing, { passive: true });
    scroller.addEventListener("touchstart", stopFollowing, { passive: true });
    scroller.addEventListener("pointerdown", stopFollowing);
    document.addEventListener("keydown", stopOnScrollKey, true);
    return () => {
      scroller.removeEventListener("wheel", stopFollowing);
      scroller.removeEventListener("touchstart", stopFollowing);
      scroller.removeEventListener("pointerdown", stopFollowing);
      document.removeEventListener("keydown", stopOnScrollKey, true);
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

  // Marks that the island is running, so CSS makes the dock sticky only then: without JS the
  // board is empty and must not cover anything. A mount flag, not derived state.
  useEffect(() => {
    dispatch({ type: "ready" });
  }, []);

  // The dock's height, for the scroller's scroll padding. Written on the scroller, the root's
  // parent, because the scroller is the element whose scroll padding reads it.
  useEffect(() => {
    const dock = dockRef.current;
    const scroller = rootRef.current?.parentElement;
    if (!dock || !scroller) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[entries.length - 1]?.borderBoxSize[0];
      if (!box) return;
      scroller.style.setProperty("--dock-block", `${box.blockSize}px`);
    });
    observer.observe(dock);

    return () => {
      observer.disconnect();
      scroller.style.removeProperty("--dock-block");
    };
  }, []);

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
    // Only the tall drawing is taller than the window it scrolls in; the wide one fits. The
    // island asks which drawing the tour runs in, never the viewport. A tour picked by focus
    // follows too; keepInView only limits how far, so a visible focus ring stays in view.
    const scroller = root.parentElement;
    const dock = dockRef.current;
    const follow: Follow | null =
      plan && tour === "tall" && scroller && dock
        ? {
            scroller,
            dock,
            anchor: readCssFraction(scroller, "--map-follow-at"),
            catchup: readCssMs(scroller, "--map-follow-catchup"),
            stage: "start",
            from: 0,
            startedAt: 0,
          }
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
    const trip: Trip = { svg, frame: 0, lit: null, follow };
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
    // Scrolling moves a new line under a pointer that has not moved and the browser reports a
    // pointerover for it; picking then would restart the tour for as long as it scrolls. A
    // pointerover from real movement arrives before the pointermove at its new position, so
    // it never equals the last one. No recorded position yet: the first hover, accept.
    const last = lastMoveRef.current;
    if (last && last.x === event.clientX && last.y === event.clientY) return;
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
      data-ready={state.ready ? "" : undefined}
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
