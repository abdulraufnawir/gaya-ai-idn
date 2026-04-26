import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroBeforeAfter from "@/assets/hero-before-after.jpg";
import { buildWhatsAppLink, DEMO_BRAND_MESSAGE } from "@/lib/contact";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-background">
      {/* Background image - editorial before/after */}
      <div className="absolute inset-0">
        <img
          src={heroBeforeAfter}
          alt="Foto produk fashion menjadi foto on-model dengan AI — sebelum dan sesudah"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
        {/* Stronger left overlay agar copy tetap legible di atas split image */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
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

          {/* Main Heading - benefit-driven, kongkret */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up tracking-tight leading-[1.05]">
            Foto on-model.
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Dalam 60 detik.
            </span>
          </h1>

          {/* Subtitle - angka konkret + ID-specific */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-6 max-w-xl animate-slide-up leading-relaxed">
            Ubah foto produk jadi foto editorial on-model — termasuk hijab &amp; modest wear.
            <strong className="text-foreground"> Hemat hingga 90% biaya foto produk</strong> vs sewa studio &amp; fotografer.
          </p>

          {/* Concrete value props */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8 text-sm text-muted-foreground animate-fade-in">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Mulai Rp 5.000/foto
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Tanpa studio fisik
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Format Shopee, Tokopedia, IG, TikTok
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-10 animate-slide-up">
            <Button
              size="xl"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-8 shadow-warm group"
              onClick={() => navigate("/auth")}
            >
              Coba Gratis — 5 Foto
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="rounded-full px-8 border-foreground/20 backdrop-blur bg-background/50 hover:bg-background"
              asChild
            >
              <a
                href={buildWhatsAppLink(DEMO_BRAND_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Jadwalkan demo untuk brand via WhatsApp"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Demo untuk Brand
              </a>
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
