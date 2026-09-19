const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

const COLORS = {
  primary: '#0052CC',
  text: '#1A2B4A',
  muted: '#8A94A6',
  border: '#D8DEE9',
  softBlue: '#EAF2FF',
  white: '#FFFFFF',
  rowAlt: '#F7F9FC',
  slogan: '#A8B3C5',
  // Figma card styles for BILL TO / CHARGING STATION / SESSION DETAILS
  cardBg: '#F9FBFD',
  cardBorder: '#E2EAF5',
};

const COMPANY = {
  name: 'GO E.C. MERCANTILE PRIVATE LIMITED',
  address: '34/1000, Kathmandu, Central Region, Nepal',
  phone: '+977 976-2117084',
  email: 'info@goec.com.np',
  website: 'www.goecm.com.np',
  tagline: 'DRIVE CLEANER TOMORROW',
};

const SLOGAN_WORDS = ['CLEAN', 'ENERGY', 'GREENER', 'TOMORROW'];

function resolveLogoPath() {
  const root = path.join(__dirname, '../..');
  const candidates = [
    path.join(root, 'assets', 'goec-logo.png'),
    path.join(root, 'assets', 'goec-logo.jpg'),
    path.join(root, 'goec-logo.png'),
    path.join(root, 'goec-logo.jpg'),
    path.join(root, 'goec-logo.jpeg'),
  ];
  return candidates.find((filePath) => fs.existsSync(filePath)) || null;
}

function resolveIconPath(name) {
  const filePath = path.join(__dirname, '../..', 'assets', name);
  return fs.existsSync(filePath) ? filePath : null;
}

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return `NPR ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function safeText(value, fallback = '-') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function drawText(doc, str, x, y, options = {}) {
  const prevX = doc.x;
  const prevY = doc.y;
  doc.text(String(str), x, y, { ...options, lineBreak: false });
  doc.x = prevX;
  doc.y = prevY;
}

function drawVerticalSlogan(doc, x, startY, options = {}) {
  const fontSize = options.fontSize || 7;
  const lineHeight = options.lineHeight || 10;
  const align = options.align || 'left';
  const width = options.width || 52;
  doc.fillColor(options.color || COLORS.slogan).font('Helvetica-Bold').fontSize(fontSize);
  SLOGAN_WORDS.forEach((word, index) => {
    drawText(doc, word, x, startY + index * lineHeight, { width, align });
  });
}

function drawLabelValue(doc, label, value, x, y, valueMaxWidth) {
  const text = safeText(value);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8);
  const labelText = `${label} : `;
  const labelWidth = doc.widthOfString(labelText);
  drawText(doc, labelText, x, y);

  const valueWidth = Math.max(24, valueMaxWidth - labelWidth);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8);
  const valueHeight = doc.heightOfString(text, { width: valueWidth, lineGap: 1.5 });

  // Allow wrapping for long values (address, etc.) without advancing PDFKit flow
  const prevX = doc.x;
  const prevY = doc.y;
  doc.text(text, x + labelWidth, y, {
    width: valueWidth,
    lineGap: 1.5,
    lineBreak: true,
  });
  doc.x = prevX;
  doc.y = prevY;

  return Math.max(11, valueHeight);
}

function measureLabelValueHeight(doc, label, value, valueMaxWidth) {
  const text = safeText(value);
  doc.font('Helvetica').fontSize(8);
  const labelWidth = doc.widthOfString(`${label} : `);
  const valueWidth = Math.max(24, valueMaxWidth - labelWidth);
  doc.font('Helvetica-Bold').fontSize(8);
  return Math.max(11, doc.heightOfString(text, { width: valueWidth, lineGap: 1.5 }));
}

function measureInfoBoxHeight(doc, width, fields) {
  const contentWidth = width - 28;
  let height = 32; // title area
  fields.forEach(([label, value]) => {
    height += measureLabelValueHeight(doc, label, value, contentWidth) + 4;
  });
  return height + 10; // bottom padding
}

function drawFooterIcon(doc, type, x, y) {
  const iconMap = {
    phone: 'icon-phone.png',
    email: 'icon-email.png',
    web: 'icon-web.png',
  };
  const iconPath = resolveIconPath(iconMap[type]);
  const size = 12;

  if (iconPath) {
    try {
      doc.image(iconPath, x, y, { width: size, height: size, fit: [size, size] });
      return;
    } catch (err) {
      // fall through to drawn icon
    }
  }

  // Fallback shapes if icon files missing
  doc.save().fillColor(COLORS.primary);
  if (type === 'phone') {
    doc.circle(x + 5, y + 5, 5).fill();
  } else if (type === 'email') {
    doc.roundedRect(x, y + 1, size, 7, 1).fill();
  } else {
    doc.circle(x + 5, y + 5, 5).fill();
  }
  doc.restore();
}

exports.generatePdf = (transactionData, callback) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    autoFirstPage: true,
  });

  const myWritableStreamBuffer = new streamBuffers.WritableStreamBuffer({
    initialSize: 100 * 1024,
    incrementAmount: 10 * 1024,
  });

  doc.pipe(myWritableStreamBuffer);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = 40;
  const right = pageWidth - 40;
  const contentWidth = right - left;
  let y = 36;

  const invoiceNo = safeText(transactionData.invoiceNo, `INV-${transactionData.transactionId}`);
  const invoiceDate = moment(transactionData.startTime).format('DD MMM YYYY');

  // ========== HEADER (Figma 2-row layout) ==========
  // Row 1:  [Logo + tagline]     | CLEAN / ENERGY / GREENER / TOMORROW
  // Row 2:  [Company details]      [INVOICE + meta]
  const row1Y = 36;
  const sloganLineHeight = 11;
  const sloganFontSize = 8;
  const sloganBlockHeight = SLOGAN_WORDS.length * sloganLineHeight;
  const sloganTextWidth = 58;
  const sloganPadLeft = 8;
  const dividerX = right - sloganTextWidth - sloganPadLeft;
  const sloganX = dividerX + sloganPadLeft;

  // --- Row 1 LEFT: full brand logo (icon + GO EC + DRIVE CLEANER TOMORROW) ---
  const logoPath = resolveLogoPath();
  const logoWidth = 160;
  const logoHeight = 48;
  if (logoPath) {
    try {
      doc.image(logoPath, left, row1Y, { width: logoWidth, height: logoHeight, fit: [logoWidth, logoHeight] });
    } catch (err) {
      doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(18);
      drawText(doc, 'GO EC', left, row1Y + 8);
      doc.fillColor(COLORS.primary).font('Helvetica').fontSize(7);
      drawText(doc, COMPANY.tagline, left, row1Y + 28);
    }
  } else {
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(18);
    drawText(doc, 'GO EC', left, row1Y + 8);
    doc.fillColor(COLORS.primary).font('Helvetica').fontSize(7);
    drawText(doc, COMPANY.tagline, left, row1Y + 28);
  }

  // --- Row 1 RIGHT: vertical left line + stacked bold slogan ---
  doc.save()
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(dividerX, row1Y)
    .lineTo(dividerX, row1Y + sloganBlockHeight)
    .stroke()
    .restore();

  drawVerticalSlogan(doc, sloganX, row1Y, {
    fontSize: sloganFontSize,
    lineHeight: sloganLineHeight,
    width: sloganTextWidth,
    align: 'left',
    color: COLORS.slogan,
  });

  // --- Row 2: company (left) + invoice details (right) ---
  const row2Y = Math.max(row1Y + logoHeight + 14, row1Y + sloganBlockHeight + 14);

  // Row 2 LEFT: company details
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11);
  drawText(doc, COMPANY.name, left, row2Y);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8);
  drawText(doc, COMPANY.address, left, row2Y + 15);
  drawText(doc, `${COMPANY.phone}  |  ${COMPANY.email}`, left, row2Y + 28);
  doc.fillColor(COLORS.primary).font('Helvetica').fontSize(8);
  drawText(doc, COMPANY.website, left, row2Y + 41);

  // Row 2 RIGHT: INVOICE block (aligned under slogan column)
  const metaRight = right;
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(26);
  drawText(doc, 'INVOICE', metaRight - 150, row2Y, { width: 150, align: 'right' });

  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(9);
  drawText(doc, 'EV CHARGING SESSION', metaRight - 160, row2Y + 28, {
    width: 160,
    align: 'right',
  });

  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9);
  const m1Label = 'Invoice No. : ';
  const m1LabelW = doc.widthOfString(m1Label);
  const m1ValueW = doc.font('Helvetica-Bold').widthOfString(invoiceNo);
  const m1Start = metaRight - (m1LabelW + m1ValueW);
  doc.font('Helvetica');
  drawText(doc, m1Label, m1Start, row2Y + 48);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9);
  drawText(doc, invoiceNo, m1Start + m1LabelW, row2Y + 48);

  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9);
  const m2Label = 'Invoice Date : ';
  const m2LabelW = doc.widthOfString(m2Label);
  const m2ValueW = doc.font('Helvetica-Bold').widthOfString(invoiceDate);
  const m2Start = metaRight - (m2LabelW + m2ValueW);
  doc.font('Helvetica');
  drawText(doc, m2Label, m2Start, row2Y + 62);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9);
  drawText(doc, invoiceDate, m2Start + m2LabelW, row2Y + 62);

  // ========== BILL TO + STATION ==========
  y = row2Y + 85;
  const boxGap = 14;
  const boxWidth = (contentWidth - boxGap) / 2;

  const billToFields = [
    ['Name', safeText(transactionData.user?.name)],
    ['Email', safeText(transactionData.user?.email)],
    ['Phone', transactionData.user?.mobile ? `+977 ${transactionData.user.mobile}` : '-'],
    ['Address', safeText(transactionData.user?.address)],
  ];
  const stationFields = [
    ['Station Name', safeText(transactionData.chargingStation?.name)],
    ['Address', safeText(transactionData.chargingStation?.address)],
    ['CP ID', safeText(transactionData.chargingStation?.evMachineName)],
    ['Connector Type', safeText(transactionData.chargingStation?.connectorType)],
  ];

  const boxHeight = Math.max(
    measureInfoBoxHeight(doc, boxWidth, billToFields),
    measureInfoBoxHeight(doc, boxWidth, stationFields),
    102
  );

  drawInfoBox(doc, left, y, boxWidth, boxHeight, 'BILL TO', billToFields);
  drawInfoBox(doc, left + boxWidth + boxGap, y, boxWidth, boxHeight, 'CHARGING STATION', stationFields);

  // ========== SESSION DETAILS ==========
  y += boxHeight + 14;
  const sessionHeight = 64;
  doc.save()
    .roundedRect(left, y, contentWidth, sessionHeight, 4)
    .fillAndStroke(COLORS.cardBg, COLORS.cardBorder)
    .restore();

  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10);
  drawText(doc, 'SESSION DETAILS', left + 14, y + 10);

  const sessionCols = [
    ['SESSION ID', safeText(transactionData.sessionId, String(transactionData.transactionId))],
    ['DATE', invoiceDate],
    ['START TIME', moment(transactionData.startTime).format('hh:mm A')],
    ['END TIME', transactionData.endTime ? moment(transactionData.endTime).format('hh:mm A') : '-'],
    ['DURATION', safeText(transactionData.durationLabel, transactionData.duration)],
    ['ENERGY CHARGED', safeText(transactionData.energyConsumed)],
  ];

  const colWidth = (contentWidth - 28) / sessionCols.length;
  sessionCols.forEach((col, index) => {
    const x = left + 14 + index * colWidth;
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(6.5);
    drawText(doc, col[0], x, y + 30, { width: colWidth - 6 });
    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8);
    drawText(doc, col[1], x, y + 43, { width: colWidth - 6 });
  });

  // ========== TABLE ==========
  y += sessionHeight + 16;
  const energyValue = Number(transactionData.energyValue) || 0;
  const tariff = Number(transactionData.tariff) || 0;
  const energyCharge = energyValue * tariff;
  const subtotal = Number(transactionData.subtotal) || 0;
  const taxAmount = Number(transactionData.taxAmount) || 0;
  const taxPercent = Number(transactionData.taxPercent) || 0;
  const totalAmount = Number(transactionData.totalAmount) || 0;
  const serviceAmount = Number(transactionData.serviceAmount) || 0;
  const energyAmount = energyCharge > 0 ? energyCharge : subtotal;

  const tableTop = y;
  const rowHeight = 28;
  const colWidths = [42, 170, 95, 110, contentWidth - 42 - 170 - 95 - 110];
  const headers = ['No.', 'Description', 'Unit', 'Rate (NPR)', 'Amount (NPR)'];
  const rows = [
    ['1', 'Energy Charge', `${energyValue.toFixed(2)} kWh`, formatCurrency(tariff), formatCurrency(energyAmount)],
    ['2', `Tax (${taxPercent}%)`, '-', '-', formatCurrency(taxAmount)],
  ];
  if (serviceAmount > 0) {
    rows.push(['3', 'Service Fee', '1', formatCurrency(serviceAmount), formatCurrency(serviceAmount)]);
  }

  // Rounded header look via rect
  doc.save().fillColor(COLORS.primary).rect(left, tableTop, contentWidth, rowHeight).fill().restore();

  let xPos = left;
  headers.forEach((header, i) => {
    doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
    drawText(doc, header, xPos + 8, tableTop + 9, {
      width: colWidths[i] - 16,
      align: i === 0 ? 'center' : i >= 3 ? 'right' : 'left',
    });
    xPos += colWidths[i];
  });

  y = tableTop + rowHeight;
  rows.forEach((row, rowIndex) => {
    const bg = rowIndex % 2 === 1 ? COLORS.rowAlt : COLORS.white;
    doc.save().fillColor(bg).rect(left, y, contentWidth, rowHeight).fill().restore();
    doc.save()
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .moveTo(left, y + rowHeight)
      .lineTo(right, y + rowHeight)
      .stroke()
      .restore();

    xPos = left;
    row.forEach((cell, i) => {
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
      drawText(doc, cell, xPos + 8, y + 9, {
        width: colWidths[i] - 16,
        align: i === 0 ? 'center' : i >= 3 ? 'right' : 'left',
      });
      xPos += colWidths[i];
    });
    y += rowHeight;
  });

  // Side border for table body
  doc.save()
    .strokeColor(COLORS.border)
    .lineWidth(0.5)
    .rect(left, tableTop, contentWidth, rowHeight * (rows.length + 1))
    .stroke()
    .restore();

  // Total bar (table already shows Energy / Tax / Service Fee — no Subtotal/Tax summary)
  y += 16;
  doc.save().fillColor(COLORS.primary).roundedRect(left, y, contentWidth, 38, 6).fill().restore();
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(12);
  drawText(doc, 'Total Amount', left + 16, y + 12);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(14);
  drawText(doc, formatCurrency(totalAmount), right - 160, y + 11, { width: 144, align: 'right' });

  // Thank you
  y += 50;
  doc.save().fillColor(COLORS.softBlue).roundedRect(left, y, contentWidth, 44, 8).fill().restore();
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10);
  drawText(doc, 'Thank you for choosing GOECM!', left + 14, y + 11);
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8);
  drawText(doc, 'Together for a cleaner and greener tomorrow.', left + 14, y + 26);

  // ========== FOOTER (pinned to page bottom — no trailing white space) ==========
  const footerBlockHeight = 54;
  const footerY = pageHeight - 36 - footerBlockHeight;
  const footerSloganX = right - 46;
  const footerDividerX = right - 56;

  // Full-width underline — covers contact row AND slogan (Figma)
  doc.save()
    .strokeColor(COLORS.border)
    .lineWidth(0.7)
    .moveTo(left, footerY)
    .lineTo(right, footerY)
    .stroke()
    .restore();

  doc.save()
    .strokeColor(COLORS.border)
    .lineWidth(0.7)
    .moveTo(footerDividerX, footerY + 6)
    .lineTo(footerDividerX, footerY + 48)
    .stroke()
    .restore();

  const footerItems = [
    { icon: 'phone', title: COMPANY.phone, subtitle: 'Customer Support' },
    { icon: 'email', title: COMPANY.email, subtitle: "We're here to help" },
    { icon: 'web', title: COMPANY.website, subtitle: 'Visit our website' },
  ];
  const footerContentWidth = footerDividerX - left - 16;
  const footerWidth = footerContentWidth / 3;

  footerItems.forEach((item, index) => {
    const fx = left + index * footerWidth;
    drawFooterIcon(doc, item.icon, fx, footerY + 12);
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(8);
    drawText(doc, item.title, fx + 16, footerY + 12);
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7);
    drawText(doc, item.subtitle, fx + 16, footerY + 24);
  });

  drawVerticalSlogan(doc, footerSloganX, footerY + 8, {
    fontSize: 7,
    lineHeight: 10,
    width: 48,
    align: 'left',
    color: COLORS.slogan,
  });

  doc.end();

  doc.on('end', () => {
    const buffer = myWritableStreamBuffer.getContents();
    callback(null, buffer.toString('base64'));
  });

  doc.on('error', (err) => {
    callback(err, null);
  });
};

function drawInfoBox(doc, x, y, width, height, title, fields) {
  doc.save()
    .roundedRect(x, y, width, height, 4)
    .fillAndStroke(COLORS.cardBg, COLORS.cardBorder)
    .restore();

  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10);
  drawText(doc, title, x + 14, y + 12);

  let fieldY = y + 32;
  const contentWidth = width - 28;
  fields.forEach(([label, value]) => {
    const usedHeight = drawLabelValue(doc, label, value, x + 14, fieldY, contentWidth);
    fieldY += usedHeight + 4;
  });
}
