import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Package, Pencil, Trash2, Image, Search } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  primary_image_url: string | null;
  images: string[];
  price: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

interface ProductCatalogProps {
  userId: string;
  onSelectProduct?: (product: Product) => void;
  selectedProductId?: string;
}

const CATEGORIES = [
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'food', label: 'F&B / Makanan' },
  { value: 'beauty', label: 'Kosmetik & Skincare' },
  { value: 'electronics', label: 'Elektronik' },
  { value: 'home', label: 'Rumah & Furniture' },
  { value: 'craft', label: 'Kerajinan & Handmade' },
  { value: 'other', label: 'Lainnya' },
];

const ProductCatalog = ({ userId, onSelectProduct, selectedProductId }: ProductCatalogProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('fashion');
  const [formPrice, setFormPrice] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, [userId]);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading products:', error);
    } else {
      setProducts((data as any[]) || []);
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Maksimal 10MB', variant: 'destructive' });
        return;
      }
      setFormImage(file);
      setFormImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${userId}/products/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('tryon-images').upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('tryon-images').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Nama produk wajib diisi', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let imageUrl = editingProduct?.primary_image_url || null;
      if (formImage) {
        imageUrl = await uploadImage(formImage);
      }

      const productData = {
        user_id: userId,
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory,
        primary_image_url: imageUrl,
        price: parseFloat(formPrice) || 0,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editingProduct) {
        const { error } = await (supabase as any)
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Produk berhasil diperbarui' });
      } else {
        const { error } = await (supabase as any)
          .from('products')
          .insert(productData);
        if (error) throw error;
        toast({ title: 'Berhasil', description: 'Produk berhasil ditambahkan' });
      }

      resetForm();
      loadProducts();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from('products').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil', description: 'Produk berhasil dihapus' });
      loadProducts();
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description || '');
    setFormCategory(product.category);
    setFormPrice(product.price?.toString() || '');
    setFormTags(product.tags?.join(', ') || '');
    setFormImagePreview(product.primary_image_url);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormCategory('fashion');
    setFormPrice('');
    setFormTags('');
    setFormImage(null);
    setFormImagePreview(null);
    setEditingProduct(null);
    setShowForm(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Katalog Produk
          </h3>
          <p className="text-sm text-muted-foreground">{products.length} produk</p>
        </div>
        <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); setShowForm(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Foto Produk</Label>
                <div className="mt-1">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="product-img" />
                  <label htmlFor="product-img" className="flex items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    {formImagePreview ? (
                      <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <div className="text-center">
                        <Image className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1" />
                        <span className="text-xs text-muted-foreground">Upload foto produk</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <Label>Nama Produk *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: Kaos Premium Cotton" className="mt-1" />
              </div>
              <div>
                <Label>Kategori</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deskripsi</Label>
                <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Deskripsi produk..." className="mt-1 min-h-[60px]" />
              </div>
              <div>
                <Label>Harga (IDR)</Label>
                <Input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0" className="mt-1" />
              </div>
              <div>
                <Label>Tags (pisahkan dengan koma)</Label>
                <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="premium, cotton, casual" className="mt-1" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? 'Menyimpan...' : editingProduct ? 'Perbarui' : 'Simpan'}
                </Button>
                <Button variant="outline" onClick={resetForm}>Batal</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari produk..." className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Belum ada produk. Tambahkan produk pertama Anda!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map(product => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedProductId === product.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => onSelectProduct?.(product)}
            >
              <CardContent className="p-2">
                <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2">
                  {product.primary_image_url ? (
                    <img src={product.primary_image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {CATEGORIES.find(c => c.value === product.category)?.label || product.category}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); handleEdit(product); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(product.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
