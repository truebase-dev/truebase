import { useState, useEffect } from 'react';

export default function App() {
  const [thirtyDayVolume, setThirtyDayVolume] = useState(8500);
  const [liveDCA, setLiveDCA] = useState(0.51);
  const [totalAccumulated, setTotalAccumulated] = useState(12500);
  const [ledger, setLedger] = useState<any[]>([]);
  const [dbLots, setDbLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [txType, setTxType] = useState('Purchase');
  const [venue, setVenue] = useState('Coinbase Advanced');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [manualFee, setManualFee] = useState('');
  const [txDate, setTxDate] = useState('2026-05-26');
  const [taxMethod, setTaxMethod] = useState('FIFO'); 
  const [estimatedCostBasis, setEstimatedCostBasis] = useState('0.51');

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
          setDbLots(data.lots || []);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchState();
  }, []);

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

  // Regulatory Export Engine
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

  if (loading) return <div>Syncing Tax Lot Matrix...</div>;

  return (
    <div style={{ padding: '24px', backgroundColor: '#090d16', color: '#fff', minHeight: '100vh' }}>
      <h1>TRUEBASE</h1>
      <button onClick={generateIRS8949Export} style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#10b981', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        Download IRS 8949 Report
      </button>

      <form onSubmit={handleInject} style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <select value={txType} onChange={(e) => setTxType(e.target.value)}>
          <option value="Purchase">Purchase</option>
          <option value="Profit-Taking Exit">Profit-Taking Exit</option>
        </select>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
        <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" />
        <button type="submit">Inject Entry</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#94a3b8' }}>
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Amount</th><th>Price</th><th>Net</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((row) => (
            <tr key={row.id}>
              <td>{row.date}</td><td>{row.type}</td><td>{row.amount}</td><td>{row.price}</td><td>{row.net}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
