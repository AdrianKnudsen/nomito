"use client";

import { useState } from "react";
import Image from "next/image";

interface RecipeImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Spoonacular's own image size, so next/image's intrinsic ratio matches what CSS shows. */
  width: number;
  height: number;
  sizes?: string;
}

/**
 * next/image that disappears when the image fails to load.
 *
 * Spoonacular's CDN returns 404 for some recipe images. Without this the browser draws
 * its broken-image icon (and the alt text) inside the card; with it the container's own
 * placeholder surface shows instead. A client component only because onError needs one.
 */
export default function RecipeImage({ alt, ...props }: RecipeImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Image alt={alt} {...props} onError={() => setFailed(true)} />;
}
