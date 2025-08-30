import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Zap, Crown } from "lucide-react";
const Pricing = () => {
  const plans = [{
    name: "Starter",
    description: "Cocok untuk UMKM yang baru mulai",
    price: "IDR 49.000",
    originalPrice: "59.000",
    period: "/bulan",
    icon: Zap,
    features: ["20 foto per bulan", "Virtual Try-on", "Membuat Model berbasis AI ", "Edit gambar AI", "Support email"],
    buttonText: "Mulai Gratis",
    buttonVariant: "warm" as const,
    popular: false
  }, {
    name: "Pro",
    description: "Untuk online shop dan brand kecil",
    price: "Rp 199.000",
    originalPrice: "Rp 299.000",
    period: "/bulan",
    icon: Star,
    features: ["100 foto per bulan", "Semua model AI premium", "Resolusi HD", "Tanpa watermark", "Background removal", "Priority support", "API access"],
    buttonText: "Coba Gratis",
    buttonVariant: "hero" as const,
    popular: true
  }, {
    name: "Enterprise",
    description: "Untuk brand besar dan agency",
    price: "Rp 999.000",
    originalPrice: "",
    period: "/bulan",
    icon: Crown,
    features: ["Semua yang Ada pada paket Pro", "Unlimited foto", "Resolusi 4K", "White-label solution", "Custom integration", "SLA 99.9%"],
    buttonText: "Hubungi Sales",
    buttonVariant: "warm" as const,
    popular: false
  }];

  return (
    <section id="pricing" className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Pilih Paket yang Tepat
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Mulai gratis, upgrade kapan saja. Semua paket termasuk akses penuh ke fitur AI terbaru.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`relative ${
                  plan.popular
                    ? 'border-primary shadow-primary/25 shadow-2xl scale-105'
                    : 'border-border'
                } transition-all duration-300 hover:shadow-lg`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Paling Populer
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <div className="text-left">
                      {plan.originalPrice && (
                        <div className="text-sm text-muted-foreground line-through">
                          {plan.originalPrice}
                        </div>
                      )}
                      <div className="text-muted-foreground">{plan.period}</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <Button
                    variant={plan.buttonVariant}
                    className="w-full"
                    size="lg"
                  >
                    {plan.buttonText}
                  </Button>

                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
export default Pricing;