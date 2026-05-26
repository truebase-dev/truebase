import { useState, useEffect } from 'react';

export default function App() {
  const [isTrueBaseClean, setIsTrueBaseClean] = useState(true);
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

  // Bulk Intake UI control states
  const [showBulk, setShowBulk] = useState(false);
  const [rawTextLog, setRawTextLog] = useState('');
  const [bulkError, setBulkError] = useState('');

  // Unlocked Target Simulation States
  const [simulatedTokens, setSimulatedTokens] = useState('10000');
  const [targetPrice1, setTargetPrice1] = useState('8000');
  const [targetPrice2, setTargetPrice2] = useState('16000');
  const [targetPrice3, setTargetPrice3] = useState('21000');

  // Advanced Accounting Configuration Deck
  const [taxMethod, setTaxMethod] = useState('FIFO'); // FIFO, LIFO, HIFO
  const [estimatedCostBasis, setEstimatedCostBasis] = useState('0.51');
  const [fedShortTermRate, setFedShortTermRate] = useState('24'); // Ordinary Bracket Simulation
  const [fedLongTermRate, setFedLongTermRate] = useState('15');  // Discounted Capital Bracket
  const [stateTaxRate, setStateTaxRate] = useState('4.9');       // Local State Component
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
    if (!amount || (txType !== 'Self-Transfer' && !price)) return;

    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: txType, venue, amount, price, manualFee, date: txDate })
    });

    const result = await response.json();
    if (result.success) {
      setAmount('');
      setPrice('');
      setManualFee('');
      fetchState();
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkError('');
    if (!rawTextLog.trim()) return;

    const rows = rawTextLog.trim().split('\n');
    const parsedRecords: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const line = rows[i].trim();
      if (!line) continue;

      // Expectation Template: Type, Venue, Amount, Price, ManualFee, Date
      const segments = line.split(',');
      if (segments.length < 3) {
        setBulkError(`Format discrepancy found at line ${i + 1}. Expected: Type, Venue, Amount, Price, ManualFee, Date`);
        return;
      }

      parsedRecords.push({
        type: segments[0]?.trim(),
        venue: segments[1]?.trim(),
        amount: segments[2]?.trim(),
        price: segments[3]?.trim() || '0',
        manualFee: segments[4]?.trim() || '',
        date: segments[5]?.trim() || '2026-05-26'
      });
    }

    const res = await fetch('/api/transactions/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: parsedRecords })
    });

    if ((await res.json()).success) {
      setRawTextLog('');
      setShowBulk(false);
      fetchState();
    } else {
      setBulkError('Ingestion processing failure.');
    }
  };

  // Localized Real-Time Institutional Tax Lot Allocation Matching 
  const calculateTaxLotAllocation = (tokensToSell: number) => {
    // Deep clone array to prevent mutations
    const lots = dbLots.map(l => ({ ...l, dateObj: new Date(l.date) }));

    if (taxMethod === 'FIFO') {
      lots.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    } else if (taxMethod === 'LIFO') {
      lots.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    } else if (taxMethod === 'HIFO') {
      lots.sort((a, b) => b.price - a.price);
    }

    let remaining = tokensToSell;
    let totalMatchedBasis = 0;
    let shortTermGainsBasis = 0;
    let longTermGainsBasis = 0;
    let shortTermTokensCount = 0;
    let longTermTokensCount = 0;

    const targetCurrentHorizonDate = new Date('2026-05-26');

    for (const lot of lots) {
      if (remaining <= 0) break;
      const taken = Math.min(lot.amount, remaining);
      const allocationRatio = taken / lot.amount;
      const proportionalCostBasis = (lot.amount * lot.price + lot.fee) * allocationRatio;

      totalMatchedBasis += proportionalCostBasis;

      const deltaDays = Math.ceil(Math.abs(targetCurrentHorizonDate.getTime() - lot.dateObj.getTime()) / (1000 * 60 * 60 * 24));
      
      if (deltaDays > 365) {
        longTermTokensCount += taken;
        longTermGainsBasis += proportionalCostBasis;
      } else {
        shortTermTokensCount += taken;
        shortTermGainsBasis += proportionalCostBasis;
      }

      remaining -= taken;
    }

    // Fallback if simulation volume exceeds recorded ledger inputs
    if (remaining > 0) {
      const fallbackBasisValue = remaining * parseFloat(estimatedCostBasis);
      totalMatchedBasis += fallbackBasisValue;
      shortTermGainsBasis += fallbackBasisValue;
      shortTermTokensCount += remaining;
    }

    return {
      totalMatchedBasis,
      shortTermTokensCount,
      longTermTokensCount,
      shortTermGainsBasis,
      longTermGainsBasis
    };
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
      <div style={{ backgroundColor: '#090d16', color: '#94a3b8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Syncing Tax Lot Matrix Architecture Pipelines...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px' }}>
      
      {/* Portfolio Top Bar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ border: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>30D Volume Fee Optimization</span>
            <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{currentFeeRate}%</span>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
            {feeGap > 0 ? `$${feeGap.toLocaleString()} to drop to 0.40%` : 'Maximum Fee Mitigation Active'}
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
          <span style={{ fontSize: '11px', color: '#64748b' }}>Pruned of self-transfers</span>
        </div>

        <div style={{ border: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Total Settled Purchases</span>
          <div style={{ fontSize: '22px', fontWeight: 'bold', fontFamily: 'monospace', color: '#a78bfa' }}>
            {totalAccumulated.toLocaleString()} <span style={{ fontSize: '14px', color: '#64748b' }}>Tokens</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Clean localized position scale</span>
        </div>
      </div>

      {/* Header Deck */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '-0.05em' }}>TRUEBASE</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Tax Lot Accounting & Dynamic Horizon Forecaster</p>
        </div>
        <button onClick={() => setShowBulk(!showBulk)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #3b82f6', backgroundColor: showBulk ? '#1e3a8a' : 'transparent', color: '#fff', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
          {showBulk ? 'Close Intake Engine' : 'Bulk Data Intake'}
        </button>
      </div>

      {/* Bulk Log Box */}
      {showBulk && (
        <div style={{ backgroundColor: '#0b1324', border: '1px solid #3b82f6', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#38bdf8' }}>Batch Processing Intake Terminal</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
            Template layout parameters: <code style={{ color: '#94a3b8' }}>Type, Venue, Amount, Price, ManualFee, Date (YYYY-MM-DD)</code>
          </p>
          <form onSubmit={handleBulkSubmit}>
            <textarea 
              value={rawTextLog} 
              onChange={(e) => setRawTextLog(e.target.value)} 
              placeholder={"Purchase, Coinbase Advanced, 5000, 0.52, , 2025-04-10\nSelf-Transfer, Coinbase → Robinhood, 2000, 0, , 2025-08-12"} 
              style={{ width: '100%', height: '120px', backgroundColor: '#090d16', color: '#34d399', border: '1px solid #1e293b', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '13px' }}
            />
            {bulkError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '8px 0 0 0' }}>{bulkError}</p>}
            <button type="submit" style={{ marginTop: '12px', padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Execute Bulk Injection</button>
          </form>
        </div>
      )}

      {/* Manual Entry */}
      {!showBulk && (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f3f4f6' }}>Execute Isolated Ledger Entry</h3>
          <form onSubmit={handleInject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <select value={txType} onChange={(e) => setTxType(e.target.value)} style={{ flex: '1 minmax(150px, 1fr)', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }}>
                <option value="Purchase">Asset Purchase</option>
                <option value="Profit-Taking Exit">Profit-Taking Exit</option>
                <option value="Self-Transfer">Self-Transfer Flow</option>
              </select>
              <input type="text" placeholder="Date (YYYY-MM-DD)" value={txDate} onChange={(e) => setTxDate(e.target.value)} style={{ flex: '1 minmax(130px, 1fr)', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
              <input type="number" placeholder="Token Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ flex: '1 minmax(120px, 1fr)', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }} />
              {txType !== 'Self-Transfer' && (
                <input type="number" step="0.0001" placeholder="Price ($)" value={price} onChange={(e) => setPrice(e.target.value)} style={{ flex: '1 minmax(120px, 1fr)', padding: '12px', backgroundColor: '#090d16', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px' }} />
              )}
            </div>
            <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start' }}>Inject Entry</button>
          </form>
        </div>
      )}

      {/* Interactive Modeling Configuration Section */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px', marginBottom: '32px' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#f3f4f6' }}>Dynamic Horizon Exit & Real-Time Tax Lot Modeler</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#64748b' }}>Configure your matching method and tax brackets to execute strict calculations across short vs long-term holding buckets.</p>
        
        {/* Expanded Matrix Parameters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', backgroundColor: '#090d16', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>Accounting Options:</label>
            <select value={taxMethod} onChange={(e) => setTaxMethod(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontWeight: 'bold' }}>
              <option value="FIFO">FIFO (First In First Out)</option>
              <option value="LIFO">LIFO (Last In First Out)</option>
              <option value="HIFO">HIFO (Highest Cost First)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Position Scale:</label>
            <input type="number" value={simulatedTokens} onChange={(e) => setSimulatedTokens(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Fed Short-Term Tax (%):</label>
            <input type="number" value={fedShortTermRate} onChange={(e) => setFedShortTermRate(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Fed Long-Term Tax (%):</label>
            <input type="number" value={fedLongTermRate} onChange={(e) => setFedLongTermRate(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>State Tax (%):</label>
            <input type="number" value={stateTaxRate} onChange={(e) => setStateTaxRate(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #1e293b', borderRadius: '6px', fontFamily: 'monospace' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#f3f4f6', cursor: 'pointer' }}>
              <input type="checkbox" checked={applyHaircut} onChange={(e) => setApplyHaircut(e.target.checked)} style={{ width: '16px', height: '16px' }} />
              Apply 10% Haircut
            </label>
          </div>
        </div>

        {/* Forecast Horizon Matrix Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {customMilestones.map((milestone, idx) => {
            const tokens = parseFloat(simulatedTokens) || 0;
            const customPrice = parseFloat(milestone.currentVal) || 0;
            
            // Invoke dynamic lot accounting framework matching
            const lotAllocation = calculateTaxLotAllocation(tokens);
            
            const grossValue = tokens * customPrice;
            const projectedFee = grossValue * (currentFeeRate / 100);
            
            // Total cost allocation derived by selected accounting logic method
            const computedCostBasis = lotAllocation.totalMatchedBasis;
            const rawProfit = Math.max(0, grossValue - computedCostBasis - projectedFee);
            
            // Strategy rule applies exclusively to profit metrics
            const haircutAmount = applyHaircut ? rawProfit * 0.10 : 0;
            const netProfitAfterHaircut = Math.max(0, rawProfit - haircutAmount);

            // Calculate precise gains ratio allocation across Short-Term vs Long-Term pools
            const shortTermRatio = tokens > 0 ? lotAllocation.shortTermTokensCount / tokens : 1;
            const longTermRatio = tokens > 0 ? lotAllocation.longTermTokensCount / tokens : 0;

            const allocatedSTProfit = netProfitAfterHaircut * shortTermRatio;
            const allocatedLTProfit = netProfitAfterHaircut * longTermRatio;

            // Generate tax weights based on separate bracket calculations
            const fedSTLiability = allocatedSTProfit * ((parseFloat(fedShortTermRate) || 0) / 100);
            const fedLTLiability = allocatedLTProfit * ((parseFloat(fedLongTermRate) || 0) / 100);
            const stateLiability = netProfitAfterHaircut * ((parseFloat(stateTaxRate) || 0) / 100);
            
            const totalTaxDeduction = fedSTLiability + fedLTLiability + stateLiability;
            const netTakeHome = grossValue - projectedFee - haircutAmount - totalTaxDeduction;

            return (
              <div key={idx} style={{ backgroundColor: '#090d16', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase' }}>{milestone.label}</span>
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
                  <span style={{ color: '#64748b' }}>Matched Cost Basis ({taxMethod}):</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>${computedCostBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {/* dynamic short term vs long term asset layout allocation mapping */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', paddingLeft: '8px', borderLeft: '2px solid #1e293b' }}>
                  <span style={{ color: '#64748b' }}>Lot Breakdown Split:</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
                    {lotAllocation.longTermTokensCount.toLocaleString()} LT / {lotAllocation.shortTermTokensCount.toLocaleString()} ST
                  </span>
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

                {/* exact cascading tax layer presentation breakdown */}
                <div style={{ margin: '8px 0', padding: '8px', backgroundColor: '#0b1324', borderRadius: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Fed Short-Term Liability:</span>
                    <span style={{ color: '#f87171', fontFamily: 'monospace' }}>-${fedSTLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#64748b' }}>Fed Long-Term Liability:</span>
                    <span style={{ color: '#f87171', fontFamily: 'monospace' }}>-${fedLTLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>State Capital Liability:</span>
                    <span style={{ color: '#f87171', fontFamily: 'monospace' }}>-${stateLiability.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px dashed #1e293b', paddingTop: '10px' }}>
                  <span style={{ color: '#f3f4f6', fontSize: '14px', fontWeight: 'bold' }}>Net Take-Home:</span>
                  <span style={{ color: '#10b981', fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>${netTakeHome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Table Interface Layer */}
      <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', backgroundColor: '#0f172a' }}>
                <th style={{ padding: '16px' }}>Date</th>
                <th style={{ padding: '16px' }}>Asset</th>
                <th style={{ padding: '16px' }}>Context</th>
                <th style={{ padding: '16px' }}>Venue</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Execution Price</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Fee Paid</th>
                <th style={{ padding: '16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0b111e' }}>
                  <td style={{ padding: '16px', fontFamily: 'monospace', color: '#94a3b8' }}>{row.date}</td>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{row.asset}</td>
                  <td style={{ padding: '16px' }}>{row.type}</td>
                  <td style={{ padding: '16px', color: '#94a3b8' }}>{row.venue}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace' }}>{row.amount}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace' }}>{row.price}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', color: '#f87171' }}>{row.fee}</td>
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
