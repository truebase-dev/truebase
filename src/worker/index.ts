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
  // In production, this uses fetch('https://s1.ripple.com:51234') or Bithomp API
  // Mocking a payload return for a newly detected transaction
  const mockXRPLResponse = [
    { 
      hash: 'A1B2C3...', 
      date: '2026-05-25', 
      asset: 'XRP', // Engine filters out any non-XRP assets here
      amount: 1500, 
      sender: wallets[0], 
      receiver: wallets[1] || 'ExternalWallet',
      marketPriceAtTime: 0.58 // Retrieved from Historical Price API (e.g. CoinGecko)
    }
  ];

  let addedCount = 0;

  mockXRPLResponse.forEach(tx => {
    if (tx.asset !== 'XRP') return; // Strict asset isolation

    // DCA Preservation: Check if sender and receiver are both owned by the user
    const isInternalMove = wallets.includes(tx.sender) && wallets.includes(tx.receiver);
    
    let txType = isInternalMove ? 'Self-Transfer' : 'Purchase'; // Simplified logic
    let status = isInternalMove ? 'Non-Taxable Flow' : 'Settled';
    let priceString = isInternalMove ? '--' : `$${tx.marketPriceAtTime}`;
    let feeString = isInternalMove ? '$0.00' : `$${(tx.amount * tx.marketPriceAtTime * 0.006).toFixed(2)}`;
    let netString = isInternalMove ? '--' : `$${(tx.amount * tx.marketPriceAtTime).toFixed(2)}`;

    if (!isInternalMove) {
      // If it's a real purchase, add to tax lots
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
