import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Sparkles, Zap, Users } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";
const Hero = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10" style={{
      backgroundImage: `url(${heroImage})`
    }} />
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-in">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              Platform AI Fashion Terdepan di Indonesia
            </Badge>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up">
            Coba Outfit Impian
            <br />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Tanpa Ribet
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up">Teknologi AI canggih untuk virtual try-on pakaian. Perfect untuk brand fashion, UMKM, dan online shop Indonesia yang ingin meningkatkan penjualan dan menekan biaya marketing.</p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-slide-up">
            <Button variant="hero" size="xl" className="shadow-glow">
              <Zap className="w-5 h-5 mr-2" />
              Mulai Coba Gratis
            </Button>
            <Button variant="warm" size="xl">
              <Play className="w-5 h-5 mr-2" />
              Lihat Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
            </div>
              <div className="text-sm text-muted-foreground">
            </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
            </div>
              <div className="text-sm text-muted-foreground">
            </div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
            </div>
              <div className="text-sm text-muted-foreground">
            </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 animate-fade-in">
            <p className="text-sm text-muted-foreground mb-4">
          </p>
            <div className="flex flex-wrap justify-center items-center gap-6 opacity-60">
              {['Batik Keris', 'Alleira', 'Cottonink', 'Berrybenka'].map(brand => (
                <span key={brand} className="text-sm font-medium">{brand}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-primary rounded-full opacity-10 animate-glow-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-secondary rounded-full opacity-10 animate-glow-pulse" style={{
      animationDelay: '1s'
    }} />
    </section>;
};
export default Hero;