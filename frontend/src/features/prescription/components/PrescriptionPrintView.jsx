function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatDateTime(value) {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return date.toLocaleString();
}

export function printPrescriptionRecord(prescription) {
    if (!prescription) {
        return;
    }

    const patientName =
        prescription.patientName ||
        `Patient #${prescription.patientId}`;

    const dentistName =
        prescription.dentistName ||
        `Dentist #${prescription.dentistId}`;

    const status = prescription.status || 'UNKNOWN';

    const notes =
        prescription.notes ||
        prescription.clinicalNotes ||
        prescription.diagnosisSummary ||
        'No clinical notes recorded.';

    const items = Array.isArray(prescription.items)
        ? prescription.items
        : [];

    const medicineRows =
        items.length > 0
            ? items
                .map(
                    (item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>
                  <strong>${escapeHtml(item.medicineName || 'N/A')}</strong>
                </td>
                <td>${escapeHtml(item.strength || '—')}</td>
                <td>${escapeHtml(item.dosage || '—')}</td>
                <td>${escapeHtml(item.frequency || '—')}</td>
                <td>${escapeHtml(item.duration || '—')}</td>
                <td>${escapeHtml(item.quantity ?? '—')}</td>
                <td>${escapeHtml(item.instructions || '—')}</td>
              </tr>
            `
                )
                .join('')
            : `
          <tr>
            <td colspan="8" class="empty">
              No medicines recorded.
            </td>
          </tr>
        `;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />

        <title>
          Prescription-${escapeHtml(prescription.id)}
        </title>

        <style>
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          }

          body {
            font-size: 12px;
            line-height: 1.45;
          }

          .document {
            width: 100%;
          }

          .clinic-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            padding-bottom: 14px;
            border-bottom: 3px solid #0f172a;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .logo {
            width: 48px;
            height: 48px;
            border: 2px solid #0f172a;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 17px;
          }

          .clinic-name {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: #0f172a;
          }

          .clinic-subtitle {
            margin: 3px 0 0;
            color: #475569;
            font-size: 11px;
          }

          .record-number {
            text-align: right;
            font-size: 11px;
          }

          .record-number strong {
            display: block;
            font-size: 14px;
            margin-bottom: 3px;
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 16px;
          }

          .info-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
            page-break-inside: avoid;
          }

          .label {
            margin-bottom: 5px;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            letter-spacing: 0.04em;
          }

          .value {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
          }

          .sub-value {
            margin-top: 3px;
            color: #475569;
          }

          .meta-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-top: 12px;
            padding: 11px 12px;
            border: 1px solid #dbe2ea;
            border-radius: 8px;
            background: #f8fafc;
          }

          .meta-title {
            font-weight: 700;
            margin-bottom: 2px;
          }

          .rx-heading {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 20px;
            margin-bottom: 10px;
          }

          .rx-symbol {
            font-family: Georgia, serif;
            font-size: 34px;
            font-weight: 700;
            line-height: 1;
          }

          .rx-heading h2 {
            margin: 0;
            font-size: 16px;
          }

          .rx-heading p {
            margin: 2px 0 0;
            color: #64748b;
            font-size: 10px;
          }

          .notes {
            margin-top: 12px;
            border: 1px solid #dbe2ea;
            border-radius: 8px;
            padding: 12px;
            page-break-inside: avoid;
          }

          .notes p {
            margin: 5px 0 0;
            white-space: pre-wrap;
          }

          table {
            width: 100%;
            margin-top: 8px;
            border-collapse: collapse;
            font-size: 10px;
          }

          th,
          td {
            border: 1px solid #cbd5e1;
            padding: 7px 6px;
            text-align: left;
            vertical-align: top;
          }

          th {
            background: #f1f5f9;
            color: #334155;
            font-size: 9px;
            text-transform: uppercase;
          }

          .empty {
            text-align: center;
            color: #64748b;
            padding: 18px;
          }

          .status-finalized {
            color: #15803d;
            font-weight: 800;
          }

          .status-cancelled {
            color: #b91c1c;
            font-weight: 800;
          }

          .status-draft {
            color: #b45309;
            font-weight: 800;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 30px;
            margin-top: 32px;
            page-break-inside: avoid;
          }

          .verification {
            max-width: 55%;
            color: #64748b;
            font-size: 10px;
          }

          .signature {
            width: 230px;
            text-align: center;
          }

          .signature-line {
            height: 42px;
            border-bottom: 1px solid #111827;
            margin-bottom: 6px;
          }

          .signature-name {
            font-weight: 700;
          }

          .signature-role {
            color: #64748b;
            font-size: 10px;
          }

          .print-footer {
            margin-top: 22px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 9px;
          }
        </style>
      </head>

      <body>
        <main class="document">

          <header class="clinic-header">
            <div class="brand">
              <div class="logo">DC</div>

              <div>
                <h1 class="clinic-name">
                  DentCare Dental Practice
                </h1>

                <p class="clinic-subtitle">
                  Official Clinical Prescription Record
                </p>
              </div>
            </div>

            <div class="record-number">
              <strong>
                Prescription #${escapeHtml(prescription.id)}
              </strong>

              Status:
              <span class="${status === 'FINALIZED'
        ? 'status-finalized'
        : status === 'CANCELLED'
            ? 'status-cancelled'
            : 'status-draft'}">
                ${escapeHtml(status)}
              </span>
            </div>
          </header>

          <section class="info-grid">

            <div class="info-card">
              <div class="label">
                Patient Information
              </div>

              <div class="value">
                ${escapeHtml(patientName)}
              </div>

              <div class="sub-value">
                Patient ID:
                ${escapeHtml(prescription.patientId)}
              </div>
            </div>

            <div class="info-card">
              <div class="label">
                Prescribing Dentist
              </div>

              <div class="value">
                ${escapeHtml(dentistName)}
              </div>

              <div class="sub-value">
                Dentist ID:
                ${escapeHtml(prescription.dentistId)}
              </div>
            </div>

          </section>

          <section class="meta-row">

            <div>
              <div class="meta-title">Created</div>
              ${escapeHtml(
        formatDateTime(prescription.createdAt)
    )}
            </div>

            <div>
              <div class="meta-title">Finalized</div>
              ${escapeHtml(
        formatDateTime(prescription.finalizedAt)
    )}
            </div>

            <div>
              <div class="meta-title">Record Status</div>
              ${escapeHtml(status)}
            </div>

          </section>

          <section class="notes">
            <div class="label">
              Clinical Notes / Diagnosis
            </div>

            <p>
              ${escapeHtml(notes)}
            </p>
          </section>

          <section>
            <div class="rx-heading">
              <div class="rx-symbol">Rx</div>

              <div>
                <h2>Prescription Medicines</h2>

                <p>
                  Medication details are listed below.
                </p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Strength</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Qty</th>
                  <th>Instructions</th>
                </tr>
              </thead>

              <tbody>
                ${medicineRows}
              </tbody>
            </table>
          </section>

          <footer class="footer">

            <div class="verification">
              DentCare Practice Clinic<br />
              System Verified Electronic Clinical Record
            </div>

            <div class="signature">
              <div class="signature-line"></div>

              <div class="signature-name">
                ${escapeHtml(dentistName)}
              </div>

              <div class="signature-role">
                Registered Dental Practitioner
              </div>
            </div>

          </footer>

          <div class="print-footer">
            Prescription #${escapeHtml(prescription.id)}
            • Generated from DentCare Dental Management System
          </div>

        </main>
      </body>
    </html>
  `;

    const printFrame = document.createElement('iframe');

    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';

    document.body.appendChild(printFrame);

    const frameWindow = printFrame.contentWindow;
    const frameDocument = printFrame.contentDocument;

    if (!frameWindow || !frameDocument) {
        printFrame.remove();
        return;
    }

    let hasPrinted = false;

    const startPrint = () => {
        if (hasPrinted) {
            return;
        }

        hasPrinted = true;

        frameWindow.focus();
        frameWindow.print();
    };

    frameWindow.onafterprint = () => {
        window.setTimeout(() => {
            printFrame.remove();
        }, 300);
    };

    printFrame.onload = () => {
        window.setTimeout(startPrint, 150);
    };

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    window.setTimeout(startPrint, 500);
}

export default function PrescriptionPrintView() {
    return null;
}