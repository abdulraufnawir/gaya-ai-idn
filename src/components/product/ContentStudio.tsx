import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, PenTool, LayoutGrid, Package } from 'lucide-react';
import ProductCatalog from './ProductCatalog';
import AIProductPhoto from './AIProductPhoto';
import AICopywriting from './AICopywriting';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  primary_image_url: string | null;
}

interface ContentStudioProps {
  userId: string;
}

const ContentStudio = ({ userId }: ContentStudioProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState('catalog');

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    // Auto-switch to photo tab when product selected
    if (activeTab === 'catalog') {
      setActiveTab('photo');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">Konten Produk</h2>
        <p className="text-sm text-muted-foreground">
          Kelola produk dan buat konten marketing dengan AI
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="catalog" className="gap-1 text-xs sm:text-sm">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Katalog</span>
          </TabsTrigger>
          <TabsTrigger value="photo" className="gap-1 text-xs sm:text-sm">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Foto AI</span>
          </TabsTrigger>
          <TabsTrigger value="copy" className="gap-1 text-xs sm:text-sm">
            <PenTool className="h-4 w-4" />
            <span className="hidden sm:inline">Copywriting</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog">
          <ProductCatalog
            userId={userId}
            onSelectProduct={handleSelectProduct}
            selectedProductId={selectedProduct?.id}
          />
        </TabsContent>

        <TabsContent value="photo">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <ProductCatalog
                userId={userId}
                onSelectProduct={handleSelectProduct}
                selectedProductId={selectedProduct?.id}
              />
            </div>
            <div>
              <AIProductPhoto userId={userId} product={selectedProduct} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="copy">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <ProductCatalog
                userId={userId}
                onSelectProduct={handleSelectProduct}
                selectedProductId={selectedProduct?.id}
              />
            </div>
            <div>
              <AICopywriting userId={userId} product={selectedProduct} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentStudio;
