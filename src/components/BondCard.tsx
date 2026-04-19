import { useState, useEffect } from "react";
import type { BondExtract } from "@/lib/types";
import { maskValue } from "@/lib/utils";
import { PurchaseTable } from "./PurchaseTable";
import { ChevronDown, ChevronRight, Building2, Calendar, Landmark, LineChart } from "lucide-react";
import { getLatestPrice, getPriceHistory, type PricePoint } from "@/services/treasuryPriceService";
import { format, parse, isAfter, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { BondChart } from "./BondChart";

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
  const [showChart, setShowChart] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

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

  useEffect(() => {
    if (showChart && priceHistory.length === 0 && !loadingChart) {
      async function loadHistory() {
        setLoadingChart(true);
        try {
          const history = await getPriceHistory(extract.title, extract.maturityDate);
          
          // Filter history starting from the first purchase date
          if (extract.purchases.length > 0) {
            const firstDateStr = extract.purchases.reduce((earliest, p) => {
              const d1 = parse(earliest, 'dd/MM/yyyy', new Date());
              const d2 = parse(p.date, 'dd/MM/yyyy', new Date());
              return d2 < d1 ? p.date : earliest;
            }, extract.purchases[0].date);
            
            const firstDate = parse(firstDateStr, 'dd/MM/yyyy', new Date());
            const filtered = history.filter(p => isAfter(p.date, firstDate) || isSameDay(p.date, firstDate));
            setPriceHistory(filtered);
          } else {
            setPriceHistory(history);
          }
        } catch (e) {
          console.error("Failed to load price history", e);
        } finally {
          setLoadingChart(false);
        }
      }
      loadHistory();
    }
  }, [showChart, extract.title, extract.maturityDate, extract.purchases, priceHistory.length, loadingChart]);

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
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-heading text-base font-bold text-card-foreground truncate">
              {extract.title}
            </h3>
          </div>
          <div className="mt-1 space-y-1 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-2">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {extract.broker}
              </span>
              <span className="mx-0.5 opacity-30">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Venc: {extract.maturityDate}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2">
              <span>{extract.purchases.length} compras</span>
              <span className="mx-0.5 opacity-30">•</span>
              <span>Qtd: {maskValue(extract.totalQuantity.toFixed(2), showValues)}</span>
              {avgPrice && (
                <>
                  <span className="mx-0.5 opacity-30">•</span>
                  <span>Preço Médio: {maskValue(avgPrice, showValues)}</span>
                </>
              )}
              {avgRate && (
                <>
                  <span className="mx-0.5 opacity-30">•</span>
                  <span>Taxa Média: {avgRate}</span>
                </>
              )}
            </div>
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

          {loadingPrice && (
            <div className="flex flex-col items-end gap-1 border-l-[0.5px] border-border-tertiary pl-[18px]">
               <div className="h-3 w-20 animate-pulse rounded bg-muted/40" />
               <div className="flex items-center gap-6">
                <div className="space-y-1">
                  <div className="h-[14px] w-[50px] animate-pulse rounded bg-muted/50" />
                  <div className="h-[14px] w-[40px] animate-pulse rounded bg-muted/50 ml-auto" />
                </div>
                <div className="space-y-1">
                  <div className="h-[14px] w-[50px] animate-pulse rounded bg-muted/50" />
                  <div className="h-[14px] w-[40px] animate-pulse rounded bg-muted/50 ml-auto" />
                </div>
              </div>
            </div>
          )}

          {!loadingPrice && latestPrice && (
            <div className="flex flex-col items-end gap-1 border-l-[0.5px] border-border-tertiary pl-[18px]">
              <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                Mercado em {format(latestPrice.date, 'dd/MM')}
              </p>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">PU venda</p>
                  <p className="font-mono text-sm font-semibold">
                    {maskValue(formatCurrency(latestPrice.puVenda), showValues)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Taxa venda</p>
                  <p className="font-mono text-sm font-normal text-muted-foreground">
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
            </div>
          )}
          <div className="flex items-center gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setShowChart(!showChart);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowChart(!showChart);
                }
              }}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all duration-150 ${
                showChart 
                  ? "bg-info/10 text-info" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              title="Ver evolução de preços"
            >
              <LineChart className="h-4 w-4" />
            </div>
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {showChart && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden border-t border-border bg-muted/5"
          >
            <div className="px-5 py-6">
              {loadingChart ? (
                <div className="h-[220px] w-full animate-pulse rounded-lg bg-muted/50" />
              ) : (
                <BondChart data={priceHistory} bondType={extract.title} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
