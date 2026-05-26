import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

let globalVolume = 8500;
const TIER_TARGET = 10000;

// Internal mutable tax lot registry tracking remaining token availability per lot
let internalLots = [
  { id: 1, date: '2025-02-15', initialAmount: 10000, remainingAmount: 10000, price: 0.50, fee: 30.00 },
  { id: 2, date: '2026-03-10', initialAmount: 2500, remainingAmount: 2500, price: 0.55, fee: 8.25 }
];

let ledgerData = [
  { id: 1, date: '2025-02-15', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '10,000', price: '$0.50', fee: '$30.00', net: '$5,030.00', status: 'Settled' },
  { id: 2, date: '2025-06-01', asset: 'XRP', type: 'Self-Transfer', venue: 'Coinbase → Robinhood', amount: '5,000', price: '--', fee: '$0.00', net: '--', status: 'Non-Taxable Flow' },
  { id: 3, date: '2026-03-10', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '2,500', price: '$0.55', fee: '$8.25', net: '$1,383.25', status: 'Settled' }
];

function recalculateLiveMetrics() {
  const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;
  const feeGap = Math.max(0, TIER_TARGET - globalVolume);

  let totalSpentOnRemaining = 0;
  let totalRemainingTokens = 0;

  internalLots.forEach(lot => {
    if (lot.remainingAmount > 0) {
      const ratio = lot.remainingAmount / lot.initialAmount;
      totalSpentOnRemaining += (lot.initialAmount * lot.price + lot.fee) * ratio;
      totalRemainingTokens += lot.remainingAmount;
    }
  });

  const dynamicDCA = totalRemainingTokens > 0 ? (totalSpentOnRemaining / totalRemainingTokens) : 0.51;

  return { feeGap, currentFeeRate, dynamicDCA, totalRemainingTokens };
}

app.get('/api/analytics', (c) => {
  const metrics = recalculateLiveMetrics();
  return c.json({
    success: true,
    metrics: {
      thirtyDayVolume: globalVolume,
      feeGap: metrics.feeGap,
      currentFee: metrics.currentFeeRate,
      tierTarget: TIER_TARGET,
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
  
  let finalFee = 0;
  let netValue = 0;
  let status = 'Settled';
  const entryDate = date && date.trim() !== '' ? date : '2026-05-26';

  if (type === 'Self-Transfer') {
    finalFee = 0;
    status = 'Non-Taxable Flow';
  } else if (type === 'Profit-Taking Exit') {
    status = 'Realized Exit';
    finalFee = manualFee && manualFee.trim() !== '' ? parseFloat(manualFee) : grossValue * (currentFeeRate / 100);
    netValue = grossValue - finalFee;

    // Permanent Lot Exhaustion Logic based on front-end selection method
    let remainingToExhaust = parsedAmount;
    const sortedLots = [...internalLots].filter(l => l.remainingAmount > 0);

    if (method === 'FIFO') {
      sortedLots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (method === 'LIFO') {
      sortedLots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (method === 'HIFO') {
      sortedLots.sort((a, b) => b.price - a.price);
    }

    for (let lot of sortedLots) {
      if (remainingToExhaust <= 0) break;
      const targetLot = internalLots.find(l => l.id === lot.id);
      if (targetLot) {
        const exhaust = Math.min(targetLot.remainingAmount, remainingToExhaust);
        targetLot.remainingAmount -= exhaust;
        remainingToExhaust -= exhaust;
      }
    }
  } else {
    // Standard purchase adds a new tracked tax lot pool permanently
    finalFee = grossValue * (currentFeeRate / 100);
    netValue = grossValue + finalFee;
    globalVolume += grossValue;

    const newLotId = internalLots.length + 1;
    internalLots.push({
      id: newLotId,
      date: entryDate,
      initialAmount: parsedAmount,
      remainingAmount: parsedAmount,
      price: parsedPrice,
      fee: finalFee
    });
  }

  const newEntry = {
    id: ledgerData.length + 1,
    date: entryDate,
    asset: 'XRP',
    type,
    venue,
    amount: parsedAmount.toLocaleString(),
    price: parsedPrice > 0 ? `$${parsedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--',
    fee: `$${finalFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    net: type === 'Self-Transfer' ? '--' : `$${netValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    status
  };

  ledgerData.push(newEntry);
  return c.json({ success: true, entry: newEntry });
});

export default app;
