import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shirt, UserSquare2, Wand2, Layers, Globe, ShieldCheck } from "lucide-react";

/**
 * Capabilities ala Lumoo — 6 fitur yang spesifik untuk produksi konten fashion.
 * Disesuaikan dengan kebutuhan pasar Indonesia (modest/hijab, marketplace ID).
 */
const Features = () => {
  const features = [
    {
      icon: Shirt,
      title: "On-Model Try-On",
      description:
        "Upload flat-lay produk → dapat foto on-model realistis. Mendukung kategori modest, hijab, abaya, dan ready-to-wear.",
      badge: "Core",
      color: "text-primary",
    },
    {
      icon: UserSquare2,
      title: "Model Library Lokal",
      description:
        "Pilih dari 100+ model AI dengan beragam etnis Indonesia, ukuran tubuh, dan style hijab — atau gunakan talent brand sendiri.",
      badge: "Indonesia",
      color: "text-success",
    },
    {
      icon: Layers,
      title: "Lookbook Multi-Pose",
      description:
        "Satu produk → multiple pose, angle, dan background dalam satu klik. Konsistensi karakter dijaga AI engine kami.",
      badge: "Hemat 90%",
      color: "text-accent",
    },
    {
      icon: Wand2,
      title: "Editorial Background",
      description:
        "Ganti background ke studio, outdoor Bali, jalanan Jakarta, atau lifestyle scene — sesuai mood koleksi Anda.",
      badge: "",
      color: "text-primary-glow",
    },
    {
      icon: Globe,
      title: "Auto-Format Marketplace",
      description:
        "Output otomatis menyesuaikan rasio Shopee, Tokopedia, TikTok Shop, Instagram Feed/Reels — tanpa cropping manual.",
      badge: "",
      color: "text-accent",
    },
    {
      icon: ShieldCheck,
      title: "Brand-Approved Output",
      description:
        "Tekstur kain, warna pantone, dan detail bordir dijaga akurat. Tidak seperti AI generic yang sering ngarang detail.",
      badge: "Premium",
      color: "text-primary-glow",
    },
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Capabilities
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Semua kebutuhan konten
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              brand fashion Indonesia
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Dari on-model try-on sampai lookbook editorial — satu platform, output siap publish
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="border-border hover:shadow-warm transition-all duration-300 hover:-translate-y-1 group"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-xl bg-gradient-secondary ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  {feature.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
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
