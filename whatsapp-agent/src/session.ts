import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { paths } from "./config.js";
import type { Session } from "./types.js";

const filePath = path.join(paths.dataDir, "sessions.json");

function loadAll(): Record<string, Session> {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, Session>;
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, Session>): void {
  mkdirSync(paths.dataDir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(all, null, 2));
}

export function getSession(waId: string): Session {
  const all = loadAll();
  return (
    all[waId] ?? {
      waId,
      businessId: null,
      messages: [],
      handoff: false,
      updatedAt: new Date().toISOString(),
    }
  );
}

export function saveSession(session: Session): void {
  const all = loadAll();
  all[session.waId] = { ...session, updatedAt: new Date().toISOString() };
  saveAll(all);
}
