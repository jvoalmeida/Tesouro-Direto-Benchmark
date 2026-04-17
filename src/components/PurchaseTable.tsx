import type { Purchase } from "@/lib/types";
import { maskValue } from "@/lib/utils";

interface PurchaseTableProps {
  purchases: Purchase[];
  showValues: boolean;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diffColorClass(val: number): string {
  if (val > 0) return "text-positive";
  if (val < 0) return "text-negative";
  return "text-muted-foreground";
}

export function PurchaseTable({ purchases, showValues }: PurchaseTableProps) {
  const hasSelicData = purchases.some((p) => p.selicUpdatedValue != null);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground align-bottom leading-tight">Data<br/>Compra</th>
            <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight">Qtd</th>
            <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight">Preço<br/>Compra</th>
            <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight">Valor<br/>Investido</th>
            {hasSelicData && (
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight">
                Atualizado<br/>Selic
              </th>
            )}
            <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight">Valor Bruto<br/>(Mercado)</th>
            {hasSelicData && (
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight">
                Diferença<br/>(Bruto − Selic)
              </th>
            )}
            <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground align-bottom leading-tight">Taxa<br/>Contratada</th>
            <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight">Índice de correção<br/>no período</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p, i) => {
            const diff = p.selicVsMarketDiff ?? 0;
            const selicUpdated = p.selicUpdatedValue ?? 0;
            const diffPct = selicUpdated > 0 ? (diff / selicUpdated) * 100 : 0;

            return (
              <tr
                key={`${p.date}-${i}`}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="px-3 py-2 font-mono text-xs">{p.date}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{maskValue(p.quantity.toFixed(2), showValues)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{maskValue(formatCurrency(p.priceAtPurchase), showValues)}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{maskValue(formatCurrency(p.investedValue), showValues)}</td>
                {hasSelicData && (
                  <td className="px-3 py-2 text-right font-mono text-xs font-medium">
                    {maskValue(formatCurrency(selicUpdated), showValues)}
                  </td>
                )}
                <td className="px-3 py-2 text-right font-mono text-xs font-medium">
                  {maskValue(formatCurrency(p.grossValue), showValues)}
                </td>
                {hasSelicData && (
                  <td className={`px-3 py-2 text-right font-mono text-xs font-semibold ${showValues ? diffColorClass(diff) : "text-muted-foreground"}`}>
                    {showValues ? (
                      <>
                        {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                        <span className="ml-1 text-[10px] opacity-70">
                          ({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%)
                        </span>
                      </>
                    ) : (
                      maskValue("", false)
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-xs">{p.contractedRate}</td>
                <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                  {p.selicFactor ? (showValues ? p.selicFactor.toFixed(6) : maskValue("", false)) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
