"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { FormState } from "@/actions/admin";

type FormAction = (prev: FormState, formData: FormData) => Promise<FormState>;

// useActionState yerine: React, <form action> ile gönderilen formu action bitince sıfırlar; doğrulama
// hatasında yazılanların silinmemesi için gönderimi kendimiz yapıyoruz. Action başarılıysa yönlendirir.
export function useServerForm(action: FormAction) {
  const [state, setState] = useState<FormState>({ error: "" });
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await action(state, formData);
      if (result) setState(result);
    });
  };

  return { state, pending, onSubmit };
}
