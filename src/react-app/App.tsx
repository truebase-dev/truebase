import { useState, useEffect } from 'react';

export default function App() {
  const [isTrueBaseClean, setIsTrueBaseClean] = useState(true);
  const [thirtyDayVolume, setThirtyDayVolume] = useState(8500);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [txType, setTxType] = useState('Purchase');
  const [venue, setVenue] = useState('Coinbase Advanced');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  const fetchState = () => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setThirtyDayVolume(data.metrics.thirtyDayVolume);
          setLedger(data.ledger);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !price) return;

    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: txType, venue, amount, price })
    });

    const result = await response.json();
    if (result.success) {
      setAmount('');
      setPrice('');
      fetchState(); // Instantly refresh UI state from server math
    }
  };

  const TIER_TARGET = 10000;
  const BASE_FEE = 0.60;
  const NEXT_TIER_FEE = 0.40;
  const feeGap = Math.max(0, TIER_TARGET - thirtyDayVolume);
  const currentFee = thirtyDayVolume >= TIER_TARGET ? NEXT_TIER_FEE : BASE_FEE;
  const progressPercent = Math.min(100, (thirtyDayVolume / TIER_TARGET) * 100);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#090d16', color: '#94a3b8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div>Syncing Ledger Engine...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px' }}>
      {/* Volume Optimization Banner */}
      <div style={{ border: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Volume Optimization Tier</span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>
              {feeGap > 0 ? `You are $${feeGap.toLocaleString()} away from dropping to a ${NEXT_TIER_FEE}% maker fee.` : `Maximum Fee Optimization Active: ${currentFee}%`}
            </h3>
          </div>
          <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            Current Fee: {currentFee}%
          </span>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#3b82f6', width: `${progressPercent}%`, height: '100%' }}></div>
        </div>
      </div>

      {/* Control Panel Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '-0.05em' }}>TRUEBASE</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Mathematical Ledger Provenance Engine</p>
        </div>
        <div style={{ backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <button onClick={() => setIsTrueBaseClean(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: !isTrueBaseClean ? '#ef4444' : 'transparent', color: '#fff', fontWeight: 'bold' }}>Legacy</button>
          <button onClick={() => setIsTrueBaseClean(true)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: isTrueBaseClean ? '#10b981' : 'transparent', color: '#fff', fontWeight: 'bold', marginLeft: '4px' }}>TrueBase Clean</button>
        </div>
      </div>

      {/* Transaction Injector Form Deck */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f3f4f6' }}>Execute Isolated Ledger Entry</h3>
        <form onSubmit={handleInject} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <select value={txType} onChange={(e) => { setTxType(e.target.value); setVenue(e.target.value === 'Self-Transfer' ? 'Coinbase → Robinhood' : 'Coinbase Advanced'); }} style={{ flex: '1 minmax(150px, 1fr)', padding: '10px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }}>
            <option value="Purchase">Asset Purchase</option>
            <option value="Self-Transfer">Self-Transfer Flow</option>
          </select>
          <input type="number" placeholder="Token Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: '1 minmax(120px, 1fr)', padding: '10px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }} />
          <input type="number" step="0.01" placeholder="Execution Price ($)" value={price} onChange={(e) => setPrice(e.target.value)} style={{ flex: '1 minmax(120px, 1fr)', padding: '10px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }} />
          <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Inject Entry</button>
        </form>
      </div>

      {/* Audit Trail Table */}
      <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', backgroundColor: '#0f172a' }}>
                <th style={{ padding: '16px' }}>Asset</th>
                <th style={{ padding: '16px' }}>Context</th>
                <th style={{ padding: '16px' }}>Venue</th>
                <th style={{ padding: '16px' }}>Cost Basis (DCA)</th>
                <th style={{ padding: '16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0b111e' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{row.asset}</td>
                  <td style={{ padding: '16px' }}>{row.type}</td>
                  <td style={{ padding: '16px', color: '#94a3b8' }}>{row.venue}</td>
                  <td style={{ padding: '16px', fontFamily: 'monospace', color: isTrueBaseClean || row.type !== 'Self-Transfer' ? '#fff' : '#f87171' }}>
                    {isTrueBaseClean ? row.dca : (row.type === 'Self-Transfer' ? '$0.58 (Corrupted)' : row.dca)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ backgroundColor: row.type === 'Self-Transfer' && isTrueBaseClean ? '#064e3b' : '#1e293b', color: row.type === 'Self-Transfer' && isTrueBaseClean ? '#34d399' : '#94a3b8', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
