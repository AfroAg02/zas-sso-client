"use client";
import { AuthProvider } from "../context/auth-context";
import Refresh from "../hooks/refresh";


type Props = {
  children: React.ReactNode;
};

export default function SSOProvider({ children }: Readonly<Props>) {

  return <AuthProvider><Refresh>{children}</Refresh></AuthProvider>;
}
