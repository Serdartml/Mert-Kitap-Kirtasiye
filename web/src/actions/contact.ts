"use server";

import { z } from "zod";
import { db } from "@/lib/db";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Adınızı yazın.").max(100),
  email: z.email("Geçerli bir e-posta adresi yazın.").max(200),
  message: z.string().trim().min(10, "Mesajınız en az 10 karakter olmalı.").max(2000),
});

export interface ContactFormState {
  ok: boolean;
  message: string;
}

export async function sendContactMessage(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  }

  await db.contactMessage.create({ data: parsed.data });
  return { ok: true, message: "Mesajınız bize ulaştı. En kısa sürede dönüş yapacağız." };
}
