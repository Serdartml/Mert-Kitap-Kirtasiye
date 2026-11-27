import type { Prisma, PrismaClient } from "@prisma/client";
import { formatPrice } from "./format";

// "Hoş geldin" kampanyası: siteye üye olan müşterinin ilk siparişinde, ürün toplamı 1.000 TL ve üzeriyse 100 TL indirim.
// Kampanyayı kapatmak için active: false yeterli; sitedeki duyurular (şerit, sepet, ödeme, kampanya sayfası) da kalkar.
// Verilmiş siparişlerdeki indirim değişmez: indirim siparişe yazılır (Order.totalKurus = ara toplam + kargo - indirim).
export const WELCOME_CAMPAIGN = {
  active: true,
  minSubtotalKurus: 100_000,
  discountKurus: 10_000,
  href: "/kampanya",
} as const;

// Duyurularda kuruşsuz yazılır: "1.000 TL" (fiyat satırlarında formatPrice kullanılır).
const tl = (kurus: number) => `${(kurus / 100).toLocaleString("tr-TR")} TL`;

export const campaignTexts = {
  discount: tl(WELCOME_CAMPAIGN.discountKurus),
  min: tl(WELCOME_CAMPAIGN.minSubtotalKurus),
  // Kısa duyuru: şerit, kayıt sayfası, kayan bant.
  short: `Üye ol, ilk siparişinde ${tl(WELCOME_CAMPAIGN.minSubtotalKurus)} ve üzerine ${tl(WELCOME_CAMPAIGN.discountKurus)} indirim!`,
};

// Sepette ve ödemede gösterilecek kampanya durumu.
export type CampaignHint =
  | { kind: "applied"; discountKurus: number }
  | { kind: "add-more"; missingKurus: number }
  | { kind: "sign-up" }
  | null;

export function campaignHint(state: { loggedIn: boolean; usedBefore: boolean; subtotalKurus: number }): CampaignHint {
  if (!WELCOME_CAMPAIGN.active || state.usedBefore) return null;
  if (!state.loggedIn) return { kind: "sign-up" };
  if (state.subtotalKurus < WELCOME_CAMPAIGN.minSubtotalKurus) return { kind: "add-more", missingKurus: WELCOME_CAMPAIGN.minSubtotalKurus - state.subtotalKurus };
  return { kind: "applied", discountKurus: WELCOME_CAMPAIGN.discountKurus };
}

export function campaignHintText(hint: Exclude<CampaignHint, null>): string {
  if (hint.kind === "applied") return `İlk siparişinize özel ${tl(hint.discountKurus)} hoş geldin indirimi uygulandı.`;
  if (hint.kind === "add-more") return `Sepetinize ${formatPrice(hint.missingKurus)} daha ürün ekleyin, ilk siparişinizde ${campaignTexts.discount} indirim kazanın.`;
  return `Üye olun ya da giriş yapın: ilk siparişinizde ${campaignTexts.min} ve üzerine ${campaignTexts.discount} indirim.`;
}

// Kampanya koşulları: kampanya sayfasında listelenir; sözleşmeye giren siparişte indirim satırı ayrıca yazılır.
export const campaignTerms = [
  `İndirim, sitemize üye olduktan sonra üye girişi yapılarak verilen ilk siparişte geçerlidir.`,
  `Sepetteki ürünlerin toplamı ${campaignTexts.min} ve üzerinde olmalıdır; indirim ${campaignTexts.discount} olarak sipariş toplamından düşülür.`,
  `İndirim sepette ve ödeme adımında kendiliğinden uygulanır; kod girmenize gerek yoktur.`,
  `Her müşteri kampanyadan bir kez yararlanabilir. Aynı e-posta adresi ya da telefon numarasıyla daha önce verilmiş (iptal edilmemiş) bir sipariş varsa indirim uygulanmaz.`,
  `İptal edilen siparişte kullanılan hak geri verilir; sonraki ilk siparişte yeniden kullanılabilir.`,
  `Siparişten cayma ya da iade durumunda, ödediğiniz (indirim düşülmüş) tutar iade edilir.`,
  `Sitedeki indirimli ürünler de toplama indirimli fiyatlarıyla dahildir. İndirim nakde çevrilemez.`,
  `Mert Kitap Kırtasiye kampanyayı sitede duyurarak sona erdirebilir ya da koşullarını değiştirebilir; verilmiş siparişler etkilenmez.`,
];

type OrderReader = Pick<PrismaClient | Prisma.TransactionClient, "order">;

export interface CampaignBuyer {
  userId: string;
  emails: string[];
  phones: string[];
}

// Telefonun son 10 hanesi: "0532...", "532...", "+90532..." aynı numara sayılır.
const phoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-10);

// Üye daha önce (iptal edilmemiş) sipariş verdi mi: üyelikle, e-postayla ya da telefonla (misafir siparişleri dahil).
export async function hasPreviousOrder(client: OrderReader, buyer: CampaignBuyer): Promise<boolean> {
  const emails = [...new Set(buyer.emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const phones = [...new Set(buyer.phones.map(phoneKey).filter((key) => key.length === 10))];
  const count = await client.order.count({
    where: {
      status: { not: "CANCELLED" },
      OR: [
        { userId: buyer.userId },
        ...emails.map((email) => ({ email: { equals: email, mode: "insensitive" as const } })),
        ...phones.map((key) => ({ phone: { endsWith: key } })),
      ],
    },
  });
  return count > 0;
}

// Bu siparişe uygulanacak indirim (kuruş). Misafire, kampanya kapalıyken ve tutar yetmezken 0.
export async function welcomeDiscountKurus(client: OrderReader, buyer: CampaignBuyer | null, subtotalKurus: number): Promise<number> {
  if (!WELCOME_CAMPAIGN.active || !buyer || subtotalKurus < WELCOME_CAMPAIGN.minSubtotalKurus) return 0;
  return (await hasPreviousOrder(client, buyer)) ? 0 : WELCOME_CAMPAIGN.discountKurus;
}

// Verilmiş bir siparişteki indirim: ayrı kolon yok, toplamlar farkından çıkar.
export function orderDiscountKurus(order: { subtotalKurus: number; shippingKurus: number; totalKurus: number }): number {
  return Math.max(0, order.subtotalKurus + order.shippingKurus - order.totalKurus);
}

export const ORDER_DISCOUNT_LABEL = "Hoş geldin indirimi (ilk sipariş)";
