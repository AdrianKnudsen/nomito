/**
 * Text layout for the home page's departure board. A file of its own, with no imports, so
 * the text check runs the same functions as the island and the two can never disagree.
 */

/** The characters a cell flips through on its way to the right one. */
export const FLIP_POOL =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,";

/**
 * Greedy word wrap. A word that does not fit on the row starts a new one; a word longer
 * than `cols` is not broken, it stands alone and `layoutBoard` cuts it off.
 */
export function wrapText(text: string, cols: number): string[] {
  const lines = [""];
  for (const word of text.split(" ")) {
    const current = lines[lines.length - 1];
    if (current && current.length + 1 + word.length > cols) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = current ? `${current} ${word}` : word;
    }
  }
  return lines;
}

/** Exactly `rows` rows of `cols` characters, padded with spaces; surplus rows are dropped. */
export function layoutBoard(text: string, cols: number, rows: number): string {
  const lines = wrapText(text, cols);
  let out = "";
  for (let row = 0; row < rows; row++) {
    out += (lines[row] ?? "").padEnd(cols).slice(0, cols);
  }
  return out;
}
