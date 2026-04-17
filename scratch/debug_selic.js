const https = require('https');

function parseDateBR(dateStr) {
  const [d, m, y] = dateStr.split("/").map(Number);
  return new Date(y, m - 1, d);
}

const url = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=01/12/2024&dataFinal=30/04/2026";

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const rates = JSON.parse(data).map(r => ({
      date: r.data,
      rate: parseFloat(r.valor)
    }));

    const fromDate = "17/12/2024";
    const toDate = "14/04/2026";
    
    const fromTime = parseDateBR(fromDate).getTime();
    const toTime = parseDateBR(toDate).getTime();

    // Strategy 1: [from, to)
    let factor1 = 1;
    let days1 = 0;
    rates.forEach(entry => {
      const entryTime = parseDateBR(entry.date).getTime();
      if (entryTime >= fromTime && entryTime < toTime) {
        factor1 *= (1 + entry.rate / 100);
        days1++;
      }
    });

    // Strategy 2: (from, to]
    let factor2 = 1;
    let days2 = 0;
    rates.forEach(entry => {
      const entryTime = parseDateBR(entry.date).getTime();
      if (entryTime > fromTime && entryTime <= toTime) {
        factor2 *= (1 + entry.rate / 100);
        days2++;
      }
    });

    // Strategy 3: [from, to] (inclusive of both)
    let factor3 = 1;
    let days3 = 0;
    rates.forEach(entry => {
      const entryTime = parseDateBR(entry.date).getTime();
      if (entryTime >= fromTime && entryTime <= toTime) {
        factor3 *= (1 + entry.rate / 100);
        days3++;
      }
    });

    // Output all strategies
    console.log("Expected BCB: 1.19279766");
    console.log(`Strategy 1 [from, to): ${factor1.toFixed(8)} | Days: ${days1}`);
    console.log(`Strategy 2 (from, to]: ${factor2.toFixed(8)} | Days: ${days2}`);
    console.log(`Strategy 3 [from, to]: ${factor3.toFixed(8)} | Days: ${days3}`);
  });
}).on('error', err => console.error(err));
