import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shirt, UserSquare2, Wand2, Layers, Globe, ShieldCheck } from "lucide-react";

/**
 * Capabilities — semua icon mono `text-foreground` untuk konsistensi visual.
 * Hanya badge "Core" yang dapat aksen primary supaya jadi anchor mata.
 */
const features = [
  {
    icon: Shirt,
    title: "On-Model Try-On",
    description:
      "Upload flat-lay produk → dapat foto on-model realistis. Mendukung kategori modest, hijab, abaya, dan ready-to-wear.",
    badge: "Core",
  },
  {
    icon: UserSquare2,
    title: "Model Library Lokal",
    description:
      "100+ model AI dengan beragam etnis Indonesia, ukuran tubuh, dan style hijab — atau gunakan talent brand sendiri.",
    badge: "Indonesia",
  },
  {
    icon: Layers,
    title: "Lookbook Multi-Pose",
    description:
      "Satu produk → multiple pose, angle, dan background dalam satu klik. Konsistensi karakter dijaga AI engine kami.",
    badge: "",
  },
  {
    icon: Wand2,
    title: "Editorial Background",
    description:
      "Ganti background ke studio, outdoor Bali, jalanan Jakarta, atau lifestyle scene — sesuai mood koleksi Anda.",
    badge: "",
  },
  {
    icon: Globe,
    title: "Auto-Format Marketplace",
    description:
      "Output otomatis menyesuaikan rasio Shopee, Tokopedia, TikTok Shop, Instagram Feed/Reels — tanpa cropping manual.",
    badge: "",
  },
  {
    icon: ShieldCheck,
    title: "Brand-Approved Output",
    description:
      "Tekstur kain, warna pantone, dan detail bordir dijaga akurat. Tidak seperti AI generic yang sering mengarang detail.",
    badge: "Premium",
  },
];

const Features = () => {
  return (
    <section id="features" className="section bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="section-header">
          <span className="eyebrow">Capabilities</span>
          <h2 className="heading-section">
            Semua kebutuhan konten brand fashion Indonesia
          </h2>
          <p className="lead">
            Dari on-model try-on sampai lookbook editorial — satu platform,
            output siap publish.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border hover:shadow-warm transition-all duration-300 hover:-translate-y-1 group bg-card"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-muted text-foreground/80 group-hover:text-primary transition-colors">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  {feature.badge && (
                    <Badge variant="secondary" className="text-xs font-medium">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg font-semibold tracking-tight group-hover:text-primary transition-colors">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
