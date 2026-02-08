"use client";

import { AuthProvider } from "../context/auth-context";

type Props = {
  children: React.ReactNode;
};

export default function SSOProvider({ children }: Readonly<Props>) {
  return <AuthProvider>{children}</AuthProvider>;
}
