import { Adapter } from '@openauthjs/openauth/adapter/adapter';
import { GithubAdapter } from '@openauthjs/openauth/adapter/github';
import { PasswordAdapter } from '@openauthjs/openauth/adapter/password';
import { PasswordUI } from '@openauthjs/openauth/ui/password';
import { GoogleAdapter } from '@openauthjs/openauth/adapter/google';
import { Env, ProviderConfig } from './types';

export const availableProviders = ['password', 'github', 'google'] as (keyof ProviderConfig)[];

export const providerConfig = (
	env: Env,
	providers?: Record<
		string,
		{
			scopes?: string[];
		}
	>
): Record<keyof ProviderConfig, Adapter> => {
	const defaultGithubScopes = ['user:email', 'read:user'];
	console.log(providers);
	return {
		password: PasswordAdapter(
			PasswordUI({
				sendCode: async (email, code) => {
					console.log(email, code);
					// Have to implement this
				},
			}) // change this whole object to our own implementation
		),
		github: GithubAdapter({
			clientID: env.GITHUB_CLIENT_ID!,
			clientSecret: env.GITHUB_CLIENT_SECRET!,
			scopes:
				Object.keys(providers || {}).includes('github') && providers?.['github'].scopes
					? [...new Set([...defaultGithubScopes, ...providers['github'].scopes])]
					: defaultGithubScopes,
		}),
		google: GoogleAdapter({
			clientID: env.GOOGLE_CLIENT_ID!,
			clientSecret: env.GOOGLE_CLIENT_SECRET!,
			scopes:
				Object.keys(providers || {}).includes('google') && providers?.['google'].scopes
					? [...new Set(['email', ...providers['google'].scopes])]
					: ['email'],
		}),
	} as Record<string, Adapter<any>>;
};

export const getProvidersWithScopes = (
	redirectUri: string,
	env: Env
):
	| {
			providers: Record<keyof ProviderConfig, Adapter<any>>;
			providersHidden: Record<string, Record<'hide', boolean>>;
	  }
	| Response => {
	const uri = new URL(redirectUri);
	const providersFromUri = uri.searchParams.get('providers');

	let providers_requested: Record<string, { scopes?: string[] }> = {};

	try {
		if (providersFromUri) {
			providers_requested = JSON.parse(atob(providersFromUri));
		}

		const providersHidden: Record<string, Record<'hide', boolean>> = availableProviders
			.map((provider) => ({ [provider]: { hide: true } }))
			.reduce((acc, val) => ({ ...acc, ...val }), {});

		if (Object.keys(providers_requested).length > 0) {
			for (const i of Object.keys(providers_requested)) {
				providersHidden[i].hide = false;
			}
		} else {
			Object.keys(providersHidden).forEach((provider) => {
				providersHidden[provider].hide = false;
			});
		}

		const providers: Record<keyof ProviderConfig, Adapter<any>> = providerConfig(env, providers_requested);

		const providerObj: { providers: typeof providers; providersHidden: typeof providersHidden } = { providers, providersHidden };

		console.log(providerObj);

		return providerObj;
	} catch (e) {
		return new Response(`Invalid providers parameter: ${e}`, { status: 400 });
	}
};
