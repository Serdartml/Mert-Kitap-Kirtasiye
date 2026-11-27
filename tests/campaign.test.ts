import { describe, expect, it, vi } from "vitest";
import { campaignHint, hasPreviousOrder, orderDiscountKurus, welcomeDiscountKurus, WELCOME_CAMPAIGN } from "@/lib/campaign";

// Kurallar, kampanya sitede açık olsun kapalı olsun sınanır: testte açık kabul edilir.
(WELCOME_CAMPAIGN as unknown as { active: boolean }).active = true;

const reader = (count: number) => {
  const countFn = vi.fn().mockResolvedValue(count);
  return { client: { order: { count: countFn } } as never, countFn };
};
const buyer = { userId: "u1", emails: ["Ali@Ornek.com", "ali@ornek.com"], phones: ["0532 123 45 67", "+905321234567", ""] };

describe("welcomeDiscountKurus", () => {
  it("üyenin ilk siparişinde, 1.000 TL ve üzerinde 100 TL indirim", async () => {
    expect(await welcomeDiscountKurus(reader(0).client, buyer, 100_000)).toBe(10_000);
    expect(await welcomeDiscountKurus(reader(0).client, buyer, 250_000)).toBe(10_000);
  });

  it("tutar yetmezse, misafirse ya da önceki sipariş varsa indirim yok", async () => {
    expect(await welcomeDiscountKurus(reader(0).client, buyer, 99_999)).toBe(0);
    expect(await welcomeDiscountKurus(reader(0).client, null, 200_000)).toBe(0);
    expect(await welcomeDiscountKurus(reader(1).client, buyer, 200_000)).toBe(0);
  });
});

describe("hasPreviousOrder", () => {
  it("üyelik, e-posta ve telefonun son 10 hanesiyle, iptaller hariç arar", async () => {
    const { client, countFn } = reader(0);
    expect(await hasPreviousOrder(client, buyer)).toBe(false);
    expect(countFn).toHaveBeenCalledWith({
      where: {
        status: { not: "CANCELLED" },
        OR: [
          { userId: "u1" },
          { email: { equals: "ali@ornek.com", mode: "insensitive" } },
          { phone: { endsWith: "5321234567" } },
        ],
      },
    });
  });
});

describe("campaignHint", () => {
  it("misafire üye ol, eksik tutarda ne kadar kaldığını, yetince uygulandı der", () => {
    expect(campaignHint({ loggedIn: false, usedBefore: false, subtotalKurus: 50_000 })).toEqual({ kind: "sign-up" });
    expect(campaignHint({ loggedIn: true, usedBefore: false, subtotalKurus: 70_000 })).toEqual({ kind: "add-more", missingKurus: 30_000 });
    expect(campaignHint({ loggedIn: true, usedBefore: false, subtotalKurus: 100_000 })).toEqual({ kind: "applied", discountKurus: WELCOME_CAMPAIGN.discountKurus });
    expect(campaignHint({ loggedIn: true, usedBefore: true, subtotalKurus: 500_000 })).toBeNull();
  });
});

describe("orderDiscountKurus", () => {
  it("indirim toplamlar farkıdır", () => {
    expect(orderDiscountKurus({ subtotalKurus: 120_000, shippingKurus: 0, totalKurus: 110_000 })).toBe(10_000);
    expect(orderDiscountKurus({ subtotalKurus: 50_000, shippingKurus: 6_500, totalKurus: 56_500 })).toBe(0);
  });
});
