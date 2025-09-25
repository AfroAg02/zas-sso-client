"use server";

import { clearSessionCookies } from "../lib/cookies";
import { readCookies } from "../lib/cookies";
import { decrypt } from "../lib/crypto";
import { SessionData } from "../types";

export const getCookiesSession = async () => {
  const encryptedSession = await readCookies();

  if (!encryptedSession) {
    return { user: null, tokens: null, shouldClear: false };
  }

  try {
    const decryptedData = await decrypt(encryptedSession);
    const sessionData = JSON.parse(decryptedData) as SessionData;
    if (!sessionData || !sessionData.tokens) {
      return { user: null, tokens: null, shouldClear: true };
    }
    return JSON.parse(decryptedData) as SessionData;
  } catch {
    return { user: null, tokens: null, shouldClear: true };
  }
};

//# Eliminar sesión de las cookies
export const deleteCookiesSession = async (callbacks?: {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}) => {
  try {
    await clearSessionCookies();

    callbacks?.onSuccess?.();
  } catch (error) {
    callbacks?.onError?.(error);
    throw error;
  }
};
