"use client";

import { useState, useTransition, type FormEvent } from "react";

// Formun durumu: error boş değilse hata mesajıdır; message başarı bildirimidir (isteğe bağlı).
export interface ServerFormState {
  error: string;
  message?: string;
}

type FormAction<S extends ServerFormState> = (prev: S, formData: FormData) => Promise<S>;

// useActionState yerine: React, <form action> ile gönderilen formu action bitince sıfırlar; doğrulama
// hatasında yazılanların silinmemesi için gönderimi kendimiz yapıyoruz. Action başarılıysa yönlendirir.
export function useServerForm<S extends ServerFormState>(action: FormAction<S>) {
  const [state, setState] = useState<S>({ error: "" } as S);
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
