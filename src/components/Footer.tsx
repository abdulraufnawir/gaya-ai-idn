import { Sparkles, Mail, Phone, MapPin, Instagram, Youtube, MessageCircle } from "lucide-react";

const Footer = () => {
  const footerSections = [
    {
      title: "Produk",
      links: [
        { label: "Virtual Try-On", href: "#" },
        { label: "Model AI", href: "#" },
        { label: "Photo Editor", href: "#" },
       ]
    },
    {
      title: "Solusi",
      links: [
        { label: "Fashion Retail", href: "#" },
        { label: "UMKM", href: "#" },
        { label: "Online Shop", href: "#" },
        { label: "Fashion Brand", href: "#" }
      ]
    },
    
    {
      title: "Dukungan",
      links: [
        { label: "Help Center", href: "#" },
        { label: "Kontak", href: "#" },
        { label: "Live Chat", href: "#" },
       
      ]
    }
  ];

  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                BUSANA<span className="text-primary">.AI</span>
              </span>
            </div>
            <p className="text-background/70 mb-6 leading-relaxed">
              Platform AI terdepan untuk virtual try-on fashion. Membantu brand Indonesia tumbuh dengan teknologi canggih.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm text-background/70">hello@busana.ai</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm text-background/70">+62 21 1234 5678</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm text-background/70">Jakarta, Indonesia</span>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-background mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a 
                      href={link.href}
                      className="text-background/70 hover:text-primary transition-colors duration-200 text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-background/70 text-sm">
              © 2024 BUSANA.AI. All rights reserved. Made with ❤️ in Indonesia.
            </div>
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
            
            {/* Legal Links */}
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;