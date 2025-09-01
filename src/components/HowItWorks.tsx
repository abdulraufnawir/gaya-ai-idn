import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Download, ArrowRight } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: Upload,
      title: "Upload Foto",
      description: "Upload foto model atau pilih dari galeri AI kami. Bisa juga upload foto pakaian yang ingin dicoba.",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      number: "02", 
      icon: Sparkles,
      title: "AI Bekerja",
      description: "Teknologi AI kami akan memproses dan menggabungkan model dengan pakaian secara realistis.",
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      number: "03",
      icon: Download,
      title: "Download Hasil",
      description: "Dapatkan foto berkualitas tinggi siap pakai untuk promosi atau katalog produk Anda.",
      color: "text-accent",
      bgColor: "bg-accent/10"
    }
  ];

  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Cara Kerja
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Mudah dalam
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              3 Langkah
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Proses yang simpel dan cepat untuk mendapatkan foto fashion berkualitas profesional
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <Card className="border-border hover:shadow-warm transition-all duration-300 h-full">
                <CardContent className="p-8 text-center">
                  {/* Step Number */}
                  <div className="text-6xl font-bold text-muted-foreground/20 mb-4">
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-2xl ${step.bgColor} ${step.color} mb-6`}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
              
              {/* Arrow (only show between steps on large screens) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-8 h-8 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Demo Images */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Before */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-4">Input</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative group">
                <img 
                  src="/lovable-uploads/fd27fcb8-ae87-47e0-b679-15c126a8a037.png" 
                  alt="Model Demo" 
                  className="w-full h-48 object-cover rounded-xl shadow-soft group-hover:shadow-warm transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <p className="text-sm text-muted-foreground mt-2">Foto Model</p>
              </div>
              <div className="relative group">
                <img 
                  src="/lovable-uploads/a839faf5-7242-43f8-a727-a443b570cd40.png" 
                  alt="Clothing Samples" 
                  className="w-full h-48 object-cover rounded-xl shadow-soft group-hover:shadow-warm transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <p className="text-sm text-muted-foreground mt-2">Foto Pakaian</p>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-4">Output</h3>
            <div className="relative group">
              <img 
                src="/lovable-uploads/a25c8745-cf7c-4f87-9c57-138b5a976ea9.png" 
                alt="AI Try-On Result" 
                className="w-full h-48 object-cover rounded-xl shadow-soft group-hover:shadow-warm transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <p className="text-sm text-muted-foreground mt-2">Hasil AI Try-On</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="hero" size="xl" className="shadow-glow">
            <Sparkles className="w-5 h-5 mr-2" />
            Coba Sekarang Gratis
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Tidak perlu kartu kredit • Trial 7 hari gratis
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;