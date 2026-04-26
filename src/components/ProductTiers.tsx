import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Sparkles, ArrowRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * "What We Power" — adaptasi langsung dari struktur Lumoo X / Lumoo Air
 * untuk pasar Indonesia. Dua tier produk yang menjelaskan untuk siapa BUSANA.AI dibuat.
 */
const tiers = [
  {
    id: "studio",
    name: "BUSANA Studio",
    tagline: "Untuk Brand Fashion & Enterprise",
    description:
      "AI engine yang terintegrasi dengan workflow produksi konten brand Anda. Konsistensi karakter model, brand guidelines, dan output editorial untuk lookbook musiman.",
    audience: "Brand fashion, retailer, &amp; enterprise",
    features: [
      "Custom model library (talent brand Anda)",
      "Brand guidelines & color profile",
      "Bulk generation untuk lookbook musiman",
      "Dedicated success manager",
    ],
    icon: Building2,
    accent: "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent",
    cta: "Jadwalkan Demo",
    badge: "Enterprise",
  },
  {
    id: "air",
    name: "BUSANA Air",
    tagline: "Untuk UMKM, Reseller & Creator",
    description:
      "Versi ringan untuk produksi konten harian. Upload foto produk, pilih model, dapatkan foto on-model dalam hitungan detik — siap upload ke Shopee, Tokopedia, TikTok Shop & Instagram.",
    audience: "UMKM fashion, dropshipper, content creator",
    features: [
      "On-model try-on instan",
      "100+ model AI (lokal & internasional)",
      "Format auto: marketplace, IG, TikTok",
      "Bayar per kredit — tanpa langganan",
    ],
    icon: Sparkles,
    accent: "border-border bg-card",
    cta: "Mulai Gratis",
    badge: "Populer untuk UMKM",
  },
];

const ProductTiers = () => {
  const navigate = useNavigate();

  return (
    <section className="section bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="section-header">
          <span className="eyebrow">What We Power</span>
          <h2 className="heading-section">
            Konten fashion, dibuat dalam skala apapun
          </h2>
          <p className="lead">
            Dari brand nasional sampai UMKM — pilih tier yang cocok untuk skala
            produksi Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.id}
              className={`${tier.accent} hover:shadow-warm transition-all duration-300 overflow-hidden`}
            >
              <CardContent className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 rounded-xl bg-background border border-border">
                    <tier.icon className="w-6 h-6 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {tier.badge}
                  </Badge>
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-1">
                  {tier.name}
                </h3>
                <p className="text-sm text-primary font-semibold mb-4">
                  {tier.tagline}
                </p>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {tier.description}
                </p>

                <div className="space-y-2 mb-8">
                  {tier.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={tier.id === "studio" ? "default" : "outline"}
                  size="lg"
                  className="w-full rounded-full group"
                  onClick={() => navigate("/auth")}
                >
                  {tier.cta}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Best for: {tier.audience}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductTiers;
