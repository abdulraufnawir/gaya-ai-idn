import { Sparkles } from "lucide-react";

/**
 * Logo wall placeholder — lebih jujur daripada testimonial palsu.
 * Ganti dengan logo brand mitra asli saat sudah ada testimoni real.
 *
 * Strategi: 6 placeholder kategori (modest, RTW, hijab, agency, marketplace, fotografer)
 * dengan styling subtle "in talks" — bukan klaim partnership.
 */
const partnerCategories = [
  { name: "Modest Wear Brand", initials: "MW" },
  { name: "Hijab Boutique", initials: "HB" },
  { name: "RTW Label", initials: "RT" },
  { name: "Marketplace Seller", initials: "MS" },
  { name: "Fashion Agency", initials: "FA" },
  { name: "Local Designer", initials: "LD" },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Komunitas awal
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-4">
            Dibangun bersama brand fashion Indonesia
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Kami sedang onboarding brand modest, RTW, dan hijab boutique generasi awal.
            Mau jadi case study?{" "}
            <a
              href="#pricing"
              className="text-primary font-medium hover:underline"
            >
              Hubungi kami →
            </a>
          </p>
        </div>

        {/* Logo wall placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {partnerCategories.map((p) => (
            <div
              key={p.name}
              className="aspect-[3/2] rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1.5 hover:border-primary/40 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                {p.initials}
              </div>
              <p className="text-[11px] text-muted-foreground text-center px-2 leading-tight">
                {p.name}
              </p>
            </div>
          ))}
        </div>

        {/* Soft CTA bar */}
        <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-6 text-center">
          <Sparkles className="w-6 h-6 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Brand fashion pertama dapat onboarding gratis
          </h3>
          <p className="text-sm text-muted-foreground">
            Kami beri credit, training, dan setup brand-trained model — tanpa biaya — untuk 10 brand pertama.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
