const Excel = require('exceljs');
const fs = require('fs');

exports.generateExcel = async (headers, rows) => {
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    worksheet.columns = headers
    rows.forEach(data => worksheet.addRow(data));

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert buffer to base64 string
    const base64String = buffer.toString('base64');

    return base64String;
};