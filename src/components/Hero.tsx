import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroEditorial from "@/assets/hero-editorial.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-background">
      {/* Background image - full bleed editorial */}
      <div className="absolute inset-0">
        <img
          src={heroEditorial}
          alt="Foto produk fashion editorial dibuat dengan AI"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-2xl">
          {/* Pill badge - Lumoo style */}
          <div className="animate-fade-in mb-6 inline-flex">
            <Badge
              variant="secondary"
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-background/80 backdrop-blur border border-border/50 rounded-full"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />
              Platform AI Konten Produk #1 Indonesia
            </Badge>
          </div>

          {/* Main Heading - bold, confident, Lumoo-style */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up tracking-tight leading-[1.05]">
            Foto Produk AI.
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Siap Jualan.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl animate-slide-up leading-relaxed">
            Buat foto produk profesional, konten 360°, dan caption marketplace
            dalam hitungan detik — tanpa studio, tanpa fotografer.
            Untuk fashion, F&B, kosmetik, dan UMKM Indonesia.
          </p>

          {/* CTA Buttons - Lumoo style: solid primary + ghost outline */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-10 animate-slide-up">
            <Button
              size="xl"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-8 shadow-warm group"
              onClick={() => navigate("/auth")}
            >
              Coba Gratis
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="rounded-full px-8 border-foreground/20 backdrop-blur bg-background/50 hover:bg-background"
              onClick={() => navigate("/auth")}
            >
              Demo untuk Brand
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Inline trust line */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground animate-fade-in">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-gradient-primary border-2 border-background" />
              <div className="w-7 h-7 rounded-full bg-gradient-secondary border-2 border-background" />
              <div className="w-7 h-7 rounded-full bg-accent border-2 border-background" />
            </div>
            <span>
              Dipercaya <strong className="text-foreground">5.000+ UMKM</strong> &amp; brand fashion Indonesia
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
