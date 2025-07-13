
import { useApp } from '../context/AppContext';
import { Sale } from '../types';

export const usePdfGenerator = () => {
  const { companyData } = useApp();

  const generateSalePdf = (sale: Sale) => {
    // Criar o conteúdo HTML para o PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Venda #${sale.id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 10px;
            }
            .company-info {
              font-size: 14px;
              line-height: 1.4;
            }
            .sale-info {
              display: flex;
              justify-content: space-between;
              margin: 30px 0;
            }
            .sale-details, .customer-details {
              width: 48%;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #2563eb;
            }
            .detail-line {
              margin: 5px 0;
              font-size: 14px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .items-table th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .total-row {
              background-color: #f8f9fa;
              font-weight: bold;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${companyData.name}</div>
            <div class="company-info">
              ${companyData.cnpj ? `CNPJ: ${companyData.cnpj}<br>` : ''}
              ${companyData.address ? `${companyData.address}<br>` : ''}
              ${companyData.phone ? `Tel: ${companyData.phone}` : ''} 
              ${companyData.email ? ` | Email: ${companyData.email}` : ''}
            </div>
          </div>

          <div class="sale-info">
            <div class="sale-details">
              <div class="section-title">Detalhes da Venda</div>
              <div class="detail-line"><strong>Número:</strong> #${sale.id}</div>
              <div class="detail-line"><strong>Data:</strong> ${new Date(sale.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</div>
              <div class="detail-line"><strong>Vendedor:</strong> ${sale.sellerName}</div>
              <div class="detail-line"><strong>Status:</strong> ${sale.status === 'completed' ? 'Concluída' : 'Cancelada'}</div>
              <div class="detail-line"><strong>Pagamento:</strong> ${getPaymentMethodLabel(sale.paymentMethod)}</div>
            </div>

            <div class="customer-details">
              <div class="section-title">Cliente</div>
              <div class="detail-line"><strong>Nome:</strong> ${sale.customerName}</div>
            </div>
          </div>

          <div class="section-title">Itens da Venda</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th style="text-align: center;">Qtd</th>
                <th style="text-align: right;">Preço Unit.</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">R$ ${item.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right;">R$ ${item.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;"><strong>Total da Venda:</strong></td>
                <td style="text-align: right;"><strong>R$ ${sale.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>

          ${sale.notes ? `
            <div class="section-title">Observações</div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              ${sale.notes}
            </div>
          ` : ''}

          <div class="footer">
            Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
          </div>
        </body>
      </html>
    `;

    // Criar uma nova janela para imprimir/salvar como PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Aguardar o carregamento e então mostrar o diálogo de impressão
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Dinheiro',
      card: 'Cartão',
      pix: 'PIX',
      bank_transfer: 'Transferência',
    };
    return methods[method] || method;
  };

  return {
    generateSalePdf,
  };
};
