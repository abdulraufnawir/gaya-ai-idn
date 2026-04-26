import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

/**
 * Testimoni gaya Lumoo — disesuaikan untuk persona brand fashion Indonesia.
 * Quote-driven, dengan jabatan & brand spesifik.
 */
const testimonials = [
  {
    product: "BUSANA Studio",
    quote:
      "Kami biasa habis 2 minggu booking studio + model untuk satu lookbook. Sekarang 1 hari, brand-approved, dan tim creative bisa fokus ke direction.",
    author: "Rania P.",
    role: "Head of Creative, Brand Modest Wear Jakarta",
  },
  {
    product: "BUSANA Air",
    quote:
      "Sebagai reseller hijab, saya butuh 50+ foto/minggu untuk Shopee & TikTok. BUSANA.AI bikin saya bisa launch koleksi baru tanpa nunggu fotografer.",
    author: "Dewi A.",
    role: "Owner, Hijab Online Store Bandung",
  },
  {
    product: "BUSANA Studio",
    quote:
      "Dari semua AI tools yang kami uji — Midjourney, Firefly, Canva AI — hanya BUSANA.AI yang konsisten menjaga karakter dan tekstur kain dengan akurat.",
    author: "Marcus L.",
    role: "Brand Manager, Local Fashion Label",
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            What our clients say
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            Dipercaya brand fashion Indonesia
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, idx) => (
            <Card
              key={idx}
              className="border-border hover:shadow-warm transition-all duration-300"
            >
              <CardContent className="p-8">
                <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-4">
                  {t.product}
                </div>
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-foreground leading-relaxed mb-6 text-base">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-foreground">{t.author}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
