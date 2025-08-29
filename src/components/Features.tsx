import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shirt, Users, Sparkles, Camera, Zap, Shield, Smartphone, TrendingUp } from "lucide-react";
const Features = () => {
  const features = [{
    icon: Shirt,
    title: "Virtual Try-On",
    description: "Coba pakaian secara virtual dengan teknologi AI terdepan. Upload foto dan lihat hasilnya dalam hitungan detik.",
    badge: "Populer",
    color: "text-primary"
  }, {
    icon: Users,
    title: "Ganti Model",
    description: "Gunakan model AI yang beragam atau upload foto sendiri untuk mencoba berbagai style.",
    badge: "Trending",
    color: "text-success"
  }, {
    icon: Camera,
    title: "Foto Produk Otomatis",
    description: "Buat foto produk profesional dari gambar pakaian flat lay. Perfect untuk toko online.",
    badge: "Baru",
    color: "text-accent"
  }, {
    icon: Sparkles,
    title: "AI Photo Editing",
    description: "Edit foto dengan AI - ubah background, pencahayaan, dan style dengan mudah.",
    badge: "",
    color: "text-primary-glow"
  }, {
    icon: Zap,
    title: "Proses Cepat",
    description: "Dapatkan hasil dalam hitungan detik. Tidak perlu menunggu lama untuk melihat hasilnya.",
    badge: "",
    color: "text-primary"
  }, {
    icon: Shield,
    title: "Data Aman",
    description: "Foto dan data Anda tersimpan aman dengan enkripsi tingkat enterprise.",
    badge: "",
    color: "text-success"
  }, {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Optimized untuk mobile. Gunakan langsung dari smartphone untuk kemudahan maksimal.",
    badge: "",
    color: "text-accent"
  }, {
    icon: TrendingUp,
    title: "Tingkatkan Penjualan",
    description: "Meningkatkan konversi hingga 40% dengan memberikan pengalaman try-on yang realistis.",
    badge: "ROI Tinggi",
    color: "text-primary-glow"
  }];
  return <section id="features" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Fitur Unggulan
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Solusi Lengkap untuk
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Fashion Business
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Semua yang Anda butuhkan untuk meningkatkan penjualan fashion online dengan teknologi AI terdepan
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => <Card key={feature.title} className="border-border hover:shadow-warm transition-all duration-300 hover:-translate-y-1 group" style={{
          animationDelay: `${index * 100}ms`
        }}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-xl bg-gradient-secondary ${feature.color}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  {feature.badge && <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>}
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
            </Card>)}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-secondary p-8 rounded-2xl border border-border shadow-soft">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Siap meningkatkan penjualan Anda?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
          </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:shadow-glow transition-all duration-300 transform hover:scale-105">
                Mulai Trial Gratis
              </button>
              
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default Features;