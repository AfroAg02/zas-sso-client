export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

// User types
export interface Email {
  address: string;
  isVerified: boolean;
  active:boolean;
}
export interface Phone {
  countryId: number;
  number: string;
  isVerified: boolean;
  country: {
    phoneNumberCode: string;
  }
  active: boolean;
}

// User types
export interface BaseUser {
  id: number;
  name: string;
  emails: Email[];
  phoneNumbers: Phone[];
  photoUrl: string;
  sessionId?: string;
}

// Augmentation hook: consumers can declare module "zas-sso-client" and merge fields into this.
export interface UserExtras {}

export interface User extends BaseUser, UserExtras {}

export type SessionData = {
  user: User | null;
  tokens: Tokens | null;
  shouldClear?: boolean;
};

export type Credentials = {
  email?: string;
  phoneNumberCountryId?: number;
  phoneNumber?: string;
  password: string;
};

export interface SSOInitOptions {
  protectedRoutes?: string[];
  cookieName?: string;
  appUrl?: string;
  ssoUrl?: string;
  redirectUri?: string;
  registerCallbackUri?: string;
  cookieMaxAgeSeconds?: number;
  automaticRedirectOnRefresh?: boolean;
  debug?: boolean;
  endpoints?: Partial<{
    login: string;
    refresh: string;
    me: string;
  }>;
}
