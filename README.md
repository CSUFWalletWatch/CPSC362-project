*Wallet Watch*
A personal finance web application built for CPSC 362 — Software Engineering at Cal State Fullerton. Wallet Watch helps users track spending, income, savings goals, and overall financial health in one dashboard.
Live App: cpsc-362-project-plum.vercel.app
Features

Dashboard — Real-time net position, monthly spending pace, goal progress, upcoming bills, and net worth chart
Transaction Management — Add, edit, and delete manual transactions with categories and date filtering
Bank Account Linking — Connect real bank accounts via *mock*Plaid to import transactions automatically
Savings Goals — Create goals with target amounts and deadlines, track progress with contributions
Budget Tracking — Set monthly budgets by category, view spending breakdowns
Net Worth Visualization — Interactive line chart with period filters and monthly breakdown table
Upcoming Bills — Track and manage upcoming bills with due dates
Authentication — Secure signup, login, logout, and password recovery via email

Tech Stack

Frontend: React, TypeScript, Vite
Styling: Tailwind CSS, shadcn/ui
Backend/Database: Supabase (PostgreSQL with Row Level Security)
Authentication: Supabase Auth
Bank Integration: *mock*Plaid API (via Supabase Edge Functions)
Hosting: Vercel
Charts: Recharts

System Requirements

Node.js 18+
npm or bun

Installation
bash# Clone the repository
git clone https://github.com/CSUFWalletWatch/CPSC362-project.git
cd CPSC362-project

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Start the development server
npm run dev
The app will be available at http://localhost:5173.
Team Members

Diyar Tohomer — Project Lead, Web Application Framework, Supabase Setup, Transaction Categorization...
Luc Brown — Authentication, User Accounts, Savings Goals, Transaction History, Budget Feature...
George El-Abed — Dashboard (Real Data Integration), Net Worth Chart, Vercel Deployment, Auth Database...
Nyela R. — 
