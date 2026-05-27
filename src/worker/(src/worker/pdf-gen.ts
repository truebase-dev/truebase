import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function generateFinancialVaultReport(db: any) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Institutional Asset Vault Report', 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  // Summary Section
  doc.setFontSize(12);
  doc.text(`Total Managed Volume: $${db.globalVolume.toLocaleString()}`, 14, 40);

  // Ledger Table
  const tableColumn = ["Date", "Type", "Venue", "Amount", "Net USD"];
  const tableRows = db.ledgerData.map((tx: any) => [
    tx.date,
    tx.type,
    tx.venue,
    tx.amount,
    tx.net
  ]);

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 50,
  });

  return doc.output('arraybuffer');
}
