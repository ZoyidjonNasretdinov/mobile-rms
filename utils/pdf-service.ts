import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Translations } from "@/constants/translations";

export class PDFService {
  static async generateEodPDF(report: any) {
    const t = Translations.uz.eodReport;
    const common = Translations.uz.common;

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; color: #2D3142; margin-bottom: 5px; }
            .date { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; }
            .section { margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .section-title { font-size: 18px; font-weight: bold; color: #10B981; margin-bottom: 10px; text-transform: uppercase; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .label { color: #666; }
            .value { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background-color: #f9f9f9; padding: 10px; border-bottom: 2px solid #eee; font-size: 12px; color: #666; }
            td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
            .total-row { background-color: #f0fff4; font-weight: bold; }
            .expense-val { color: #EF4444; }
            .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${t.title}</h1>
          <div class="date">
            Smena: ${new Date(report.shift.startTime).toLocaleString()} - ${
              report.shift.endTime
                ? new Date(report.shift.endTime).toLocaleString()
                : "Hozirgi vaqt"
            }
          </div>

          <div class="section">
            <div class="section-title">Moliyaviy Xulosa</div>
            <div class="row">
              <span class="label">Jami Savdo:</span>
              <span class="value">${report.stats.totalSales.toLocaleString()} ${common.currency}</span>
            </div>
            <div class="row">
              <span class="label">Naqd Savdo:</span>
              <span class="value">${report.stats.cashSales.toLocaleString()} ${common.currency}</span>
            </div>
            <div class="row">
              <span class="label">Terminal Savdo:</span>
              <span class="value">${report.stats.terminalSales.toLocaleString()} ${common.currency}</span>
            </div>
            <div class="row">
              <span class="label">Jami Xarajatlar:</span>
              <span class="value expense-val">-${report.stats.totalExpenses.toLocaleString()} ${common.currency}</span>
            </div>
            <div class="row">
              <span class="label">Kutilgan Naqd:</span>
              <span class="value">${report.stats.expectedCash.toLocaleString()} ${common.currency}</span>
            </div>
            <div class="row">
              <span class="label">Haqiqiy Naqd:</span>
              <span class="value">${report.stats.actualCash.toLocaleString()} ${common.currency}</span>
            </div>
            <div class="row">
              <span class="label">Farq:</span>
              <span class="value" style="color: ${report.stats.discrepancy < 0 ? "#EF4444" : "#10B981"}">
                ${report.stats.discrepancy.toLocaleString()} ${common.currency}
              </span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Buyurtmalar Ro'yxati</div>
            <table>
              <thead>
                <tr>
                  <th>Stol</th>
                  <th>Vaqt</th>
                  <th>To'lov</th>
                  <th>Summa</th>
                </tr>
              </thead>
              <tbody>
                ${(report.orders || [])
                  .map(
                    (o: any) => `
                  <tr>
                    <td>${o.tableName || "N/A"}</td>
                    <td>${o.updatedAt ? new Date(o.updatedAt).toLocaleTimeString() : ""}</td>
                    <td>${o.paymentMethod === "Cash" ? "Naqd" : "Karta"}</td>
                    <td><b>${(o.totalAmount || 0).toLocaleString()}</b></td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Xarajatlar Tafsiloti</div>
            <table>
              <thead>
                <tr>
                  <th>Nomi</th>
                  <th>Kategoriya</th>
                  <th>Summa</th>
                </tr>
              </thead>
              <tbody>
                ${(report.expenses || [])
                  .map(
                    (e: any) => `
                  <tr>
                    <td>${e.title || "N/A"}</td>
                    <td>${e.category || "N/A"}</td>
                    <td class="expense-val">-${(e.amount || 0).toLocaleString()}</td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="footer">
            RMS Smart Boshqaruv - Avtomatik yaratilgan hisobot
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (error) {
      console.error("PDF generate error:", error);
      throw error;
    }
  }
}
