// Fetches daily Selic rates from BCB open data API (série 11)
// and calculates accumulated factor between two dates.

export interface SelicEntry {
  date: string; // DD/MM/YYYY
  rate: number; // daily rate as percentage (e.g. 0.049073)
}

const CACHE_KEY = "selic-daily-cache";
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1h

function loadCache(): { ts: number; data: SelicEntry[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(data: SelicEntry[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
}

function parseDateBR(dateStr: string): Date {
  const [d, m, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateBR(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export async function fetchSelicRates(startDate?: string): Promise<SelicEntry[]> {
  // Check cache
  const cached = loadCache();
  if (cached && Date.now() - cached.ts < CACHE_TTL && cached.data.length > 0) {
    return cached.data;
  }

  // Fetch from BCB API - série 11 = taxa Selic diária
  const start = startDate || "01/01/2022";
  const end = formatDateBR(new Date());
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${start}&dataFinal=${end}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar dados da Selic: ${res.status}`);
  }

  const raw: Array<{ data: string; valor: string }> = await res.json();

  const entries: SelicEntry[] = raw.map((r) => ({
    date: r.data,
    rate: parseFloat(r.valor),
  }));

  saveCache(entries);
  return entries;
}

/**
 * Calculates accumulated Selic factor between two dates.
 * Factor = product of (1 + dailyRate/100) for each business day in the range.
 * Returns the factor (e.g. 1.15 means 15% accumulated return).
 */
export function calculateSelicFactor(
  rates: SelicEntry[],
  fromDate: string, // DD/MM/YYYY
  toDate: string     // DD/MM/YYYY
): number {
  const from = parseDateBR(fromDate).getTime();
  const to = parseDateBR(toDate).getTime();

  let factor = 1;
  for (const entry of rates) {
    const entryTime = parseDateBR(entry.date).getTime();
    if (entryTime >= from && entryTime < to) {
      factor *= 1 + entry.rate / 100;
    }
  }

  return factor;
}

/**
 * For a purchase, calculates investedValue * selicFactor
 */
export function calculateSelicUpdatedValue(
  investedValue: number,
  selicFactor: number
): number {
  return investedValue * selicFactor;
}
