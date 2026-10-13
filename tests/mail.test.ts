import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendMail } from "@/lib/mail";
import { newContactAdminMail, orderConfirmationMail, passwordResetMail } from "@/lib/mail-templates";

const message = { to: "a@b.com", subject: "Konu", text: "metin", html: "<p>metin</p>" };

describe("sendMail", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("API anahtarı yokken göndermez ve ağa çıkmaz", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendMail(message)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("anahtar varken Resend'e yetkili istek atar", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendMail(message)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({ to: ["a@b.com"], subject: "Konu" });
  });

  it("sağlayıcı hata dönse ya da ağ kopsa da fırlatmaz", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "hata" }));
    expect(await sendMail(message)).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ağ yok")));
    expect(await sendMail(message)).toBe(false);
  });
});

const order = {
  orderNo: "MK-261007-7HQ4KD",
  fullName: "Ali <b>Veli</b>",
  email: "ali@example.com",
  phone: "05321234567",
  note: null,
  totalKurus: 12500,
  createdAt: new Date("2026-10-07T10:00:00Z"),
  status: "PENDING" as const,
  items: [{ name: 'Kalem "Pro" & Silgi', quantity: 2, unitPriceKurus: 6250 }],
};

describe("e-posta şablonları", () => {
  it("sipariş onayı numarayı, toplamı ve müşteri adresini içerir", () => {
    const mail = orderConfirmationMail(order);
    expect(mail.to).toBe("ali@example.com");
    expect(mail.subject).toContain(order.orderNo);
    expect(mail.text).toContain("Kalem");
    expect(mail.html).toContain("/siparis/MK-261007-7HQ4KD");
  });

  it("kullanıcıdan gelen değerleri HTML'de kaçışlar", () => {
    const html = orderConfirmationMail(order).html;
    expect(html).not.toContain("<b>Veli</b>");
    expect(html).toContain("&lt;b&gt;Veli&lt;/b&gt;");
    expect(html).toContain("Kalem &quot;Pro&quot; &amp; Silgi");

    const contact = newContactAdminMail("m@x.com", { name: "<script>x</script>", email: "a@b.com", message: "<img src=x>" });
    expect(contact.html).not.toContain("<script>");
    expect(contact.html).not.toContain("<img");
  });

  it("parola sıfırlama bağlantısı token'ı adres olarak kodlar", () => {
    const mail = passwordResetMail("a@b.com", null, "tok/en+1", 60);
    expect(mail.text).toContain("/sifre-sifirla?token=tok%2Fen%2B1");
    expect(mail.text).toContain("60 dakika");
  });
});
