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
    <section className="section-tight bg-background border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="eyebrow">Konten Anda, siap di setiap channel</span>
          <h3 className="heading-card mt-2">
            Lookbook, marketplace, sosial media — semua format otomatis
          </h3>
        </div>

        {/* Logo strip — semua mono muted untuk demote saturasi */}
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 sm:gap-x-12">
          {marketplaces.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="text-base sm:text-lg font-semibold">{name}</span>
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
