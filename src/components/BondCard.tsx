import { useState, useEffect } from "react";
import type { BondExtract } from "@/lib/types";
import { maskValue } from "@/lib/utils";
import { PurchaseTable } from "./PurchaseTable";
import { ChevronDown, ChevronRight, Building2, Calendar, Landmark, Loader2 } from "lucide-react";
import { getLatestPrice, type PricePoint } from "@/services/treasuryPriceService";
import { format } from "date-fns";

interface BondCardProps {
  extract: BondExtract;
  showValues: boolean;
}

function formatCurrency(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BondCard({ extract, showValues }: BondCardProps) {
  const [open, setOpen] = useState(false);
  const [latestPrice, setLatestPrice] = useState<PricePoint | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(true);

  useEffect(() => {
    async function loadLatest() {
      try {
        const price = await getLatestPrice(extract.title, extract.maturityDate);
        setLatestPrice(price);
      } catch (e) {
        console.error("Failed to load latest price", e);
      } finally {
        setLoadingPrice(false);
      }
    }
    loadLatest();
  }, [extract.title, extract.maturityDate]);

  const hasSelicData = extract.totalSelicUpdated != null && extract.totalSelicUpdated > 0;
  const diff = extract.totalSelicVsMarketDiff ?? 0;
  const selicUpdated = extract.totalSelicUpdated ?? 0;
  const diffPct = selicUpdated > 0 ? (diff / selicUpdated) * 100 : 0;

  let avgRate = "";
  let avgPrice = "";
  if (extract.purchases.length > 0) {
    let prefix = "";
    let totalInvested = 0;
    let weightedSumRate = 0;
    let totalPriceWeighted = 0;
    let totalQty = 0;
    let rateValid = true;

    for (const p of extract.purchases) {
      // For Price Weighted Average
      totalPriceWeighted += p.priceAtPurchase * p.quantity;
      totalQty += p.quantity;

      // For Rate Weighted Average
      if (!p.contractedRate) {
        rateValid = false;
        continue;
      }
      
      const match = p.contractedRate.match(/^(.*?)\s*([\d,]+)%?$/);
      if (!match) {
        rateValid = false;
        continue;
      }

      if (!prefix && match[1]) {
        prefix = match[1].trim() + (match[1].trim() ? " " : "");
      }

      const num = parseFloat(match[2].replace(",", "."));
      if (isNaN(num)) {
        rateValid = false;
        continue;
      }

      totalInvested += p.investedValue;
      weightedSumRate += num * p.investedValue;
    }

    if (rateValid && totalInvested > 0) {
      const avg = weightedSumRate / totalInvested;
      avgRate = `${prefix}${avg.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }

    if (totalQty > 0) {
      const avgP = totalPriceWeighted / totalQty;
      avgPrice = formatCurrency(avgP);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full flex-col lg:flex-row items-start lg:items-center justify-between gap-5 px-5 py-5 text-left transition-colors hover:bg-muted/30"
      >
        {/* Bloco 1: Informações do Título */}
        <div className="flex-1 min-w-0 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary shrink-0" />
            <h3 className="font-heading text-base font-bold text-card-foreground truncate">
              {extract.title}
            </h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Building2 className="h-3.5 w-3.5" />
              {extract.broker}
            </span>
            <span className="opacity-30">•</span>
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              Venc: {extract.maturityDate}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground/80">
            <span>{extract.purchases.length} compras</span>
            <span className="opacity-30">•</span>
            <span>Qtd: {maskValue(extract.totalQuantity.toFixed(2), showValues)}</span>
            {avgPrice && (
              <>
                <span className="opacity-30">•</span>
                <span>Preço Médio: {maskValue(avgPrice, showValues)}</span>
              </>
            )}
            {avgRate && (
              <>
                <span className="opacity-30">•</span>
                <span className="text-foreground/70 font-medium">Taxa Média: {avgRate}</span>
              </>
            )}
          </div>
        </div>

        {/* Blocos 2 e 3: Posição e Mercado */}
        <div className="flex w-full lg:w-auto items-center justify-between lg:justify-end gap-5 shrink-0 overflow-x-auto pb-1 lg:pb-0 hide-scrollbar">
          
          {/* Bloco 2: Sua Posição */}
          <div className="flex items-start gap-5 pr-5 lg:border-r border-border min-w-max">
            <div className="text-left lg:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">Valor Investido</p>
              <p className="font-mono text-[15px] font-semibold text-foreground">
                {maskValue(formatCurrency(extract.totalInvested), showValues)}
              </p>
            </div>

            {hasSelicData && (
              <div className="text-left lg:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">Valor Selic</p>
                <p className="font-mono text-[15px] font-semibold text-foreground">
                  {maskValue(formatCurrency(selicUpdated), showValues)}
                </p>
              </div>
            )}

            <div className="text-left lg:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">Valor a Mercado</p>
              <p className="font-mono text-[15px] font-semibold text-foreground">
                {maskValue(formatCurrency(extract.totalGrossValue), showValues)}
              </p>
            </div>

            {hasSelicData && (
              <div className="text-left lg:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">Mercado vs Selic</p>
                <p className={`font-mono text-[15px] font-bold ${showValues ? (diff >= 0 ? "text-positive" : "text-negative") : "text-muted-foreground"}`}>
                  {showValues ? (
                    diff >= 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)
                  ) : (
                    maskValue("", false)
                  )}
                </p>
                {showValues && (
                  <p className={`text-[10px] mt-0.5 font-medium ${diff >= 0 ? 'text-positive' : 'text-negative'} opacity-80`}>
                    {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(2)}%
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Bloco 3: Preço e Taxa Atual de Mercado */}
          <div className="flex items-center gap-3 min-w-max">
            {loadingPrice ? (
              <div className="flex items-center gap-2 bg-muted/20 px-3 py-2.5 rounded-lg border border-border/40">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">Carregando mercado...</span>
              </div>
            ) : latestPrice ? (
              <div className="flex items-center gap-4 bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                    PU Venda
                    <span className="ml-1 opacity-50 lowercase font-normal">({format(latestPrice.date, 'dd/MM')})</span>
                  </p>
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {maskValue(formatCurrency(latestPrice.puVenda), showValues)}
                  </p>
                </div>
                <div className="w-[1px] h-8 bg-border/50" />
                <div className="text-right pl-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-0.5">Taxa Venda</p>
                  <p className="font-mono text-[13px] font-medium text-foreground/80">
                    {( () => {
                      const title = extract.title.toLowerCase();
                      const rateStr = latestPrice.taxaVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      if (title.includes('selic')) return `SELIC + ${rateStr}%`;
                      if (title.includes('ipca')) return `IPCA+ ${rateStr}%`;
                      return `${rateStr}% a.a.`;
                    })() }
                  </p>
                </div>
              </div>
            ) : null}

            {/* Botão expandir detalhes */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-all duration-150 bg-background/50 border border-border/40 hover:bg-muted hover:text-foreground">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </div>
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
