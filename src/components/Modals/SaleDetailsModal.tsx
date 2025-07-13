
import React from 'react';
import { X, ShoppingCart, User, Calendar, CreditCard, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePdfGenerator } from '../../hooks/usePdfGenerator';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
}

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ isOpen, onClose, sale }) => {
  const { generateSalePdf } = usePdfGenerator();

  if (!isOpen || !sale) return null;

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'Dinheiro',
      card: 'Cartão',
      pix: 'PIX',
      bank_transfer: 'Transferência',
    };
    return methods[method] || method;
  };

  const handleDownloadPdf = () => {
    generateSalePdf(sale);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-card-foreground">Detalhes da Venda</h2>
              <p className="text-sm text-muted-foreground">#{sale.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-card-foreground">Cliente</p>
                  <p className="text-muted-foreground">{sale.customerName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <User className="h-5 w-5 text-muted-foreground" />
                 <div>
                   <p className="font-medium text-card-foreground">Vendedor</p>
                   <p className="text-muted-foreground">{sale.sellerName || 'Vendedor não encontrado'}</p>
                 </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-card-foreground">Data</p>
                  <p className="text-muted-foreground">
                    {new Date(sale.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-card-foreground">Pagamento</p>
                  <p className="text-muted-foreground">{getPaymentMethodLabel(sale.paymentMethod)}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-medium text-card-foreground">Itens da Venda</h3>
            </div>
            
            <div className="bg-muted/10 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                      Qtd
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                      Preço Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                 <tbody className="divide-y divide-border">
                   {(sale.items || []).map((item, index) => (
                     <tr key={index}>
                       <td className="px-4 py-3 text-sm text-card-foreground">
                         {item.productName || 'Produto não encontrado'}
                       </td>
                       <td className="px-4 py-3 text-sm text-card-foreground text-center">
                         {item.quantity}
                       </td>
                       <td className="px-4 py-3 text-sm text-card-foreground text-right">
                         R$ {item.unitPrice.toFixed(2)}
                       </td>
                       <td className="px-4 py-3 text-sm font-medium text-card-foreground text-right">
                         R$ {item.totalPrice.toFixed(2)}
                       </td>
                     </tr>
                   ))}
                 </tbody>
                 <tfoot className="bg-muted/20">
                   <tr>
                     <td colSpan={3} className="px-4 py-3 text-sm font-medium text-card-foreground text-right">
                       Total da Venda:
                     </td>
                     <td className="px-4 py-3 text-sm font-bold text-card-foreground text-right">
                       R$ {sale.totalAmount.toFixed(2)}
                     </td>
                   </tr>
                 </tfoot>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-card-foreground">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                sale.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
              </span>
            </div>
          </div>

          {sale.notes && (
            <div>
              <p className="font-medium mb-2 text-card-foreground">Observações</p>
              <p className="text-muted-foreground bg-muted/10 p-3 rounded-lg">{sale.notes}</p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailsModal;
