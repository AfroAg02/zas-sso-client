export type Tokens = {
    accessToken: string;
    refreshToken: string;
};
export interface Email {
    address: string;
    isVerified: boolean;
    active: boolean;
}
export interface Phone {
    countryId: number;
    number: string;
    isVerified: boolean;
    country: {
        phoneNumberCode: string;
    };
    active: boolean;
}
export interface BaseUser {
    id: number;
    name: string;
    emails: Email[];
    phoneNumbers: Phone[];
    photoUrl: string;
    sessionId?: string;
}
export interface UserExtras {
}
export interface User extends BaseUser, UserExtras {
}
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
//# sourceMappingURL=index.d.ts.map