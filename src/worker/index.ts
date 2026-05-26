import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

let globalVolume = 8500;
const TIER_TARGET = 10000;

// Central Registry
let internalLots = [
  { id: 1, date: '2025-02-15', initialAmount: 10000, remainingAmount: 10000, price: 0.50, fee: 30.00 },
  { id: 2, date: '2026-03-10', initialAmount: 2500, remainingAmount: 2500, price: 0.55, fee: 8.25 }
];

let ledgerData = [
  { id: 1, date: '2025-02-15', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '10,000', price: '$0.50', fee: '$30.00', net: '$5,030.00', status: 'Settled' },
  { id: 2, date: '2025-06-01', asset: 'XRP', type: 'Self-Transfer', venue: 'Coinbase → Robinhood', amount: '5,000', price: '--', fee: '$0.00', net: '--', status: 'Non-Taxable Flow' },
  { id: 3, date: '2026-03-10', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '2,500', price: '$0.55', fee: '$8.25', net: '$1,383.25', status: 'Settled' }
];

function checkWashSale(exitDate: string, exitPrice: number) {
  const exitDateObj = new Date(exitDate);
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return internalLots.some(lot => {
    const lotDateObj = new Date(lot.date);
    const diff = Math.abs(exitDateObj.getTime() - lotDateObj.getTime());
    return diff <= THIRTY_DAYS_MS && lot.price > exitPrice;
  });
}

// LIVE SYNC ENGINE: XRPL Architecture
async function syncBlockchainTransactions(wallets: string[]) {
  const mockXRPLResponse = [
    { 
      hash: 'A1B2C3...', 
      date: '2026-05-25', 
      asset: 'XRP', 
      amount: 1500, 
      sender: wallets[0], 
      receiver: wallets[1] || 'ExternalWallet',
      marketPriceAtTime: 0.58 
    }
  ];

  let addedCount = 0;

  mockXRPLResponse.forEach(tx => {
    if (tx.asset !== 'XRP') return; 

    const isInternalMove = wallets.includes(tx.sender) && wallets.includes(tx.receiver);
    
    let txType = isInternalMove ? 'Self-Transfer' : 'Purchase'; 
    let status = isInternalMove ? 'Non-Taxable Flow' : 'Settled';
    let priceString = isInternalMove ? '--' : `$${tx.marketPriceAtTime}`;
    let feeString = isInternalMove ? '$0.00' : `$${(tx.amount * tx.marketPriceAtTime * 0.006).toFixed(2)}`;
    let netString = isInternalMove ? '--' : `$${(tx.amount * tx.marketPriceAtTime).toFixed(2)}`;

    if (!isInternalMove) {
      internalLots.push({
        id: internalLots.length + 1,
        date: tx.date,
        initialAmount: tx.amount,
        remainingAmount: tx.amount,
        price: tx.marketPriceAtTime,
        fee: tx.amount * tx.marketPriceAtTime * 0.006
      });
      globalVolume += (tx.amount * tx.marketPriceAtTime);
    }

    ledgerData.push({
      id: ledgerData.length + 1,
      date: tx.date,
      asset: tx.asset,
      type: txType,
      venue: isInternalMove ? 'Internal Infrastructure' : 'External Sync',
      amount: tx.amount.toLocaleString(),
      price: priceString,
      fee: feeString,
      net: netString,
      status: status
    });
    addedCount++;
  });

  return addedCount;
}

app.get('/api/analytics', (c) => {
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

  return c.json({
    success: true,
    metrics: { thirtyDayVolume: globalVolume, currentFee: currentFeeRate, dynamicDCA: totalRemainingTokens > 0 ? (totalSpentOnRemaining / totalRemainingTokens) : 0.51, totalTokensAccumulated: totalRemainingTokens },
    lots: internalLots.filter(l => l.remainingAmount > 0),
    ledger: ledgerData
  });
});

app.post('/api/transactions', async (c) => {
  const body = await c.req.json();
  const { type, venue, amount, price, manualFee, date, method, knownWallets } = body;

  if (type === 'Sync-Blockchain') {
    const count = await syncBlockchainTransactions(knownWallets || []);
    return c.json({ success: true, count });
  }

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPrice = parseFloat(price) || 0;
  const grossValue = parsedAmount * parsedPrice;
  const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;
  let finalFee = manualFee ? parseFloat(manualFee) : grossValue * (currentFeeRate / 100);
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
    internalLots.push({ id: internalLots.length + 1, date: date || '2026-05-26', initialAmount: parsedAmount, remainingAmount: parsedAmount, price: parsedPrice, fee: finalFee });
  }

  ledgerData.push({ id: ledgerData.length + 1, date: date || '2026-05-26', asset: 'XRP', type, venue, amount: parsedAmount.toLocaleString(), price: `$${parsedPrice}`, fee: `$${finalFee.toFixed(2)}`, net: `$${(grossValue - finalFee).toFixed(2)}`, status: 'Settled' });
  return c.json({ success: true, washSaleDetected });
});

export default app;
