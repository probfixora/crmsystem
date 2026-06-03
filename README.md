# ProbFixora CRM

A comprehensive Customer Relationship Management (CRM) system designed specifically for solar energy companies. This platform manages the entire lifecycle of a solar installation project, from initial customer registration and quotation generation to installation, financing, and subsidy processing.

![ProbFixora CRM](frontend/public/logo3.png) <!-- Update with an actual screenshot or logo path if available -->

## Key Features

- **Role-Based Access Control (RBAC):** Customized dashboards and permissions for various departments including Admin, Sales, Registration, Banking/Finance, Store/Inventory, Installation, Electrical, and Subsidy.
- **Dynamic Case Registration:** Intelligent form that adapts required document checklists based on the customer's occupation (Salaried, Pensioner, Business Owner).
- **Automated Quotation System:** Generates professional PDF quotations based on selected solar panels, inverters, and battery configurations, and automatically emails them to customers.
- **Financial Tracking:** Dedicated modules to track loan approvals, cash payments, EMIs, and down payments.
- **Inventory & Store Management:** Track solar panels, inverters, and balance of systems (BOS), along with dispatch tracking for approved cases.
- **Real-Time Stage History:** Detailed audit logs and timelines for every case to ensure transparency and smooth handoffs between departments.
- **Cloud Document Storage:** Secure uploading and management of customer documents using Supabase Storage.

## 🛠️ Technology Stack

**Frontend:**
- [React.js](https://reactjs.org/) (v19)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React Router](https://reactrouter.com/) for navigation
- [Lucide React](https://lucide.dev/) for iconography
- [React Hot Toast](https://react-hot-toast.com/) for notifications

**Backend & Database:**
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- PostgreSQL (Database & Row Level Security)
- Supabase Edge Functions (Deno/TypeScript) for backend logic, PDF generation, and email workflows
- Supabase Storage for secure document and PDF management

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase account and project

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/probfixora/crmsystem.git
   cd crmsystem
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

3. **Environment Variables**
   Create a `.env` file in the `frontend` directory and add your Supabase credentials:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Frontend**
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

### Backend Setup (Supabase)

1. Ensure you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed.
2. Link your local repository to your Supabase project:
   ```bash
   npx supabase link --project-ref your_project_ref
   ```
3. Push the database schema and migrations:
   ```bash
   npx supabase db push
   ```
4. Deploy the Edge Functions (e.g., workflow, quotation generation):
   ```bash
   npx supabase functions deploy
   ```

## 📂 Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components and page views
│   │   ├── lib/              # Utility functions and Supabase client setup
│   │   ├── App.js            # Main application router
│   │   └── index.js          # React entry point
│   └── package.json          # Frontend dependencies
├── supabase/                 # Supabase backend configuration
│   ├── functions/            # Deno Edge Functions (business logic, emails, PDFs)
│   └── migrations/           # PostgreSQL schema migrations
└── README.md                 # Project documentation
```

## 🔒 Security

- All database access from the frontend is restricted using Supabase Row Level Security (RLS) policies.
- Sensitive business logic and external API calls (like sending emails) are handled securely via Supabase Edge Functions.

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
