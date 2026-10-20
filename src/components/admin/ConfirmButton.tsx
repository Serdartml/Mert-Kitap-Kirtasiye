"use client";

import type { ReactNode } from "react";

interface ConfirmButtonProps {
  message: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  // Düğme başka bir formun içindeyse (iç içe form olmaz) kendi eylemini taşır.
  formAction?: (formData: FormData) => void | Promise<void>;
}

// Geri alınamayan işlemler (silme) için: formu göndermeden önce tarayıcının onay kutusunu açar.
export default function ConfirmButton({ message, className, children, ...rest }: ConfirmButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
