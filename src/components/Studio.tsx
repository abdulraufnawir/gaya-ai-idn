import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shirt, Package } from 'lucide-react';
import VirtualTryOn from './VirtualTryOn';
import Produk from './Produk';

interface StudioProps {
  userId: string;
}

const Studio = ({ userId }: StudioProps) => {
  const [activeStudioTab, setActiveStudioTab] = useState('pakaian');

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Studio</h2>
        <p className="text-muted-foreground">
          Buat konten visual yang menakjubkan dengan AI
        </p>
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