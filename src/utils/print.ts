// Utility functions for printing

export type PrintFormat = '80mm' | 'half-letter';

export interface PrintConfig {
  format: PrintFormat;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  taxId?: string;
  taxIdType?: string;
  companyLogo?: string;
  website?: string;
  socialMedia?: string;
  warrantyNotes?: string;
  welcomeMessage?: string;
  farewellMessage?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  // Optional repair info for service invoices
  repairOrderNumber?: string;
  deviceInfo?: string;
  technicianName?: string;
}

export interface ServiceOrderData {
  orderNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  device: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  problem: string;
  observations?: string;
  estimatedCost?: number;
  estimatedDate?: string;
  status: string;
  technician?: string;
  accessories?: string;
  trackingUrl?: string;
}

export interface DeviceLabelData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  problem: string;
  devicePassword?: string;
  devicePasswordType?: 'text' | 'pattern';
}

// Note: Print config is now stored in the backend via /company/print-config endpoint
// These functions are kept for backward compatibility but should use backend config

export function printInvoice(data: InvoiceData, config: PrintConfig): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir');
    return;
  }

  const html = generateInvoiceHTML(data, config);
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
}

export async function printServiceOrder(data: ServiceOrderData, config: PrintConfig): Promise<void> {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir');
    return;
  }

  let qrCodeDataUrl = '';
  if (data.trackingUrl) {
    try {
      const QRCode = (await import('qrcode')).default;
      qrCodeDataUrl = await QRCode.toDataURL(data.trackingUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  const html = generateServiceOrderHTML(data, config, qrCodeDataUrl);
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
}

export function printDeviceLabel(data: DeviceLabelData, config: PrintConfig): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor permite las ventanas emergentes para imprimir');
    return;
  }

  const html = generateDeviceLabelHTML(data, config);
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
}

function generateInvoiceHTML(data: InvoiceData, config: PrintConfig): string {
  const is80mm = config.format === '80mm';
  const width = is80mm ? '80mm' : '5.5in';
  const fontSize = is80mm ? '10px' : '12px';
  const padding = is80mm ? '5mm' : '15mm';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${data.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: ${width} auto;
          margin: 0;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: ${fontSize};
          line-height: 1.4;
          color: #000;
          background: #fff;
          width: ${width};
          padding: ${padding};
        }
        
        .header {
          text-align: center;
          margin-bottom: 10px;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
        }
        
        .company-logo {
          max-width: ${is80mm ? '50px' : '80px'};
          max-height: ${is80mm ? '50px' : '80px'};
          margin: 0 auto 8px;
          display: block;
        }
        
        .company-name {
          font-size: ${is80mm ? '14px' : '16px'};
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-info {
          font-size: ${is80mm ? '9px' : '10px'};
          line-height: 1.3;
        }
        
        .invoice-info {
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #000;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .label {
          font-weight: bold;
        }
        
        .items-table {
          margin-bottom: 10px;
          border-bottom: 1px dashed #000;
          padding-bottom: 10px;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        
        .item-name {
          flex: 1;
        }
        
        .item-qty {
          width: ${is80mm ? '30px' : '40px'};
          text-align: center;
        }
        
        .item-price,
        .item-total {
          width: ${is80mm ? '50px' : '70px'};
          text-align: right;
        }
        
        .totals {
          margin-bottom: 10px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .total-row.grand-total {
          font-weight: bold;
          font-size: ${is80mm ? '12px' : '14px'};
          border-top: 2px solid #000;
          padding-top: 5px;
          margin-top: 5px;
        }
        
        .footer {
          text-align: center;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px dashed #000;
          font-size: ${is80mm ? '9px' : '10px'};
        }
        
        .notes {
          margin-top: 10px;
          font-size: ${is80mm ? '9px' : '10px'};
          font-style: italic;
        }
        
        .service-badge {
          background: #1e40af;
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
          font-size: ${is80mm ? '10px' : '12px'};
          font-weight: bold;
          margin-bottom: 10px;
          display: inline-block;
        }
        
        .repair-info {
          background: #f0f9ff;
          border: 1px solid #3b82f6;
          padding: 8px;
          margin-bottom: 10px;
          border-radius: 3px;
          font-size: ${is80mm ? '9px' : '10px'};
        }
        
        .repair-info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .warning-note {
          background: #fffbeb;
          border: 1px solid #f59e0b;
          padding: 8px;
          margin: 10px 0;
          border-radius: 3px;
          font-size: ${is80mm ? '8px' : '9px'};
          line-height: 1.4;
        }
        
        @media print {
          body {
            width: ${width};
          }
          .repair-info,
          .warning-note {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .service-badge {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${config.companyLogo ? `<img src="${config.companyLogo}" alt="Logo" class="company-logo">` : ''}
        <div class="company-name">${config.companyName}</div>
        <div class="company-info">
          ${config.companyAddress ? `${config.companyAddress}<br>` : ''}
          ${config.companyPhone ? `Tel: ${config.companyPhone}<br>` : ''}
          ${config.companyEmail ? `${config.companyEmail}<br>` : ''}
          ${config.taxId ? `${config.taxIdType || 'NIT'}: ${config.taxId}<br>` : ''}
          ${config.website ? `Web: ${config.website}<br>` : ''}
          ${config.socialMedia ? `${config.socialMedia}` : ''}
        </div>
      </div>
      
      ${data.repairOrderNumber ? `
      <div style="text-align: center; margin-bottom: 10px;">
        <span class="service-badge">🔧 FACTURA DE SERVICIO TÉCNICO</span>
      </div>
      
      <div class="repair-info">
        <div class="repair-info-row">
          <span style="font-weight: bold;">Orden:</span>
          <span>${data.repairOrderNumber}</span>
        </div>
        ${data.deviceInfo ? `
        <div class="repair-info-row">
          <span style="font-weight: bold;">Equipo:</span>
          <span>${data.deviceInfo}</span>
        </div>
        ` : ''}
        ${data.technicianName ? `
        <div class="repair-info-row">
          <span style="font-weight: bold;">Técnico:</span>
          <span>${data.technicianName}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <div class="invoice-info">
        <div class="info-row">
          <span class="label">FACTURA:</span>
          <span>${data.invoiceNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">Fecha:</span>
          <span>${data.date}</span>
        </div>
        <div class="info-row">
          <span class="label">Cliente:</span>
          <span>${data.customerName}</span>
        </div>
        ${data.customerPhone ? `
        <div class="info-row">
          <span class="label">Teléfono:</span>
          <span>${data.customerPhone}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="items-table">
        <div class="item-row" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 5px;">
          <div class="item-name">Producto</div>
          <div class="item-qty">Cant</div>
          <div class="item-price">Precio</div>
          <div class="item-total">Total</div>
        </div>
        ${data.items.map(item => `
        <div class="item-row">
          <div class="item-name">${item.name}</div>
          <div class="item-qty">${item.quantity}</div>
          <div class="item-price">$${item.price.toLocaleString('es-CO')}</div>
          <div class="item-total">$${item.total.toLocaleString('es-CO')}</div>
        </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>$${data.subtotal.toLocaleString('es-CO')}</span>
        </div>
        ${data.discount ? `
        <div class="total-row">
          <span>Descuento:</span>
          <span>-$${data.discount.toLocaleString('es-CO')}</span>
        </div>
        ` : ''}
        ${data.tax ? `
        <div class="total-row">
          <span>IVA:</span>
          <span>$${data.tax.toLocaleString('es-CO')}</span>
        </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>$${data.total.toLocaleString('es-CO')}</span>
        </div>
      </div>
      
      <div class="info-row">
        <span class="label">Método de pago:</span>
        <span>${data.paymentMethod}</span>
      </div>
      
      ${data.notes ? `
      <div class="notes">
        Nota: ${data.notes}
      </div>
      ` : ''}
      
      ${config.welcomeMessage ? `
      <div class="notes">
        ${config.welcomeMessage}
      </div>
      ` : ''}
      
      ${config.warrantyNotes ? `
      <div class="notes" style="margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px;">
        <strong>Términos de Garantía:</strong><br>
        ${config.warrantyNotes}
      </div>
      ` : ''}
      
      ${data.repairOrderNumber ? `
      <div class="warning-note">
        <strong>⚠️ Importante:</strong><br>
        • Garantía de servicio según términos acordados<br>
        • Conserve este documento para cualquier reclamo<br>
        • Su equipo ha sido entregado en perfectas condiciones
      </div>
      ` : ''}
      
      <div class="footer">
        ${config.farewellMessage || '¡Gracias por su compra!'}<br>
        ${data.repairOrderNumber ? 'Gracias por confiar en nuestro servicio técnico' : 'Este documento es una factura válida'}
      </div>
    </body>
    </html>
  `;
}

function generateServiceOrderHTML(data: ServiceOrderData, config: PrintConfig, qrCodeDataUrl?: string): string {
  const is80mm = config.format === '80mm';
  const width = is80mm ? '80mm' : '5.5in';
  const fontSize = is80mm ? '10px' : '12px';
  const padding = is80mm ? '5mm' : '15mm';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Orden de Servicio ${data.orderNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: ${width} auto;
          margin: 0;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: ${fontSize};
          line-height: 1.4;
          color: #000;
          background: #fff;
          width: ${width};
          padding: ${padding};
        }
        
        .header {
          text-align: center;
          margin-bottom: 10px;
          border-bottom: 2px dashed #000;
          padding-bottom: 10px;
        }
        
        .company-logo {
          max-width: ${is80mm ? '50px' : '80px'};
          max-height: ${is80mm ? '50px' : '80px'};
          margin: 0 auto 8px;
          display: block;
        }
        
        .company-name {
          font-size: ${is80mm ? '14px' : '16px'};
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-info {
          font-size: ${is80mm ? '9px' : '10px'};
          line-height: 1.3;
        }
        
        .title {
          text-align: center;
          font-size: ${is80mm ? '12px' : '14px'};
          font-weight: bold;
          margin-bottom: 10px;
          padding: 5px;
          background: #f0f0f0;
          border: 1px solid #000;
        }
        
        .section {
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px dashed #000;
        }
        
        .section-title {
          font-weight: bold;
          margin-bottom: 5px;
          text-decoration: underline;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        
        .label {
          font-weight: bold;
          min-width: ${is80mm ? '80px' : '100px'};
        }
        
        .value {
          flex: 1;
          text-align: right;
        }
        
        .full-width {
          margin-bottom: 5px;
        }
        
        .box {
          border: 1px solid #000;
          padding: 5px;
          margin-bottom: 5px;
          min-height: ${is80mm ? '30px' : '40px'};
        }
        
        .signature-section {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
        }
        
        .signature-box {
          width: 45%;
          text-align: center;
        }
        
        .signature-line {
          border-top: 1px solid #000;
          margin-top: ${is80mm ? '30px' : '40px'};
          padding-top: 3px;
          font-size: ${is80mm ? '9px' : '10px'};
        }
        
        .footer {
          text-align: center;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px dashed #000;
          font-size: ${is80mm ? '9px' : '10px'};
        }
        
        @media print {
          body {
            width: ${width};
          }
          .box {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        ${config.companyLogo ? `<img src="${config.companyLogo}" alt="Logo" class="company-logo">` : ''}
        <div class="company-name">${config.companyName}</div>
        <div class="company-info">
          ${config.companyAddress ? `${config.companyAddress}<br>` : ''}
          ${config.companyPhone ? `Tel: ${config.companyPhone}<br>` : ''}
          ${config.companyEmail ? `${config.companyEmail}<br>` : ''}
          ${config.taxId ? `${config.taxIdType || 'NIT'}: ${config.taxId}<br>` : ''}
          ${config.website ? `Web: ${config.website}<br>` : ''}
          ${config.socialMedia ? `${config.socialMedia}` : ''}
        </div>
      </div>
      
      <div class="title">ORDEN DE SERVICIO</div>
      
      <div class="section">
        <div class="info-row">
          <span class="label">N° Orden:</span>
          <span class="value">${data.orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">Fecha:</span>
          <span class="value">${data.date}</span>
        </div>
        <div class="info-row">
          <span class="label">Estado:</span>
          <span class="value">${data.status}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">DATOS DEL CLIENTE</div>
        <div class="full-width">
          <span class="label">Nombre:</span> ${data.customerName}
        </div>
        ${data.customerPhone ? `
        <div class="full-width">
          <span class="label">Teléfono:</span> ${data.customerPhone}
        </div>
        ` : ''}
        ${data.customerEmail ? `
        <div class="full-width">
          <span class="label">Email:</span> ${data.customerEmail}
        </div>
        ` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">DATOS DEL EQUIPO</div>
        <div class="full-width">
          <span class="label">Equipo:</span> ${data.device}
        </div>
        ${data.brand ? `
        <div class="full-width">
          <span class="label">Marca:</span> ${data.brand}
        </div>
        ` : ''}
        ${data.model ? `
        <div class="full-width">
          <span class="label">Modelo:</span> ${data.model}
        </div>
        ` : ''}
        ${data.serialNumber ? `
        <div class="full-width">
          <span class="label">Serie:</span> ${data.serialNumber}
        </div>
        ` : ''}
        ${data.accessories ? `
        <div class="full-width">
          <span class="label">Accesorios:</span> ${data.accessories}
        </div>
        ` : ''}
      </div>
      
      <div class="section">
        <div class="section-title">DESCRIPCIÓN DEL PROBLEMA</div>
        <div class="box">
          ${data.problem}
        </div>
      </div>
      
      ${data.observations ? `
      <div class="section">
        <div class="section-title">OBSERVACIONES</div>
        <div class="box">
          ${data.observations}
        </div>
      </div>
      ` : ''}
      
      <div class="section">
        ${data.estimatedCost ? `
        <div class="info-row">
          <span class="label">Costo Estimado:</span>
          <span class="value">$${data.estimatedCost.toLocaleString('es-CO')}</span>
        </div>
        ` : ''}
        ${data.estimatedDate ? `
        <div class="info-row">
          <span class="label">Fecha Estimada:</span>
          <span class="value">${data.estimatedDate}</span>
        </div>
        ` : ''}
        ${data.technician ? `
        <div class="info-row">
          <span class="label">Técnico:</span>
          <span class="value">${data.technician}</span>
        </div>
        ` : ''}
      </div>
      
      <div class="tracking-section" style="text-align: center; margin-top: 15px; padding: 15px; border: 2px solid #000; background: #f0f9ff;">
        <div style="font-weight: bold; margin-bottom: 10px; font-size: ${is80mm ? '12px' : '14px'}; color: #1e40af;">
          🔍 SEGUIMIENTO DE REPARACIÓN
        </div>
        <div style="background: white; padding: 10px; border: 2px dashed #3b82f6; border-radius: 8px; margin-bottom: 10px;">
          <div style="font-size: ${is80mm ? '9px' : '11px'}; color: #64748b; margin-bottom: 5px;">
            CÓDIGO DE SEGUIMIENTO
          </div>
          <div style="font-size: ${is80mm ? '24px' : '32px'}; font-weight: bold; color: #1e40af; letter-spacing: 2px; font-family: monospace;">
            ${data.orderNumber.replace('#', '')}
          </div>
        </div>
        ${qrCodeDataUrl ? `
        <div style="margin-bottom: 10px;">
          <img src="${qrCodeDataUrl}" alt="QR Code" style="width: ${is80mm ? '100px' : '120px'}; height: ${is80mm ? '100px' : '120px'}; margin: 0 auto; display: block; border: 2px solid #3b82f6; background: white; padding: 5px; border-radius: 8px;">
        </div>
        ` : ''}
        <div style="font-size: ${is80mm ? '8px' : '10px'}; color: #64748b; line-height: 1.4;">
          ${qrCodeDataUrl ? 'Escanea el QR o ' : ''}Ingresa el código en:<br>
          <strong style="color: #1e40af;">${window.location.origin}/tracking</strong>
        </div>
      </div>
      
      ${!is80mm ? `
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">
            Firma del Cliente
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            Firma del Técnico
          </div>
        </div>
      </div>
      ` : ''}
      
      ${config.warrantyNotes ? `
      <div class="notes" style="margin-top: 10px; font-size: ${is80mm ? '9px' : '10px'}; border-top: 1px dashed #000; padding-top: 5px;">
        <strong>Términos de Garantía:</strong><br>
        ${config.warrantyNotes}
      </div>
      ` : ''}
      
      <div class="footer">
        ${config.farewellMessage ? `${config.farewellMessage}<br>` : ''}
        IMPORTANTE: Conserve este documento<br>
        Es necesario para retirar el equipo
      </div>
    </body>
    </html>
  `;
}

function generateDeviceLabelHTML(data: DeviceLabelData, config: PrintConfig): string {
  // Etiqueta optimizada para impresoras térmicas de etiquetas adhesivas (58mm típico)
  const width = '58mm';
  const fontSize = '9px';
  
  // Truncar textos largos para que quepan en la etiqueta
  const truncate = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Etiqueta Equipo ${data.orderNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: ${width} auto;
          margin: 0;
        }
        
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: ${fontSize};
          line-height: 1.3;
          color: #000;
          background: #fff;
          width: ${width};
          padding: 3mm;
        }
        
        .label-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 3mm;
          margin-bottom: 3mm;
        }
        
        .company-name {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 1mm;
        }
        
        .order-number {
          font-size: 14px;
          font-weight: bold;
          background: #000;
          color: #fff;
          padding: 2mm;
          margin: 2mm 0;
          text-align: center;
          letter-spacing: 1px;
        }
        
        .info-section {
          margin-bottom: 2mm;
          padding: 2mm;
          border: 1px solid #000;
        }
        
        .label-text {
          font-size: 7px;
          font-weight: bold;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 1mm;
        }
        
        .value-text {
          font-size: 9px;
          font-weight: bold;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.2;
        }
        
        .password-box {
          background: #f0f0f0;
          border: 2px dashed #000;
          padding: 2mm;
          margin: 2mm 0;
          text-align: center;
        }
        
        .password-text {
          font-size: 12px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          letter-spacing: 2px;
        }
        
        .problem-box {
          border: 1px solid #000;
          padding: 2mm;
          margin: 2mm 0;
          min-height: 10mm;
        }
        
        .footer {
          text-align: center;
          font-size: 7px;
          margin-top: 3mm;
          padding-top: 2mm;
          border-top: 1px dashed #000;
        }
        
        @media print {
          body {
            width: ${width};
          }
          
          .password-box,
          .info-section {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="label-header">
        <div class="company-name">${truncate(config.companyName, 25)}</div>
        ${config.companyPhone ? `<div style="font-size: 7px;">${config.companyPhone}</div>` : ''}
      </div>
      
      <div class="order-number">
        ORDEN ${data.orderNumber}
      </div>
      
      <div class="info-section">
        <div class="label-text">Cliente</div>
        <div class="value-text">${truncate(data.customerName, 30)}</div>
      </div>
      
      <div class="info-section">
        <div class="label-text">Teléfono</div>
        <div class="value-text">${data.customerPhone}</div>
      </div>
      
      ${data.devicePassword && data.devicePasswordType === 'text' ? `
      <div class="password-box">
        <div class="label-text" style="color: #000;">⚠ Contraseña</div>
        <div class="password-text">${data.devicePassword}</div>
      </div>
      ` : data.devicePasswordType === 'pattern' ? `
      <div class="password-box">
        <div class="label-text" style="color: #000;">⚠ Patrón</div>
        <div style="font-size: 8px; font-weight: bold;">VER ORDEN COMPLETA</div>
      </div>
      ` : ''}
      
      <div class="label-text" style="margin-top: 2mm;">Motivo de Ingreso:</div>
      <div class="problem-box">
        <div style="font-size: 8px; line-height: 1.3;">
          ${truncate(data.problem, 120)}
        </div>
      </div>
      
      <div class="footer">
        Conserve su copia de la orden<br>
        Es requerida para retirar el equipo
      </div>
    </body>
    </html>
  `;
}
