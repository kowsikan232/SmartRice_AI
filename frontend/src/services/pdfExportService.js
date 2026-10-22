import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a clean timestamped filename in the format:
 * SmartRice_Report_YYYY-MM-DD_HH-mm.pdf
 */
export function getReportFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `SmartRice_Report_${year}-${month}-${day}_${hours}-${minutes}.pdf`;
}

/**
 * Loads an image from a Data URL, Object URL, or web URL
 * and renders it to a base64 JPEG canvas to maintain aspect ratio and jsPDF compatibility.
 */
export async function loadImageForPDF(imageSrc) {
  if (!imageSrc) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const origWidth = img.naturalWidth || img.width || 400;
        const origHeight = img.naturalHeight || img.height || 300;
        const aspectRatio = origWidth / origHeight;

        // Draw to canvas to get guaranteed valid base64 JPEG
        const canvas = document.createElement('canvas');
        canvas.width = origWidth;
        canvas.height = origHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({
          dataUrl,
          width: origWidth,
          height: origHeight,
          aspectRatio
        });
      } catch (err) {
        console.warn('Canvas conversion failed for PDF image:', err);
        resolve(null);
      }
    };

    img.onerror = (err) => {
      console.warn('Image load failed for PDF export:', err);
      resolve(null);
    };

    img.src = imageSrc;
  });
}

/**
 * Standardizes raw prediction and form data into a single, cohesive report data object.
 * Used identically for both PDF and JSON exports.
 */
export function createReportDataObject({
  results = {},
  formData = {},
  imageSrc = null,
  modelInfo = null,
  reportId = null
}) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const generatedId =
    reportId ||
    (results?.id ? `SR-REC-${results.id}` : null) ||
    `SR-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const formattedDate = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const variety =
    formData?.variety ||
    results?.rice_variety ||
    results?.detected_variety ||
    results?.predicted_variety ||
    'Basmati';

  const temperature =
    formData?.temperature !== undefined && formData?.temperature !== ''
      ? Number(formData.temperature)
      : results?.temperature !== undefined
      ? Number(results.temperature)
      : 'Not available';

  const humidity =
    formData?.humidity !== undefined && formData?.humidity !== ''
      ? Number(formData.humidity)
      : results?.humidity !== undefined
      ? Number(results.humidity)
      : 'Not available';

  const moisture =
    formData?.moisture !== undefined && formData?.moisture !== ''
      ? Number(formData.moisture)
      : results?.moisture_content !== undefined
      ? Number(results.moisture_content)
      : 'Not available';

  const storageDays =
    formData?.storageDays !== undefined && formData?.storageDays !== ''
      ? Number(formData.storageDays)
      : results?.storage_days !== undefined
      ? Number(results.storage_days)
      : 'Not available';

  const quality =
    results?.final_quality ||
    results?.quality ||
    'Not available';

  const qualityGrade =
    results?.predicted_quality_grade ||
    results?.quality_grade ||
    results?.qualityDetails?.quality_grade ||
    (quality.toLowerCase().includes('good') ? 'Grade A' : quality.toLowerCase().includes('medium') ? 'Grade B' : 'Grade C');

  const spoilageRisk =
    results?.spoilage_risk ||
    'Not available';

  const shelfLifeDays =
    results?.shelf_life_days !== undefined && results?.shelf_life_days !== null
      ? Number(results.shelf_life_days)
      : 'Not available';

  const confidence =
    results?.overall_confidence !== undefined && results?.overall_confidence !== null
      ? results.overall_confidence
      : results?.quality_confidence !== undefined && results?.quality_confidence !== null
      ? results.quality_confidence
      : results?.confidence !== undefined && results?.confidence !== null
      ? Number((results.confidence * 100).toFixed(1))
      : 'Not available';

  const recommendedPrice =
    results?.recommended_price !== undefined && results?.recommended_price !== null
      ? Number(results.recommended_price)
      : null;

  const detectedVariety =
    results?.detected_variety ||
    results?.predicted_variety ||
    'Not available';

  const visualQuality =
    results?.image_prediction ||
    results?.detected_condition ||
    results?.qualityDetails?.detected_condition ||
    (results?.has_image || imageSrc ? 'Evaluated' : 'Not available');

  const detectedDefects =
    results?.defects_detected ||
    results?.qualityDetails?.defects_detected ||
    (visualQuality.toLowerCase().includes('good') || visualQuality.toLowerCase().includes('whole') ? 'None detected' : 'Not available');

  return {
    reportId: generatedId,
    timestamp: now.toISOString(),
    formattedDate,
    riceInformation: {
      variety,
      hasImage: Boolean(imageSrc || results?.has_image),
      imageSrc: imageSrc || null
    },
    storageConditions: {
      temperature,
      humidity,
      moisture,
      storageDuration: storageDays,
      co2: formData?.co2 || results?.co2 || null,
      o2: formData?.o2 || results?.o2 || null
    },
    predictionResults: {
      quality,
      qualityGrade,
      spoilageRisk,
      shelfLifeDays,
      confidence,
      recommendedPrice,
      advisory: results?.advisory || null
    },
    imageAnalysis: {
      detectedVariety,
      visualQuality,
      detectedDefects,
      imageConfidence: results?.image_confidence || results?.variety_confidence || null
    },
    modelInformation: {
      imageModel: 'MobileNetV2 Visual Classifier & EfficientNet-B0 Rice Variety Identification',
      storageModel: 'Scikit-Learn Random Forest Classifier (Spoilage) & Random Forest Regressor (Shelf-Life)',
      version: 'Phase 1 (NO-IoT Software Prototype) • Zero Synthetic Data Fabrication',
      ...modelInfo
    },
    academicMetadata: {
      title: 'SMART RICE AI',
      subtitle: 'AI-Based Rice Storage Quality Assessment System',
      phase: 'Phase 1 (NO-IoT Software Prototype)',
      lead: 'Kowsikan',
      institution: 'S.A. Engineering College (Autonomous), Chennai',
      department: 'Department of Artificial Intelligence and Data Science'
    },
    rawResults: results
  };
}

/**
 * Downloads the structured report data as a JSON file.
 * Preserves the underlying JSON export capability while sharing the same data structure.
 */
export function exportSmartRiceJSON(reportData) {
  const jsonString = JSON.stringify(reportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `SmartRice_Data_${new Date().toISOString().slice(0, 10)}.json`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Generates and automatically triggers the download of a professional A4 PDF report.
 * Matches Smart Rice AI forest-green and neutral design theme.
 *
 * @param {Object} reportData - Standardized report data object
 * @returns {Promise<{ success: boolean, filename: string }>}
 */
export async function generateSmartRicePDF(reportData) {
  if (!reportData) {
    throw new Error('Report data is required to generate PDF.');
  }

  // Ensure report data is normalized
  const data = reportData.predictionResults ? reportData : createReportDataObject({ results: reportData });

  // Initialize jsPDF A4 document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // SmartRice Theme Colors
  const COLOR_PRIMARY = [20, 53, 34];     // #143522 (Deep Forest)
  const COLOR_ACCENT = [47, 111, 74];     // #2f6f4a (Green 600)
  const COLOR_LIGHT_BG = [242, 250, 245]; // #f2faf5 (Green 50)
  const COLOR_BORDER = [203, 211, 201];   // #cbd3c9
  const COLOR_TEXT_DARK = [21, 30, 24];   // #151e18
  const COLOR_TEXT_MUTED = [100, 115, 105];// #647369

  // Track vertical drawing cursor
  let currentY = 0;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  // Top Spacing
  currentY = 14;

  // 2. Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('SMART RICE AI', margin, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_TEXT_MUTED);
  doc.text('AI-Based Rice Storage Quality Assessment System', margin, currentY);

  // Document Type Pill (Top Right)
  const pillText = 'PREDICTION REPORT';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  const pillWidth = doc.getTextWidth(pillText) + 8;
  const pillHeight = 6.5;
  const pillX = pageWidth - margin - pillWidth;
  const pillY = 11;

  doc.setFillColor(...COLOR_ACCENT);
  doc.rect(pillX, pillY, pillWidth, pillHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(pillText, pillX + 4, pillY + 4.5);

  currentY += 4;
  // Header dividing rule
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // 3. Report Information Box
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: COLOR_TEXT_DARK,
      font: 'helvetica',
      fillColor: COLOR_LIGHT_BG,
      lineColor: COLOR_BORDER,
      lineWidth: 0.1
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLOR_ACCENT, cellWidth: 24 },
      1: { cellWidth: 64 },
      2: { fontStyle: 'bold', textColor: COLOR_ACCENT, cellWidth: 26 },
      3: { cellWidth: 68 }
    },
    body: [
      [
        'Report ID:',
        String(data.reportId || 'N/A'),
        'Rice Variety:',
        String(data.riceInformation?.variety || 'Not available')
      ],
      [
        'Date & Time:',
        String(data.formattedDate || 'N/A'),
        'Evaluation Scope:',
        'Phase 1 (NO-IoT Software Prototype)'
      ]
    ]
  });

  currentY = doc.lastAutoTable.finalY + 7;

  // 4. Rice Grain Image (if available)
  let imgObj = null;
  if (data.riceInformation?.imageSrc) {
    try {
      imgObj = await loadImageForPDF(data.riceInformation.imageSrc);
    } catch (e) {
      console.warn('Could not load image for PDF embedding:', e);
    }
  }

  // Rice Information & Image Analysis Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Rice Information & Visual Analysis', margin, currentY);
  currentY += 3;

  if (imgObj && imgObj.dataUrl) {
    // Image Box Dimensions
    const maxImgW = 60;
    const maxImgH = 46;
    let renderW = maxImgW;
    let renderH = maxImgW / imgObj.aspectRatio;

    if (renderH > maxImgH) {
      renderH = maxImgH;
      renderW = maxImgH * imgObj.aspectRatio;
    }

    const imgX = margin;
    const imgY = currentY + 2;

    // Caption
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_ACCENT);
    doc.text('Analyzed Rice Image', imgX, currentY + 1);

    // Draw Image Border & Image
    doc.setDrawColor(...COLOR_BORDER);
    doc.setFillColor(255, 255, 255);
    doc.rect(imgX, imgY, renderW, renderH, 'FD');
    doc.addImage(imgObj.dataUrl, 'JPEG', imgX + 1, imgY + 1, renderW - 2, renderH - 2);

    // Beside the image: Table with visual findings
    const tableLeft = imgX + renderW + 6;
    const tableWidth = contentWidth - (renderW + 6);

    autoTable(doc, {
      startY: currentY + 1,
      margin: { left: tableLeft, right: margin },
      tableWidth: tableWidth,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: 255,
        fontStyle: 'bold'
      },
      head: [['Visual Parameter', 'Observation / Result']],
      body: [
        ['Identified Variety', String(data.imageAnalysis?.detectedVariety || data.riceInformation?.variety || 'Not available')],
        ['Visual Quality', String(data.imageAnalysis?.visualQuality || 'Not available')],
        ['Detected Defects', String(data.imageAnalysis?.detectedDefects || 'None detected')],
        ['Image Confidence', data.imageAnalysis?.imageConfidence ? `${data.imageAnalysis.imageConfidence}%` : 'Not available']
      ]
    });

    currentY = Math.max(imgY + renderH + 6, doc.lastAutoTable.finalY + 6);
  } else {
    // No image uploaded: tabular summary only, no fake image
    autoTable(doc, {
      startY: currentY + 1,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        font: 'helvetica'
      },
      headStyles: {
        fillColor: COLOR_PRIMARY,
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 54 },
        2: { cellWidth: 32 },
        3: { cellWidth: 70 }
      },
      head: [['Rice Variety', 'Visual Assessment Status', 'Detected Defects', 'Note']],
      body: [
        [
          String(data.riceInformation?.variety || 'Basmati'),
          'Not Uploaded (Environmental Prediction Only)',
          'Not available',
          'Physical grain photography was not submitted for this evaluation.'
        ]
      ]
    });

    currentY = doc.lastAutoTable.finalY + 6;
  }

  // 5. Storage Conditions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Storage Conditions', margin, currentY);
  currentY += 2.5;

  const formatUnit = (val, unit) => (val !== 'Not available' && val !== null && val !== undefined ? `${val} ${unit}` : 'Not available');

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 32 },
      2: { cellWidth: 54 },
      3: { cellWidth: 58 }
    },
    head: [['Storage Parameter', 'Recorded Value', 'Recommended Safe Limit', 'Condition Evaluation']],
    body: [
      [
        'Temperature',
        formatUnit(data.storageConditions?.temperature, '°C'),
        '18.0 - 25.0 °C',
        typeof data.storageConditions?.temperature === 'number'
          ? data.storageConditions.temperature <= 25.0 ? 'Optimal Range' : 'Elevated Thermal Stress'
          : 'Not available'
      ],
      [
        'Relative Humidity',
        formatUnit(data.storageConditions?.humidity, '%'),
        '≤ 65.0 %',
        typeof data.storageConditions?.humidity === 'number'
          ? data.storageConditions.humidity <= 65.0 ? 'Safe Storage Range' : 'High Humidity Vulnerability'
          : 'Not available'
      ],
      [
        'Moisture Content',
        formatUnit(data.storageConditions?.moisture, '%'),
        '≤ 14.0 % (Critical threshold)',
        typeof data.storageConditions?.moisture === 'number'
          ? data.storageConditions.moisture <= 14.0 ? 'Safe Moisture Limit' : 'High Spoilage & Fungal Risk'
          : 'Not available'
      ],
      [
        'Storage Duration',
        formatUnit(data.storageConditions?.storageDuration, 'Days'),
        'Recommended ≤ 180 Days',
        typeof data.storageConditions?.storageDuration === 'number'
          ? `${data.storageConditions.storageDuration} days elapsed`
          : 'Not available'
      ]
    ]
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 6. Prediction Results Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Prediction Results', margin, currentY);
  currentY += 2.5;

  const predRows = [
    ['Rice Quality', String(data.predictionResults?.quality || 'Not available'), 'Multi-variable grain quality assessment'],
    ['Quality Grade', String(data.predictionResults?.qualityGrade || 'Not available'), 'Derived visual defect and storage condition grade (A-D)'],
    ['Spoilage Risk', String(data.predictionResults?.spoilageRisk || 'Not available'), 'Categorized risk factor (Low, Medium, or High)'],
    ['Estimated Shelf Life', formatUnit(data.predictionResults?.shelfLifeDays, 'Days'), 'Projected usable duration under current environmental conditions'],
    ['Confidence', typeof data.predictionResults?.confidence === 'number' || !isNaN(Number(data.predictionResults?.confidence)) ? `${data.predictionResults.confidence}%` : 'Not available', 'Synthesized multi-model confidence index']
  ];

  if (data.predictionResults?.recommendedPrice !== null && data.predictionResults?.recommendedPrice !== undefined) {
    predRows.push([
      'Dynamic Price Recommendation',
      `₹ ${data.predictionResults.recommendedPrice} / kg`,
      'Calculated via Pr = Pb × Fq × Fs (Phase 1 Decision Support)'
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 46 },
      2: { cellWidth: 90 }
    },
    head: [['Output Metric', 'Prediction Result', 'Benchmark & Technical Details']],
    body: predRows
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 7. Preservation Advisory (if available)
  if (data.predictionResults?.advisory) {
    if (currentY + 22 > pageHeight - 25) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text('Preservation & Storage Advisory', margin, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: COLOR_TEXT_DARK,
        font: 'helvetica',
        fillColor: COLOR_LIGHT_BG
      },
      body: [[String(data.predictionResults.advisory)]]
    });

    currentY = doc.lastAutoTable.finalY + 6;
  }

  // 8. Model Information & Scientific Scope
  if (currentY + 30 > pageHeight - 25) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('Model Information', margin, currentY);
  currentY += 2.5;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.4,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [36, 88, 58],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 140 }
    },
    head: [['Component', 'Architecture / Specification']],
    body: [
      ['Image Model', String(data.modelInformation?.imageModel || 'MobileNetV2 Visual Classifier & EfficientNet-B0 Variety Identification')],
      ['Storage Model', String(data.modelInformation?.storageModel || 'Random Forest Classifier & Random Forest Regressor')],
      ['Model Version & Scope', String(data.modelInformation?.version || 'Phase 1 (NO-IoT Software Prototype) • Zero Synthetic Data Fabrication')]
    ]
  });

  // 9. Running Page Numbers & Footers (applied to all pages)
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Footer rule
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    // Left Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_TEXT_MUTED);
    doc.text('SmartRice AI • Phase 1 — AI-Based Rice Storage Analysis', margin, pageHeight - 7);

    // Right Footer (Page Number)
    const pageStr = `Page ${p} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 7);
  }

  // 10. Trigger Browser Download with formatted filename
  const filename = getReportFilename();
  doc.save(filename);

  return {
    success: true,
    filename
  };
}
