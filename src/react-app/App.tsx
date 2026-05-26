import { useState, useEffect } from 'react';

export default function App() {
  const [isTrueBaseClean, setIsTrueBaseClean] = useState(true);
  const [thirtyDayVolume, setThirtyDayVolume] = useState(8500);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Transaction Input states
  const [txType, setTxType] = useState('Purchase');
  const [venue, setVenue] = useState('Coinbase Advanced');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [manualFee, setManualFee] = useState('');

  // Unlocked Target Simulation States
  const [simulatedTokens, setSimulatedTokens] = useState('10000');
  const [targetPrice1, setTargetPrice1] = useState('8000');
  const [targetPrice2, setTargetPrice2] = useState('16000');
  const [targetPrice3, setTargetPrice3] = useState('21000');

  // NEW: Tax & Haircut Parameters
  const [estimatedCostBasis, setEstimatedCostBasis] = useState('0.50');
  const [federalTaxRate, setFederalTaxRate] = useState('15');
  const [stateTaxRate, setStateTaxRate] = useState('4.9');
  const [applyHaircut, setApplyHaircut] = useState(true);

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
        <div>Syncing Ledger Architecture...</div>
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
              {feeGap > 0 ? `You are $${feeGap.toLocaleString()} away from dropping to a 0.40% maker fee.` : `Maximum Fee Optimization Active: ${currentFeeRate}%`}
            </h3>
          </div>
          <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            Current Rate: {currentFeeRate}%
          </span>
        </div>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#3b82f6', width: `${progressPercent}%`, height: '100%' }}></div>
        </div>
      </div>

      {/* Header Deck */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '-0.05em' }}>TRUEBASE</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Dynamic Profit & Fee Mitigation Ledger</p>
        </div>
        <div style={{ backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <button onClick={() => setIsTrueBaseClean(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: !isTrueBaseClean ? '#ef4444' : 'transparent', color: '#fff', fontWeight: 'bold' }}>Legacy</button>
          <button onClick={() => setIsTrueBaseClean(true)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: isTrueBaseClean ? '#10b981' : 'transparent', color: '#fff', fontWeight: 'bold', marginLeft: '4px' }}>TrueBase Clean</button>
        </div>
      </div>

      {/* Transaction Injector Form Deck */}
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
          <button type="submit" style={{ width: '100%', maxWidth: '200px', padding: '12px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}>Inject Entry</button>
        </form>
      </div>

      {/* Dynamic Target Exit Modeler with Capital Preservation Controls */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#f3f4f6' }}>Dynamic Target Exit & Capital Preservation Deck</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Configure parameters below to review localized liability deductions and absolute take-home positions.</p>
        
        {/* Unified Modeling Inputs Layout */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', backgroundColor: '#090d16', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '24px' }}>
          <div style={{ flex: '1 minmax(140px, 1fr)' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Position Scale:</label>
            <input type="number" value={simulatedTokens} onChange={(e) => setSimulatedTokens(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: '1 minmax(140px, 1fr)' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Est. Cost Basis ($):</label>
            <input type="number" step="0.01" value={estimatedCostBasis} onChange={(e) => setEstimatedCostBasis(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: '1 minmax(110px, 1fr)' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Federal Tax (%):</label>
            <input type="number" value={federalTaxRate} onChange={(e) => setFederalTaxRate(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ flex: '1 minmax(110px, 1fr)' }}>
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
            
            // Calculate raw crypto profit before deductions
            const rawProfit = Math.max(0, grossValue - totalCostBasis - projectedFee);
            
            // Apply 10% haircut rules exclusively to profit calculations if checked
            const haircutAmount = applyHaircut ? rawProfit * 0.10 : 0;
            const taxableProfit = Math.max(0, rawProfit - haircutAmount);
            
            // Tax reconciliations
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
