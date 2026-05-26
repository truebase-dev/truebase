import { useState, useEffect } from 'react';

export default function App() {
  const [thirtyDayVolume, setThirtyDayVolume] = useState(8500);
  const [liveDCA, setLiveDCA] = useState(0.51);
  const [totalAccumulated, setTotalAccumulated] = useState(12500);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync Input State
  const [infrastructureNodes, setInfrastructureNodes] = useState('rMyWalletAddress1, rMyWalletAddress2');

  // Form states
  const [txType, setTxType] = useState('Purchase');
  const [venue, setVenue] = useState('Coinbase Advanced');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [manualFee, setManualFee] = useState('');
  const [txDate, setTxDate] = useState('2026-05-26');
  const [taxMethod, setTaxMethod] = useState('FIFO'); 
  const [estimatedCostBasis, setEstimatedCostBasis] = useState('0.51');

  // Projection State
  const [projectionTranche, setProjectionTranche] = useState(100); 
  const targetTiers = [5000, 8000, 16000, 21000];

  const fetchState = () => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setThirtyDayVolume(data.metrics.thirtyDayVolume);
          setLiveDCA(data.metrics.dynamicDCA);
          setTotalAccumulated(data.metrics.totalTokensAccumulated);
          setEstimatedCostBasis(data.metrics.dynamicDCA.toFixed(4));
          setLedger(data.ledger);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchState();
  }, []);

  const handleSync = async () => {
    const walletArray = infrastructureNodes.split(',').map(w => w.trim());
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Sync-Blockchain', knownWallets: walletArray })
    });
    const result = await res.json();
    alert(`Live Sync Complete. Integrated ${result.count} new verifiable transactions.`);
    fetchState();
  };

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: txType, venue, amount, price, manualFee, date: txDate, method: taxMethod })
    });
    const result = await response.json();
    if (result.washSaleDetected) {
      alert('WARNING: Wash Sale Detected on this Exit Strategy.');
    }
    fetchState();
  };

  const generateIRS8949Export = () => {
    const headers = ["Description", "Date Acquired", "Date Sold", "Proceeds", "Cost Basis", "Gain/Loss"];
    const rows = ledger
      .filter((tx) => tx.type === 'Profit-Taking Exit')
      .map((tx) => [
        `XRP - ${tx.venue}`, "VARIOUS", tx.date, 
        tx.net.replace('$', '').replace(',', ''), estimatedCostBasis, "0.00"
      ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IRS_8949_Export_${new Date().getFullYear()}.csv`;
    a.click();
  };

  if (loading) return <div>Initializing Ledger Infrastructure...</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#090d16', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ letterSpacing: '2px', color: '#f8fafc' }}>TRUEBASE: Master Vault</h1>
      
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#38bdf8' }}>Target Trajectory Command Center</h2>
          <div>
            <label style={{ fontSize: '12px', marginRight: '10px', color: '#94a3b8' }}>XRP Tranche Size to Model:</label>
            <input 
              type="number" 
              value={projectionTranche} 
              onChange={(e) => setProjectionTranche(Number(e.target.value))} 
              style={{ width: '100px', padding: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
          {targetTiers.map(target => {
            const grossProceeds = projectionTranche * target;
            const costBasis = projectionTranche * liveDCA;
            const grossCryptoProfit = grossProceeds - costBasis;
            
            const haircutAmount = grossCryptoProfit > 0 ? (grossCryptoProfit * 0.10) : 0;
            const taxableProfit = grossCryptoProfit - haircutAmount;
            
            const estimatedTax = taxableProfit > 0 ? (taxableProfit * 0.24) : 0; 
            const netProfit = taxableProfit - estimatedTax;

            return (
              <div key={target} style={{ flex: 1, backgroundColor: '#1e293b', padding: '15px', borderRadius: '6px', minWidth: '220px', borderLeft: '4px solid #38bdf8' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#e2e8f0' }}>${target.toLocaleString()}</h3>
                <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Gross Proceeds:</span> <span>${grossProceeds.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Basis (DCA: ${liveDCA.toFixed(2)}):</span> <span>-${costBasis.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>10% Crypto Haircut:</span> <span>-${haircutAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>Est. Tax (Fed+State):</span> <span>-${estimatedTax.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
                  <hr style={{ borderColor: '#334155', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>
                    <span>Net Profit:</span> <span>${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 5px 0' }}>Network Sync Engine</h3>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: 0 }}>Define internal custody addresses to preserve DCA on self-transfers.</p>
        <input 
          value={infrastructureNodes} 
          onChange={(e) => setInfrastructureNodes(e.target.value)} 
          style={{ width: '400px', padding: '8px', marginRight: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} 
        />
        <button onClick={handleSync} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Execute Chain Sync
        </button>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <button onClick={generateIRS8949Export} style={{ padding: '10px 15px', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}>
          Download IRS 8949 Report
        </button>
      </div>

      <form onSubmit={handleInject} style={{ marginBottom: '20px', display: 'flex', gap: '10px', backgroundColor: '#1e293b', padding: '15px', borderRadius: '8px' }}>
        <select value={txType} onChange={(e) => setTxType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }}>
          <option value="Purchase">Purchase</option>
          <option value="Profit-Taking Exit">Profit-Taking Exit</option>
        </select>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' }} />
        <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Inject Manual Entry</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#94a3b8', fontSize: '14px' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #334155' }}>
            <th style={{ padding: '10px 0' }}>Date</th><th>Type</th><th>Venue</th><th>Amount</th><th>Price</th><th>Net</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((row) => (
            <tr key={row.id} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '10px 0', color: '#e2e8f0' }}>{row.date}</td>
              <td style={{ color: row.type === 'Self-Transfer' ? '#64748b' : '#38bdf8' }}>{row.type}</td>
              <td>{row.venue}</td>
              <td style={{ color: '#e2e8f0' }}>{row.amount}</td>
              <td>{row.price}</td>
              <td style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{row.net}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
<button 
  onClick={() => window.open('/api/report', '_blank')} 
  style={{ padding: '10px 15px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
>
  Generate PDF Vault Report
</button>
