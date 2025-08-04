import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      description: "Perfect untuk UMKM yang baru mulai",
      price: "Gratis",
      originalPrice: "",
      period: "selamanya",
      icon: Zap,
      features: [
        "10 foto per bulan",
        "Model AI basic",
        "Resolusi standar",
        "Watermark GayaAI",
        "Support email"
      ],
      buttonText: "Mulai Gratis",
      buttonVariant: "warm" as const,
      popular: false
    },
    {
      name: "Pro",
      description: "Untuk online shop dan brand kecil",
      price: "Rp 199.000",
      originalPrice: "Rp 299.000",
      period: "/bulan",
      icon: Star,
      features: [
        "100 foto per bulan",
        "Semua model AI premium",
        "Resolusi HD",
        "Tanpa watermark",
        "Background removal",
        "Priority support",
        "API access"
      ],
      buttonText: "Coba 7 Hari Gratis",
      buttonVariant: "hero" as const,
      popular: true
    },
    {
      name: "Enterprise",
      description: "Untuk brand besar dan agency",
      price: "Rp 999.000",
      originalPrice: "",
      period: "/bulan",
      icon: Crown,
      features: [
        "Unlimited foto",
        "Custom model training",
        "Resolusi 4K",
        "White-label solution",
        "Dedicated account manager",
        "Custom integration",
        "SLA 99.9%"
      ],
      buttonText: "Hubungi Sales",
      buttonVariant: "warm" as const,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Star className="w-4 h-4 mr-2" />
            Harga Transparan
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Pilih Paket yang
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Sesuai Kebutuhan
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Harga khusus untuk market Indonesia. Mulai gratis, upgrade kapan saja
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={plan.name}
              className={`relative border-border hover:shadow-warm transition-all duration-300 hover:-translate-y-1 ${
                plan.popular ? 'border-primary shadow-glow' : ''
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
                {/* Icon */}
                <div className="inline-flex p-3 rounded-2xl bg-gradient-secondary text-primary mx-auto mb-4">
                  <plan.icon className="w-8 h-8" />
                </div>
                
                {/* Plan Name */}
                <CardTitle className="text-2xl font-bold text-foreground">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {plan.description}
                </CardDescription>
                
                {/* Price */}
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-2">
                    {plan.originalPrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        {plan.originalPrice}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {/* CTA Button */}
                <Button 
                  variant={plan.buttonVariant} 
                  className="w-full" 
                  size="lg"
                >
                  {plan.buttonText}
                </Button>
                
                {plan.popular && (
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Hemat 33% dibanding bulanan
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
              <h4 className="font-medium text-foreground mb-2">Apakah ada kontrak?</h4>
              <p className="text-sm text-muted-foreground">Tidak ada kontrak. Bisa cancel kapan saja.</p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Bagaimana pembayaran?</h4>
              <p className="text-sm text-muted-foreground">Transfer bank, OVO, GoPay, atau kartu kredit.</p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Ada support dalam bahasa Indonesia?</h4>
              <p className="text-sm text-muted-foreground">Ya, tim support kami 100% berbahasa Indonesia.</p>
            </div>
            <div className="text-left">
              <h4 className="font-medium text-foreground mb-2">Bisa custom untuk kebutuhan khusus?</h4>
              <p className="text-sm text-muted-foreground">Tentu! Hubungi tim sales untuk solusi enterprise.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;