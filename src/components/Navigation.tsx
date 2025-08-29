import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const Navigation = () => {
  const navItems = [
    { label: "Fitur", href: "#features" },
    { label: "Cara Kerja", href: "#how-it-works" },
    { label: "Harga", href: "#pricing" },
    { label: "Kontak", href: "#contact" }
  ];

  return (
    <>
      {/* Desktop Navigation - Top */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                BUSANA<span className="text-primary">.AI</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <a href="/auth">Masuk</a>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <a href="/auth">Coba Gratis</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Logo Bar - Top */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-center h-16 px-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              BUSANA<span className="text-primary">.AI</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border pb-safe">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex flex-col items-center justify-center py-2 px-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-muted/50"
            >
              <div className="w-6 h-6 mb-1 flex items-center justify-center">
                <div className="w-2 h-2 bg-current rounded-full"></div>
              </div>
              <span className="truncate">{item.label}</span>
            </a>
          ))}
        </div>
        
        {/* Bottom CTA Buttons */}
        <div className="px-4 pb-2 pt-1 flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1" asChild>
            <a href="/auth">Masuk</a>
          </Button>
          <Button variant="hero" size="sm" className="flex-1" asChild>
            <a href="/auth">Coba Gratis</a>
          </Button>
        </div>
      </nav>
    </>
  );
};

export default Navigation;