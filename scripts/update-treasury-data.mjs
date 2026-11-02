import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_URL =
  "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

async function update() {
  console.log("Baixando CSV do Tesouro Transparente...");
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    throw new Error(`Falha ao baixar CSV: status ${res.status}`);
  }

  const tempCsvPath = path.join(__dirname, 'temp_preco.csv');
  const buffer = await res.arrayBuffer();
  fs.writeFileSync(tempCsvPath, Buffer.from(buffer));
  console.log("Download concluído. Processando registros...");

  const fileStream = fs.createReadStream(tempCsvPath, { encoding: 'latin1' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let count = 0;
  const history = {};

  for await (const line of rl) {
    count++;
    if (count === 1) continue;
    const parts = line.split(';');
    if (parts.length < 7) continue;
    const [tipo, venc, dataBase, txC, txV, puC, puV] = parts;
    if (!tipo || !venc || !dataBase || !puV || !txV) continue;

    const normType = normalizeText(tipo);
    const normMat = venc.trim();
    const key = `${normType}::${normMat}`;

    const pu = parseFloat(puV.replace(',', '.'));
    const taxa = parseFloat(txV.replace(',', '.'));
    if (isNaN(pu) || isNaN(taxa)) continue;

    const [d, m, y] = dataBase.split('/');
    if (!d || !m || !y) continue;
    const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    if (!history[key]) history[key] = [];
    if (history[key].length < 60) {
      history[key].push({ date: isoDate, puVenda: pu, taxaVenda: taxa });
    }
  }

  for (const k in history) {
    history[k].reverse();
  }

  try {
    fs.unlinkSync(tempCsvPath);
  } catch {}

  const outDir = path.resolve(__dirname, '../public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'treasury-data.json');
  fs.writeFileSync(outPath, JSON.stringify(history));
  console.log(`Sucesso! Atualizado ${outPath} com ${Object.keys(history).length} títulos.`);
}

update().catch((err) => {
  console.error("Erro ao atualizar dados:", err);
  process.exit(1);
});

