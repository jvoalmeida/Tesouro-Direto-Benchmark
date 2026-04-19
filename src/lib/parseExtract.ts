import * as XLSX from "xlsx";
import type { BondExtract, Purchase } from "./types";

function parseNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function parseDate(val: unknown): string {
  if (!val) return "";
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    return `${String(d.d).padStart(2, "0")}/${String(d.m).padStart(2, "0")}/${d.y}`;
  }
  return String(val);
}

export function parseExtractFile(data: ArrayBuffer): BondExtract[] {
  const wb = XLSX.read(data, { type: "array" });
  const results: BondExtract[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    let title = "";
    let investor = "";
    let broker = "";
    let maturityDate = "";
    let extractDate = "";
    let generationInfo = "";

    // Parse header info
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (!row) continue;
      const firstCell = String(row[0] || "");

      if (firstCell.includes("EXTRATO ANALÍTICO")) {
        // Extract title name after the dash
        const match = firstCell.match(/EXTRATO ANALÍTICO\s*-\s*(.+)/);
        if (match) title = match[1].trim();
      }
      if (firstCell.includes("INVESTIDOR:")) {
        investor = firstCell.replace("INVESTIDOR:", "").trim();
      }
      if (firstCell.includes("AGENTE DE CUSTÓDIA:")) {
        broker = firstCell.replace("AGENTE DE CUSTÓDIA:", "").trim();
      }
      if (firstCell.includes("VENCIMENTO:")) {
        maturityDate = firstCell.replace("VENCIMENTO:", "").trim();
      }
    }

    if (!title) continue;

    // Find purchase rows - they start with a date pattern (DD/MM/YYYY)
    const purchases: Purchase[] = [];
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const firstCell = String(row[0] || "").trim();

      if (firstCell.includes("Extrato Analítico gerado em")) {
        generationInfo = firstCell.trim();
        const m = firstCell.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (m) extractDate = m[1];
        continue;
      }

      if (row.length < 10) continue;

      // Check if it's a date or excel serial date
      let dateStr = "";
      if (dateRegex.test(firstCell)) {
        dateStr = firstCell;
      } else if (typeof row[0] === "number" && row[0] > 30000 && row[0] < 60000) {
        dateStr = parseDate(row[0]);
      }

      if (!dateStr || firstCell === "Total") continue;

      // Validate it's a data row by checking quantity
      const qty = parseNumber(row[1]);
      if (qty <= 0) continue;

      const price = parseNumber(row[2]);
      const invested = parseNumber(row[3]);
      const contractedRate = String(row[4] || "");
      const accReturn = String(row[5] || "");
      const accReturnPct = parseNumber(row[6]);
      const grossValue = parseNumber(row[7]);
      const days = parseNumber(row[8]);
      const irRate = parseNumber(row[9]);
      const irTax = parseNumber(row[10]);
      const iofTax = parseNumber(row[11]);
      const b3Fee = parseNumber(row[12]);
      const brokerFee = parseNumber(row[13]);
      const netValue = parseNumber(row[14]);

      purchases.push({
        date: dateStr,
        quantity: qty,
        priceAtPurchase: price,
        investedValue: invested,
        contractedRate,
        accumulatedReturn: accReturn,
        accumulatedReturnPct: accReturnPct,
        grossValue,
        daysSincePurchase: days,
        irRate,
        irTax,
        iofTax,
        b3Fee,
        brokerFee,
        netValue,
      });
    }

    if (purchases.length === 0) continue;

    const id = `${title}::${broker}`;
    const totalInvested = purchases.reduce((s, p) => s + p.investedValue, 0);
    const totalGrossValue = purchases.reduce((s, p) => s + p.grossValue, 0);
    const totalNetValue = purchases.reduce((s, p) => s + p.netValue, 0);
    const totalQuantity = purchases.reduce((s, p) => s + p.quantity, 0);

    results.push({
      id,
      title,
      investor,
      broker,
      maturityDate,
      purchases,
      extractDate,
      generationInfo,
      totalInvested,
      totalGrossValue,
      totalNetValue,
      totalQuantity,
    });
  }

  return results;
}
