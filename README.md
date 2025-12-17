# Rillation Revenue Analytics Hub

A comprehensive analytics dashboard for lead generation performance, built with React, TypeScript, and Supabase.

## Features

- **Quick View**: Overview of all key metrics with trend charts
- **Performance Overview**: Client-by-client breakdown with target comparisons
- **GTM Scoreboard**: Go-to-market performance ratios and conversion rates
- **DeepView**: Detailed reply analysis and categorization
- **Pipeline View**: Sales funnel visualization and forecast spreadsheet

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account with your project set up

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
   ```
   VITE_SUPABASE_URL=https://pfxgcavxdktxooiqthoi.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   
   Navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   ├── charts/          # Chart components (TrendChart, FunnelChart)
│   ├── layout/          # Layout components (Sidebar, Header, TabNavigation)
│   └── ui/              # Reusable UI components (MetricCard, Button, etc.)
├── hooks/               # Custom React hooks for data fetching
├── lib/                 # Supabase client and utilities
├── pages/               # Page components for each dashboard view
├── types/               # TypeScript type definitions
├── App.tsx              # Main app with routing
├── main.tsx             # Entry point
└── index.css            # Global styles with Tailwind
```

## Supabase Tables

The dashboard connects to the following tables:

1. **campaign_reporting** - Daily campaign metrics
2. **replies** - Email reply tracking with categories
3. **meetings_booked** - Booked meetings/discovery calls
4. **Clients** - Client configuration
5. **client_targets** - Daily performance targets
6. **funnel_forecasts** - Monthly forecasting data
7. **inboxes** - Email inbox statistics
8. **storeleads** - Lead database
9. **Campaigns** - Campaign master list

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## License

Private - Rillation Revenue

