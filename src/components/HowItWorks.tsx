import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, Download, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Foto",
    description:
      "Upload foto model atau pilih dari galeri AI kami. Bisa juga upload foto pakaian yang ingin dicoba.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "AI Bekerja",
    description:
      "Teknologi AI kami akan memproses dan menggabungkan model dengan pakaian secara realistis.",
  },
  {
    number: "03",
    icon: Download,
    title: "Download Hasil",
    description:
      "Dapatkan foto berkualitas tinggi siap pakai untuk promosi atau katalog produk Anda.",
  },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section id="how-it-works" className="section bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="section-header">
          <span className="eyebrow">Cara Kerja</span>
          <h2 className="heading-section">
            Mudah, hanya 3 langkah
          </h2>
          <p className="lead">
            Proses yang simpel dan cepat untuk mendapatkan foto fashion
            berkualitas profesional.
          </p>
        </div>

        {/* Steps — mono icons, satu warna konsisten */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              <Card className="border-border hover:shadow-warm transition-all duration-300 h-full bg-card">
                <CardContent className="p-8 text-center">
                  <div className="text-5xl font-bold text-muted-foreground/15 mb-4 tracking-tight">
                    {step.number}
                  </div>

                  <div className="inline-flex p-3 rounded-xl bg-muted text-foreground/80 mb-6">
                    <step.icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-semibold text-foreground mb-3 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step.description}
                  </p>
                </CardContent>
              </Card>

              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Demo Images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          {[
            { label: "Foto Model", src: "/lovable-uploads/fd27fcb8-ae87-47e0-b679-15c126a8a037.png" },
            { label: "Foto Pakaian", src: "/lovable-uploads/a839faf5-7242-43f8-a727-a443b570cd40.png" },
            { label: "Hasil AI Try-On", src: "/lovable-uploads/a25c8745-cf7c-4f87-9c57-138b5a976ea9.png" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
                {item.label}
              </h4>
              <div className="aspect-[3/4] bg-background rounded-xl overflow-hidden border border-border">
                <img
                  src={item.src}
                  alt={item.label}
                  loading="lazy"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Single primary CTA */}
        <div className="text-center">
          <Button
            size="xl"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 shadow-warm"
            onClick={() => navigate("/auth")}
          >
            Coba Sekarang Gratis
            <ArrowRight className="w-5 h-5 ml-2" />
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
