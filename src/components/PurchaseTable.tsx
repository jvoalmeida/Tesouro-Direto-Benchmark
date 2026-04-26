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
    <>
      {/* Visualização de Tabela (Desktop) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">Data<br/>Compra</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">Qtd</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">Preço<br/>Compra</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">Valor<br/>Investido</th>
              {hasSelicData && (
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">
                  Atualizado<br/>Selic
                </th>
              )}
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">Valor a<br/>Mercado</th>
              {hasSelicData && (
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">
                  Diferença<br/>(Vs Selic)
                </th>
              )}
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">Taxa<br/>Contratada</th>
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground align-bottom leading-tight whitespace-nowrap">Fator<br/>Correção</th>
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
                  <td className="px-3 py-2 text-right text-xs">{p.contractedRate}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                    {p.selicFactor ? (showValues ? p.selicFactor.toFixed(6) : maskValue("", false)) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visualização de Cards (Mobile) */}
      <div className="md:hidden space-y-3">
        {purchases.map((p, i) => {
          const diff = p.selicVsMarketDiff ?? 0;
          const selicUpdated = p.selicUpdatedValue ?? 0;
          const diffPct = selicUpdated > 0 ? (diff / selicUpdated) * 100 : 0;

          return (
            <div key={`${p.date}-${i}-mobile`} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Data da Compra</p>
                  <p className="font-mono text-sm font-semibold">{p.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Taxa Contratada</p>
                  <p className="text-sm font-semibold">{p.contractedRate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Qtd / Preço Compra</p>
                  <p className="font-mono text-xs">
                    {maskValue(p.quantity.toFixed(2), showValues)} <span className="text-muted-foreground mx-1">x</span> {maskValue(formatCurrency(p.priceAtPurchase), showValues)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Investido</p>
                  <p className="font-mono text-xs font-semibold">{maskValue(formatCurrency(p.investedValue), showValues)}</p>
                </div>

                {hasSelicData && (
                  <>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Atualizado Selic</p>
                      <p className="font-mono text-xs font-medium">{maskValue(formatCurrency(selicUpdated), showValues)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Fator de Correção</p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {p.selicFactor ? (showValues ? p.selicFactor.toFixed(6) : maskValue("", false)) : "—"}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-0.5">Valor a Mercado</p>
                  <p className="font-mono text-sm font-bold">{maskValue(formatCurrency(p.grossValue), showValues)}</p>
                </div>
                {hasSelicData && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground mb-0.5">Diferença vs Selic</p>
                    <p className={`font-mono text-sm font-bold ${showValues ? diffColorClass(diff) : "text-muted-foreground"}`}>
                      {showValues ? (
                        <>
                          {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                          <span className="block text-[10px] opacity-80 -mt-0.5">
                            ({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%)
                          </span>
                        </>
                      ) : (
                        maskValue("", false)
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
