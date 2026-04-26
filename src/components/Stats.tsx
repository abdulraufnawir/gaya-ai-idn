import { Zap, TrendingDown, Clock, Leaf } from "lucide-react";

const stats = [
  {
    icon: Clock,
    value: "21 detik",
    label: "Rata-rata generate",
    description: "Dari upload sampai siap pakai",
  },
  {
    icon: TrendingDown,
    value: "Hemat 90%",
    label: "vs sewa fotografer",
    description: "Tanpa studio, model, atau editor",
  },
  {
    icon: Zap,
    value: "10x",
    label: "Lebih cepat closing",
    description: "Konten siap untuk semua channel",
  },
  {
    icon: Leaf,
    value: "0 sample",
    label: "Produksi fisik",
    description: "Ramah lingkungan & efisien",
  },
];

const Stats = () => {
  return (
    <section className="py-20 bg-foreground text-background relative overflow-hidden">
      {/* Subtle decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mb-12">
          <p className="text-sm uppercase tracking-widest text-background/60 mb-4">
            Hasil Nyata
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Lebih cepat. Lebih murah.
            <br />
            <span className="text-primary-glow">Lebih siap jualan.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="border-t border-background/20 pt-6"
            >
              <stat.icon className="w-6 h-6 text-primary-glow mb-4" />
              <div className="text-3xl sm:text-4xl font-bold mb-2 tracking-tight">
                {stat.value}
              </div>
              <div className="text-sm font-semibold text-background/90 mb-1">
                {stat.label}
              </div>
              <div className="text-xs text-background/60 leading-relaxed">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
