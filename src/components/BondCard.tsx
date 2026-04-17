import { useState } from "react";
import type { BondExtract } from "@/lib/types";
import { maskValue } from "@/lib/utils";
import { PurchaseTable } from "./PurchaseTable";
import { ChevronDown, ChevronRight, Building2, Calendar, Landmark } from "lucide-react";

interface BondCardProps {
  extract: BondExtract;
  showValues: boolean;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BondCard({ extract, showValues }: BondCardProps) {
  const [open, setOpen] = useState(false);
  const hasSelicData = extract.totalSelicUpdated != null && extract.totalSelicUpdated > 0;
  const diff = extract.totalSelicVsMarketDiff ?? 0;
  const selicUpdated = extract.totalSelicUpdated ?? 0;
  const diffPct = selicUpdated > 0 ? (diff / selicUpdated) * 100 : 0;

  let avgRate = "";
  if (extract.purchases.length > 0) {
    let prefix = "";
    let totalInvested = 0;
    let weightedSum = 0;
    let valid = true;

    for (const p of extract.purchases) {
      if (!p.contractedRate) {
        valid = false;
        break;
      }
      
      // Matches things like "IPCA + 5,50%", "SELIC + 0,107%", "10,50%"
      const match = p.contractedRate.match(/^(.*?)\s*([\d,]+)%?$/);
      if (!match) {
        valid = false; /* Could not parse the number */
        break;
      }

      if (!prefix && match[1]) {
        prefix = match[1].trim() + (match[1].trim() ? " " : "");
      }

      const num = parseFloat(match[2].replace(",", "."));
      if (isNaN(num)) {
        valid = false;
        break;
      }

      // Weight by invested value
      totalInvested += p.investedValue;
      weightedSum += num * p.investedValue;
    }

    if (valid && totalInvested > 0) {
      const avg = weightedSum / totalInvested;
      avgRate = `${prefix}${avg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-heading text-base font-bold text-card-foreground truncate">
              {extract.title}
            </h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {extract.broker}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Venc: {extract.maturityDate}
            </span>
            <span>{extract.purchases.length} compras</span>
            <span>Qtd: {maskValue(extract.totalQuantity.toFixed(2), showValues)}</span>
            {avgRate && <span>Taxa Média: {avgRate}</span>}
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          {hasSelicData && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Atualizado Selic</p>
              <p className="font-mono text-sm font-semibold">{maskValue(formatCurrency(selicUpdated), showValues)}</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Bruto (Mercado)</p>
            <p className="font-mono text-sm font-semibold">{maskValue(formatCurrency(extract.totalGrossValue), showValues)}</p>
          </div>
          {hasSelicData && (
            <div className="text-right min-w-[110px]">
              <p className="text-xs text-muted-foreground">Diferença</p>
              <p className={`font-mono text-sm font-bold ${showValues ? (diff >= 0 ? "text-positive" : "text-negative") : "text-muted-foreground"}`}>
                {showValues ? (
                  <>
                    {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                    <span className="ml-1 text-[10px] opacity-70">({diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%)</span>
                  </>
                ) : (
                  maskValue("", false)
                )}
              </p>
            </div>
          )}
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          <PurchaseTable purchases={extract.purchases} showValues={showValues} />
          {(extract.generationInfo || extract.extractDate) && (
            <div className="mt-4 flex items-center justify-end gap-1.5 text-right text-[10px] text-muted-foreground">
              <span className="opacity-70">
                {extract.generationInfo || `Extrato gerado em ${extract.extractDate}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
