import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

function fillDocxTemplatePureJs(templatePath: string, outputPath: string, data: any) {
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  
  let xml = zip.files['word/document.xml'].asText();

  function escapeXml(unsafe: string) {
    return (unsafe || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Table 0 placeholders
  xml = xml.replace('&lt;Customer Name&gt;', escapeXml(data.customerName));
  xml = xml.replace('<Customer Name>', escapeXml(data.customerName));
  xml = xml.replace('&lt;Reference&gt;', escapeXml(data.quoteReference));
  xml = xml.replace('<Reference>', escapeXml(data.quoteReference));
  
  const formattedAddress = escapeXml(data.siteAddress);
  xml = xml.replace('&lt;Site Address&gt;', formattedAddress);
  xml = xml.replace('<Site Address>', formattedAddress);

  // Dates
  xml = xml.replace('Quotation issued by:', `Quotation issued by: ${escapeXml(data.issuedBy || 'Prime Energy UK')}`);
  xml = xml.replace('Date issued:', `Date issued: ${escapeXml(data.dateIssued || '')}`);
  xml = xml.replace('Valid until:', `Valid until: ${escapeXml(data.validUntil || '')}`);

  zip.file('word/document.xml', xml);
  const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, buf);
  console.log(`SUCCESS: Created pure JS populated DOCX at ${outputPath}`);
}

const templatePath = path.resolve('server/templates/Heat Pump Quotation.docx');
const outputPath = path.resolve('scratch_pizzip_test.docx');

fillDocxTemplatePureJs(templatePath, outputPath, {
  customerName: 'Pure JS Customer',
  quoteReference: 'PEQ-2026-9660',
  siteAddress: '10 Downing Street, London, SW1A 2AA',
  issuedBy: 'Prime Energy UK',
  dateIssued: '16 September 2026',
  validUntil: '16 October 2026'
});
