import { ShoppingBag } from "lucide-react";

const marketplaces = [
  "Shopee",
  "Tokopedia",
  "TikTok Shop",
  "Lazada",
  "Instagram",
  "WhatsApp",
  "Blibli",
  "Bukalapak",
];

const MarketplaceTrust = () => {
  return (
    <section className="py-16 bg-background border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Siap Diunggah ke
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
            Semua marketplace &amp; sosial media favorit Anda
          </h3>
        </div>

        {/* Marquee-style logo strip (text-based fallback for now) */}
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 sm:gap-x-12">
          {marketplaces.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-lg font-semibold">{name}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Format otomatis menyesuaikan rasio &amp; spesifikasi tiap platform
        </p>
      </div>
    </section>
  );
};

export default MarketplaceTrust;
