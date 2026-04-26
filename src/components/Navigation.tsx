import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Sparkles, Menu } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { label: "Fitur", href: "#features" },
  { label: "Cara Kerja", href: "#how-it-works" },
  { label: "Harga", href: "#pricing" },
  { label: "Kontak", href: "#contact" },
];

const Logo = () => (
  <a href="/" className="flex items-center space-x-2" aria-label="BUSANA.AI Beranda">
    <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
      <Sparkles className="w-5 h-5 text-primary-foreground" />
    </div>
    <span className="text-xl font-bold text-foreground">
      BUSANA<span className="text-primary">.AI</span>
    </span>
  </a>
);

const Navigation = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        {/* Mobile: Top bar — Logo + Hamburger + Primary CTA */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <Logo />
            <div className="flex items-center gap-2">
              <Button variant="hero" size="sm" className="rounded-full px-4" asChild>
                <a href="/auth">Coba Gratis</a>
              </Button>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Buka menu">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80vw] max-w-xs">
                  <SheetHeader>
                    <SheetTitle className="text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-1 mt-6">
                    {navItems.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="px-3 py-3 rounded-lg text-base font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        {item.label}
                      </a>
                    ))}
                    <div className="border-t border-border my-3" />
                    <Button variant="ghost" className="justify-start" asChild>
                      <a href="/auth" onClick={() => setOpen(false)}>Masuk</a>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-16 px-8 max-w-7xl mx-auto">
        <Logo />

        <div className="hidden md:flex items-center space-x-8">
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

        <div className="hidden md:flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <a href="/auth">Masuk</a>
          </Button>
          <Button variant="hero" asChild>
            <a href="/auth">Coba Gratis</a>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
