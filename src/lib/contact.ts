// Pusat kontak — ubah angka & email di sini saja
// Format WA: kode negara tanpa "+" / "0" awal (62 untuk Indonesia)
export const WHATSAPP_NUMBER = "6281234567890"; // TODO: ganti dengan nomor sales asli
export const SUPPORT_EMAIL = "support@busana.ai";
export const SALES_EMAIL = "sales@busana.ai";

export const buildWhatsAppLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const DEMO_BRAND_MESSAGE =
  "Halo BUSANA.AI 👋, saya ingin jadwalkan demo untuk brand fashion saya.\n\nNama:\nNama Brand:\nKategori (modest/RTW/lainnya):\nPerkiraan SKU/bulan:";
