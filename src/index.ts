import { authorizer } from '@openauthjs/openauth';
import { type ExecutionContext } from '@cloudflare/workers-types';
import { subjects } from './subjects';
import { providerConfig, getProvidersWithScopes, availableProviders } from './providers';
import { Adapter } from '@openauthjs/openauth/adapter/adapter';
import { Env, Provider, ProviderConfig, ProviderObject, Value } from './types';
import { db as dbInit } from './db/index';
import { SelectClient, InsertClient, clientTable, kvTable, usersTable, SelectUser as User } from './db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleStorage } from './storage/drizzle';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { Oauth2Token } from '@openauthjs/openauth/adapter/oauth2';
import { THEME_TERMINAL } from '@openauthjs/openauth/ui/theme';
import { Select } from './select';
import { isDomainMatch } from '@openauthjs/openauth/util';

type UserWithToken = Omit<User, 'providers'> & {
	providers: ProviderObject[];
};

async function getUser(
	email: string,
	name: string,
	pfp: string,
	provider: string,
	db: LibSQLDatabase,
	tokenset: Oauth2Token
): Promise<UserWithToken> {
	const user = (await db.select().from(usersTable).where(eq(usersTable.email, email)).get()) as User;

	if (user) {
		const update: Partial<User> = {
			...(name && user.name !== name && { name }),
			...(pfp && user.pfp !== pfp && { pfp }),
			...(!user.providers.includes(provider) && { providers: `${user.providers},${provider}` }),
		};

		if (Object.keys(update).length > 0) {
			await db.update(usersTable).set(update).where(eq(usersTable.email, email)).execute();
		}

		const providers: ProviderObject[] = [];

		for (let provider_new of user.providers.split(',')) {
			if (provider_new == provider) {
				providers.push({
					provider: provider_new,
					tokenset: tokenset,
				});
			} else {
				providers.push({
					provider: provider_new,
					tokenset: {
						access: '',
						refresh: '',
						expiry: 0,
						raw: {},
					},
				});
			}
		}

		return {
			...user,
			...update,
			providers,
		};
	} else {
		const newUser: User = {
			id: uuidv4(),
			email,
			name,
			pfp,
			providers: provider,
		};

		await db.insert(usersTable).values(newUser).execute();

		const providers: ProviderObject[] = [
			{
				provider,
				tokenset,
			},
		];

		return {
			...newUser,
			providers,
		};
	}
}

async function isValidUrl(url: string): Promise<boolean> {
	try {
		const response = await fetch(url);
		return response.ok;
	} catch {
		return false;
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		const pathname = url.pathname;
		const clientId = url.searchParams.get('client_id');
		const redirectUri = url.searchParams.get('redirect_uri');
		const db = dbInit(env);

		let authorizedProviders: Provider[] = availableProviders;

		let client: SelectClient | undefined;

		if (clientId) {
			client = (await db.select().from(clientTable).where(eq(clientTable.id, clientId)).get()) as SelectClient;
			if (!client) {
				return returnError(
					"Client not found! visit https://auth-painsicle.thedevyash.workers.dev/client/new to create on if you don' have one yet.",
					404
				);
			}

			if (redirectUri) {
				if (client.provider) {
					authorizedProviders = client.provider.split(',') as Provider[];
					const providers_param = new URL(redirectUri).searchParams.get('providers');
					if (providers_param) {
						const clientRequestedProviders: Provider[] = Object.keys(JSON.parse(atob(providers_param || ''))) as Provider[];
						for (const provider of clientRequestedProviders) {
							if (!client.provider.includes(provider)) {
								return returnError('Unauthorized provider requested: ' + provider, 400);
							}
						}
					}
				} else {
					return returnError('No authorized providers found.', 400);
				}
			}
		}

		switch (pathname) {
			case '/':
				return new Response("It's not for you dickhead!!");

			case '/terms_and_conditions':
				const termsHtmlContent = await env.StaticFilesKV.get('terms_and_conditions.html');
				if (!termsHtmlContent) {
					return new Response('Terms and Conditions not found', { status: 404 });
				}
				return new Response(termsHtmlContent, {
					headers: { 'Content-Type': 'text/html' },
				});

			case '/privacy_policy':
				const privacyHtmlContent = await env.StaticFilesKV.get('privacy_policy.html');
				if (!privacyHtmlContent) {
					return new Response('Terms and Conditions not found', { status: 404 });
				}
				return new Response(privacyHtmlContent, {
					headers: { 'Content-Type': 'text/html' },
				});

			case '/client/new':
				if (request.method == 'GET') {
					// serve html from html file clientsPage.html
					const clientsHtmlContent = await env.StaticFilesKV.get('clientsPage.html');
					if (!clientsHtmlContent) {
						return new Response('Clients Page not found', { status: 404 });
					}
					return new Response(clientsHtmlContent, {
						headers: { 'Content-Type': 'text/html' },
					});
				} else {
					return new Response('Method not allowed', { status: 405 });
				}

			case '/api/v1/client/new':
				if (request.method !== 'POST') {
					return new Response('Method Not Allowed', { status: 405 });
				}

				const authHeader = request.headers.get('Authorization');
				if (!authHeader || !authHeader.startsWith('Bearer ')) {
					return new Response('Unauthorized', { status: 401 });
				}

				const token = authHeader.split(' ')[1];
				if (token !== env.TemporaryAdminBearerToken) {
					return new Response('Forbidden', { status: 403 });
				}

				let payload;
				try {
					payload = await request.json();
				} catch (e) {
					return new Response('Invalid JSON payload', { status: 400 });
				}

				const {
					clientName,
					domains,
					providers: clientProviders,
					logo,
				} = payload as {
					clientName: string;
					domains: string;
					providers: string;
					logo: string;
				};

				if (!clientName) {
					return new Response('Client Name is required!', { status: 400 });
				}

				const existingClient = await db.select().from(clientTable).where(eq(clientTable.name, clientName)).get();
				if (existingClient) {
					return new Response('Client with this name already exists!', { status: 400 });
				}

				const domainList = domains.split(',');

				if (domainList.length == 0) {
					return new Response('At least one domain is required!', { status: 400 });
				}

				const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
				for (const domain of domainList) {
					if (!domainRegex.test(domain)) {
						return new Response(`Invalid domain format - ${domain}!`, { status: 400 });
					}
				}

				if (logo && !(await isValidUrl(logo))) {
					return new Response('Invalid logo URL!', { status: 400 });
				}

				if (clientProviders) {
					const providerList = clientProviders.split(',') as typeof availableProviders;
					for (const provider of providerList) {
						if (!availableProviders.includes(provider)) {
							return new Response(`Invalid provider - ${provider}!`, { status: 400 });
						}
					}
				}

				const clientId: string = uuidv4();
				const newClient: InsertClient = {
					id: clientId,
					name: clientName,
					domains: domains,
					provider: clientProviders,
					logo: logo,
				};

				await db.insert(clientTable).values(newClient).execute();

				return new Response(JSON.stringify(newClient), { status: 201 });

			default:
				if (pathname.startsWith('/static/')) {
					return serveStatic(request, env.StaticFilesKV);
				}

				let providers: Record<keyof ProviderConfig, Adapter<any>> = providerConfig(env);
				let providersHidden: Record<string, Record<'hide', boolean>> = {};

				if (redirectUri) {
					const temp:
						| {
								providers: typeof providers;
								providersHidden: Record<keyof ProviderConfig, Record<'hide', boolean>>;
						  }
						| Response = getProvidersWithScopes(redirectUri, authorizedProviders, env);
					if (temp instanceof Response) {
						return temp;
					} else if (Object.keys(temp).length > 0) {
						providers = temp.providers;
						providersHidden = temp.providersHidden;
					}
				}

				return authorizer({
					theme: THEME_TERMINAL,
					select: Select(env, { providers: providersHidden }),
					storage: DrizzleStorage({
						db,
						KVtable: kvTable,
					}),
					subjects,
					providers: providers,
					allow: async (
						input: { clientID: string; redirectURI: string; audience?: string | undefined },
						req: Request
					): Promise<boolean> => {
						const redir = new URL(input.redirectURI).hostname;
						if (redir === 'localhost' || redir === '127.0.0.1') {
							return true;
						}

						console.log('Client ID:', input.clientID);

						const client = (await db.select().from(clientTable).where(eq(clientTable.id, input.clientID)).get()) as SelectClient;

						if (!client || !client.domains) {
							return false;
						}

						const domains: string[] = client.domains.split(',');
						if (!domains.includes(redir)) {
							return false;
						}

						const forwarded = req.headers.get('x-forwarded-host');
						const host = forwarded ? new URL(`https://` + forwarded).hostname : new URL(req.headers.get("referer") || "").hostname;

						console.log(redir, host);

						return isDomainMatch(redir, host);
					},
					success: async (ctx, value: Value) => {
						if (value.provider === 'password') {
							const tokenset = {
								access: '',
								refresh: '',
								expiry: 0,
								raw: {},
							};
							const user = await getUser(value.email, '', '', 'password', db, tokenset);

							return ctx.subject('user', user);
						} else if (value.provider === 'github') {
							const { tokenset } = value;
							const accessToken = tokenset.access;

							const response = await fetch('https://api.github.com/user', {
								headers: {
									Accept: 'application/vnd.github+json',
									Authorization: `Bearer ${accessToken}`,
									'X-GitHub-Api-Version': '2022-11-28',
									'User-Agent': 'Painsicle Auth',
								},
							});

							if (!response.ok) {
								const errorText = await response.text();
								console.error('Error:', errorText);
								throw new Error('Error fetching user info');
							}

							const userInfo = (await response.json()) as { avatar_url: string; name: string; email: string | null };

							if (!userInfo.email) {
								const emailResponse = await fetch('https://api.github.com/user/emails', {
									headers: {
										Accept: 'application/vnd.github+json',
										Authorization: `Bearer ${accessToken}`,
										'X-GitHub-Api-Version': '2022-11-28',
										'User-Agent': 'Painsicle Auth',
									},
								});

								if (!emailResponse.ok) {
									const errorText = await emailResponse.text();
									console.error('Error:', errorText);
									throw new Error('Error fetching user emails');
								}

								const emailInfo = (await emailResponse.json()) as { email: string; primary: boolean; verified: boolean }[];

								const primaryEmail = emailInfo.find((e) => e.primary && e.verified);

								if (!primaryEmail) {
									throw new Error('User primary email not found');
								}

								userInfo.email = primaryEmail.email;
							}

							const user = await getUser(userInfo.email, userInfo.name, userInfo.avatar_url, 'github', db, tokenset);

							return ctx.subject('user', user);
						} else if (value.provider === 'google') {
							const { tokenset } = value;
							const accessToken = tokenset.access;

							const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
								headers: {
									Authorization: `Bearer ${accessToken}`,
								},
							});

							if (!response.ok) {
								const errorText = await response.text();
								console.error('Error:', errorText);
								throw new Error('Error fetching user info');
							}

							const userInfo = (await response.json()) as { picture: string; name: string; email: string };

							const user = await getUser(userInfo.email, userInfo.name, userInfo.picture, 'google', db, tokenset);

							return ctx.subject('user', user);
						}
						throw new Error('Invalid provider');
					},
				}).fetch(request, env, ctx);
		}
	},
};

async function serveStatic(request: Request, StaticFilesKV: KVNamespace): Promise<Response> {
	const url = new URL(request.url);
	const path = url.pathname.replace('/static/', '');
	const fileKey = `static/${path}`;

	try {
		const file = await StaticFilesKV.get(fileKey, { type: 'arrayBuffer' });
		if (!file) {
			return new Response('File not found', { status: 404 });
		}

		return new Response(file, {
			headers: { 'Content-Type': getContentType(fileKey) },
		});
	} catch (e) {
		return new Response('File not found', { status: 404 });
	}
}

function getContentType(filePath: string): string {
	const ext = filePath.split('.').pop();
	switch (ext) {
		case 'html':
			return 'text/html';
		case 'css':
			return 'text/css';
		case 'js':
			return 'application/javascript';
		case 'json':
			return 'application/json';
		case 'png':
			return 'image/png';
		case 'svg':
			return 'image/svg';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		default:
			return 'application/octet-stream';
	}
}

const returnError = (error: string, code: number): Response => {
	return new Response(error, { status: code });
};
