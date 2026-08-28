# 🛡️ AuthentiQ — AI-Based Fake Identity & Document Screening System

> **Team Name**: AuthentiQ  
> **Project Name**: AI-Based Fake Identity & Document Screening System  
> **Built for**: Smart India Hackathon (SIH)

---

## 🌟 Key Features

1. **Role-Based Authentication & ID Allocation System**:
   - **Traveller**: Generates unique ID formatted as `T` + 5 letters + 4 digits (e.g. `TAXYZW1234`).
   - **Officer**: Generates unique ID formatted as `O` + 5 letters + 4 digits (e.g. `OFGHJK5678`).
   - **Collision-Proof**: Guarantees newly allocated User IDs have never been previously assigned.

2. **Clerk Multi-Channel Verification**:
   - Integrated email OTP verification.
   - Integrated mobile SMS OTP verification.

3. **Supabase Cloud Database & RLS**:
   - Stores user profiles, generated User IDs, verification statuses, and screening audit records.
   - Includes ready-to-run SQL schema with Row-Level Security (`supabase/schema.sql`).

4. **Dedicated Role Dashboards**:
   - **Traveller Dashboard (`/dashboard/traveller`)**: Digital Travel Pass, AI Hologram / MRZ document screening simulator, and verification history.
   - **Officer Dashboard (`/dashboard/officer`)**: Real-time screening telemetry, AI forensics inspector, deepfake detection diagnostics, and interception control desk.

---

## 🚀 Quick Start Guide

### 1. Configure Environment Variables (`.env`)
Open `.env` in the root folder and add your keys:

```env
# Clerk Authentication Keys
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here

# Supabase Cloud Database Keys
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Set Up Supabase Database
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) -> Select your project.
2. Open the **SQL Editor**.
3. Copy and run the queries inside [`supabase/schema.sql`](./supabase/schema.sql).

### 3. Run the Development Server
```bash
npm run dev
```

Visit the app in your browser at `http://localhost:5173`.
