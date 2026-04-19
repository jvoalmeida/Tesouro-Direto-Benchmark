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
    { label: "Total Investido (Compra)", value: maskValue(formatCurrency(totalInvested), showValues), color: "", subColor: "" },
    ...(hasSelicData
      ? [
          {
            label: "Atualizado pela Selic",
            value: maskValue(formatCurrency(totalSelicUpdated), showValues),
            sub: showValues ? `+${((totalSelicUpdated / totalInvested - 1) * 100).toFixed(2)}%` : maskValue("", false),
            color: "",
            subColor: (totalSelicUpdated / totalInvested - 1) >= 0 ? "text-positive" : "text-negative",
          },
        ]
      : []),
    { 
      label: "Valor Bruto (Mercado)", 
      value: maskValue(formatCurrency(totalGross), showValues), 
      sub: showValues 
        ? `${(totalGross / totalInvested - 1) >= 0 ? "+" : ""}${((totalGross / totalInvested - 1) * 100).toFixed(2)}%` 
        : maskValue("", false),
      color: "",
      subColor: (totalGross / totalInvested - 1) >= 0 ? "text-positive" : "text-negative",
    },
    ...(hasSelicData
      ? [
          {
            label: "Diferença (Mercado − Selic)",
            value: showValues ? `${selicVsMarket >= 0 ? "+" : ""}${formatCurrency(selicVsMarket)}` : maskValue("", false),
            sub: showValues ? `${selicVsMarketPct >= 0 ? "+" : ""}${selicVsMarketPct.toFixed(2)}%` : maskValue("", false),
            color: selicVsMarket >= 0 ? "text-positive" : "text-negative",
            subColor: selicVsMarketPct >= 0 ? "text-positive" : "text-negative",
          },
        ]
      : []),
  ];

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${hasSelicData ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
      {cards.map((c, i) => {
        const isDifferenceCard = c.label.includes("Diferença");
        const isPositive = c.color === "text-positive";
        const isNegative = c.color === "text-negative";
        
        let cardBg = "bg-card";
        let borderClass = "border-border";
        
        if (isDifferenceCard) {
          if (isPositive) {
            cardBg = "bg-positive/5";
            borderClass = "border-positive/20";
          } else if (isNegative) {
            cardBg = "bg-negative/5";
            borderClass = "border-negative/20";
          }
        }

        return (
          <div
            key={c.label}
            className={`relative overflow-hidden rounded-xl border ${borderClass} ${cardBg} p-5 shadow-sm transition-all hover:shadow-md`}
          >
            {isDifferenceCard && isPositive && (
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-positive/10 blur-xl"></div>
            )}
            {isDifferenceCard && isNegative && (
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-negative/10 blur-xl"></div>
            )}
            
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 relative z-10">{c.label}</p>
            <p className={`mt-2 font-heading text-2xl font-bold tracking-tight ${c.color || "text-card-foreground"} relative z-10`}>
              {c.value}
            </p>
            {c.sub && (
              <p className={`mt-1 font-mono text-[13px] font-medium ${c.subColor || c.color || "text-muted-foreground"} relative z-10`}>{c.sub}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
