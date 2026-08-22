import { readFileSync } from "node:fs";
import path from "node:path";
import { paths } from "./config.js";
import type { BusinessId, BusinessProfile, Catalog } from "./types.js";

const catalog = JSON.parse(
  readFileSync(path.join(paths.knowledgeDir, "businesses.json"), "utf8"),
) as Catalog;

const files: Record<BusinessId, string> = {
  hospitality: "hospitality.md",
  "the-browns": "the-browns.md",
  rivendell: "rivendell.md",
  "perfect-water": "perfect-water.md",
  credimed: "credimed.md",
  autopost: "autopost.md",
};

const briefs = Object.fromEntries(
  (Object.keys(files) as BusinessId[]).map((id) => [
    id,
    readFileSync(path.join(paths.knowledgeDir, files[id]), "utf8"),
  ]),
) as Record<BusinessId, string>;

export function getCatalog(): Catalog {
  return catalog;
}

export function getBusiness(id: BusinessId): BusinessProfile {
  const found = catalog.businesses.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown business ${id}`);
  }
  return found;
}

export function getBrief(id: BusinessId): string {
  return briefs[id];
}

export function allBriefs(): string {
  return (Object.keys(briefs) as BusinessId[])
    .map((id) => briefs[id])
    .join("\n\n---\n\n");
}
