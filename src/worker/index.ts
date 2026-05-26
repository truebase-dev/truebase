import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

let globalVolume = 8500;
const TIER_TARGET = 10000;

// Seeded ledger with strategic historical timestamps relative to 2026
let ledgerData = [
  { id: 1, date: '2025-02-15', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '10,000', price: '$0.50', fee: '$30.00', net: '$5,030.00', status: 'Settled' },
  { id: 2, date: '2025-06-01', asset: 'XRP', type: 'Self-Transfer', venue: 'Coinbase → Robinhood', amount: '5,000', price: '--', fee: '$0.00', net: '--', status: 'Non-Taxable Flow' },
  { id: 3, date: '2026-03-10', asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '2,500', price: '$0.55', fee: '$8.25', net: '$1,383.25', status: 'Settled' }
];

app.get('/api/analytics', (c) => {
  const feeGap = Math.max(0, TIER_TARGET - globalVolume);
  const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;

  let totalSpent = 0;
  let totalTokensAccumulated = 0;
  const rawLots: any[] = [];

  ledgerData.forEach((tx) => {
    if (tx.type === 'Purchase') {
      const amt = parseFloat(tx.amount.replace(/,/g, '')) || 0;
      const prc = parseFloat(tx.price.replace('$', '').replace(/,/g, '')) || 0;
      const fee = parseFloat(tx.fee.replace('$', '').replace(/,/g, '')) || 0;
      
      totalSpent += (amt * prc) + fee;
      totalTokensAccumulated += amt;
      
      rawLots.push({
        date: tx.date,
        amount: amt,
        price: prc,
        fee: fee
      });
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
    lots: rawLots,
    ledger: ledgerData
  });
});

app.post('/api/transactions', async (c) => {
  const body = await c.req.json();
  const { type, venue, amount, price, manualFee, date } = body;

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
  } else {
    finalFee = grossValue * (currentFeeRate / 100);
    netValue = grossValue + finalFee;
    globalVolume += grossValue;
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

app.post('/api/transactions/batch', async (c) => {
  const body = await c.req.json();
  const { records } = body;

  if (!Array.isArray(records)) {
    return c.json({ success: false, error: 'Invalid batch configuration' }, 400);
  }

  records.forEach((rec) => {
    const parsedAmount = parseFloat(rec.amount) || 0;
    const parsedPrice = parseFloat(rec.price) || 0;
    const grossValue = parsedAmount * parsedPrice;
    const currentFeeRate = globalVolume >= TIER_TARGET ? 0.40 : 0.60;
    
    let finalFee = 0;
    let netValue = 0;
    let status = 'Settled';
    const entryDate = rec.date && String(rec.date).trim() !== '' ? rec.date : '2026-05-26';

    if (rec.type === 'Self-Transfer') {
      finalFee = 0;
      status = 'Non-Taxable Flow';
    } else if (rec.type === 'Profit-Taking Exit') {
      status = 'Realized Exit';
      finalFee = rec.manualFee && String(rec.manualFee).trim() !== '' ? parseFloat(rec.manualFee) : grossValue * (currentFeeRate / 100);
      netValue = grossValue - finalFee;
    } else {
      finalFee = grossValue * (currentFeeRate / 100);
      netValue = grossValue + finalFee;
      globalVolume += grossValue;
    }

    ledgerData.push({
      id: ledgerData.length + 1,
      date: entryDate,
      asset: 'XRP',
      type: rec.type,
      venue: rec.venue,
      amount: parsedAmount.toLocaleString(),
      price: parsedPrice > 0 ? `$${parsedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--',
      fee: `$${finalFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      net: rec.type === 'Self-Transfer' ? '--' : `$${netValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      status
    });
  });

  return c.json({ success: true, count: records.length });
});

export default app;
