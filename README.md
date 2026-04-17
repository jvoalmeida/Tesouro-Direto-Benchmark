# Tesouro Direto Benchmark

## [🚀 Acesse a aplicação aqui](https://jvoalmeida.github.io/Tesouro-Direto-Benchmark/)

Ferramenta para comparar o **valor de venda dos títulos do Tesouro Direto com marcação a mercado** em relação ao **valor que o título teria se estivesse rendendo apenas pela taxa Selic diária** desde a data de compra (dados do Banco Central). Isso permite avaliar se vale a pena vender antecipadamente ou manter o título até o vencimento.

## O que o app faz?

- **Importa extratos**: Lê as planilhas `.xls` exportadas do [Portal do Investidor](https://portalinvestidor.tesourodireto.com.br) e extrai automaticamente todos os dados de cada compra (título, corretora, quantidade, valor investido, taxa contratada, impostos, etc.).
- **Atualiza pela Selic**: Busca a taxa Selic diária direto da API do Banco Central e calcula quanto cada compra renderia se fosse corrigida apenas pela Selic acumulada desde a data de aquisição.
- **Compara Selic vs Mercado**: Mostra a diferença entre o valor bruto atualizado pelo mercado (dado do extrato) e o valor corrigido pela Selic, permitindo avaliar se o título está performando acima ou abaixo do CDI/Selic.
- **Painel consolidado**: Exibe um resumo geral com total investido, valor atualizado pela Selic, valor bruto de mercado e a diferença percentual.
- **Detalhamento por título**: Para cada título do Tesouro, mostra corretora, vencimento, quantidade de compras e permite expandir para ver os detalhes de cada operação individual.
- **Exportação CSV**: Permite exportar todos os dados consolidados em formato CSV para análise em planilhas.
- **Armazenamento local**: Os dados importados são salvos no `localStorage` do navegador — nenhum dado é enviado para servidores externos.

## Como obter a planilha do Tesouro Direto

Para usar o Tesouro Tracker, você precisa exportar seus extratos do portal oficial. Siga os passos:

1. Acesse o site do Tesouro Direto: **[https://portalinvestidor.tesourodireto.com.br](https://portalinvestidor.tesourodireto.com.br)**
2. Faça login com sua conta Gov.br
3. Clique em **Extrato** no menu
4. Selecione a **Instituição Financeira**, o **ano** e o **mês** desejados
5. Clique em **Aplicar** para filtrar
6. Clique no **título** listado para expandir os detalhes
7. Clique em **Exportar** para baixar a planilha (`.xls`)
8. Repita os passos 4–7 para quantos títulos você tiver em cada corretora.

Depois, abra o Tesouro Tracker e arraste os arquivos para a área de importação (ou clique para selecionar).

> **Dica**: Você pode importar vários arquivos de uma vez. O app detecta duplicatas automaticamente e mantém apenas os dados mais recentes de cada título.

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Rodar testes
npm test

# Build de produção
npm run build
```

## Tecnologias

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Recharts (gráficos)
- SheetJS (leitura de planilhas)
- API do Banco Central (Selic diária)
