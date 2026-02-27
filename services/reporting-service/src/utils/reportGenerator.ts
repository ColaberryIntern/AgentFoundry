import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_DIR = path.resolve(process.cwd(), 'reports');

/**
 * Ensure the reports output directory exists.
 */
function ensureReportsDir(): void {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

/**
 * Generate a PDF compliance report.
 *
 * Creates a simple structured document with the report metadata and
 * writes it to ./reports/{reportId}.pdf
 */
export async function generatePDF(
  reportId: string,
  reportType: string,
  parameters: object | null,
): Promise<string> {
  ensureReportsDir();

  const filePath = path.join(REPORTS_DIR, `${reportId}.pdf`);

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc.fontSize(20).text('Agent Foundry Report', { align: 'center' });
    doc.moveDown();

    // Metadata
    doc.fontSize(12).text(`Report ID: ${reportId}`);
    doc.text(`Report Type: ${reportType}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    // Parameters
    if (parameters && Object.keys(parameters).length > 0) {
      doc.fontSize(14).text('Parameters', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(JSON.stringify(parameters, null, 2));
      doc.moveDown();
    }

    // Placeholder content
    doc.fontSize(14).text('Report Content', { underline: true });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text(
        `This is a generated ${reportType} report. In a production environment this ` +
          'section would contain data aggregated from compliance records, risk assessments, ' +
          'audit trails, or regulatory status depending on the report type.',
      );

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

/**
 * Generate a CSV compliance report.
 *
 * Creates a simple CSV with report metadata and writes it to
 * ./reports/{reportId}.csv
 */
export async function generateCSV(
  reportId: string,
  reportType: string,
  parameters: object | null,
): Promise<string> {
  ensureReportsDir();

  const filePath = path.join(REPORTS_DIR, `${reportId}.csv`);

  const data = [
    {
      reportId,
      reportType,
      generatedAt: new Date().toISOString(),
      parameters: parameters ? JSON.stringify(parameters) : '',
      status: 'generated',
      notes: `Sample ${reportType} report data`,
    },
  ];

  const parser = new Parser({
    fields: ['reportId', 'reportType', 'generatedAt', 'parameters', 'status', 'notes'],
  });

  const csv = parser.parse(data);
  fs.writeFileSync(filePath, csv, 'utf-8');

  return filePath;
}

/**
 * Generate a report file in the requested format.
 * Returns the file path of the generated report.
 */
export async function generateReport(
  reportId: string,
  reportType: string,
  parameters: object | null,
  format: 'pdf' | 'csv',
): Promise<string> {
  if (format === 'csv') {
    return generateCSV(reportId, reportType, parameters);
  }
  return generatePDF(reportId, reportType, parameters);
}
