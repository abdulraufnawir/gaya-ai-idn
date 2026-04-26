import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { buildWhatsAppLink } from "@/lib/contact";

/**
 * Pricing — disesuaikan dengan tier produk Studio (Enterprise) & Air (Self-serve)
 * dan fokus fashion premium. Harga dalam IDR, transparan untuk B2B Indonesia.
 */
const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Air Starter",
      tag: "BUSANA Air",
      description: "Untuk reseller, dropshipper, dan UMKM fashion",
      price: "Rp 99.000",
      originalPrice: "Rp 149.000",
      perPhoto: "≈ Rp 5.000/foto",
      period: "/bulan",
      icon: Zap,
      features: [
        "20 foto on-model per bulan",
        "Model Library lokal (etnis & hijab)",
        "Format Shopee, Tokopedia, TikTok, IG",
        "Resolusi HD",
        "Support WhatsApp (jam kerja)",
      ],
      buttonText: "Mulai Gratis",
      buttonVariant: "warm" as const,
      onClick: () => navigate("/auth"),
      popular: false,
    },
    {
      name: "Air Pro",
      tag: "BUSANA Air",
      description: "Untuk online shop & brand fashion kecil-menengah",
      price: "Rp 399.000",
      originalPrice: "Rp 599.000",
      perPhoto: "≈ Rp 4.000/foto",
      period: "/bulan",
      icon: Star,
      features: [
        "100 foto on-model per bulan",
        "Semua model premium + custom model",
        "Editorial background & retouch",
        "Resolusi HD, tanpa watermark",
        "Priority WhatsApp support",
        "Export batch (auto-format marketplace)",
      ],
      buttonText: "Coba Gratis 7 Hari",
      buttonVariant: "hero" as const,
      onClick: () => navigate("/auth"),
      popular: true,
    },
    {
      name: "Studio Brand",
      tag: "BUSANA Studio",
      description: "Untuk brand fashion, agency & enterprise",
      price: "Custom",
      originalPrice: "",
      perPhoto: "Volume pricing",
      period: "",
      icon: Crown,
      features: [
        "Volume foto unlimited / negotiable",
        "Brand-trained custom models",
        "Brand consistency guardrails",
        "Resolusi 4K + cetak siap",
        "API & integrasi PIM/Shopify",
        "Dedicated account manager + SLA",
      ],
      buttonText: "Hubungi Sales",
      buttonVariant: "warm" as const,
      onClick: () =>
        window.open(
          buildWhatsAppLink(
            "Halo BUSANA.AI 👋, saya ingin diskusi paket Studio Brand.\n\nNama:\nNama Brand:\nKategori:\nPerkiraan SKU/bulan:"
          ),
          "_blank"
        ),
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="section bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="section-header">
          <span className="eyebrow">Harga Transparan — IDR</span>
          <h2 className="heading-section">
            Mulai Rp 5.000/foto
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              vs Rp 500.000/foto fotografer
            </span>
          </h2>
          <p className="lead">
            Tanpa kontrak, tanpa biaya setup. Mulai gratis, upgrade kapan saja.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative border-border hover:shadow-warm transition-all duration-300 hover:-translate-y-1 ${
                plan.popular ? "border-primary shadow-glow" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-primary text-primary-foreground px-4 py-1">
                    Terpopuler
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-6">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-secondary text-primary mx-auto mb-4">
                  <plan.icon className="w-8 h-8" />
                </div>

                <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">
                  {plan.tag}
                </div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground min-h-[2.5rem]">
                  {plan.description}
                </CardDescription>

                {/* Price */}
                <div className="mt-6">
                  <div className="flex items-end justify-center gap-2">
                    {plan.originalPrice && (
                      <span className="text-base text-muted-foreground line-through pb-1">
                        {plan.originalPrice}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground pb-1">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{plan.perPhoto}</p>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.buttonVariant}
                  className="w-full"
                  size="lg"
                  onClick={plan.onClick}
                >
                  {plan.buttonText}
                </Button>

                {plan.popular && (
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Hemat 33% — 7 hari gratis, cancel kapan saja
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Quick */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-6">
            Pertanyaan Umum
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Apakah hasil bisa dipakai komersial?</h4>
              <p className="text-sm text-muted-foreground">
                Ya. Semua hasil foto pada paket berbayar bebas dipakai untuk marketplace, ads, dan campaign brand.
              </p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Bagaimana pembayaran?</h4>
              <p className="text-sm text-muted-foreground">
                Transfer bank, OVO, GoPay, kartu kredit — atau invoice untuk paket Studio.
              </p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Apakah mendukung modest wear &amp; hijab?</h4>
              <p className="text-sm text-muted-foreground">
                Ya, ini fokus utama kami. Model library lokal mencakup beragam etnis dan style hijab Indonesia.
              </p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Bisa custom model untuk brand?</h4>
              <p className="text-sm text-muted-foreground">
                Tersedia di Studio Brand — kami train model AI sesuai brand DNA (mood, ethnicity, age range).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
