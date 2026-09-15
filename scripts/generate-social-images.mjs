#!/usr/bin/env bun

import { generateSocialImages } from "./social-images/render.mjs";

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const surface = readOption("--surface");
const outputDirectory = readOption("--out");
const keys = readOption("--keys")?.split(",").filter(Boolean);

if (!surface || !["marketing", "docs"].includes(surface)) {
  throw new Error(
    "Usage: bun scripts/generate-social-images.mjs --surface <marketing|docs> [--out <path> [--keys <key,...>]]",
  );
}

const result = await generateSocialImages({ surface, outputDirectory, keys });
console.log(`Generated ${result.entries.length} ${surface} social images in ${result.destination}`);
