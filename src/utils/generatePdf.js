const PDFDocument = require('pdfkit');
const streamBuffers = require('stream-buffers');
const moment = require('moment')
// const fs = require('fs');

exports.generatePdf = (transactionData, callback) => {
    const doc = new PDFDocument();
    // const fileName = 'Invoice.pdf';
    // const stream = fs.createWriteStream(fileName);
    // doc.pipe(stream);

    const myWritableStreamBuffer = new streamBuffers.WritableStreamBuffer({
        initialSize: (100 * 1024), // Start at 100 kilobytes.
        incrementAmount: (10 * 1024) // Grow by 10 kilobytes each time buffer overflows.
    });

    doc.pipe(myWritableStreamBuffer);

    // Logo
    const logoPath = 'goec-logo.jpg'; //! Update this path
    const lineSpacing = 15;
    const largeFontSize = 18;
    const fontSize = 12
    const blueColor = "#0410ba"

    const invoiceDetailsStartY = 160;
    const companyDetailsStartY = invoiceDetailsStartY + 2 * lineSpacing + 40
    const stationDetailsStartY = 350
    const paymentDetailsStartY = 650
    const tableStartY = 420
    const firstXPos = 72
    const secondXPos = 350


    // Header
    doc.font('Helvetica-Bold').fontSize(30).text('TAX INVOICE', firstXPos, 120, { align: 'left' });
    doc.image(logoPath, 400, 0, { width: 140 });

    // Function to render label in bold and value in normal font
    function renderLabelAndValue(label, value, x, y, fontSize) {
        doc.font('Helvetica-Bold').fontSize(fontSize).text(label, x, y);
        const labelWidth = doc.widthOfString(label);
        doc.font('Helvetica').fontSize(fontSize).text(value, x + labelWidth, y);
    }

    //* INVOICE DETAILS
    renderLabelAndValue('INVOICE DATE: ', moment(transactionData.startTime).format("D MMMM YYYY"), firstXPos, invoiceDetailsStartY, fontSize);
    renderLabelAndValue('INVOICE NO: ', transactionData.transactionId, firstXPos, invoiceDetailsStartY + lineSpacing, fontSize);
    renderLabelAndValue('TID: ', transactionData.tid, firstXPos, invoiceDetailsStartY + 2 * lineSpacing, fontSize);


    //* COMPANY AND BILLING DETAILS
    doc.fillColor(blueColor).font('Helvetica-Bold').fontSize(fontSize).text(`GOEC PRIVATE LIMITED`, firstXPos, companyDetailsStartY);
    doc.fillColor('#000').font('Helvetica').fontSize(fontSize).text(`KB square, Vytilla, 7th Floor,`, firstXPos, companyDetailsStartY + lineSpacing);
    doc.fontSize(fontSize).text(`Cochin, Kerala 682019, IN`, firstXPos, companyDetailsStartY + lineSpacing * 2);

    doc.font('Helvetica-Bold').fontSize(fontSize).text(`BILLED TO`, secondXPos, companyDetailsStartY);
    doc.font('Helvetica').fontSize(fontSize).text(`${transactionData.user.name} +91${transactionData.user.mobile}`, secondXPos, companyDetailsStartY + lineSpacing);

    doc.font('Helvetica-Bold').fontSize(fontSize).text(`GSTIN:`, firstXPos, companyDetailsStartY + lineSpacing * 3 + 7);
    doc.font('Helvetica-Bold').fontSize(fontSize).text(`GSTIN:`, secondXPos, companyDetailsStartY + lineSpacing * 3 + 7);

    //* STATION DETAILS
    doc.font('Helvetica-Bold').fontSize(fontSize).text(`STATION`, firstXPos, stationDetailsStartY);
    // doc.font('Helvetica').fontSize(fontSize).text(transactionData.chargingStation.name, firstXPos, stationDetailsStartY + lineSpacing);
    doc.font('Helvetica')
    wrapText(doc, transactionData.chargingStation.name, 260, fontSize, firstXPos, stationDetailsStartY + lineSpacing, lineSpacing);

    doc.font('Helvetica-Bold').fontSize(fontSize).text(`CHARGE POINT`, secondXPos, stationDetailsStartY);
    doc.font('Helvetica').fontSize(fontSize).text(`:${transactionData.chargingStation.evMachineName}`, secondXPos + 120, stationDetailsStartY);
    doc.font('Helvetica-Bold').fontSize(fontSize).text(`CONNECTOR TYPE`, secondXPos, stationDetailsStartY + lineSpacing);
    doc.font('Helvetica').fontSize(fontSize).text(`:${transactionData.chargingStation.connectorType}`, secondXPos + 120, stationDetailsStartY + lineSpacing);

    //* TABLE
    drawStyledTable(doc, 50, tableStartY, transactionData)

    //* TOTAL AMOUNT
    doc.font('Helvetica-Bold').fillColor(blueColor).fontSize(fontSize).text(`TOTAL`, secondXPos + 70, paymentDetailsStartY - 50);
    doc.font('Helvetica-Bold').fillColor('#000').fontSize(fontSize).text(` ${transactionData.totalAmount}`, secondXPos + 150, paymentDetailsStartY - 50);

    // * PAYMENT DETAILS
    doc.font('Helvetica-Bold').fontSize(fontSize).text(`PAYMENT METHOD`, firstXPos, paymentDetailsStartY);
    doc.font('Helvetica').fontSize(fontSize).text(`: ${transactionData.paymentMethod}`, firstXPos + 120, paymentDetailsStartY);
    doc.font('Helvetica-Bold').fontSize(fontSize).text(`AMOUNT IN WORDS`, firstXPos, paymentDetailsStartY + lineSpacing);
    doc.font('Helvetica').fontSize(fontSize).text(`${transactionData.totalAmountInWords} ONLY`, firstXPos, paymentDetailsStartY + lineSpacing * 2);


    // Finalize the PDF and end the stream
    doc.end();

    // Once the 'end' event is triggered on the document, the PDF is complete
    doc.on('end', () => {
        // Get the buffer
        const buffer = myWritableStreamBuffer.getContents();

        // Convert the buffer to a base64 string
        const base64 = buffer.toString('base64');

        // Output the Base64 string
        callback(null, base64)
    });

    // stream.on('finish', () => {
    //     callback(null, fileName);
    // });

    // stream.on('error', (err) => {
    //     callback(err, null);
    // });
}

// Function to draw the background of a cell
function drawCellBackground(doc, x, y, width, height, color) {
    doc.save().fillColor(color).rect(x, y, width, height).fill().restore();
}

// Function to draw a styled table
function drawStyledTable(doc, startX, startY, transactionData) {
    const chargingDateTime = `${moment(transactionData.startTime).format('DD/MM/YYYY')}\n${moment(transactionData.startTime).format('hh:mm:ss A')}`
    const headers = ['HSN CODE', 'DURATION', 'TARIFF', 'CHARGED ON', 'ENERGY DELIVERED', 'AMOUNT'];
    const data = [
        ['', transactionData.duration, `${transactionData.tariff}/ kWh`, chargingDateTime, transactionData.energyConsumed, `${(transactionData.totalAmount - transactionData.taxAmount).toFixed(2)}`],
        ['', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['', '', '', '', 'Session Fee', '-'],
        ['', '', '', '', 'Idle Fee', '-'],
        ['', '', '', '', `CGST ${(transactionData.taxRate * 100) / 2}%`, (transactionData.taxAmount / 2).toFixed(2)],
        ['', '', '', '', `SGST ${(transactionData.taxRate * 100) / 2}%`, (transactionData.taxAmount / 2).toFixed(2)],
    ];
    const columnWidths = [82, 82, 82, 82, 82, 82]; // Column widths
    let rowHeight = 30; // Row height

    let y = startY;

    // Draw header background and text
    headers.forEach((header, i) => {
        drawCellBackground(doc, startX + sum(columnWidths, i), y, columnWidths[i], rowHeight, '#007bff');
        doc.fillColor('white').fontSize(10).text(header, startX + sum(columnWidths, i), y + (rowHeight / 2) - 5, { width: columnWidths[i], align: 'center' });
    });

    y += rowHeight;

    // Draw data rows
    data.forEach((row, rowIndex) => {
        // let temperoryRowHeight = rowIndex ? rowHeight : 100
        if (rowIndex === 2) rowHeight = 15
        let temperoryRowHeight = rowHeight
        row.forEach((cell, i) => {
            drawCellBackground(doc, startX + sum(columnWidths, i), y, columnWidths[i], temperoryRowHeight, '#d9edf7');
            doc.fillColor('black').fontSize(10).text(cell, startX + sum(columnWidths, i), y + (temperoryRowHeight / 2) - 5, { width: columnWidths[i], align: 'center' });
        });

        //   row.forEach((cell, i) => {
        //     drawCellBackground(doc, startX + sum(columnWidths, i), y, columnWidths[i], rowHeight, rowIndex % 2 === 0 ? '#d9edf7' : 'white');
        //     doc.fillColor('black').fontSize(10).text(cell, startX + sum(columnWidths, i) + 5, y + 5, { width: columnWidths[i] - 10, align: 'left' });
        //   });
        y += rowHeight;
    });

    // Draw bottom border lines
    // doc.save().strokeColor('#007bff').lineWidth(3);
    // headers.forEach((_, i) => {
    //     doc.moveTo(startX + sum(columnWidths, i), startY + rowHeight).lineTo(startX + sum(columnWidths, i), y).stroke();
    // });
    doc.restore();
}

// Utility function to sum the widths of columns up to the given index
function sum(array, index) {
    let sum = array.slice(0, index).reduce((a, b) => a + b, 0);
    return sum ? sum + index * 2 : 0
}

function wrapText(doc, text, maxWidth, fontSize, startX, startY, lineSpacing) {
    let words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (let word of words) {
        let width = doc.widthOfString(currentLine + ' ' + word, { fontSize });

        if (width < maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine.trim());
            currentLine = word;
        }
    }

    lines.push(currentLine.trim());

    for (let line of lines) {
        doc.text(line, startX, startY);
        startY += lineSpacing;
    }
}