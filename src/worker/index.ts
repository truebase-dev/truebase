import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

let globalVolume = 8500;
const TIER_TARGET = 10000;

let ledgerData = [
  { id: 1, asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '10,000', price: '$0.50', fee: '$30.00', net: '$5,030.00', status: 'Settled' },
  { id: 2, asset: 'XRP', type: 'Self-Transfer', venue: 'Coinbase → Robinhood', amount: '5,000', price: '--', fee: '$0.00', net: '--', status: 'Non-Taxable Flow' },
  { id: 3, asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '2,500', price: '$0.55', fee: '$8.25', net: '$1,383.25', status: 'Settled' }
];

app.get('/api/analytics', (c) => {
  const feeGap = Math.max(0, TIER_TARGET - globalVolume);
  const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;

  // Compute dynamic volume-weighted DCA from settled purchases only
  let totalSpent = 0;
  let totalTokensAccumulated = 0;

  ledgerData.forEach((tx) => {
    if (tx.type === 'Purchase') {
      const amt = parseFloat(tx.amount.replace(/,/g, '')) || 0;
      const prc = parseFloat(tx.price.replace('$', '').replace(/,/g, '')) || 0;
      const fee = parseFloat(tx.fee.replace('$', '').replace(/,/g, '')) || 0;
      
      totalSpent += (amt * prc) + fee;
      totalTokensAccumulated += amt;
    }
  });

  const dynamicDCA = totalTokensAccumulated > 0 ? (totalSpent / totalTokensAccumulated) : 0.51;

  return c.json({
    success: true,
    metrics: { 
      thirtyDayVolume: globalVolume, 
      feeGap, 
      currentFee: currentFeeRate, 
      tierTarget: TIER_TARGET,
      dynamicDCA,
      totalTokensAccumulated
    },
    ledger: ledgerData
  });
});

app.post('/api/transactions', async (c) => {
  const body = await c.req.json();
  const { type, venue, amount, price, manualFee } = body;

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPrice = parseFloat(price) || 0;
  const grossValue = parsedAmount * parsedPrice;

  const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;
  
  let finalFee = 0;
  let netValue = 0;
  let status = 'Settled';

  if (type === 'Self-Transfer') {
    finalFee = 0;
    status = 'Non-Taxable Flow';
  } else if (type === 'Profit-Taking Exit') {
    status = 'Realized Exit';
    if (manualFee && manualFee.trim() !== '') {
      finalFee = parseFloat(manualFee) || 0;
    } else {
      finalFee = grossValue * (currentFeeRate / 100);
    }
    netValue = grossValue - finalFee;
  } else {
    // Standard Purchase (Fee adds to total cost basis)
    finalFee = grossValue * (currentFeeRate / 100);
    netValue = grossValue + finalFee;
    globalVolume += grossValue;
  }

  const newEntry = {
    id: ledgerData.length + 1,
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
