# SaaS Billing App with Cloudflare Workers

This project implements a simple billing app for a SaaS platform using Cloudflare Workers. It supports multiple subscription tiers and handles recurring billing using TypeScript.

## Tech Stack

- **Hono**: A lightweight web framework for Cloudflare Workers. Chosen for its simplicity, excellent integration with Cloudflare (it was built by a CF dev and is used internally by CF), and optimized performance in serverless environments.
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
   git clone https://github.com/karimdaghari/saas-billing-app.git
   cd saas-billing-api
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up your Cloudflare account:
   - Create a Cloudflare Workers project
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

[!INFO] You need to be connected to internet to run the docs.

The API documentation for this project is available as an OpenAPI v3.1 specification. You can access the full API reference by visiting the `http://localhost:4200/docs` endpoint when the server is running.

This interactive documentation provides detailed information about all available endpoints, including:

- Expected request formats and parameters
- Response schemas and examples
- Error handling strategies and status codes

To explore the API:

1. Start the server (see "Development" section above)
2. Navigate to `http://localhost:4200/docs` in your web browser
3. Use the interactive interface to test endpoints and view detailed specifications

For the most up-to-date and comprehensive API information, please refer to the `http://localhost:4200/docs` endpoint.

## References

- [Prorated billing 101: What it is, how it works, and how to use it by Stripe](https://stripe.com/en-sg/resources/more/prorated-billing-101-what-it-is-how-it-works-and-how-to-use-it)

## A Step-by-Step Scenario of how to use the app

[!NOTE] This scenario tries to mimic a real-world one. It is also assumed that you're using the api through `/docs` as it offers an integrated requests tester/runner.

1. Create subscription plans, optionally, list them all to double check that they've all been created. And note the ID of one of the plans as you'll be using them later.
2. Create a new customer (note their ID as you'll use it for later)
3. Generate the invoice for the customer (note here that an email should be sent to the customer [so make sure that theirs is a valid one])
4. Check that the invoice has been created (through: `Get customer's invoices`)
5. Optionally, if you want to know what's the customer's active subscription, an API has been created to that effect
6. Pay the invoice (through: `Create payment`)
7. Once the payment goes through (or not) the customer should receive an email

So these are the main steps, but in between, the customer can upgrade/downgrade their plan during which a prorated invoice will be generated.
