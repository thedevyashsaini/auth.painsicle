import { Adapter } from '@openauthjs/openauth/adapter/adapter';
import { Oauth2Token } from '@openauthjs/openauth/adapter/oauth2';

export interface Env {
	CloudflareHtmlKV: KVNamespace;
	TURSO_CONNECTION_URL: string;
	TURSO_AUTH_TOKEN: string;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
	TemporaryAdminBearerToken: string;
}

export interface ProviderConfig {
	password: Adapter<{ email: string }>;
	github: Adapter<{ tokenset: Oauth2Token; clientID: string }>;
	google: Adapter<{ tokenset: Oauth2Token; clientID: string }>;
}

export type Provider = keyof ProviderConfig;

type ExtractValue<T> = T extends Adapter<infer U> ? U : never;

export type Value = {
	[K in keyof ProviderConfig]: { provider: K } & ExtractValue<ProviderConfig[K]>;
}[keyof ProviderConfig];

export type User = { id: string, name: string, providers: string, pfp: string, email: string }