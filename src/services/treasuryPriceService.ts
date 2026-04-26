import Papa from 'papaparse';
import { parse, format, isAfter, subDays } from 'date-fns';

const CSV_URL = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";
const CACHE_KEY = 'td_price_history_v2'; // Changed key to avoid old data format conflicts
const CACHE_TTL = 1 * 60 * 60 * 1000; // 1h

export type PricePoint = {
  date: Date;
  puVenda: number;
  taxaVenda: number;
};

interface CachedData {
  timestamp: number;
  data: Record<string, PricePoint[]>;
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeBondName(title: string): string {
  // Removes year and anything after it: 
  // "Tesouro Selic 2027" -> "Tesouro Selic"
  // "Tesouro IPCA+ 2029 (S290329)" -> "Tesouro IPCA+"
  const withoutYear = title.replace(/\s\d{4}(\s.*)?$/, '').trim();
  return normalizeText(withoutYear);
}

function parseCSVText(csvText: string): Promise<Record<string, PricePoint[]>> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      delimiter: ';',
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const groupedData: Record<string, PricePoint[]> = {};
        const rowKeys = results.meta.fields || [];
        
        const findKey = (search: string) => {
          const normSearch = normalizeText(search);
          return rowKeys.find(k => normalizeText(k) === normSearch);
        };

        const typeKey = findKey('Tipo Titulo');
        const maturityKey = findKey('Data Vencimento');
        const dateKey = findKey('Data Base');
        const puKey = findKey('PU Venda Manha');
        const taxaKey = findKey('Taxa Venda Manha');

        if (!typeKey || !maturityKey || !dateKey || !puKey || !taxaKey) {
          console.error("Missing headers in CSV:", rowKeys);
          reject(new Error("Missing required headers in Treasury CSV"));
          return;
        }
        
        results.data.forEach((row: any) => {
          const type = row[typeKey];
          const maturity = row[maturityKey];
          const dateStr = row[dateKey];
          const puStr = row[puKey];
          const taxaStr = row[taxaKey];
          
          if (!type || !maturity || !dateStr || !puStr || !taxaStr) return;
          
          const normType = normalizeText(type);
          const normMaturity = maturity.trim();
          const key = `${normType}::${normMaturity}`;
          
          const pu = parseFloat(puStr.replace(',', '.'));
          const taxa = parseFloat(taxaStr.replace(',', '.'));
          const date = parse(dateStr, 'dd/MM/yyyy', new Date());
          
          if (!isNaN(pu) && !isNaN(taxa) && !isNaN(date.getTime())) {
            if (!groupedData[key]) groupedData[key] = [];
            groupedData[key].push({
              date,
              puVenda: pu,
              taxaVenda: taxa
            });
          }
        });

        // Sort each history by date
        for (const key in groupedData) {
          groupedData[key].sort((a, b) => a.date.getTime() - b.date.getTime());
        }

        console.log(`Parsed ${Object.keys(groupedData).length} unique bond history entries`);
        resolve(groupedData);
      },
      error: (err) => reject(err)
    });
  });
}

async function fetchAndParseCSV(): Promise<Record<string, PricePoint[]>> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(CSV_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(CSV_URL)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(CSV_URL)}`
  ];

  let response: Response | null = null;
  
  for (const proxyUrl of proxies) {
    try {
      console.log("Fetching Treasury data from:", proxyUrl);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        response = res;
        break;
      } else {
        console.warn(`Proxy returned non-ok status: ${res.status}`);
      }
    } catch (err) {
      console.warn(`Proxy failed: ${proxyUrl}`, err);
    }
  }

  if (!response) {
    throw new Error("Failed to fetch Treasury data from all proxies. CORS or network error.");
  }

  const buffer = await response.arrayBuffer();
  const csvText = new TextDecoder('iso-8859-1').decode(buffer);
  
  return await parseCSVText(csvText);
}

// Allow manual upload of the CSV in case all proxies fail
export async function processCSVBuffer(buffer: ArrayBuffer): Promise<void> {
  try {
    const csvText = new TextDecoder('iso-8859-1').decode(buffer);
    const data = await parseCSVText(csvText);
    fullHistoryData = data;
    updateCache(data);
  } catch (err) {
    throw new Error("Falha ao processar o arquivo CSV do Tesouro.");
  }
}

/**
 * Selective caching: Only keep data for titles the user actually needs
 * This avoids exceeding localStorage limits (5MB) while still providing speed.
 */
function updateCache(newEntries: Record<string, PricePoint[]>) {
  const cached = localStorage.getItem(CACHE_KEY);
  let cachePayload: CachedData = { timestamp: Date.now(), data: {} };
  
  if (cached) {
    try {
      cachePayload = JSON.parse(cached);
      // If cache is expired, clear it
      if (Date.now() - cachePayload.timestamp > CACHE_TTL) {
        cachePayload.data = {};
      }
    } catch (e) {
      cachePayload.data = {};
    }
  }

  // Add/Update only the requested entries
  for (const key in newEntries) {
    cachePayload.data[key] = newEntries[key];
  }

  cachePayload.timestamp = Date.now();

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
  } catch (e) {
    console.warn("LocalStorage quota exceeded. Reducing history depth to fit...");
    // If quota exceeded, only keep last 12 months for each entry in cache
    const cutoff = subDays(new Date(), 365);
    for (const key in cachePayload.data) {
      cachePayload.data[key] = cachePayload.data[key].filter(p => isAfter(p.date, cutoff));
    }
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
    } catch (e2) {
      console.error("Critical: Could not save even reduced history to localStorage", e2);
    }
  }
}

async function getFromCache(key: string): Promise<PricePoint[] | null> {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  try {
    const parsed: CachedData = JSON.parse(cached);
    if (Date.now() - parsed.timestamp < CACHE_TTL && parsed.data[key]) {
      return parsed.data[key].map((p: any) => ({
        ...p,
        date: new Date(p.date)
      }));
    }
  } catch (e) {}
  return null;
}

let fullHistoryPromise: Promise<Record<string, PricePoint[]>> | null = null;
let fullHistoryData: Record<string, PricePoint[]> | null = null;

export async function ensureFullHistory(): Promise<Record<string, PricePoint[]>> {
  if (fullHistoryData) return fullHistoryData;
  if (fullHistoryPromise) return fullHistoryPromise;

  fullHistoryPromise = (async () => {
    try {
      const data = await fetchAndParseCSV();
      fullHistoryData = data;
      return data;
    } catch (e) {
      fullHistoryPromise = null;
      throw e;
    }
  })();

  return fullHistoryPromise;
}

export async function getPriceHistory(bondType: string, maturityDate: string): Promise<PricePoint[]> {
  const normalizedType = normalizeBondName(bondType);
  const normMaturity = maturityDate.trim();
  const key = `${normalizedType}::${normMaturity}`;
  
  // 1. Try Memory cache
  if (fullHistoryData && fullHistoryData[key]) return fullHistoryData[key];
  
  // 2. Try LocalStorage cache
  const cachedHistory = await getFromCache(key);
  if (cachedHistory) return cachedHistory;
  
  // 3. Force fetch full CSV if not in cache (once)
  try {
    const fullData = await ensureFullHistory();
    const history = fullData[key] || [];
    
    if (history.length > 0) {
      // Save it selectively to cache for next time
      updateCache({ [key]: history });
    } else {
      console.warn(`No match found for: ${key}. Attempting fallback...`);
      // Try a "looser" match based only on type and YEAR of maturity
      const year = normMaturity.split('/').pop();
      const fallbackKey = Object.keys(fullData).find(k => {
        const [kType, kMat] = k.split('::');
        return kType === normalizedType && kMat.endsWith(year || 'NEVER_MATCH');
      });
      
      if (fallbackKey) {
        console.info(`Using fallback match: ${fallbackKey} for ${key}`);
        return fullData[fallbackKey];
      }
    }
    
    return history;
  } catch (e) {
    console.error("Treasury Service Fetch Error:", e);
    return [];
  }
}

export async function getLatestPrice(bondType: string, maturityDate: string): Promise<PricePoint | null> {
  const history = await getPriceHistory(bondType, maturityDate);
  if (history.length === 0) return null;
  return history[history.length - 1];
}
