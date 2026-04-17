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
    
    // In UTC to avoid timezone shifting
    function dateToUTC(dateStr) {
      const [d, m, y] = dateStr.split("/").map(Number);
      return Date.UTC(y, m - 1, d);
    }
    
    const fromTime = dateToUTC(fromDate);
    const toTime = dateToUTC(toDate);

    let factor1 = 1, days1 = 0;
    rates.forEach(entry => {
      const entryTime = dateToUTC(entry.date);
      if (entryTime >= fromTime && entryTime < toTime) {
        factor1 *= (1 + entry.rate / 100);
        days1++;
      }
    });

    let factor1trunc = 1;
    rates.forEach(entry => {
      const entryTime = dateToUTC(entry.date);
      if (entryTime >= fromTime && entryTime < toTime) {
        // According to Bacen methodology, calculation is done by truncating at 8 places
        let f = Number((1 + entry.rate / 100).toFixed(8));
        factor1trunc = factor1trunc * f; // Also BACEN standard truncates the accumulated factor at each step?
      }
    });

    let factor2 = 1, days2 = 0;
    rates.forEach(entry => {
      const entryTime = dateToUTC(entry.date);
      if (entryTime > fromTime && entryTime <= toTime) {
        factor2 *= (1 + entry.rate / 100);
        days2++;
      }
    });

    let factor3 = 1, days3 = 0;
    rates.forEach(entry => {
      const entryTime = dateToUTC(entry.date);
      if (entryTime >= fromTime && entryTime <= toTime) {
        factor3 *= (1 + entry.rate / 100);
        days3++;
      }
    });

    console.log("Expected BCB: 1.19279766");
    console.log(`Strategy 1 [from, to): ${factor1.toFixed(8)} | Days: ${days1}`);
    console.log(`Strategy 1 trunc: ${factor1trunc.toFixed(8)}`);
    console.log(`Strategy 2 (from, to]: ${factor2.toFixed(8)} | Days: ${days2}`);
    console.log(`Strategy 3 [from, to]: ${factor3.toFixed(8)} | Days: ${days3}`);
  });
}).on('error', err => console.error(err));
