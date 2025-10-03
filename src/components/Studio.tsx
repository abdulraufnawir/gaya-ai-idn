import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shirt, Package, Info, CheckCircle2, XCircle } from 'lucide-react';
import VirtualTryOn from './VirtualTryOn';
import Produk from './Produk';

interface StudioProps {
  userId: string;
}

const Studio = ({ userId }: StudioProps) => {
  const [activeStudioTab, setActiveStudioTab] = useState('pakaian');

  return (
    <div className="w-full">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Studio</h2>
          <p className="text-muted-foreground">
            Buat konten visual yang menakjubkan dengan AI
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Info className="h-4 w-4" />
              Tips Foto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Tips Membuat Foto Model & Pakaian yang Berkualitas
              </DialogTitle>
              <DialogDescription>
                Panduan untuk hasil AI yang optimal
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Model Photo Tips */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Shirt className="h-5 w-5" />
                  Foto Model
                </h3>
                
                <div className="space-y-2">
                  <p className="font-medium text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Yang Direkomendasikan:
                  </p>
                  <ul className="space-y-1 text-sm ml-6 list-disc">
                    <li>Foto dengan pencahayaan yang baik dan merata</li>
                    <li>Background polos atau sederhana (putih, abu-abu, atau warna solid)</li>
                    <li>Pose natural dan jelas menampilkan bagian tubuh yang diinginkan</li>
                    <li>Resolusi tinggi (minimal 1024x1024 pixels)</li>
                    <li>Model menghadap kamera dengan postur tegak</li>
                    <li>Pakaian yang dikenakan polos atau netral</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Yang Harus Dihindari:
                  </p>
                  <ul className="space-y-1 text-sm ml-6 list-disc">
                    <li>Foto blur atau tidak fokus</li>
                    <li>Background ramai atau terlalu banyak elemen</li>
                    <li>Pencahayaan terlalu gelap atau terlalu terang</li>
                    <li>Pose yang menutupi bagian tubuh penting</li>
                    <li>Foto dari sudut ekstrem atau tidak natural</li>
                    <li>Model memakai aksesoris berlebihan yang menghalangi</li>
                  </ul>
                </div>
              </div>
              
              {/* Garment Photo Tips */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Foto Pakaian/Produk
                </h3>
                
                <div className="space-y-2">
                  <p className="font-medium text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Yang Direkomendasikan:
                  </p>
                  <ul className="space-y-1 text-sm ml-6 list-disc">
                    <li>Foto flat lay atau di mannequin dengan jelas</li>
                    <li>Warna dan detail pakaian terlihat dengan jelas</li>
                    <li>Background kontras dengan warna pakaian</li>
                    <li>Seluruh bagian pakaian terlihat dalam frame</li>
                    <li>Fokus tajam pada tekstur dan detail</li>
                    <li>Format PNG dengan background transparan (optimal)</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <p className="font-medium text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Yang Harus Dihindari:
                  </p>
                  <ul className="space-y-1 text-sm ml-6 list-disc">
                    <li>Pakaian kusut atau tidak rapi</li>
                    <li>Foto dengan bayangan yang mengganggu</li>
                    <li>Warna yang tidak akurat atau terlalu saturasi</li>
                    <li>Bagian pakaian terpotong atau tidak lengkap</li>
                    <li>Background yang mirip dengan warna pakaian</li>
                    <li>Ukuran file terlalu kecil atau resolusi rendah</li>
                  </ul>
                </div>
              </div>
              
              {/* General Tips */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium text-sm">💡 Tips Tambahan:</p>
                <ul className="space-y-1 text-sm list-disc ml-6">
                  <li>Gunakan kamera berkualitas baik atau smartphone dengan resolusi tinggi</li>
                  <li>Pastikan pencahayaan natural atau studio lighting yang baik</li>
                  <li>Edit foto minimal (crop, brightness) sebelum upload</li>
                  <li>Pilih kategori yang sesuai (Atasan, Bawahan, atau Full Body)</li>
                  <li>Hasil terbaik didapat dengan foto berkualitas tinggi dan jelas</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeStudioTab} onValueChange={setActiveStudioTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="pakaian" className="flex items-center gap-2">
            <Shirt className="h-4 w-4" />
            Pakaian
          </TabsTrigger>
          <TabsTrigger value="produk" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pakaian">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5" />
                Virtual Try-On Pakaian
              </CardTitle>
              <CardDescription>
                Upload foto model dan pakaian untuk melihat hasil virtual try-on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VirtualTryOn userId={userId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Materi Marketing Produk
              </CardTitle>
              <CardDescription>
                Ubah foto produk menjadi materi marketing yang menarik
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Produk userId={userId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Studio;