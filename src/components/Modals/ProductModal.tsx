import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '../../context/AppContext';
import { useProductCategories } from '../../hooks/useProductCategories';
import { Product, ValidationErrors } from '../../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product }) => {
  const { addProduct, updateProduct } = useApp();
  const { categories, addCategory } = useProductCategories();
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    categoryId: '',
    brand: '',
    model: '',
    costPrice: '',
    price: '',
    stock: '',
    warrantyMonths: '',
    description: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        categoryId: product.categoryId || '',
        brand: product.brand,
        model: product.model,
        costPrice: product.costPrice.toString(),
        price: product.price.toString(),
        stock: product.stock.toString(),
        warrantyMonths: product.warrantyMonths.toString(),
        description: product.description || '',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        categoryId: '',
        brand: '',
        model: '',
        costPrice: '',
        price: '',
        stock: '',
        warrantyMonths: '',
        description: '',
      });
    }
    setErrors({});
  }, [product, isOpen]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    const category = await addCategory(newCategoryName.trim());
    if (category) {
      setFormData(prev => ({ 
        ...prev, 
        categoryId: category.id,
        category: category.name 
      }));
      setNewCategoryName('');
      setShowNewCategory(false);
    }
  };

  const validateForm = () => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.categoryId) newErrors.category = 'Categoria é obrigatória';
    if (!formData.brand.trim()) newErrors.brand = 'Marca é obrigatória';
    if (!formData.model.trim()) newErrors.model = 'Modelo é obrigatório';
    if (!formData.costPrice || parseFloat(formData.costPrice) <= 0) newErrors.costPrice = 'Preço de custo deve ser maior que zero';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Preço de venda deve ser maior que zero';
    if (parseFloat(formData.price) <= parseFloat(formData.costPrice)) newErrors.price = 'Preço de venda deve ser maior que o custo';
    if (!formData.stock || parseInt(formData.stock) < 0) newErrors.stock = 'Estoque deve ser zero ou maior';
    if (!formData.warrantyMonths || parseInt(formData.warrantyMonths) < 0) newErrors.warrantyMonths = 'Garantia deve ser zero ou maior';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const selectedCategory = categories.find(c => c.id === formData.categoryId);

    const productData = {
      name: formData.name.trim(),
      category: selectedCategory?.name || '',
      categoryId: formData.categoryId,
      brand: formData.brand.trim(),
      model: formData.model.trim(),
      costPrice: parseFloat(formData.costPrice),
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      warrantyMonths: parseInt(formData.warrantyMonths),
      description: formData.description.trim(),
    };

    if (isEditing && product) {
      updateProduct(product.id, productData);
    } else {
      addProduct(productData);
    }

    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const profit = parseFloat(formData.price || '0') - parseFloat(formData.costPrice || '0');
  const profitMargin = parseFloat(formData.price || '0') > 0 ? ((profit / parseFloat(formData.price || '0')) * 100) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nome do produto"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Categoria *</label>
              <div className="flex gap-2">
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => {
                    const category = categories.find(c => c.id === value);
                    setFormData(prev => ({ 
                      ...prev, 
                      categoryId: value,
                      category: category?.name || ''
                    }));
                  }}
                >
                  <SelectTrigger className={`flex-1 ${errors.category ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategory(!showNewCategory)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {showNewCategory && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nova categoria"
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddCategory} size="sm">
                    Adicionar
                  </Button>
                </div>
              )}
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Marca *</label>
              <Input
                value={formData.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Ex: Kingston, Intel, etc."
                className={errors.brand ? 'border-red-500' : ''}
              />
              {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Modelo *</label>
              <Input
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="Modelo específico"
                className={errors.model ? 'border-red-500' : ''}
              />
              {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preço de Custo (R$) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', e.target.value)}
                placeholder="0.00"
                className={errors.costPrice ? 'border-red-500' : ''}
              />
              {errors.costPrice && <p className="text-red-500 text-sm mt-1">{errors.costPrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Preço de Venda (R$) *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="0.00"
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Estoque *</label>
              <Input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleChange('stock', e.target.value)}
                placeholder="0"
                className={errors.stock ? 'border-red-500' : ''}
              />
              {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Garantia (meses) *</label>
              <Input
                type="number"
                min="0"
                value={formData.warrantyMonths}
                onChange={(e) => handleChange('warrantyMonths', e.target.value)}
                placeholder="12"
                className={errors.warrantyMonths ? 'border-red-500' : ''}
              />
              {errors.warrantyMonths && <p className="text-red-500 text-sm mt-1">{errors.warrantyMonths}</p>}
            </div>
          </div>

          {(formData.costPrice && formData.price) && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Análise de Lucro</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Lucro por unidade:</span>
                  <p className="font-bold text-green-600">R$ {profit.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Margem de lucro:</span>
                  <p className="font-bold text-green-600">{profitMargin.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Descrição</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descrição adicional do produto..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {isEditing ? 'Atualizar' : 'Criar'} Produto
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
