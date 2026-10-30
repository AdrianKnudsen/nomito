"use client";

import {
  useEffect,
  useReducer,
  useRef,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { LineId } from "../../lib/lines";
import styles from "../../styles/lineMap.module.css";

interface LineMapControllerProps {
  children: ReactNode;
}

type Input = "pointer" | "focus";
type Drawing = "wide" | "tall";
type Phase = "running" | "arrived";

interface State {
  selected: LineId | null;
  phase: Phase | null;
  input: Input | null;
  tour: Drawing | null;
  /** From --map-board-stations on the drawing at tour start, for showing station names off the map. */
  boardStations: boolean;
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
  | { type: "arrive" };

const INITIAL_STATE: State = {
  selected: null,
  phase: null,
  input: null,
  tour: null,
  boardStations: false,
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
      };
    case "input":
      return state.input === action.input
        ? state
        : { ...state, input: action.input };
    case "arrive":
      return state.phase === "running"
        ? { ...state, phase: "arrived" }
        : state;
  }
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

// cx and cy on the train, and data-lit on a station name, are the only DOM writes the island
// makes outside React; both are presentation hooks CSS reads.
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
  children,
}: LineMapControllerProps) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const rootRef = useRef<HTMLDivElement>(null);
  const tripRef = useRef<Trip | null>(null);
  // Mirrors state.selected for the handlers: two events can land before a render.
  const selectedRef = useRef<LineId | null>(null);

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
    runTrip(trip, plan, path, train, stations, () => {
      tripRef.current = null;
      dispatch({ type: "arrive" });
    });
  };

  // Only a mouse or a pen picks by hovering; a touch has no hover to read.
  const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    select(event.target, "pointer");
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    select(event.target, "focus");
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-selected={state.selected ?? undefined}
      data-state={state.phase ?? undefined}
      data-input={state.input ?? undefined}
      data-tour={state.tour ?? undefined}
      onPointerOver={handlePointerOver}
      onFocus={handleFocus}
    >
      {children}
    </div>
  );
}
