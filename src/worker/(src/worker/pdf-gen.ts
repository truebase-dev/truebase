import { HTML } from 'weasyprint';

export async function generateFinancialVaultReport(db: any) {
  const htmlContent = `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 15mm; background-color: #ffffff; }
          body { font-family: sans-serif; color: #333; }
          h1 { color: #0f172a; border-bottom: 2px solid #38bdf8; }
          .summary-card { border: 1px solid #e2e8f0; padding: 10px; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #f8fafc; text-align: left; padding: 8px; border-bottom: 2px solid #cbd5e1; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>Institutional Asset Vault Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <div class="summary-card">
          <p><strong>Total Managed Volume:</strong> $${db.globalVolume.toLocaleString()}</p>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Venue</th><th>Amount</th><th>Net USD</th></tr></thead>
          <tbody>
            ${db.ledgerData.map((tx: any) => `
              <tr>
                <td>${tx.date}</td><td>${tx.type}</td><td>${tx.venue}</td>
                <td>${tx.amount}</td><td>${tx.net}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  return HTML(htmlContent).write_pdf();
}
