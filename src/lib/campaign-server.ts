import "server-only";
import type { User } from "@prisma/client";
import { campaignHint, hasPreviousOrder, WELCOME_CAMPAIGN, type CampaignHint } from "./campaign";
import { db } from "./db";

// Sepet ve ödeme sayfası için kampanya durumu (asıl indirim siparişte, actions/order.ts içinde yeniden hesaplanır).
export async function campaignHintFor(user: User | null, subtotalKurus: number): Promise<CampaignHint> {
  if (!WELCOME_CAMPAIGN.active) return null;
  const usedBefore = user ? await hasPreviousOrder(db, { userId: user.id, emails: [user.email], phones: [user.phone ?? ""] }) : false;
  return campaignHint({ loggedIn: Boolean(user), usedBefore, subtotalKurus });
}
