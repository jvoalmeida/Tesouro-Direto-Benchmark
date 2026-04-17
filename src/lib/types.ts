export interface Purchase {
  date: string;
  quantity: number;
  priceAtPurchase: number;
  investedValue: number;
  contractedRate: string;
  accumulatedReturn: string;
  accumulatedReturnPct: number;
  grossValue: number;
  daysSincePurchase: number;
  irRate: number;
  irTax: number;
  iofTax: number;
  b3Fee: number;
  brokerFee: number;
  netValue: number;
  // Selic-calculated fields (populated after Selic data is loaded)
  selicFactor?: number;
  selicUpdatedValue?: number; // investedValue * selicFactor
  selicVsMarketDiff?: number; // grossValue - selicUpdatedValue
}

export interface BondExtract {
  id: string; // title + broker key
  title: string;
  investor: string;
  broker: string;
  maturityDate: string;
  purchases: Purchase[];
  extractDate: string;
  generationInfo?: string; // Full string: "Extrato Analítico gerado em..."
  totalInvested: number;
  totalGrossValue: number;
  totalNetValue: number;
  totalQuantity: number;
  // Selic totals
  totalSelicUpdated?: number;
  totalSelicVsMarketDiff?: number;
}
