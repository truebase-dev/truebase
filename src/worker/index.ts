import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { generateFinancialVaultReport } from './pdf-gen';

const app = new Hono();
app.use('/*', cors());

const DB_PATH = resolve('./vault-ledger.json');
const TIER_TARGET = 10000;

function initDB() {
  if (!existsSync(DB_PATH)) {
    const defaultData = { globalVolume: 8500, internalLots: [], ledgerData: [] };
    writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function loadDB() {
  initDB();
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
}

function saveDB(data: any) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function checkWashSale(exitDate: string, exitPrice: number, internalLots: any[]) {
  const exitDateObj = new Date(exitDate);
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return internalLots.some((lot: any) => {
    const lotDateObj = new Date(lot.date);
    const diff = Math.abs(exitDateObj.getTime() - lotDateObj.getTime());
    return diff <= THIRTY_DAYS_MS && lot.price > exitPrice;
  });
}

async function syncBlockchainTransactions(wallets: string[], db: any) {
  let addedCount = 0;
  for (const wallet of wallets) {
    if (!wallet) continue;
    try {
      const xrplResponse = await fetch('https://s1.ripple.com:51234/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'account_tx', params: [{ account: wallet, limit: 20 }] })
      });
      const xrplData = await xrplResponse.json();
      const transactions = xrplData.result?.transactions || [];

      for (const txData of transactions) {
        const tx = txData.tx;
        if (tx.TransactionType !== 'Payment' || typeof tx.Amount !== 'string') continue;
        
        const txHash = tx.hash;
        if (db.ledgerData.some((entry: any) => entry.hash === txHash)) continue;

        const dateObj = new Date((tx.date + 946684800) * 1000);
        const dateStr = dateObj.toISOString().split('T')[0]; 
        const cgDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;
        const amountXrp = parseInt(tx.Amount) / 1000000;
        const isInternalMove = wallets.includes(tx.Account) && wallets.includes(tx.Destination);
        
        let marketPriceAtTime = 0;
        if (!isInternalMove) {
          try {
            const cgResponse = await fetch(`https://api.coingecko.com/api/v3/coins/ripple/history?date=${cgDate}`);
            const cgData = await cgResponse.json();
            marketPriceAtTime = cgData.market_data?.current_price?.usd || 0.55; 
          } catch (e) {
            marketPriceAtTime = 0.55; 
          }
        }

        let txType = isInternalMove ? 'Self-Transfer' : 'Purchase'; 
        let status = isInternalMove ? 'Non-Taxable Flow' : 'Settled';
        let priceString = isInternalMove ? '--' : `$${marketPriceAtTime.toFixed(4)}`;
        let feeString = isInternalMove ? '$0.00' : `$${(amountXrp * marketPriceAtTime * 0.006).toFixed(2)}`;
        let netString = isInternalMove ? '--' : `$${(amountXrp * marketPriceAtTime).toFixed(2)}`;

        if (!isInternalMove && marketPriceAtTime > 0) {
          db.internalLots.push({ id: db.internalLots.length + 1, date: dateStr, initialAmount: amountXrp, remainingAmount: amountXrp, price: marketPriceAtTime, fee: amountXrp * marketPriceAtTime * 0.006 });
          db.globalVolume += (amountXrp * marketPriceAtTime);
        }

        db.ledgerData.push({ id: db.ledgerData.length + 1, hash: txHash, date: dateStr, asset: 'XRP', type: txType, venue: isInternalMove ? 'Internal Infrastructure' : 'XRPL Network Sync', amount: amountXrp.toLocaleString(), price: priceString, fee: feeString, net: netString, status: status });
        addedCount++;
      }
    } catch (error) {
      console.error(`Error syncing wallet infrastructure.`, error);
    }
  }
  return addedCount;
}

// NEW ROUTE: PDF GENERATOR
app.get('/api/report', async (c) => {
  const db = loadDB();
  const pdfBuffer = generateFinancialVaultReport(db);
  return new Response(pdfBuffer, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Vault_Report.pdf"' }
  });
});

app.get('/api/analytics', (c) => {
  const db = loadDB();
  const currentFeeRate = db.globalVolume >= TIER_TARGET ? 0.40 : 0.60;
  let totalSpentOnRemaining = 0;
  let totalRemainingTokens = 0;

  db.internalLots.forEach((lot: any) => {
    if (lot.remainingAmount > 0) {
      const ratio = lot.remainingAmount / lot.initialAmount;
      totalSpentOnRemaining += (lot.initialAmount * lot.price + lot.fee) * ratio;
      totalRemainingTokens += lot.remainingAmount;
    }
  });

  return c.json({
    success: true,
    metrics: { thirtyDayVolume: db.globalVolume, currentFee: currentFeeRate, dynamicDCA: totalRemainingTokens > 0 ? (totalSpentOnRemaining / totalRemainingTokens) : 0.51, totalTokensAccumulated: totalRemainingTokens },
    lots: db.internalLots.filter((l: any) => l.remainingAmount > 0),
    ledger: db.ledgerData
  });
});

app.post('/api/transactions', async (c) => {
  const db = loadDB();
  const body = await c.req.json();
  const { type, venue, amount, price, manualFee, date, method, knownWallets } = body;

  if (type === 'Sync-Blockchain') {
    const count = await syncBlockchainTransactions(knownWallets || [], db);
    saveDB(db);
    return c.json({ success: true, count });
  }

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPrice = parseFloat(price) || 0;
  const grossValue = parsedAmount * parsedPrice;
  const currentFeeRate = db.globalVolume >= TIER_TARGET ? 0.40 : 0.60;
  let finalFee = manualFee ? parseFloat(manualFee) : grossValue * (currentFeeRate / 100);
  let washSaleDetected = false;

  if (type === 'Profit-Taking Exit') {
    washSaleDetected = checkWashSale(date, parsedPrice, db.internalLots);
    let remainingToExhaust = parsedAmount;
    let sortedLots = [...db.internalLots].filter(l => l.remainingAmount > 0);
    if (method === 'FIFO') sortedLots.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (method === 'LIFO') sortedLots.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (method === 'HIFO') sortedLots.sort((a,b) => b.price - a.price);

    for (let lot of sortedLots) {
      if (remainingToExhaust <= 0) break;
      const target = db.internalLots.find((l: any) => l.id === lot.id);
      if (target) {
        const exhaust = Math.min(target.remainingAmount, remainingToExhaust);
        target.remainingAmount -= exhaust;
        remainingToExhaust -= exhaust;
      }
    }
  } else if (type === 'Purchase') {
    db.globalVolume += grossValue;
    db.internalLots.push({ id: db.internalLots.length + 1, date: date || '2026-05-26', initialAmount: parsedAmount, remainingAmount: parsedAmount, price: parsedPrice, fee: finalFee });
  }

  db.ledgerData.push({ id: db.ledgerData.length + 1, hash: `MANUAL-${Date.now()}`, date: date || '2026-05-26', asset: 'XRP', type, venue, amount: parsedAmount.toLocaleString(), price: `$${parsedPrice}`, fee: `$${finalFee.toFixed(2)}`, net: `$${(grossValue - finalFee).toFixed(2)}`, status: 'Settled' });
  
  saveDB(db);
  return c.json({ success: true, washSaleDetected });
});

export default app;
