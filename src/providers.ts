import { Adapter } from '@openauthjs/openauth/adapter/adapter';
import { GithubAdapter } from '@openauthjs/openauth/adapter/github';
import { Oauth2Token } from '@openauthjs/openauth/adapter/oauth2';
import { PasswordAdapter } from '@openauthjs/openauth/adapter/password';
import { PasswordUI } from '@openauthjs/openauth/ui/password';
import { GoogleAdapter } from '@openauthjs/openauth/adapter/google';
import { Env, Provider, ProviderConfig } from './types';

export const availableProviders = ['password', 'github', 'google'] as (keyof ProviderConfig)[];

export const providerConfig = (env: Env) => ({
	password: PasswordAdapter(
		PasswordUI({
			sendCode: async (email, code) => {
				console.log(email, code);
			},
		})
	),
	github: GithubAdapter({
		clientID: env.GITHUB_CLIENT_ID!,
		clientSecret: env.GITHUB_CLIENT_SECRET!,
		scopes: ['user:email', 'read:user'],
	}),
    google: GoogleAdapter({
        clientID: env.GOOGLE_CLIENT_ID!,
        clientSecret: env.GOOGLE_CLIENT_SECRET!,
        scopes: ['email'], 
    })
} as Record<string, Adapter<any>>);

export const getProviders = (redirectUri: string, env: Env): Record<string, Adapter<any>> | Response => {
	const uri = new URL(redirectUri);
	const providers_requested = uri.searchParams.get('providers');

	const providers: Record<string, Adapter<any>> = {};

	if (providers_requested) {
		for (const provider of (providers_requested.split(',') as Provider[])) {
			if (!availableProviders.includes(provider)) {
				return new Response(`${provider} is not a valid provider`, {
					status: 400,
				});
			}

			providers[provider] = providerConfig(env)[provider];
		}
	}

	return providers;
};