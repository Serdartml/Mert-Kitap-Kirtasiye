import { describe, expect, it } from "vitest";
import { OrderStatus } from "@prisma/client";
import { closedStatuses, nextStatuses, orderStatusLabels, orderStatusNotes, orderStatusTone } from "@/lib/order-status";

const all = Object.values(OrderStatus);

describe("sipariş durumları", () => {
  it("her durumun etiketi, açıklaması ve rengi vardır", () => {
    for (const status of all) {
      expect(orderStatusLabels[status]).toBeTruthy();
      expect(orderStatusNotes[status]).toBeTruthy();
      expect(orderStatusTone[status]).toBeTruthy();
    }
  });

  it("kapanmış durumlardan ve tesliminden sonra ilerlenemez", () => {
    for (const status of [...closedStatuses, OrderStatus.DELIVERED]) {
      expect(nextStatuses[status]).toEqual([]);
    }
  });

  it("geçişler yalnızca ileri gider (kendine ya da geriye dönüş yok)", () => {
    const order: OrderStatus[] = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED"];
    for (const status of order) {
      for (const next of nextStatuses[status]) {
        expect(order.indexOf(next)).toBeGreaterThan(order.indexOf(status));
      }
    }
  });
});
