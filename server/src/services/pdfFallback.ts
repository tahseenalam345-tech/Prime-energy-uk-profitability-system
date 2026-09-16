import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';

export async function generateFallbackPdf(data: any, outputPath: string): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Helper drawing functions
  const primaryColor = rgb(0.06, 0.45, 0.27);
  const darkTextColor = rgb(0.1, 0.15, 0.25);
  const lightBgColor = rgb(0.93, 0.95, 0.98);
  const borderGray = rgb(0.75, 0.8, 0.85);

  // ==========================================
  // PAGE 1: Commercial Summary & Cost Tables
  // ==========================================
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Header Logos & Title
  page1.drawText('PRIME ENERGY UK', { x: 50, y: height - 45, size: 22, font: fontBold, color: primaryColor });
  page1.drawText('RECC / tsi APPROVED CODE', { x: 380, y: height - 40, size: 7, font: fontBold, color: rgb(0.3, 0.3, 0.5) });

  page1.drawText('Heat Pump Quotation', { x: 215, y: height - 70, size: 14, font: fontBold, color: darkTextColor });

  page1.drawText('KNF LINX Limited T/A Prime Energy UK', { x: 340, y: height - 60, size: 8, font: fontBold, color: darkTextColor });
  page1.drawText('Office 27 Lythgoe House, Manchester Road, Bolton BL3 2NZ', { x: 300, y: height - 72, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  page1.drawText('0800 001 6077 | info@primeenergyuk.com', { x: 360, y: height - 84, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

  // Customer / Job Box
  let y = height - 105;
  page1.drawRectangle({ x: 50, y: y - 75, width: 495, height: 75, borderWidth: 1, borderColor: borderGray, color: rgb(0.98, 0.99, 1.0) });
  
  page1.drawText(`Customer Name: ${data.customerName || ''}`, { x: 60, y: y - 20, size: 9.5, font: fontBold });
  page1.drawText(`Project Reference: ${data.quoteReference || ''}`, { x: 310, y: y - 20, size: 9.5, font: fontBold });
  
  page1.drawText('Installation Address:', { x: 60, y: y - 38, size: 9, font: fontBold });
  page1.drawText(String(data.siteAddress || ''), { x: 60, y: y - 50, size: 8.5, font: fontRegular });
  
  page1.drawText(`Quotation issued by: ${data.issuedBy || 'Prime Energy UK'}`, { x: 60, y: y - 68, size: 8, font: fontRegular });
  page1.drawText(`Date issued: ${data.dateIssued || ''}`, { x: 260, y: y - 68, size: 8, font: fontRegular });
  page1.drawText(`Valid until: ${data.validUntil || ''}`, { x: 400, y: y - 68, size: 8, font: fontRegular });

  // Goods Table
  y -= 95;
  page1.drawRectangle({ x: 50, y: y - 20, width: 495, height: 20, color: lightBgColor, borderWidth: 1, borderColor: borderGray });
  page1.drawText('Description of Goods', { x: 60, y: y - 14, size: 9, font: fontBold });
  page1.drawText('Qty.', { x: 340, y: y - 14, size: 9, font: fontBold });
  page1.drawText('Unit Price', { x: 390, y: y - 14, size: 9, font: fontBold });
  page1.drawText('Total Price', { x: 470, y: y - 14, size: 9, font: fontBold });

  y -= 20;
  for (const item of (data.goodsItems || [])) {
    page1.drawRectangle({ x: 50, y: y - 18, width: 495, height: 18, borderWidth: 0.5, borderColor: borderGray });
    page1.drawText(String(item.description || '').substring(0, 52), { x: 60, y: y - 13, size: 8.5, font: fontRegular });
    page1.drawText(String(item.quantity || 1), { x: 348, y: y - 13, size: 8.5, font: fontRegular });
    page1.drawText(`£${(item.unitPriceExVat || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 390, y: y - 13, size: 8.5, font: fontRegular });
    page1.drawText(`£${(item.totalPriceExVat || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: y - 13, size: 8.5, font: fontRegular });
    y -= 18;
  }

  // Goods Total
  page1.drawRectangle({ x: 50, y: y - 20, width: 495, height: 20, borderWidth: 0.5, borderColor: borderGray, color: rgb(0.97, 0.97, 0.97) });
  page1.drawText('Goods Total:', { x: 370, y: y - 14, size: 9.5, font: fontBold });
  page1.drawText(`£${(data.goodsTotal || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: y - 14, size: 9.5, font: fontBold });

  // Services Table
  y -= 30;
  page1.drawRectangle({ x: 50, y: y - 20, width: 495, height: 20, color: lightBgColor, borderWidth: 1, borderColor: borderGray });
  page1.drawText('Description of Services', { x: 60, y: y - 14, size: 9, font: fontBold });
  page1.drawText('Qty.', { x: 340, y: y - 14, size: 9, font: fontBold });
  page1.drawText('Unit Price', { x: 390, y: y - 14, size: 9, font: fontBold });
  page1.drawText('Total Price', { x: 470, y: y - 14, size: 9, font: fontBold });

  y -= 20;
  for (const item of (data.servicesItems || [])) {
    page1.drawRectangle({ x: 50, y: y - 18, width: 495, height: 18, borderWidth: 0.5, borderColor: borderGray });
    page1.drawText(String(item.description || '').substring(0, 52), { x: 60, y: y - 13, size: 8.5, font: fontRegular });
    page1.drawText(String(item.quantity || 1), { x: 348, y: y - 13, size: 8.5, font: fontRegular });
    page1.drawText(`£${(item.unitPriceExVat || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 390, y: y - 13, size: 8.5, font: fontRegular });
    page1.drawText(`£${(item.totalPriceExVat || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: y - 13, size: 8.5, font: fontRegular });
    y -= 18;
  }

  // Services Total
  page1.drawRectangle({ x: 50, y: y - 20, width: 495, height: 20, borderWidth: 0.5, borderColor: borderGray, color: rgb(0.97, 0.97, 0.97) });
  page1.drawText('Services Total:', { x: 370, y: y - 14, size: 9.5, font: fontBold });
  page1.drawText(`£${(data.servicesTotal || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: y - 14, size: 9.5, font: fontBold });

  // Commercial Totals Box
  y -= 30;
  page1.drawRectangle({ x: 50, y: y - 90, width: 495, height: 90, borderWidth: 1, borderColor: borderGray, color: rgb(1, 1, 1) });
  
  page1.drawText('Total Contract Value (exc. VAT):', { x: 60, y: y - 20, size: 9.5, font: fontBold });
  page1.drawText(`£${(data.totalContractValueExVat || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: y - 20, size: 9.5, font: fontBold });

  page1.drawText('VAT:', { x: 60, y: y - 40, size: 9, font: fontRegular });
  page1.drawText('£0.00', { x: 470, y: y - 40, size: 9, font: fontRegular });

  page1.drawText('BUS voucher deduction:', { x: 60, y: y - 60, size: 9.5, font: fontBold, color: rgb(0.02, 0.5, 0.25) });
  const busVal = Number(data.busDeduction || 0);
  const busStr = busVal > 0 ? `-£${busVal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '£0.00';
  page1.drawText(busStr, { x: 470, y: y - 60, size: 9.5, font: fontBold, color: rgb(0.02, 0.5, 0.25) });

  page1.drawText('Customer contribution (inc. VAT):', { x: 60, y: y - 80, size: 10, font: fontBold, color: rgb(0.7, 0.15, 0.1) });
  page1.drawText(`£${(data.customerContributionIncVat || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 470, y: y - 80, size: 10, font: fontBold, color: rgb(0.7, 0.15, 0.1) });

  // Page 1 Footer
  page1.drawText('KNF LINX Limited Registered in England and Wales. Registered Address: Office 27 Lythgoe House, Manchester Road, Bolton, BL3 2NZ. 10799803 VAT Registration No: 322785007', { x: 50, y: 30, size: 6.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  page1.drawText('Rev 1 16/01/2026 | © Easy MCS™ 2026 | F27A Page 1 of 3', { x: 50, y: 18, size: 7, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  // ==========================================
  // PAGE 2: Warranties & BUS Legal Wording
  // ==========================================
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  
  page2.drawText('PRIME ENERGY UK', { x: 50, y: height - 45, size: 22, font: fontBold, color: primaryColor });
  page2.drawText('Heat Pump Quotation', { x: 215, y: height - 70, size: 14, font: fontBold, color: darkTextColor });

  y = height - 100;
  // EPC Disclaimer Box
  page2.drawRectangle({ x: 50, y: y - 50, width: 495, height: 50, borderWidth: 1, borderColor: borderGray, color: rgb(0.97, 0.98, 1.0) });
  page2.drawText('Our intention is to give you a full and clear cost for the installation of the system. Providing nothing unforeseen should occur the only', { x: 55, y: y - 15, size: 7.5, font: fontRegular });
  page2.drawText('additional costs would be those associated with the Energy Performance Certificate (if not included above) and any planning related issues', { x: 55, y: y - 27, size: 7.5, font: fontRegular });
  page2.drawText('should they be required. You are responsible for these costs unless we state otherwise. If there is an existing EPC for your home, please ensure it is up to date.', { x: 55, y: y - 39, size: 7.5, font: fontRegular });

  // Warranties Table
  y -= 75;
  page2.drawRectangle({ x: 50, y: y - 20, width: 495, height: 20, color: lightBgColor, borderWidth: 1, borderColor: borderGray });
  page2.drawText('Guarantees and Warranties', { x: 210, y: y - 14, size: 10, font: fontBold });

  y -= 20;
  const warranties = data.warranties || [
    { item: 'Air Source Heat Pump', brand: data.ashpBrand || 'Grant / Daikin', years: '5 Years' },
    { item: 'Hot Water Cylinder', brand: data.cylinderBrand || 'Joule', years: '25 Years' },
    { item: 'Radiators & Emitters', brand: 'City Plumbing', years: '10 Years' },
    { item: 'Accessories & Controls', brand: 'Diverse', years: '2 Years' },
    { item: 'Installation & Workmanship', brand: 'Prime Energy UK', years: '2 Years' }
  ];

  for (const w of warranties) {
    page2.drawRectangle({ x: 50, y: y - 18, width: 495, height: 18, borderWidth: 0.5, borderColor: borderGray });
    page2.drawText(String(w.item || ''), { x: 60, y: y - 13, size: 8.5, font: fontRegular });
    page2.drawText(String(w.brand || ''), { x: 370, y: y - 13, size: 8.5, font: fontRegular });
    page2.drawText(String(w.years || ''), { x: 470, y: y - 13, size: 8.5, font: fontBold });
    y -= 18;
  }

  y -= 25;
  page2.drawText('Important notes concerning this quotation', { x: 50, y, size: 11, font: fontBold, color: primaryColor });
  
  y -= 20;
  page2.drawText('Boiler Upgrade Scheme (BUS)', { x: 50, y, size: 10, font: fontBold });
  
  y -= 15;
  const busLines = [
    'If you have indicated that you give consent for us to apply for a Boiler Upgrade Scheme voucher on your behalf, we will make',
    'the application as soon as possible. We are required to submit certain information about you and your property to make the',
    'application, and you will be contacted by the scheme administrator to provide consent yourself. This should arrive via email.',
    '',
    'You will have 14 days to give consent, so we ask that said consent is given in a timely manner for us to begin the installation.',
    'If consent is not given within this time, your application may be deemed "dormant" and we would be unable to progress.',
    '',
    'Once a voucher is approved, we have 3 months from the date of the voucher to complete the installation for air source heat pumps,',
    'and 6 months for ground source, to be able to redeem the funds.',
    '',
    'Once the installation is complete, we will submit information to redeem the voucher funds. If Ofgem requires the installation to',
    'be audited, you must provide access to the installation if requested, otherwise funds may be withheld.'
  ];

  for (const line of busLines) {
    page2.drawText(line, { x: 50, y, size: 8, font: fontRegular });
    y -= 12;
  }

  page2.drawText('Rev 1 16/01/2026 | © Easy MCS™ 2026 | F27A Page 2 of 3', { x: 50, y: 18, size: 7, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  // ==========================================
  // PAGE 3: Acceptance & Handover Wording
  // ==========================================
  const page3 = pdfDoc.addPage([595.28, 841.89]);

  page3.drawText('PRIME ENERGY UK', { x: 50, y: height - 45, size: 22, font: fontBold, color: primaryColor });
  page3.drawText('Heat Pump Quotation', { x: 215, y: height - 70, size: 14, font: fontBold, color: darkTextColor });

  y = height - 110;
  page3.drawText('After sales support and maintenance', { x: 50, y, size: 11, font: fontBold, color: primaryColor });
  y -= 18;
  page3.drawText('If, following installation, the system does not appear to be operating correctly please refer to operating instructions.', { x: 50, y, size: 8.5, font: fontRegular });
  y -= 14;
  page3.drawText('We will explain the safe operation of the system and any maintenance requirements to you when we complete handover.', { x: 50, y, size: 8.5, font: fontRegular });

  y -= 35;
  page3.drawText('If you wish to accept the quotation', { x: 50, y, size: 11, font: fontBold, color: primaryColor });
  y -= 18;
  page3.drawText('If you wish to accept the quotation, we will provide you with a Contract of Sale. Please read the Contract carefully.', { x: 50, y, size: 8.5, font: fontRegular });
  y -= 14;
  page3.drawText('If you agree with our terms and conditions, please sign and return to us with a deposit, if requested.', { x: 50, y, size: 8.5, font: fontRegular });

  y -= 35;
  page3.drawText('If you have any questions on any aspect of this quotation, the contract or any other related issue please do not hesitate to contact us.', { x: 50, y, size: 8.5, font: fontRegular });

  page3.drawText('Rev 1 16/01/2026 | © Easy MCS™ 2026 | F27A Page 3 of 3', { x: 50, y: 18, size: 7, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
}
