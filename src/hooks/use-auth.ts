"use client";
import { useAuthContext } from "../context/auth-context";

export const useAuth = () => {
  return useAuthContext();
};
