import { useState, useEffect, useCallback } from "react";
import { FileUpload } from "@/components/FileUpload";
import { BondCard } from "@/components/BondCard";
import { ConsolidatedSummary } from "@/components/ConsolidatedSummary";
import { parseExtractFile } from "@/lib/parseExtract";
import { loadExtracts, upsertExtract, clearAllExtracts } from "@/lib/store";
import type { BondExtract } from "@/lib/types";
import { fetchSelicRates, calculateSelicFactor, calculateSelicUpdatedValue, formatDateBR, type SelicEntry } from "@/lib/selic";
import { toast } from "sonner";
import { Trash2, TrendingUp, Loader2, Download, Eye, EyeOff } from "lucide-react";

function enrichWithSelic(extracts: BondExtract[], rates: SelicEntry[]): BondExtract[] {
  const today = formatDateBR(new Date());
  return extracts.map((ext) => {
    let targetDate = ext.extractDate || today;
    
    // Clamp targetDate to the last available Selic rate date
    if (rates.length > 0) {
      const lastSelicDate = rates[rates.length - 1].date;
      const tParts = targetDate.split("/").map(Number);
      const lParts = lastSelicDate.split("/").map(Number);
      const tVal = new Date(tParts[2], tParts[1] - 1, tParts[0]).getTime();
      const lVal = new Date(lParts[2], lParts[1] - 1, lParts[0]).getTime();
      
      if (tVal > lVal) {
        targetDate = lastSelicDate;
      }
    }

    const purchases = ext.purchases.map((p) => {
      const factor = calculateSelicFactor(rates, p.date, targetDate);
      const selicUpdated = calculateSelicUpdatedValue(p.investedValue, factor);
      return {
        ...p,
        selicFactor: factor,
        selicUpdatedValue: selicUpdated,
        selicVsMarketDiff: p.grossValue - selicUpdated,
      };
    });
    const totalSelicUpdated = purchases.reduce((s, p) => s + (p.selicUpdatedValue ?? 0), 0);
    const totalGross = purchases.reduce((s, p) => s + p.grossValue, 0);
    return {
      ...ext,
      purchases,
      totalSelicUpdated,
      totalSelicVsMarketDiff: totalGross - totalSelicUpdated,
    };
  });
}

const Index = () => {
  const [extracts, setExtracts] = useState<BondExtract[]>([]);
  const [selicRates, setSelicRates] = useState<SelicEntry[]>([]);
  const [selicLoading, setSelicLoading] = useState(false);
  const [selicError, setSelicError] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(() => {
    const saved = localStorage.getItem("tesouro-benchmark-show-values");
    return saved !== "false";
  });

  useEffect(() => {
    localStorage.setItem("tesouro-benchmark-show-values", String(showValues));
  }, [showValues]);

  const loadSelic = useCallback(async () => {
    setSelicLoading(true);
    setSelicError(null);
    try {
      const rates = await fetchSelicRates();
      setSelicRates(rates);
      return rates;
    } catch (err) {
      console.error(err);
      setSelicError("Falha ao carregar dados da Selic");
      toast.error("Não foi possível carregar a Selic diária do BCB.");
      return [];
    } finally {
      setSelicLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = loadExtracts();
    if (stored.length > 0) {
      loadSelic().then((rates) => {
        if (rates.length > 0) {
          setExtracts(enrichWithSelic(stored, rates));
        } else {
          setExtracts(stored);
        }
      });
    }
  }, []);

  const handleFiles = async (files: { data: ArrayBuffer; fileName: string }[]) => {
    try {
      let allParsed: BondExtract[] = [];
      for (const { data } of files) {
        const parsed = parseExtractFile(data);
        allParsed = allParsed.concat(parsed);
      }

      if (allParsed.length === 0) {
        toast.error("Nenhum dado de extrato encontrado nos arquivos.");
        return;
      }

      let updated = loadExtracts();
      for (const extract of allParsed) {
        updated = upsertExtract(extract);
      }

      let rates = selicRates;
      if (rates.length === 0) {
        rates = await loadSelic();
      }

      if (rates.length > 0) {
        setExtracts(enrichWithSelic(updated, rates));
      } else {
        setExtracts(updated);
      }

      const titles = [...new Set(allParsed.map((p) => p.title))].join(", ");
      toast.success(`Importado: ${titles}`, {
        description: `${allParsed.reduce((s, p) => s + p.purchases.length, 0)} compras de ${files.length} arquivo(s)`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar os arquivos. Verifique o formato.");
    }
  };

  const handleClearAll = () => {
    clearAllExtracts();
    setExtracts([]);
    toast.info("Todos os dados foram removidos.");
  };

  const handleExportCSV = () => {
    const rows: string[] = [];
    rows.push("Título,Corretora,Vencimento,Data Compra,Qtd,Valor Investido,Fator Selic,Atualizado Selic,Valor Bruto (Mercado),Diferença (Bruto-Selic),Diferença %,Taxa Contratada,Valor Líquido");
    for (const ext of extracts) {
      for (const p of ext.purchases) {
        const selicUpd = p.selicUpdatedValue ?? 0;
        const diff = p.selicVsMarketDiff ?? 0;
        const diffPct = selicUpd > 0 ? ((diff / selicUpd) * 100).toFixed(2) : "0";
        rows.push([
          `"${ext.title}"`, `"${ext.broker}"`, ext.maturityDate, p.date,
          p.quantity.toFixed(2), p.investedValue.toFixed(2),
          (p.selicFactor ?? 1).toFixed(6), selicUpd.toFixed(2),
          p.grossValue.toFixed(2), diff.toFixed(2), diffPct,
          `"${p.contractedRate}"`, p.netValue.toFixed(2),
        ].join(","));
      }
    }
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tesouro-benchmark-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground">
                Tesouro Direto Benchmark
              </h1>
              <p className="text-xs text-muted-foreground">
                Comparação Selic vs Mercado • Dados BCB
                {selicLoading && (
                  <Loader2 className="inline-block ml-1 h-3 w-3 animate-spin" />
                )}
                {selicRates.length > 0 && !selicLoading && (
                  <span className="ml-1 text-positive">
                    • Selic atualizada até {selicRates[selicRates.length - 1].date}
                  </span>
                )}
                {selicError && (
                  <span className="ml-1 text-negative">• {selicError}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowValues(!showValues)}
              className="flex items-center justify-center p-2 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={showValues ? "Ocultar valores" : "Mostrar valores"}
            >
              {showValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>

            {extracts.length > 0 && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Limpar</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        <FileUpload onFilesLoaded={handleFiles} />

        {extracts.length > 0 && (
          <>
            <ConsolidatedSummary extracts={extracts} showValues={showValues} />

            <div className="space-y-3">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Títulos ({extracts.length})
              </h2>
              {extracts.map((ext) => (
                <BondCard key={ext.id} extract={ext} showValues={showValues} />
              ))}
            </div>
          </>
        )}

        {extracts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              Importe um extrato analítico do Tesouro Direto para começar.
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-muted/30 py-8 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-semibold">Tesouro Direto Benchmark</span>
            </div>
            
            <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">⚠️ Aviso Importante</p>
              <p>
                Este projeto tem caráter exclusivamente educacional e informativo. As informações, simulações e 
                comparações apresentadas não constituem recomendação de investimento, oferta, análise ou 
                consultoria financeira de qualquer tipo.
              </p>
              <p className="mt-2">
                Os cálculos são baseados em dados públicos (como a taxa Selic do Banco Central) e nos dados 
                fornecidos pelo próprio usuário, podendo conter imprecisões, simplificações ou defasagens.
              </p>
              <p className="mt-2">
                O uso desta ferramenta é de inteira responsabilidade do usuário. Sempre considere consultar 
                um profissional qualificado antes de tomar decisões financeiras.
              </p>
              <p className="mt-2">
                Este projeto não possui qualquer vínculo com o Tesouro Direto, Banco Central do Brasil ou 
                instituições financeiras.
              </p>
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2">
              <p>© {new Date().getFullYear()} • Desenvolvido para fins educacionais</p>
              <p>v1.0.0</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
