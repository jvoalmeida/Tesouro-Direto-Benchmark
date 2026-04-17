import type { BondExtract } from "@/lib/types";
import { maskValue } from "@/lib/utils";

interface ConsolidatedSummaryProps {
  extracts: BondExtract[];
  showValues: boolean;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ConsolidatedSummary({ extracts, showValues }: ConsolidatedSummaryProps) {
  const totalInvested = extracts.reduce((s, e) => s + e.totalInvested, 0);
  const totalGross = extracts.reduce((s, e) => s + e.totalGrossValue, 0);
  const totalSelicUpdated = extracts.reduce((s, e) => s + (e.totalSelicUpdated ?? 0), 0);
  const selicVsMarket = totalGross - totalSelicUpdated;
  const selicVsMarketPct = totalSelicUpdated > 0 ? (selicVsMarket / totalSelicUpdated) * 100 : 0;

  const hasSelicData = totalSelicUpdated > 0;

  const cards = [
    { label: "Total Investido (Compra)", value: maskValue(formatCurrency(totalInvested), showValues), color: "" },
    ...(hasSelicData
      ? [
          {
            label: "Atualizado pela Selic",
            value: maskValue(formatCurrency(totalSelicUpdated), showValues),
            sub: showValues ? `+${((totalSelicUpdated / totalInvested - 1) * 100).toFixed(2)}% desde a compra` : maskValue("", false),
            color: "",
          },
        ]
      : []),
    { label: "Valor Bruto (Mercado)", value: maskValue(formatCurrency(totalGross), showValues), color: "" },
    ...(hasSelicData
      ? [
          {
            label: "Diferença (Mercado − Selic)",
            value: showValues ? `${selicVsMarket >= 0 ? "+" : ""}${formatCurrency(selicVsMarket)}` : maskValue("", false),
            sub: showValues ? `${selicVsMarketPct >= 0 ? "+" : ""}${selicVsMarketPct.toFixed(2)}%` : maskValue("", false),
            color: selicVsMarket >= 0 ? "text-positive" : "text-negative",
          },
        ]
      : []),
  ];

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${hasSelicData ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
          <p className={`mt-1 font-heading text-xl font-bold ${c.color || "text-card-foreground"}`}>
            {c.value}
          </p>
          {c.sub && (
            <p className={`mt-0.5 font-mono text-sm ${c.color || "text-muted-foreground"}`}>{c.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
