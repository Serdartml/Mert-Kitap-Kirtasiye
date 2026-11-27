import { site } from "./site";

// Teslimat yöntemleri ve kapına teslim (mağazanın kendi kuryesi, İzmir içi) kuralları. İşletme kararı (2026-11-09/11):
// İzmir'in 11 merkez ilçesi, her gün; 17:00'ye kadar verilen sipariş aynı gün, sonrakiler ertesi gün, mağazanın kapanış
// saatine kadar teslim edilir. Ücret 100 TL (KDV dahil), ürün toplamı 1.000 TL ve üzerindeyse ücretsiz.
// Yasal metinler de bu değerleri kullanır (lib/legal-content.ts, shippingTerms). İstemci bileşenleri de içe aktarır.

export const PICKUP_DELIVERY = "magaza";
export const COURIER_DELIVERY = "kurye";
export type DeliveryMethod = typeof PICKUP_DELIVERY | typeof COURIER_DELIVERY;

export const COURIER_CITY = "İzmir";
export const COURIER_DISTRICTS = [
  "Balçova",
  "Bayraklı",
  "Bornova",
  "Buca",
  "Çiğli",
  "Gaziemir",
  "Güzelbahçe",
  "Karabağlar",
  "Karşıyaka",
  "Konak",
  "Narlıdere",
] as const;

export const COURIER_FEE_KURUS = 10_000;
export const COURIER_FREE_OVER_KURUS = 100_000;
export const SAME_DAY_CUTOFF = "17:00";

export const deliveryMethodLabels: Record<string, string> = {
  [PICKUP_DELIVERY]: "Mağazadan teslim",
  [COURIER_DELIVERY]: "İzmir içi kurye ile teslim",
};

export const isCourierDistrict = (district: string) => (COURIER_DISTRICTS as readonly string[]).includes(district);

// Ücretsiz teslimat sınırı ürün toplamına (indirimden önce) bakar.
export function courierFeeKurus(subtotalKurus: number): number {
  return subtotalKurus >= COURIER_FREE_OVER_KURUS ? 0 : COURIER_FEE_KURUS;
}

const istanbulParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, time: `${get("hour")}:${get("minute")}` };
};

const closingTime = (weekday: number) => site.hours.find((row) => (row.dayNumbers as readonly number[]).includes(weekday))?.close ?? "21:00";

// Siparişin (kartla ödemede ödemenin) verildiği ana göre teslim zamanı: "bugün 21:00'e kadar" / "yarın 20:00'ye kadar".
export function courierEstimate(placedAt: Date): { sameDay: boolean; text: string } {
  const { weekday, time } = istanbulParts(placedAt);
  const sameDay = time < SAME_DAY_CUTOFF;
  const day = sameDay ? weekday : (weekday + 1) % 7;
  const close = closingTime(day);
  return { sameDay, text: `${sameDay ? "Bugün" : "Yarın"} ${close}${suffixTo(close)} kadar` };
}

// Türkçe yönelme eki, saatin 24 saatlik okunuşunun son sözcüğüne göre: 21:00 "yirmi bir" -> 21:00'e,
// 20:00 "yirmi" -> 20:00'ye, 19:00 "on dokuz" -> 19:00'a. Kapanış saatleri tam saattir.
export function suffixTo(time: string): string {
  const hour = Number(time.slice(0, 2));
  const byLastDigit: Record<number, string> = { 1: "'e", 2: "'ye", 3: "'e", 4: "'e", 5: "'e", 6: "'ya", 7: "'ye", 8: "'e", 9: "'a" };
  if (hour % 10 !== 0) return byLastDigit[hour % 10];
  return hour === 20 ? "'ye" : "'a"; // 10 "on" -> 'a, 20 "yirmi" -> 'ye, 00 "sıfır" -> 'a
}
