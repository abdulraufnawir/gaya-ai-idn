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
  return;
};
export default Pricing;