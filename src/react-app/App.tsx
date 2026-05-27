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

    const csvContent = [headers.
