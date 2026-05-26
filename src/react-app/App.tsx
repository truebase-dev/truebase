import { useState, useEffect } from 'react';

export default function App() {
  const [isTrueBaseClean, setIsTrueBaseClean] = useState(true);
  const [thirtyDayVolume, setThirtyDayVolume] = useState(8500);
  const [liveDCA, setLiveDCA] = useState(0.51);
  const [totalAccumulated, setTotalAccumulated] = useState(12500);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Input state hooks
  const [txType, setTxType] = useState('Purchase');
  const [venue, setVenue] = useState('Coinbase Advanced');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [manualFee, setManualFee] = useState('');

  // Bulk Intake UI control states
  const [showBulk, setShowBulk] = useState(false);
  const [rawTextLog, setRawTextLog] = useState('');
  const [bulkError, setBulkError] = useState('');

  // Modeling Targets
  const [simulatedTokens, setSimulatedTokens] = useState('10000');
  const [targetPrice1, setTargetPrice1] = useState('8000');
  const [targetPrice2, setTargetPrice2] = useState('16000');
  const [targetPrice3, setTargetPrice3] = useState('21000');

  // Operational Strategy Parameters
  const [estimatedCostBasis, setEstimatedCostBasis] = useState('0.51');
  const [federalTaxRate, setFederalTaxRate] = useState('15');
  const [stateTaxRate, setStateTaxRate] = useState('4.9');
  const [applyHaircut, setApplyHaircut] = useState(true);

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

  const handleInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || (txType !== 'Self-Transfer' && !price)) return;

    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: txType, venue, amount, price, manualFee })
    });

    const result = await response.json();
    if (result.success) {
      setAmount('');
      setPrice('');
      setManualFee('');
      fetchState();
    }
  };

  // Process pasted string row data safely
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    if (!rawTextLog.trim()) return;

    const rows = rawTextLog.trim().split('\n');
    const parsedRecords: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const line = rows[i].trim();
      if (!line) continue;

      // Format template expectation: Type, Venue, Amount, Price, ManualFee
      const segments = line.split(',');
      if (segments.length < 3) {
        setBulkError(`Format discrepancy found at line ${i + 1}. Expected format: Type, Venue, Amount, Price, ManualFee`);
        return;
      }

      const type = segments[0]?.trim();
      const ven = segments[1]?.trim();
      const amt = segments[2]?.trim();
      const prc = segments[3]?.trim() || '0';
      const fee = segments[4]?.trim() || '';

      if (!['Purchase', 'Profit-Taking Exit', 'Self-Transfer'].includes(type)) {
        setBulkError(`Line ${i + 1}: Unknown type "${type}". Use: Purchase, Profit-Taking Exit, or Self-Transfer.`);
        return;
      }

      parsedRecords.push({ type, venue: ven, amount: amt, price: prc, manualFee: fee });
    }

    const res = await fetch('/api/transactions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: parsedRecords })
    });

    const responseJSON = await res.json();
    if (responseJSON.success) {
      setRawTextLog('');
      setShowBulk(false);
      fetchState();
    } else {
      setBulkError('Ingestion failed at backend system gateway.');
    }
  };

  const syncCalculatedDCA = () => {
    setEstimatedCostBasis(liveDCA.toFixed(4));
  };

  const TIER_TARGET = 10000;
  const currentFeeRate = thirtyDayVolume >= TIER_TARGET ? 0.40 : 0.60;
  const feeGap = Math.max(0, TIER_TARGET - thirtyDayVolume);
  const progressPercent = Math.min(100, (thirtyDayVolume / TIER_TARGET) * 100);

  const customMilestones = [
    { label: 'Horizon Target Alpha', currentVal: targetPrice1, setVal: setTargetPrice1 },
    { label: 'Horizon Target Beta', currentVal: targetPrice2, setVal: setTargetPrice2 },
    { label: 'Horizon Target Gamma', currentVal: targetPrice3, setVal: setTargetPrice3 }
  ];

  if (loading) {
    return (
      <div style={{ backgroundColor: '#090d16', color: '#94a3b8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div>Syncing Matrix Architecture Pipeline...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px' }}>
      
      {/* Dynamic Portfolio Status Blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ border: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>30D Volume Tier Progress</span>
            <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{currentFeeRate}%</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
            {feeGap > 0 ? `$${feeGap.toLocaleString()} to drop to 0.40%` : 'Max Optimization Active'}
          </div>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '9999px', height: '6px', overflow: 'hidden' }}>
            <div style={{ backgroundColor: '#3b82f6', width: `${progressPercent}%`, height: '100%' }}></div>
          </div>
        </div>

        <div style={{ border: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Audited Ledger DCA</span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', color: '#38bdf8' }}>
            ${liveDCA.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Derived strictly from settled buy volume</span>
        </div>

        <div style={{ border: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Total Settled Asset Volume</span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', color: '#a78bfa' }}>
            {totalAccumulated.toLocaleString()} <span style={{ fontSize: '14px', color: '#64748b' }}>Tokens</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Excludes unverified network flows</span>
        </div>
      </div>

      {/* Header Deck */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '-0.05em' }}>TRUEBASE</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Dynamic Profit & Fee Mitigation Ledger</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowBulk(!showBulk)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #3b82f6', backgroundColor: showBulk ? '#1e3a8a' : 'transparent', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
            {showBulk ? 'Close Intake Engine' : 'Bulk Data Intake'}
          </button>
        </div>
      </div>

      {/* Conditional Rendering: Bulk Intake Terminal Panel */}
      {showBulk && (
        <div style={{ backgroundColor: '#0b1324', border: '1px solid #3b82f6', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#38bdf8' }}>Log Sheet Batch Intake Processing Engine</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
            Paste comma-separated items below (One record per line). Format: <code style={{ color: '#94a3b8', fontFamily: 'monospace' }}>Type, Venue, Amount, Price, ManualFee</code>
          </p>
          <form onSubmit={handleBulkSubmit}>
            <textarea 
              value={rawTextLog} 
              onChange={(e) => setRawTextLog(e.target.value)} 
              placeholder={"Purchase, Coinbase Advanced, 5000, 0.52\nSelf-Transfer, Coinbase → Robinhood, 2000\nProfit-Taking Exit, Coinbase Advanced, 1000, 8000.00, 48.00"} 
              style={{ width: '100%', height: '140px', backgroundColor: '#090d16', color: '#34d399', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', resize: 'vertical' }}
            />
            {bulkError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '8px 0 0 0' }}>{bulkError}</p>}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Execute Bulk Injection</button>
              <button type="button" onClick={() => setRawTextLog('')} style={{ padding: '10px 16px', backgroundColor: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Clear Board</button>
            </div>
          </form>
        </div>
      )}

      {/* Standard Isolated Transaction Injector */}
      {!showBulk && (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f3f4f6' }}>Execute Isolated Ledger Entry</h3>
          <form onSubmit={handleInject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <select value={txType} onChange={(e) => { setTxType(e.target.value); setVenue(e.target.value === 'Self-Transfer' ? 'Coinbase → Robinhood' : 'Coinbase Advanced'); }} style={{ flex: '1 minmax(180px, 1fr)', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }}>
                <option value="Purchase">Asset Purchase</option>
                <option value="Profit-Taking Exit">Profit-Taking Exit</option>
                <option value="Self-Transfer">Self-Transfer Flow</option>
              </select>
              <input type="number" placeholder="Token Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: '1 minmax(140px, 1fr)', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }} />
              {txType !== 'Self-Transfer' && (
                <input type="number" step="0.0001" placeholder={txType === 'Profit-Taking Exit' ? "Exit Price ($)" : "Purchase Price ($)"} value={price} onChange={(e) => setPrice(e.target.value)} style={{ flex: '1 minmax(140px, 1fr)', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }} />
              )}
            </div>
            {txType === 'Profit-Taking Exit' && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Manual Fee Paid (Leave blank to auto-calculate at {currentFeeRate}%):</label>
                <input type="number" step="0.01" placeholder="Exact fee value paid ($)" value={manualFee} onChange={(e) => setManualFee(e.target.value)} style={{ width: '100%', maxWidth: '300px', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }} />
              </div>
            )}
            <button type="submit" style={{ width: '100%', maxWidth: '200px', padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Inject Entry</button>
          </form>
        </div>
      )}

      {/* Dynamic Target Exit Modeler with Capital Preservation Controls */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#f3f4f6' }}>Dynamic Target Exit & Capital Preservation Deck</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Configure parameters below to review localized liability deductions and absolute take-home positions.</p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', backgroundColor: '#090d16', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '24px' }}>
          <div style={{ flex: '1 minmax(140px, 1fr)' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Position Scale:</label>
            <input type="number" value={simulatedTokens} onChange={(e) => setSimulatedTokens(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: '1 minmax(160px, 1fr)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Cost Basis ($):</label>
              <button onClick={syncCalculatedDCA} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Sync Audited DCA</button>
            </div>
            <input type="number" step="0.0001" value={estimatedCostBasis} onChange={(e) => setEstimatedCostBasis(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: '1 minmax(100px, 1fr)' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Federal Tax (%):</label>
            <input type="number" value={federalTaxRate} onChange={(e) => setFederalTaxRate(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: '1 minmax(100px, 1fr)' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>State Tax (%):</label>
            <input type="number" value={stateTaxRate} onChange={(e) => setStateTaxRate(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '180px', marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f3f4f6', cursor: 'pointer' }}>
              <input type="checkbox" checked={applyHaircut} onChange={(e) => setApplyHaircut(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Apply 10% Profit Haircut
            </label>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {customMilestones.map((milestone, idx) => {
            const tokens = parseFloat(simulatedTokens) || 0;
            const customPrice = parseFloat(milestone.currentVal) || 0;
            const basis = parseFloat(estimatedCostBasis) || 0;
            
            const grossValue = tokens * customPrice;
            const totalCostBasis = tokens * basis;
            const projectedFee = grossValue * (currentFeeRate / 100);
            
            const rawProfit = Math.max(0, grossValue - totalCostBasis - projectedFee);
            const haircutAmount = applyHaircut ? rawProfit * 0.10 : 0;
            const taxableProfit = Math.max(0, rawProfit - haircutAmount);
            
            const fedTaxLiability = taxableProfit * ((parseFloat(federalTaxRate) || 0) / 100);
            const stateTaxLiability = taxableProfit * ((parseFloat(stateTaxRate) || 0) / 100);
            const totalTaxDeduction = fedTaxLiability + stateTaxLiability;

            const netTakeHome = grossValue - projectedFee - haircutAmount - totalTaxDeduction;

            return (
              <div key={idx} style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase' }}>{milestone.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>$</span>
                    <input 
                      type="number" 
                      value={milestone.currentVal} 
                      onChange={(e) => milestone.setVal(e.target.value)} 
                      style={{ width: '90px', padding: '6px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'right' }} 
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Gross Liquidation:</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>${grossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Exchange Fee ({currentFeeRate}%):</span>
                  <span style={{ color: '#f87171', fontFamily: 'monospace' }}>-${projectedFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {applyHaircut && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>10% Strategic Haircut:</span>
                    <span style={{ color: '#f87171', fontFamily: 'monospace' }}>-${haircutAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed #1e293b', paddingBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#64748b' }}>Est. Capital Gains Tax:</span>
                  <span style={{ color: '#f87171', fontFamily: 'monospace' }}>-${totalTaxDeduction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#f3f4f6', fontSize: '14px', fontWeight: 'bold' }}>Net Take-Home:</span>
                  <span style={{ color: '#10b981', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>${netTakeHome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Log Table */}
      <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', backgroundColor: '#0f172a' }}>
                <th style={{ padding: '16px' }}>Asset</th>
                <th style={{ padding: '16px' }}>Context</th>
                <th style={{ padding: '16px' }}>Venue</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Execution Price</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Fee Paid</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Net Realized Value</th>
                <th style={{ padding: '16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0b111e' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{row.asset}</td>
                  <td style={{ padding: '16px' }}>{row.type}</td>
                  <td style={{ padding: '16px', color: '#94a3b8' }}>{row.venue}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace' }}>{row.amount}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace' }}>{row.price}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', color: '#f87171' }}>{row.fee}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', color: row.type === 'Profit-Taking Exit' ? '#34d399' : '#fff' }}>
                    {row.net}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ 
                      backgroundColor: row.type === 'Profit-Taking Exit' ? '#064e3b' : (row.type === 'Self-Transfer' ? '#1e293b' : '#1e3a8a'), 
                      color: row.type === 'Profit-Taking Exit' ? '#34d399' : (row.type === 'Self-Transfer' ? '#94a3b8' : '#60a5fa'), 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' 
                    }}>
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
