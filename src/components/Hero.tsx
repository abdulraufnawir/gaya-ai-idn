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
          alt="Foto fashion editorial dibuat dengan AI"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-2xl">
          {/* Pill badge */}
          <div className="animate-fade-in mb-6 inline-flex">
            <Badge
              variant="secondary"
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-background/80 backdrop-blur border border-border/50 rounded-full"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary" />
              AI Fashion Studio #1 Indonesia
            </Badge>
          </div>

          {/* Main Heading - fashion-focused, confident */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up tracking-tight leading-[1.05]">
            AI Fashion.
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Brand-Approved.
            </span>
          </h1>

          {/* Subtitle - fashion-only positioning */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl animate-slide-up leading-relaxed">
            Studio AI untuk brand fashion Indonesia — virtual try-on, ganti model,
            dan foto produk berkualitas editorial. Tanpa studio, tanpa model fee,
            tanpa kompromi pada brand Anda.
          </p>

          {/* CTA Buttons */}
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

          {/* Trust line */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground animate-fade-in">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-gradient-primary border-2 border-background" />
              <div className="w-7 h-7 rounded-full bg-gradient-secondary border-2 border-background" />
              <div className="w-7 h-7 rounded-full bg-accent border-2 border-background" />
            </div>
            <span>
              Dipercaya <strong className="text-foreground">brand fashion &amp; UMKM</strong> di seluruh Indonesia
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
