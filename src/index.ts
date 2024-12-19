import { authorizer } from '@openauthjs/openauth';
import { type ExecutionContext } from '@cloudflare/workers-types';
import { subjects } from './subjects';
import { providerConfig, getProviders } from './providers';
import { Adapter } from '@openauthjs/openauth/adapter/adapter';
import { Env, Value } from './types';
import { db as dbInit } from './db/index';
import { SelectClient, InsertClient, clientTable, kvTable, usersTable, SelectUser as User } from './db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { DrizzleStorage } from './storage/drizzle';
import { LibSQLDatabase } from 'drizzle-orm/libsql';

async function getUser(email: string, name: string, pfp: string, provider: string, db: LibSQLDatabase): Promise<User> {
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

		return {
			...user,
			...update,
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

		return newUser;
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

		if (clientId) {
			const client: SelectClient = (await db.select().from(clientTable).where(eq(clientTable.id, clientId)).get()) as SelectClient;
			if (!client) {
				throw new Error('Client not found');
			}
			if (client.domains) {
				const domains: string[] = client.domains.split(',');
				if (redirectUri && !domains.includes(new URL(redirectUri).hostname)) {
					throw new Error('Invalid redirect_uri');
				}
			}
		}

		switch (pathname) {
			case '/':
				return new Response("It's not for you dickhead!!");

			case '/privacy_policy':
				const htmlContent: string | null = await env.CloudflareHtmlKV.get('privacy_policy.html');
				if (!htmlContent) {
					return new Response('Privacy Policy not found', { status: 404 });
				}
				return new Response(htmlContent, {
					headers: { 'Content-Type': 'text/html' },
				});

			case '/terms_and_conditions':
				// Serve the terms and conditions HTML file from KV namespace
				const termsHtmlContent = await env.CloudflareHtmlKV.get('terms_and_conditions.html');
				if (!termsHtmlContent) {
					return new Response('Terms and Conditions not found', { status: 404 });
				}
				return new Response(termsHtmlContent, {
					headers: { 'Content-Type': 'text/html' },
				});

			case '/api/client/new':
				const authHeader = request.headers.get('Authorization');
				if (!authHeader || !authHeader.startsWith('Bearer ')) {
					return new Response('Unauthorized', { status: 401 });
				}

				const token = authHeader.split(' ')[1];
				if (token !== env.TemporaryAdminBearerToken) {
					return new Response('Forbidden', { status: 403 });
				}

				const name = url.searchParams.get('name');
				const domains = url.searchParams.get('domains');
				const logo = url.searchParams.get('logo');

				if (!name) {
					return new Response('Client Name is required!', { status: 400 });
				}

				const existingClient = await db.select().from(clientTable).where(eq(clientTable.name, name)).get();
				if (existingClient) {
					return new Response('Client with this name already exists!', { status: 400 });
				}

				if (domains) {
					const domainList = domains.split(',');
					const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
					for (const domain of domainList) {
						if (!domainRegex.test(domain)) {
							return new Response(`Invalid domain format - ${domain}!`, { status: 400 });
						}
					}
				}

				if (logo && !(await isValidUrl(logo))) {
					return new Response('Invalid logo URL!', { status: 400 });
				}

				const clientId: string = uuidv4();
				const newClient: InsertClient = {
					id: clientId,
					name,
					domains: domains || '',
					logo: logo || '',
				};

				await db.insert(clientTable).values(newClient).execute();

				return new Response(JSON.stringify(newClient), { status: 201 });

			default:
				let providers: Record<string, Adapter<any>> = providerConfig(env);

				if (redirectUri) {
					const temp: Record<string, Adapter<any>> | Response = getProviders(redirectUri, env);
					if (temp instanceof Response) {
						return temp;
					} else if (Object.keys(temp).length > 0) {
						providers = temp;
					}
				}

				return authorizer({
					storage: DrizzleStorage({
						db,
						KVtable: kvTable,
					}),
					subjects,
					providers: providers,
					success: async (ctx, value: Value) => {
						if (value.provider === 'password') {
							const user = await getUser(value.email, 'mynameisanthonygoneservice', '', 'password', db);

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

							const user = await getUser(userInfo.email, userInfo.name, userInfo.avatar_url, 'github', db);

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

							const user = await getUser(userInfo.email, userInfo.name, userInfo.picture, 'google', db);

							return ctx.subject('user', user);
						}
						throw new Error('Invalid provider');
					},
				}).fetch(request, env, ctx);
		}
	},
};
