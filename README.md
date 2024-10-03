# SaaS Billing App with Cloudflare Workers

This project implements a simple billing app for a SaaS platform using Cloudflare Workers. It supports multiple subscription tiers and handles recurring billing using TypeScript.

## Tech Stack

- **Hono**: A lightweight web framework for Cloudflare Workers. Chosen for its simplicity, excellent integration with Cloudflare, and optimized performance in serverless environments.
- **TypeScript**: For type-safe code and improved developer experience.
- **Cloudflare Workers**: Serverless platform for running our application.
- **Cloudflare KV**: For data storage.
- **Vitest**: For unit and integration testing.

## Setup

### Prerequisites

1. Node.js (v20 or later)
2. pnpm
3. A Cloudflare account

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/saas-billing-app.git
   cd saas-billing-api
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up your Cloudflare account:
   - Create a Cloudflare Workers project
   - Set up KV namespaces for data storage
   - Configure your `wrangler.toml` file with your account details and KV namespace bindings

## Usage

### Development

To run the project in development mode:

```bash
pnpm run dev
```

This will start a local development server, allowing you to test your Cloudflare Worker locally.

### Testing

To run the test suite:

```bash
pnpm run test
```

This will execute all tests using Vitest.

## Deployment

To deploy your worker to Cloudflare:

1. Ensure your `wrangler.toml` is correctly configured.
2. Run:

   ```bash
   pnpm run deploy
   ```

## API Documentation

The API documentation for this project is available as an OpenAPI v3.1 specification. You can access the full API reference by visiting the `/docs` endpoint when the server is running.

This interactive documentation provides detailed information about all available endpoints, including:

- Expected request formats and parameters
- Response schemas and examples
- Error handling strategies and status codes

To explore the API:

1. Start the server (see "Development" section above)
2. Navigate to `/docs` in your web browser
3. Use the interactive interface to test endpoints and view detailed specifications

For the most up-to-date and comprehensive API information, please refer to the `/docs` endpoint.
