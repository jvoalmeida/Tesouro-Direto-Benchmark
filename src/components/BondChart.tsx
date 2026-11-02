import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PricePoint } from '@/services/treasuryPriceService';
import { TrendingUp, Download } from 'lucide-react';

const CSV_DOWNLOAD_URL = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";

interface BondChartProps {
  data: PricePoint[];
  bondType: string;
  chartError?: boolean;
}

export function BondChart({ data, bondType, chartError }: BondChartProps) {
  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatRate = (val: number) => {
    const title = bondType.toLowerCase();
    const rateStr = val.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (title.includes('selic')) return `SELIC + ${rateStr}%`;
    if (title.includes('ipca')) return `IPCA+ ${rateStr}%`;
    return `${rateStr}% a.a.`;
  };

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {chartError ? 'Não foi possível carregar o histórico de preços' : 'Histórico de preços não encontrado'}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {chartError
              ? 'Os proxies falharam ao buscar os dados do Tesouro Transparente. '
              : 'O título pode não constar no CSV do Tesouro Transparente ou o nome pode ser diferente. '}
            Importe o arquivo CSV manualmente para ver o gráfico.
          </p>
        </div>
        <a
          href={CSV_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar CSV do Tesouro Transparente
        </a>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-start gap-4 px-1">
        <span className="text-[12px] font-medium text-[#378ADD]">
          — PU venda
        </span>
        <span className="text-[12px] font-medium text-[#1D9E75]">
          — Taxa venda
        </span>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-subtle)" opacity={0.5} />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(date, 'MMM/yy', { locale: ptBR })}
              fontSize={10}
              tick={{ fill: 'var(--color-text-secondary)' }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
              fontSize={10}
              tick={{ fill: '#378ADD' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(val) => `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`}
              fontSize={10}
              tick={{ fill: '#1D9E75' }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as PricePoint;
                  return (
                    <div className="rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur-md">
                      <p className="mb-2 text-[11px] font-semibold text-foreground">
                        {format(d.date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-[11px] text-[#378ADD]">PU venda</span>
                          <span className="font-mono text-[11px] font-bold text-foreground">
                            {formatCurrency(d.puVenda)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span className="text-[11px] text-[#1D9E75]">Taxa venda</span>
                          <span className="font-mono text-[11px] font-bold text-foreground">
                            {formatRate(d.taxaVenda)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="puVenda"
              stroke="#378ADD"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#378ADD' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="taxaVenda"
              stroke="#1D9E75"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#1D9E75' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
