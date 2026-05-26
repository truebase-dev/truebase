import { useState } from 'react';

// Hardcoded Tier Structure for V1
const BASE_FEE = 0.60; 
const NEXT_TIER_FEE = 0.40;
const TIER_TARGET = 10000;

export default function App() {
  const [isTrueBaseClean, setIsTrueBaseClean] = useState(true);
  const [thirtyDayVolume, setThirtyDayVolume] = useState(8500);

  // Fee optimization calculations
  const feeGap = Math.max(0, TIER_TARGET - thirtyDayVolume);
  const currentFee = thirtyDayVolume >= TIER_TARGET ? NEXT_TIER_FEE : BASE_FEE;
  const progressPercent = Math.min(100, (thirtyDayVolume / TIER_TARGET) * 100);

  // Asset Ledger Audit Trail Data
  const ledgerData = [
    { id: 1, asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '10,000', dca: '$0.50', status: 'Settled' },
    { id: 2, asset: 'XRP', type: 'Self-Transfer', venue: 'Coinbase → Robinhood', amount: '5,000', dca: isTrueBaseClean ? '$0.50 (Locked)' : '$0.58 (Corrupted)', status: 'Non-Taxable Flow' },
    { id: 3, asset: 'XRP', type: 'Purchase', venue: 'Coinbase Advanced', amount: '2,500', dca: isTrueBaseClean ? '$0.51' : '$0.64 (Skewed)', status: 'Settled' }
  ];

  return (
    <div style={{ backgroundColor: '#090d16', color: '#f3f4f6', minHeight: '100vh', fontFamily: 'sans-serif', padding: '24px' }}>
      {/* Upper Volume Tier Progress Bar */}
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
          <div style={{ backgroundColor: '#3b82f6', width: `${progressPercent}%`, height: '100%', transition: 'width 0.3s' }}></div>
        </div>
      </div>

      {/* Title & Engine State Controller */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '-0.05em' }}>TRUEBASE</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Mathematical Ledger Provenance & Separation Engine</p>
        </div>
        
        <div style={{ backgroundColor: '#0f172a', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <button 
            onClick={() => setIsTrueBaseClean(false)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: !isTrueBaseClean ? '#ef4444' : 'transparent', color: '#fff', fontWeight: 'bold' }}
          >
            Legacy View
          </button>
          <button 
            onClick={() => setIsTrueBaseClean(true)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: isTrueBaseClean ? '#10b981' : 'transparent', color: '#fff', fontWeight: 'bold', marginLeft: '4px' }}
          >
            TrueBase Clean
          </button>
        </div>
      </div>

      {/* State Indicators & Volume Simulators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Portfolio Tracking State</span>
          <h2 style={{ fontSize: '24px', margin: '8px 0 0 0', color: isTrueBaseClean ? '#10b981' : '#ef4444' }}>
            {isTrueBaseClean ? 'DCA Integrity Locked' : 'DCA Drift Detected'}
          </h2>
        </div>
        <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Interactive Simulated Volume</span>
          <input 
            type="range" 
            min="0" 
            max="15000" 
            value={thirtyDayVolume} 
            onChange={(e) => setThirtyDayVolume(Number(e.target.value))}
            style={{ width: '100%', marginTop: '16px', cursor: 'pointer' }}
          />
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', textAlign: 'right' }}>${thirtyDayVolume.toLocaleString()} / $10,000</div>
        </div>
      </div>

      {/* Isolated Asset Audit Trail */}
      <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Asset Audit Trail (Isolated Verification)</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b' }}>
                <th style={{ padding: '16px' }}>Asset</th>
                <th style={{ padding: '16px' }}>Transaction Context</th>
                <th style={{ padding: '16px' }}>Venue</th>
                <th style={{ padding: '16px' }}>Calculated Cost Basis (DCA)</th>
                <th style={{ padding: '16px' }}>Protocol Status</th>
              </tr>
            </thead>
            <tbody>
              {ledgerData.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #0f172a', backgroundColor: '#0b111e' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{row.asset}</td>
                  <td style={{ padding: '16px' }}>{row.type}</td>
                  <td style={{ padding: '16px', color: '#94a3b8' }}>{row.venue}</td>
                  <td style={{ padding: '16px', fontFamily: 'monospace', color: isTrueBaseClean ? '#fff' : '#f87171' }}>{row.dca}</td>
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
