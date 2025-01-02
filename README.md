# Painsicle Auth 🍦🔐

Welcome to **Painsicle Auth** – the centralized authentication provider that will make your (my) projects as secure as a vault and as cool as an ice cream truck on a hot summer day! 🍦

## What is Painsicle Auth?

Painsicle Auth is a centralized authentication provider designed to handle all your authentication needs across multiple projects (built on top of [OpenAUTH](https://openauth.js.org/)). Whether you're building a web app, a mobile app, or even a smart fridge app (because why not?), Painsicle Auth has got you covered.

## Features

- **Centralized Authentication**: Manage authentication for all your projects from one place.
- **OAuth Support**: Integrates seamlessly with Google and GitHub OAuth.
- **Cloudflare Workers**: Built specifically to be deployed on Cloudflare Workers for maximum performance and scalability.
- **Drizzle ORM**: Uses Drizzle ORM for database interactions, making your life easier.
- **Humor Included**: Because who said authentication has to be boring?

## Prerequisites

Before you dive into the setup, make sure you have the following:

1. **Google OAuth Application**: Set up a Google OAuth application and get your `client_id` and `client_secret`.
2. **GitHub OAuth Application**: Set up a GitHub OAuth application and get your `client_id` and `client_secret`.
3. **Cloudflare KV Namespace**: Create a Cloudflare KV namespace to store static files and other data.
4. **Turso Database**: Set up a Turso database and get your connection URL and auth token.

## Environment Variables

You'll need to set the following environment variables in your 

wrangler.toml file:

```toml
[vars]
TURSO_CONNECTION_URL="your-turso-connection-url"
TURSO_AUTH_TOKEN="your-turso-auth-token"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
TemporaryAdminBearerToken="your-temporary-admin-bearer-token"
```

and also the kv binding:
```toml
[[kv_namespaces]]
binding = "StaticFilesKV"
id = ""
```

## Setting Up

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/thedevyashsaini/auth.painsicle.git
   cd auth.painsicle
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Update the wrangler.toml file with your environment variables.

4. **Set Up Database Schema**:
   Use Drizzle Kit to push the database schema:
   ```bash
   npx drizzle-kit push
   ```

5. **Deploy to Cloudflare Workers**:
   Deploy your project to Cloudflare Workers with Wrangler:
   ```bash
   npx wrangler deploy
   ```

## How to Use

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```

2. **Access the Authentication Endpoint**:
   Visit `http://localhost:8787` to access the authentication endpoint.

3. **Integrate with Your Projects**:
   Use the provided authentication endpoints in your projects to handle user authentication.

   Check out [this example](https://github.com/openauthjs/openauth/tree/873d1af7ca5f1dfa3d5ced256e80841d12e32d59/examples/client/nextjs) for how to use it with your client.


## Made for Cloudflare Workers

Painsicle Auth is designed specifically to be deployed on Cloudflare Workers, leveraging the power of Cloudflare's global network to provide fast and secure authentication services.

## Contributing

Feel free to open issues and pull requests. Contributions are always welcome! (cuz I know how bad this sh*t is)

---

P.S.: There are a bunch of things this README didn't mention, and I guess there should be something for you to figure out on your own too, so good luck, play around, and have fun!

---

Enjoy your Painsicle Auth experience! 🍦🔐
