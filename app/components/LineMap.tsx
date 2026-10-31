import type { ReactNode } from "react";
import Link from "next/link";
import LineMapController from "./LineMapController";
import {
  IDLE_TEXT,
  LINES,
  lineName,
  toBoardLine,
  type Line,
  type LineId,
} from "../../lib/lines";
import styles from "../../styles/lineMap.module.css";

interface Tick {
  /** Where the stroke meets the track, read by the client island to find the stops. */
  at: string;
  d: string;
}

interface Point {
  x: number;
  y: number;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WideGeometry {
  path: string;
  ticks: readonly Tick[];
  stations: readonly (Point & { below?: boolean })[];
  name: Point;
  focus: Box;
}

interface TallGeometry {
  path: string;
  ticks: readonly Tick[];
  name: Point;
  focus: Box;
}

// Coordinates are SVG user units inside each drawing's viewBox, copied from the approved
// sketch. Only the geometry exists twice; texts and hrefs come from LINES.
// `focus` is the measured glyph box of the line name (Khand, Chromium) plus 3 units of air.
// Four names sit a few units off the sketch so the focus shape keeps clear of their own
// track; re-measure if the font, a name, or a track moves.
const WIDE_GEOMETRY: Record<LineId, WideGeometry> = {
  search: {
    path: "M89,145 H150 L235,60 H765 L850,145 H950",
    ticks: [
      { at: "330,60", d: "M330,60 V44" },
      { at: "500,60", d: "M500,60 V44" },
      { at: "670,60", d: "M670,60 V44" },
    ],
    stations: [
      { x: 330, y: 36 },
      { x: 500, y: 36 },
      { x: 670, y: 36 },
    ],
    name: { x: 245, y: 96 },
    focus: { x: 243, y: 74.6, width: 147, height: 28 },
  },
  collections: {
    path: "M89,185 H185 L210,160 H790 L815,185 H950",
    ticks: [
      { at: "400,160", d: "M400,160 V144" },
      { at: "600,160", d: "M600,160 V144" },
    ],
    stations: [
      { x: 400, y: 136 },
      { x: 600, y: 136 },
    ],
    name: { x: 245, y: 196 },
    focus: { x: 242.8, y: 174.7, width: 101, height: 24.6 },
  },
  guide: {
    path: "M89,245 H185 L210,270 H790 L815,245 H950",
    ticks: [
      { at: "400,270", d: "M400,270 V286" },
      { at: "600,270", d: "M600,270 V286" },
    ],
    stations: [
      { x: 400, y: 294, below: true },
      { x: 600, y: 294, below: true },
    ],
    name: { x: 245, y: 250 },
    focus: { x: 243.1, y: 229.1, width: 141.6, height: 27.5 },
  },
  plan: {
    path: "M89,285 H150 L235,370 H765 L850,285 H950",
    ticks: [
      { at: "330,370", d: "M330,370 V386" },
      { at: "500,370", d: "M500,370 V386" },
      { at: "670,370", d: "M670,370 V386" },
    ],
    stations: [
      { x: 330, y: 394, below: true },
      { x: 500, y: 394, below: true },
      { x: 670, y: 394, below: true },
    ],
    name: { x: 245, y: 350 },
    focus: { x: 243.1, y: 329.1, width: 80, height: 27.5 },
  },
};

const TALL_GEOMETRY: Record<LineId, TallGeometry> = {
  search: {
    path: "M115,199 V230 L60,285 V690 L158,788 V905",
    ticks: [
      { at: "60,400", d: "M60,400 H44" },
      { at: "60,505", d: "M60,505 H44" },
      { at: "60,610", d: "M60,610 H44" },
    ],
    name: { x: 92, y: 505 },
    focus: { x: 24.6, y: 485.2, width: 135.2, height: 26.1 },
  },
  collections: {
    path: "M175,199 V250 L150,275 V732 L186,768 V905",
    ticks: [
      { at: "150,430", d: "M150,430 H134" },
      { at: "150,590", d: "M150,590 H134" },
    ],
    name: { x: 182, y: 505 },
    focus: { x: 135.6, y: 485.2, width: 93.1, height: 23 },
  },
  guide: {
    path: "M225,199 V250 L250,275 V732 L214,768 V905",
    ticks: [
      { at: "250,430", d: "M250,430 H266" },
      { at: "250,590", d: "M250,590 H266" },
    ],
    name: { x: 224, y: 505 },
    focus: { x: 159.1, y: 485.6, width: 130.3, height: 25.7 },
  },
  plan: {
    path: "M285,199 V230 L340,285 V690 L242,788 V905",
    ticks: [
      { at: "340,400", d: "M340,400 H356" },
      { at: "340,505", d: "M340,505 H356" },
      { at: "340,610", d: "M340,610 H356" },
    ],
    name: { x: 314, y: 505 },
    focus: { x: 277.1, y: 485.6, width: 73.8, height: 25.7 },
  },
};

const DRAWING_LABEL = "Four ways in, from your fridge to the table";

function WideDrawing() {
  return (
    <svg
      className={styles.wide}
      role="group"
      aria-label={DRAWING_LABEL}
      data-drawing="wide"
      viewBox="-40 0 1120 450"
    >
      {LINES.map((line) => {
        const geometry = WIDE_GEOMETRY[line.id];
        return (
          <g key={`wide-${line.id}`} className={styles.line} data-line={line.id}>
            <g aria-hidden="true">
              <path className={styles.hit} d={geometry.path} />
              <path
                className={styles.track}
                data-track=""
                pathLength="1"
                d={geometry.path}
              />
              {geometry.ticks.map((tick, index) => (
                <path
                  key={`tick-${line.id}-${index}`}
                  className={styles.tick}
                  data-at={tick.at}
                  d={tick.d}
                />
              ))}
              {geometry.stations.map((station, index) => (
                <text
                  key={`stn-${line.id}-${index}`}
                  className={
                    station.below
                      ? `${styles.stn} ${styles.below}`
                      : styles.stn
                  }
                  data-station=""
                  x={station.x}
                  y={station.y}
                  textAnchor="middle"
                >
                  {line.stations[index]}
                </text>
              ))}
            </g>
            <LineLink line={line}>
              <FocusShapes box={geometry.focus} />
              <text
                className={styles.name}
                x={geometry.name.x}
                y={geometry.name.y}
              >
                {lineName(line)}
              </text>
            </LineLink>
          </g>
        );
      })}
      <g aria-hidden="true" className={styles.fridge}>
        <rect className={styles.inside} x="-10" y="95" width="90" height="240" rx="10" />
        <rect className={styles.body} x="-10" y="95" width="90" height="240" rx="10" />
        <path className={styles.split} d="M-10,165 H80" />
        <g className={styles.door}>
          <rect className={styles.panel} x="-10" y="165" width="90" height="170" rx="6" />
          <path className={styles.handle} d="M64,185 V235" />
        </g>
        <path className={styles.handle} d="M64,115 V145" />
      </g>
      <g aria-hidden="true">
        <text className={styles["hub-label"]} x="35" y="372" textAnchor="middle">
          Your fridge
        </text>
        <text className={styles["hub-sub"]} x="35" y="396" textAnchor="middle">
          You are here
        </text>
      </g>
      <g aria-hidden="true">
        <circle className={styles.train} data-train="" r="11" />
      </g>
      <g aria-hidden="true" className={styles.table}>
        <rect className={styles.top} x="862" y="100" width="176" height="230" rx="16" />
        <path
          className={styles.cutlery}
          d="M884,160 V270 M876,160 V185 Q884,200 892,185 V160 M1016,160 Q1024,200 1016,215 V270"
        />
        <circle className={`${styles.hub} ${styles.plate}`} cx="950" cy="215" r="74" />
        <circle className={styles.rim} cx="950" cy="215" r="52" />
        <g className={styles.steam}>
          <path d="M932,190 q-8,-14 0,-28 q8,-14 0,-28" />
          <path d="M950,186 q-8,-14 0,-28 q8,-14 0,-28" />
          <path d="M968,190 q-8,-14 0,-28 q8,-14 0,-28" />
        </g>
      </g>
      {/* Outside aria-hidden and last: these labels carry the nutrition information for screen
          readers (spec 8.5), read after the four links, so they must not move into aria-hidden. */}
      <text className={styles["hub-label"]} x="950" y="364" textAnchor="middle">
        The table
      </text>
      <text className={styles["hub-sub"]} x="950" y="388" textAnchor="middle">
        A recipe, with its
      </text>
      <text className={styles["hub-sub"]} x="950" y="410" textAnchor="middle">
        nutrition per serving
      </text>
    </svg>
  );
}

function TallDrawing() {
  return (
    <svg
      className={styles.tall}
      role="group"
      aria-label={DRAWING_LABEL}
      data-drawing="tall"
      viewBox="0 0 400 1010"
    >
      {LINES.map((line) => {
        const geometry = TALL_GEOMETRY[line.id];
        const { x, y } = geometry.name;
        const rotation = `rotate(-90 ${x} ${y})`;
        return (
          <g key={`tall-${line.id}`} className={styles.line} data-line={line.id}>
            <g aria-hidden="true">
              <path className={styles.hit} d={geometry.path} />
              <path
                className={styles.track}
                data-track=""
                pathLength="1"
                d={geometry.path}
              />
              {geometry.ticks.map((tick, index) => (
                <path
                  key={`tick-${line.id}-${index}`}
                  className={styles.tick}
                  data-at={tick.at}
                  d={tick.d}
                />
              ))}
            </g>
            <LineLink line={line}>
              <FocusShapes box={geometry.focus} transform={rotation} />
              <text
                className={styles.name}
                x={x}
                y={y}
                textAnchor="middle"
                transform={rotation}
              >
                {lineName(line)}
              </text>
            </LineLink>
          </g>
        );
      })}
      <g aria-hidden="true" className={styles.freezer}>
        <rect className={styles.inside} x="70" y="54" width="260" height="30" />
        <rect className={styles.body} x="70" y="72" width="260" height="118" rx="10" />
        <path className={styles.handle} d="M180,92 H220" />
        <g className={styles.lid}>
          <rect className={styles.panel} x="62" y="50" width="276" height="24" rx="7" />
        </g>
        <text className={styles["hub-label"]} x="200" y="140" textAnchor="middle">
          Your fridge
        </text>
        <text className={styles["hub-sub"]} x="200" y="166" textAnchor="middle">
          You are here
        </text>
      </g>
      <g aria-hidden="true">
        <circle className={styles.train} data-train="" r="11" />
      </g>
      <g aria-hidden="true" className={styles.table}>
        <rect className={styles.top} x="110" y="832" width="180" height="160" rx="16" />
        <path
          className={styles.cutlery}
          d="M128,870 V950 M121,870 V888 Q128,900 135,888 V870 M272,870 Q279,900 272,912 V950"
        />
        <circle className={`${styles.hub} ${styles.plate}`} cx="200" cy="912" r="58" />
        <circle className={styles.rim} cx="200" cy="912" r="40" />
        <g className={styles.steam}>
          <path d="M186,896 q-7,-12 0,-24 q7,-12 0,-24" />
          <path d="M200,892 q-7,-12 0,-24 q7,-12 0,-24" />
          <path d="M214,896 q-7,-12 0,-24 q7,-12 0,-24" />
        </g>
      </g>
      <text className={styles["hub-label"]} x="96" y="870" textAnchor="end">
        The
      </text>
      <text className={styles["hub-label"]} x="96" y="896" textAnchor="end">
        table
      </text>
    </svg>
  );
}

// Drawn inside the link so :focus-visible on the <a> shows them. The halo keeps the ring
// readable where it would lie on a track in the line's colour.
function FocusShapes({ box, transform }: { box: Box; transform?: string }) {
  return (
    <>
      <rect className={styles.focusHalo} {...box} transform={transform} />
      <rect className={styles.focusShape} {...box} transform={transform} />
    </>
  );
}

function LineLink({
  line,
  children,
}: {
  line: Line;
  children: ReactNode;
}) {
  // The visible <text> is the accessible name; the board text is the description.
  // prefetch={false}: a visible link would otherwise be prefetched in production.
  return (
    <Link
      href={line.prefix}
      prefetch={false}
      aria-describedby={`line-desc-${line.id}`}
    >
      {children}
    </Link>
  );
}

export default function LineMap() {
  return (
    <div className={styles.glass}>
      <div className={styles.scroller}>
        <h1 className={styles.title}>Cook with what you have</h1>
        <p className={styles.visuallyHidden}>
          Nomito finds recipes for the food already in your fridge. Four
          lines, and every one ends at the table.
        </p>
        <LineMapController
          lines={LINES.map(toBoardLine)}
          idle={IDLE_TEXT}
        >
          <WideDrawing />
          <TallDrawing />
        </LineMapController>
      </div>
      <div hidden>
        {LINES.map((line) => (
          <p key={`desc-${line.id}`} id={`line-desc-${line.id}`}>
            {line.board}
          </p>
        ))}
      </div>
    </div>
  );
}
