import type { BondExtract } from "./types";

const STORAGE_KEY = "tesouro-extracts";

export function loadExtracts(): BondExtract[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExtracts(extracts: BondExtract[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extracts));
}

export function upsertExtract(newExtract: BondExtract): BondExtract[] {
  const existing = loadExtracts();
  const idx = existing.findIndex((e) => e.id === newExtract.id);
  if (idx >= 0) {
    existing[idx] = newExtract;
  } else {
    existing.push(newExtract);
  }
  saveExtracts(existing);
  return existing;
}

export function clearAllExtracts(): void {
  localStorage.removeItem(STORAGE_KEY);
}
