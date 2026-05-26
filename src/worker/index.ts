import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('/*', cors());

// In-memory global ledger state for live prototyping
let globalVolume = 8500;
const TIER_TARGET = 10000;

let ledgerData = [
  { id: 1, asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '10,000', dca: '$0.50', status: 'Settled' },
  { id: 2, asset: 'XRP', type: 'Self-Transfer', venue: 'Coinbase → Robinhood', amount: '5,000', dca: '$0.50 (Locked)', status: 'Non-Taxable Flow' },
  { id: 3, asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '2,500', dca: '$0.51', status: 'Settled' }
];

// GET: Fetch current system state
app.get('/api/analytics', (c) => {
  const feeGap = Math.max(0, TIER_TARGET - globalVolume);
  const currentFee = globalVolume >= TIER_TARGET ? 0.40 : 0.60;

  return c.json({
    success: true,
    metrics: { thirtyDayVolume: globalVolume, feeGap, currentFee, tierTarget: TIER_TARGET },
    ledger: ledgerData
  });
});

// POST: Inject a new transaction into the engine
app.post('/api/transactions', async (c) => {
  const body = await c.req.json();
  const { type, venue, amount, price } = body;

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPrice = parseFloat(price) || 0;

  // 1. Calculate new record entry
  let calculatedDca = `$${parsedPrice.toFixed(2)}`;
  let status = 'Settled';

  if (type === 'Self-Transfer') {
    // TrueBase Integrity Rule: Self-transfers preserve the existing base DCA and are non-taxable
    calculatedDca = '$0.50 (Locked)';
    status = 'Non-Taxable Flow';
  } else {
    // If it's a new purchase venue volume increases
    globalVolume += parsedAmount * parsedPrice;
  }

  const newEntry = {
    id: ledgerData.length + 1,
    asset: 'XRP',
    type,
    venue,
    amount: parsedAmount.toLocaleString(),
    dca: calculatedDca,
    status
  };

  ledgerData.push(newEntry);

  return c.json({ success: true, entry: newEntry });
});

export default app;
