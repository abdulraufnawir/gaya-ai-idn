import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shirt, Package, Info, CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import VirtualTryOn from './VirtualTryOn';
import Produk from './Produk';
import goodModelExample from '@/assets/examples/good-model-example.jpg';
import badModelExample from '@/assets/examples/bad-model-example.jpg';
import goodGarmentExample from '@/assets/examples/good-garment-example.jpg';
import badGarmentExample from '@/assets/examples/bad-garment-example.jpg';
import modelExamples from '@/assets/examples/model-examples.png';
import apparelExamples from '@/assets/examples/apparel-examples.png';

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
            <Button 
              variant="default" 
              size="lg" 
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            >
              <Lightbulb className="h-5 w-5" />
              Tips Foto Berkualitas
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
              <div className="space-y-4">
                <h3 className="font-semibold text-xl flex items-center gap-2 pb-2 border-b">
                  <Shirt className="h-6 w-6" />
                  Foto Model (Live Model Images)
                </h3>
                
                {/* Reference Image - Full Guide */}
                <div className="rounded-lg overflow-hidden border-2 border-blue-200 dark:border-blue-800">
                  <img 
                    src={modelExamples} 
                    alt="Model photo examples guide" 
                    className="w-full object-contain"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="font-medium text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Yang Direkomendasikan:
                    </p>
                    <ul className="space-y-1 text-sm ml-6 list-disc text-green-900 dark:text-green-300">
                      <li><strong>Satu orang saja</strong> - Model tunggal dalam frame</li>
                      <li><strong>Full-body shot</strong> - Seluruh tubuh terlihat jelas</li>
                      <li>Foto dengan pencahayaan yang baik dan merata</li>
                      <li>Background polos atau sederhana (putih, biru muda, abu-abu)</li>
                      <li>Pose natural dan jelas menampilkan bagian tubuh yang diinginkan</li>
                      <li>Resolusi tinggi (minimal 1024x1024 pixels)</li>
                      <li>Model menghadap kamera dengan postur tegak</li>
                      <li>Pakaian yang dikenakan polos atau netral</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                    <p className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Yang Harus Dihindari:
                    </p>
                    <ul className="space-y-1 text-sm ml-6 list-disc text-red-900 dark:text-red-300">
                      <li><strong>Multiple people</strong> - Lebih dari satu orang dalam foto</li>
                      <li><strong>Group photos</strong> - Foto berkelompok</li>
                      <li>Foto blur atau tidak fokus</li>
                      <li>Background ramai atau terlalu banyak elemen</li>
                      <li>Pencahayaan terlalu gelap atau terlalu terang</li>
                      <li>Pose yang menutupi bagian tubuh penting</li>
                      <li>Foto dari sudut ekstrem atau tidak natural</li>
                      <li>Model memakai aksesoris berlebihan yang menghalangi</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Garment Photo Tips */}
              <div className="space-y-4">
                <h3 className="font-semibold text-xl flex items-center gap-2 pb-2 border-b">
                  <Package className="h-6 w-6" />
                  Foto Pakaian/Produk (Apparel Images)
                </h3>
                
                {/* Reference Image - Full Guide */}
                <div className="rounded-lg overflow-hidden border-2 border-blue-200 dark:border-blue-800">
                  <img 
                    src={apparelExamples} 
                    alt="Apparel photo examples guide" 
                    className="w-full object-contain"
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="font-medium text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Yang Direkomendasikan:
                    </p>
                    <ul className="space-y-1 text-sm ml-6 list-disc text-green-900 dark:text-green-300">
                      <li><strong>Flatlay Apparel</strong> - Pakaian diletakkan rata di permukaan</li>
                      <li><strong>Hanging Apparel</strong> - Pakaian digantung di hanger</li>
                      <li><strong>3D Apparel</strong> - Pakaian di mannequin atau bentuk 3D</li>
                      <li>Warna dan detail pakaian terlihat dengan jelas</li>
                      <li>Background kontras dengan warna pakaian (putih/abu-abu/biru muda)</li>
                      <li>Seluruh bagian pakaian terlihat dalam frame</li>
                      <li>Fokus tajam pada tekstur dan detail</li>
                      <li>Pakaian rapi, tidak kusut atau terlipat</li>
                      <li>Format PNG dengan background transparan (optimal)</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                    <p className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Yang Harus Dihindari:
                    </p>
                    <ul className="space-y-1 text-sm ml-6 list-disc text-red-900 dark:text-red-300">
                      <li><strong>Overlapping Clothes</strong> - Pakaian bertumpuk/saling menutupi</li>
                      <li><strong>Folded Clothes</strong> - Pakaian dilipat (tidak terlihat lengkap)</li>
                      <li><strong>Back of Clothes</strong> - Foto dari belakang saja</li>
                      <li>Pakaian kusut atau tidak rapi</li>
                      <li>Foto dengan bayangan yang mengganggu</li>
                      <li>Warna yang tidak akurat atau terlalu saturasi</li>
                      <li>Bagian pakaian terpotong atau tidak lengkap</li>
                      <li>Background yang mirip dengan warna pakaian</li>
                      <li>Ukuran file terlalu kecil atau resolusi rendah</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* General Tips */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg space-y-2 border-2 border-blue-200 dark:border-blue-900">
                <p className="font-medium text-base flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Tips Tambahan:
                </p>
                <ul className="space-y-1 text-sm list-disc ml-6">
                  <li>Gunakan kamera berkualitas baik atau smartphone dengan resolusi tinggi</li>
                  <li>Pastikan pencahayaan natural atau studio lighting yang baik</li>
                  <li>Edit foto minimal (crop, brightness) sebelum upload</li>
                  <li>Pilih kategori yang sesuai (Atasan, Bawahan, atau Full Body)</li>
                  <li>Hasil terbaik didapat dengan foto berkualitas tinggi dan jelas</li>
                  <li>Foto berkualitas = Hasil AI lebih akurat dan realistis</li>
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