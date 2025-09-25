export type Tokens = {
    accessToken: string;
    refreshToken: string;
};
export interface Email {
    address: string;
    isVerified: boolean;
}
export interface Phone {
    countryId: number;
    number: string;
    isVerified: boolean;
}
export interface User {
    id: number;
    name: string;
    emails: Email[];
    phones: Phone[];
    photoUrl: string;
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
    cookieMaxAgeSeconds?: number;
    endpoints?: Partial<{
        login: string;
        refresh: string;
        me: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map