# Stellera Pay

![Stellera Logo](public/stellera-logo.svg)

> A comprehensive blockchain payment platform built on the Stellar network.

## Overview

Stellera Pay is a next-generation payment application that leverages the Stellar blockchain to provide fast, low-cost, and user-friendly payment solutions. Our platform integrates username-based payments, group expense management (Splitwise-style), NFT ticketing, and a rewards system to create a complete ecosystem for modern financial transactions.

## Features

### 🔹 Username Pay
- Send payments using usernames instead of complex wallet addresses
- Seamless username resolution to Stellar addresses
- Transaction history and notifications
- Contact management

### 🔹 Splitwise Integration
- Track group expenses and shared bills
- Automated debt calculation and settlement
- Real-time notifications for expense updates
- Optimized payment paths

### 🔹 NFT Ticketing
- Create and sell event tickets as NFTs on the Stellar blockchain
- Secure ticket distribution and ownership verification
- QR code verification for events
- Secondary market for ticket trading

### 🔹 Rewards System
- Earn Stellera Coin (SLR) tokens for platform activity
- 1 SLR per 100 XLM spent on transactions
- Multiple reward programs and redemption options
- SLR token economy with platform utility

### 🔹 Token Swap
- Exchange various Stellar-based assets
- Atomic swaps with USDC
- Slippage protection
- Integrated with Soroban smart contracts

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS
- **Blockchain**: Stellar Network, Soroban Smart Contracts
- **Authentication**: Self-custodial wallet integration
- **Database**: MongoDB
- **API**: Next.js API routes

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm
- MongoDB instance
- Stellar account (testnet for development)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/stellera.git
   cd stellera
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
   MONGODB_URI=your_mongodb_connection_string
   SLR_ISSUER_WALLET=your_slr_issuer_wallet_address
   SLR_ASSET_CODE=SLR
   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
   ```

4. Start the development server:
   ```
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Smart Contract Development

The project includes Soroban smart contracts for advanced functionality:

1. Navigate to the contracts directory:
   ```
   cd contracts/soroban-hello-world
   ```

2. Build the smart contract:
   ```
   cargo build --target wasm32-unknown-unknown --release
   ```

3. Deploy using the Soroban CLI (see Soroban documentation for details).

## Project Structure

- `/app` - Next.js application pages and components
- `/components` - Reusable UI components
- `/lib` - Utility functions and blockchain integration
- `/contracts` - Soroban smart contracts
- `/packages` - JavaScript wrappers for smart contracts
- `/public` - Static assets

## Usage

### Connect Wallet
1. Visit the application homepage
2. Click "Connect Wallet" or create a new wallet
3. Authorize the application to access your Stellar account

### Make Username Payments
1. Navigate to the Username Pay section
2. Enter recipient's username and payment amount
3. Review and confirm transaction

### Split Expenses
1. Create or join a group in the Splitwise section
2. Add expenses with multiple participants
3. Use the settlement feature to clear debts

### Create NFT Tickets
1. Navigate to NFT Tickets section
2. Create a new event with details
3. Set ticket quantities and prices
4. Issue tickets to the Stellar blockchain

## Contributing

We welcome contributions to Stellera Pay! Please review our [contributing guidelines](CONTRIBUTING.md) for details.

## Roadmap

- **Q2 2025**: Core Platform Launch
  - Username Pay
  - Basic Splitwise
  - Rewards System

- **Q3 2025**: 
  - Mobile App Release
  - Additional Payment Methods
  - Advanced Expense Sharing
  - Marketing Campaign

- **Q4 2025**:
  - Business Accounts
  - Enhanced Analytics
  - NFT Marketplace
  - API for Developers

- **Q1 2026**:
  - International Expansion
  - Strategic Partnerships
  - Advanced Smart Contracts
  - Enterprise Solutions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or support:
- Email: contact@stellerapay.com
- Twitter: [@StelleraPay](https://twitter.com/StelleraPay)
- Website: [stellerapay.com](https://stellerapay.com)

---

Built with ❤️ by the Stellera team.
