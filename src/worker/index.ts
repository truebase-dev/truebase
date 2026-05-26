import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

let globalVolume = 8500;
const TIER_TARGET = 10000;

// Central Registry: Tracks absolute state of every tax lot
let internalLots = [
  { id: 1, date: '2025-02-15', initialAmount: 10000, remainingAmount: 10000, price: 0.50, fee: 30.00 },
  { id: 2, date: '2026-03-10', initialAmount: 2500, remainingAmount: 2500, price: 0.55, fee: 8.25 }
];

let ledgerData = [
  { id: 1, date: '2025-02-15', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '10,000', price: '$0.50', fee: '$30.00', net: '$5,030.00', status: 'Settled' },
  { id: 2, date: '2025-06-01', asset: 'XRP', type: 'Self-Transfer', venue: 'Coinbase → Robinhood', amount: '5,000', price: '--', fee: '$0.00', net: '--', status: 'Non-Taxable Flow' },
  { id: 3, date: '2026-03-10', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '2,500', price: '$0.55', fee: '$8.25', net: '$1,383.25', status: 'Settled' }
];

// Helper: Wash Sale Scanner
function checkWashSale(exitDate: string, exitPrice: number) {
  const exitDateObj = new Date(exitDate);
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  // Flags if a purchase exists within 30 days of the exit date at a higher cost basis (potential loss/wash)
  return internalLots.some(lot => {
    const lotDateObj = new Date(lot.date);
    const diff = Math.abs(exitDateObj.getTime() - lotDateObj.getTime());
    return diff <= THIRTY_DAYS_MS && lot.price > exitPrice;
  });
}

function recalculateLiveMetrics() {
  const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;
  let totalSpentOnRemaining = 0;
  let totalRemainingTokens = 0;

  internalLots.forEach(lot => {
    if (lot.remainingAmount > 0) {
      const ratio = lot.remainingAmount / lot.initialAmount;
      totalSpentOnRemaining += (lot.initialAmount * lot.price + lot.fee) * ratio;
      totalRemainingTokens += lot.remainingAmount;
    }
  });

  return { 
    currentFeeRate, 
    dynamicDCA: totalRemainingTokens > 0 ? (totalSpentOnRemaining / totalRemainingTokens) : 0.51, 
    totalRemainingTokens 
  };
}

app.get('/api/analytics', (c) => {
  const metrics = recalculateLiveMetrics();
  return c.json({
    success: true,
    metrics: {
      thirtyDayVolume: globalVolume,
      currentFee: metrics.currentFeeRate,
      dynamicDCA: metrics.dynamicDCA,
      totalTokensAccumulated: metrics.totalRemainingTokens
    },
    lots: internalLots.filter(l => l.remainingAmount > 0),
    ledger: ledgerData
  });
});

app.post('/api/transactions', async (c) => {
  const body = await c.req.json();
  const { type, venue, amount, price, manualFee, date, method } = body;
  const parsedAmount = parseFloat(amount) || 0;
  const parsedPrice = parseFloat(price) || 0;
  const grossValue = parsedAmount * parsedPrice;
  const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;
  
  let finalFee = manualFee ? parseFloat(manualFee) : grossValue * (currentFeeRate / 100);
  const entryDate = date || '2026-05-26';
  let washSaleDetected = false;

  if (type === 'Profit-Taking Exit') {
    washSaleDetected = checkWashSale(date, parsedPrice);
    
    let remainingToExhaust = parsedAmount;
    let sortedLots = [...internalLots].filter(l => l.remainingAmount > 0);
    
    if (method === 'FIFO') sortedLots.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (method === 'LIFO') sortedLots.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (method === 'HIFO') sortedLots.sort((a,b) => b.price - a.price);

    for (let lot of sortedLots) {
      if (remainingToExhaust <= 0) break;
      const target = internalLots.find(l => l.id === lot.id);
      if (target) {
        const exhaust = Math.min(target.remainingAmount, remainingToExhaust);
        target.remainingAmount -= exhaust;
        remainingToExhaust -= exhaust;
      }
    }
  } else if (type === 'Purchase') {
    globalVolume += grossValue;
    internalLots.push({ id: internalLots.length + 1, date: entryDate, initialAmount: parsedAmount, remainingAmount: parsedAmount, price: parsedPrice, fee: finalFee });
  }

  ledgerData.push({ id: ledgerData.length + 1, date: entryDate, asset: 'XRP', type, venue, amount: parsedAmount.toLocaleString(), price: `$${parsedPrice}`, fee: `$${finalFee.toFixed(2)}`, net: `$${(grossValue - finalFee).toFixed(2)}`, status: 'Settled' });
  return c.json({ success: true, washSaleDetected });
});

export default app;
