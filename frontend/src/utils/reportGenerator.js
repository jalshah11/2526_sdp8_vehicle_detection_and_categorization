import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- Helper Functions ---

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  // Ensure it treats it as UTC to avoid timezone shift if missing 'Z'
  const timeStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
  return new Date(timeStr).toLocaleString();
};

const getFileName = (path) => {
  if (!path) return 'Unknown_Video';
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
};

// --- PDF Generation ---

export const generatePDFReport = (data) => {
  if (!data) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // 1. Header (Title & Meta)
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('Vehicle Analytics Report', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  // 2. Video Information Box
  doc.setDrawColor(200);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 35, pageWidth - 28, 30, 3, 3, 'FD');
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.text('Video Details:', 18, 43);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`File: ${getFileName(data.video || data.video_path)}`, 18, 50);
  doc.text(`Processed At: ${formatDate(data.generated_at || data.processed_at)}`, 18, 56);
  doc.text(`Model used: ${data.model || 'Unknown'}`, pageWidth / 2, 50);
  
  const videoInfo = data.video_info || {};
  const lineY = data.line_y ?? videoInfo.line_y ?? 'N/A';
  doc.text(`Line Position: ${lineY}`, pageWidth / 2, 56);

  // 3. High-level Summary
  const counts = data.counts || {};
  const total = counts.total || data.total_vehicles || 0;
  const totalIn = counts.in?.total || 0;
  const totalOut = counts.out?.total || 0;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); 
  doc.text('Executive Summary', 14, 75);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50);
  doc.setFontSize(11);
  doc.text(`Total Vehicles Detected: ${total}`, 14, 83);
  doc.text(`Total Inbound (↑): ${totalIn}`, 14, 90);
  doc.text(`Total Outbound (↓): ${totalOut}`, 14, 97);
  
  const ratio = totalOut > 0 ? (totalIn / totalOut).toFixed(2) : (totalIn > 0 ? '∞' : '0');
  doc.text(`In/Out Ratio: ${ratio}`, 14, 104);

  // 4. Detailed Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); 
  doc.text('Categorized Breakdown', 14, 118);

  const categories = ['car', 'bike', 'bus', 'truck'];
  const tableData = categories.map(cat => {
    const catTotal = counts.by_category?.[cat] || 0;
    const catIn = counts.in?.by_category?.[cat] || 0;
    const catOut = counts.out?.by_category?.[cat] || 0;
    const percentage = total > 0 ? ((catTotal / total) * 100).toFixed(1) + '%' : '0%';
    return [
      cat.charAt(0).toUpperCase() + cat.slice(1), 
      catTotal.toString(), 
      percentage, 
      catIn.toString(), 
      catOut.toString()
    ];
  });

  doc.autoTable({
    startY: 124,
    head: [['Vehicle Type', 'Total Count', 'Percentage', 'Inbound (↑)', 'Outbound (↓)']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138] },
    margin: { left: 14, right: 14 }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`, 
      pageWidth / 2, 
      doc.internal.pageSize.getHeight() - 10, 
      { align: 'center' }
    );
  }

  // Save the PDF
  const safeName = getFileName(data.video || data.video_path).split('.')[0];
  doc.save(`Analytics_Report_${safeName}.pdf`);
};

// --- CSV Generation ---

export const generateCSVReport = (data) => {
  if (!data) return;

  const counts = data.counts || {};
  const total = counts.total || data.total_vehicles || 0;
  const totalIn = counts.in?.total || 0;
  const totalOut = counts.out?.total || 0;
  
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Header section
  csvContent += "REPORT: VEHICLE ANALYTICS\n";
  csvContent += `Generated On,${new Date().toLocaleString()}\n`;
  csvContent += `Video File,${getFileName(data.video || data.video_path)}\n`;
  csvContent += `Model,${data.model || 'Unknown'}\n`;
  csvContent += "\n";
  
  // Summary section
  csvContent += "SUMMARY\n";
  csvContent += `Total Vehicles,${total}\n`;
  csvContent += `Total Inbound,${totalIn}\n`;
  csvContent += `Total Outbound,${totalOut}\n`;
  csvContent += "\n";

  // Data table
  csvContent += "Category,Total Count,Percentage,Inbound,Outbound\n";
  
  const categories = ['car', 'bike', 'bus', 'truck'];
  categories.forEach(cat => {
    const catTotal = counts.by_category?.[cat] || 0;
    const catIn = counts.in?.by_category?.[cat] || 0;
    const catOut = counts.out?.by_category?.[cat] || 0;
    const percentage = total > 0 ? ((catTotal / total) * 100).toFixed(1) + '%' : '0%';
    
    csvContent += `${cat.charAt(0).toUpperCase() + cat.slice(1)},${catTotal},${percentage},${catIn},${catOut}\n`;
  });

  // Create downloadable file
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const safeName = getFileName(data.video || data.video_path).split('.')[0];
  link.setAttribute("download", `analytics_${safeName}.csv`);
  
  // Required for Firefox
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
