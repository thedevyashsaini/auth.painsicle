/** @jsxImportSource hono/jsx */

import { db as dbInit } from "./db";
import { clientTable, SelectClient } from "./db/schema";
import { Env } from "./types";
import { eq } from 'drizzle-orm';

export interface SelectProps {
	providers?: Record<
		string,
		{
			hide?: boolean;
			display?: string;
		}
	>;
}

export function Select(env: Env, props?: SelectProps) {
	return async (providers: Record<string, string>, _req: Request): Promise<Response> => {

        const clientId = new URL(_req.url).searchParams.get('client_id');
        const db = dbInit(env);

        const reqClient: {logo: string, name: string} = {
            name: "the Client",
            logo: "/static/ClientLogo.svg"
        };

		if (clientId !== null) {
            const client: SelectClient = (await db.select().from(clientTable).where(eq(clientTable.id, clientId)).get()) as SelectClient;
            if (!client) {
				throw new Error('Client not found');
			}
            reqClient.name = client.name;
            if (client.logo) {
                reqClient.logo = client.logo;
            }
        }

		const jsx = (
			<html lang="en">
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
					<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
					<link rel="stylesheet" href="/static/main.css" />
				</head>
				<body>
					<div className="loginForm" style={{}}>
						<div style={{ position: 'relative' }}>
							<div className="loader" style={{ display: 'none' }}></div>
							<img src={'/static/TicketSystemLogo.png'} className={'logoTall'} alt="logo" style={{ height: '120px' }} height="120" />
						</div>
						{
							<>
								<h1>Painsicle Auth</h1>
								<div style={{ margin: '30px 0 50px 0', width: '242px', position: 'relative' }}>
									<svg height="70" alt="User -- Kreiva X Alfaaz" viewBox="0 0 214 62" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path
											d="M31.0001 25.8334C36.707 25.8334 41.3334 21.207 41.3334 15.5001C41.3334 9.79314 36.707 5.16675 31.0001 5.16675C25.2931 5.16675 20.6667 9.79314 20.6667 15.5001C20.6667 21.207 25.2931 25.8334 31.0001 25.8334Z"
											stroke="#7F0019"
											stroke-width="2.5"
										/>
										<path
											d="M51.6615 46.5002C51.6667 46.0765 51.6667 45.6451 51.6667 45.2085C51.6667 38.7889 42.4132 33.5835 31 33.5835C19.5869 33.5835 10.3334 38.7889 10.3334 45.2085C10.3334 51.6281 10.3334 56.8335 31 56.8335C36.7635 56.8335 40.92 56.4279 43.9167 55.7046"
											stroke="#7F0019"
											stroke-width="2.5"
											stroke-linecap="round"
										/>
										<path d="M91 22H133M133 22L126 28M133 22L126 16" stroke="#C2C9CD" />
										<path d="M133 41H91M91 41L98 47M91 41L98 35" stroke="#C2C9CD" />
									</svg>
                                    <img src={reqClient.logo} alt="Client" class="clientLogo" />
								</div>

								<h2>Hello,</h2>
								<h3>You need to verify with Painsicle Auth for accessing {reqClient.name}.</h3>

								{Object.entries(providers).map(([key, type]) => {
									const match = props?.providers?.[key];
									if (match?.hide) return;
									const icon = ICON[key];
									return (
										<>
											<button className="loginBtn">
												<a
													href={`/${key}/authorize`}
													style={{
														textDecoration: 'none',
														color: 'white',
														width: '100%',
														padding: '0',
														margin: '0',
														display: 'flex',
														justifyContent: 'center',
														alignItems: 'center',
													}}
												>
													{icon && icon}
													<span style={type == 'password' ? { fontSize: '0.9em' } : {}}>
														Continue with {match?.display || DISPLAY[type] || type}
													</span>
												</a>
											</button>
										</>
									);
								})}
								<div className="followBackground">
									<span className="follow">FOLLOW US</span>
								</div>
								<Socials />
							</>
						}
					</div>
				</body>
			</html>
		);

		return new Response(jsx.toString(), {
			headers: {
				'Content-Type': 'text/html',
			},
		});
	};
}

const DISPLAY: Record<string, string> = {
	twitch: 'Twitch',
	google: 'Google',
	github: 'GitHub',
};

const ICON: Record<string, any> = {
	code: (
		<svg fill="currentColor" style={{ height: '40px;' }} viewBox="0 0 52 52" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M8.55,36.91A6.55,6.55,0,1,1,2,43.45,6.54,6.54,0,0,1,8.55,36.91Zm17.45,0a6.55,6.55,0,1,1-6.55,6.54A6.55,6.55,0,0,1,26,36.91Zm17.45,0a6.55,6.55,0,1,1-6.54,6.54A6.54,6.54,0,0,1,43.45,36.91ZM8.55,19.45A6.55,6.55,0,1,1,2,26,6.55,6.55,0,0,1,8.55,19.45Zm17.45,0A6.55,6.55,0,1,1,19.45,26,6.56,6.56,0,0,1,26,19.45Zm17.45,0A6.55,6.55,0,1,1,36.91,26,6.55,6.55,0,0,1,43.45,19.45ZM8.55,2A6.55,6.55,0,1,1,2,8.55,6.54,6.54,0,0,1,8.55,2ZM26,2a6.55,6.55,0,1,1-6.55,6.55A6.55,6.55,0,0,1,26,2ZM43.45,2a6.55,6.55,0,1,1-6.54,6.55A6.55,6.55,0,0,1,43.45,2Z"
				fill-rule="evenodd"
			/>
		</svg>
	),
	password: (
		<svg xmlns="http://www.w3.org/2000/svg" style={{ height: '35px;', padding: '4px 0 5px 0;' }} viewBox="0 0 24 24" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
				clip-rule="evenodd"
			/>
		</svg>
	),
	twitch: (
		<svg role="img" xmlns="http://www.w3.org/2000/svg" style={{ height: '40px;', padding: '3px 0 4px 5px;' }} viewBox="0 0 448 512">
			<path
				fill="currentColor"
				d="M40.1 32L10 108.9v314.3h107V480h60.2l56.8-56.8h87l117-117V32H40.1zm357.8 254.1L331 353H224l-56.8 56.8V353H76.9V72.1h321v214zM331 149v116.9h-40.1V149H331zm-107 0v116.9h-40.1V149H224z"
			></path>
		</svg>
	),
	google: (
		<svg
			width="40"
			height="40"
			viewBox="0 0 40 40"
			style={{ height: '50px;', fill: 'white' }}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M36.3425 16.7358H35V16.6666H20V23.3333H29.4192C28.045 27.2141 24.3525 30 20 30C14.4775 30 10 25.5225 10 20C10 14.4775 14.4775 9.99998 20 9.99998C22.5492 9.99998 24.8683 10.9616 26.6342 12.5325L31.3483 7.81831C28.3717 5.04415 24.39 3.33331 20 3.33331C10.7958 3.33331 3.33334 10.7958 3.33334 20C3.33334 29.2041 10.7958 36.6666 20 36.6666C29.2042 36.6666 36.6667 29.2041 36.6667 20C36.6667 18.8825 36.5517 17.7916 36.3425 16.7358Z"
				fill=""
			/>
			<path
				d="M5.255 12.2425L10.7308 16.2583C12.2125 12.59 15.8008 9.99998 20 9.99998C22.5492 9.99998 24.8683 10.9616 26.6342 12.5325L31.3483 7.81831C28.3717 5.04415 24.39 3.33331 20 3.33331C13.5983 3.33331 8.04666 6.94748 5.255 12.2425Z"
				fill=""
			/>
			<path
				d="M20 36.6667C24.305 36.6667 28.2167 35.0192 31.1742 32.34L26.0158 27.975C24.2863 29.2903 22.1729 30.0017 20 30C15.665 30 11.9842 27.2359 10.5975 23.3784L5.1625 27.5659C7.92083 32.9634 13.5225 36.6667 20 36.6667Z"
				fill=""
			/>
			<path
				d="M36.3425 16.7359H35V16.6667H20V23.3334H29.4192C28.7618 25.1804 27.5778 26.7943 26.0133 27.9759L26.0158 27.9742L31.1742 32.3392C30.8092 32.6709 36.6667 28.3334 36.6667 20C36.6667 18.8825 36.5517 17.7917 36.3425 16.7359Z"
				fill=""
			/>
		</svg>
	),
	github: (
		<svg role="img" style={{ height: '50px;', padding: '7px 0', color: 'white' }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512">
			<path
				fill="currentColor"
				d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"
			></path>
		</svg>
	),
};

const Socials = () => {
	return (
		<div className="socials">
			<a href="https://www.instagram.com/academics_committee_iiitv/" target="_blank" rel="noreferrer">
				<i class="fa fa-instagram"></i>
			</a>
			<a href="mailto:academics_committee@iiitvadodara.ac.in" target="_blank" rel="noreferrer">
				<i class="fa fa-envelope"></i>
			</a>
			<a href="tel:+91 6367019081" target="_blank" rel="noreferrer">
				<i class="fa fa-phone"></i>
			</a>
		</div>
	);
};
