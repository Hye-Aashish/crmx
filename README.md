# CRMX — Enterprise CRM & Order Management System

A production-ready, full-stack CRM and Order Management System built with **React (TypeScript, Tailwind CSS)** and **Node.js (Express, SQLite)**.

---

## 🌟 Key Features Delivered

1. **📊 Real-Time Analytics Dashboard**
   - 4 Dynamic KPI Cards: *Total Leads*, *Active Leads*, *Converted Leads*, and *Total Orders*.
   - Filter by date range: *Today*, *Last 7 Days*, *This Month*, *Last Month*, *All Time*.
   - Sales Funnel stage distribution, lead source performance, and agent conversion leaderboard.
   - Live overdue and upcoming follow-up alert queues.

2. **👥 Advanced Lead Management**
   - Unique automated Lead Code generation (`LD-1001`, `LD-1002`, ...).
   - Detailed contact info: Name, primary/secondary phone, email, company, city, deal value.
   - Full communication and activity timeline: phone calls, WhatsApp messages, meetings, notes, status changes.
   - Quick action modal: log call outcome & schedule next callback without page reloads.
   - Bulk agent reassignment and bulk funnel stage updates.

3. **🔄 Visual Drag-and-Drop Sales Funnel (Kanban Pipeline)**
   - Drag lead cards smoothly across stages: *New Lead, Contact Pending, Contacted, Interested, Follow-up Required, Qualified, Proposal Sent, Negotiation, Confirmed, Converted, Lost*.
   - Real-time database persistence upon drop with permanent audit timeline logging.
   - Automatic Lost reason capture when dropped into the Lost stage.
   - Live header metrics showing lead count and total estimated deal value per stage.

4. **⚡ One-Click Lead-to-Customer Conversion**
   - Safe atomic database transaction.
   - Converts lead to customer profile (`CUST-001`, `CUST-002`, ...), preserves all contact details and linked lead timeline.
   - Prevents duplicate customer creation if phone number already exists in customer database.

5. **📦 Order Management & Manual Location Tracking**
   - Manage orders manually for customers (`ORD-5001`, `ORD-5002`, ...).
   - **Manual Location Updates**: Admin/Staff can update transit hubs (e.g. *New York Logistics Center*, *Chicago Distribution Center*), statuses (*In Transit, Out for Delivery, Delivered*), and dispatch remarks.
   - Visual historical tracking timeline on order details with timestamps and user attribution.

6. **🔍 Centralized Global Phone Search**
   - Accessible from every CRM screen via universal header search bar.
   - Normalizes phone numbers (+1, international, spaces, dashes) to match reliably.
   - Unified 3-in-1 result: Customer Account + Origin Lead History + All Linked Orders with statuses and current recorded locations.

7. **📝 Custom Web Form Builder & Public Lead Capture**
   - Visual drag-and-drop form designer with customizable fields, colors, presets, and button text.
   - Generates standalone public shareable links (`/?form=<slug>`) requiring no login.
   - Generates responsive `<iframe>` embed codes for WordPress, Webflow, Shopify, or landing pages.
   - Automatically captures submissions into the CRM pipeline with agent assignment and activity logs.

8. **🛡️ Role-Based Access Control (RBAC)**
   - **Admin**: Full access to all leads, customers, orders, analytics, forms, and user creation.
   - **Manager**: Team-wide view, lead assignments, and pipeline monitoring.
   - **Agent**: Restricted to viewing only assigned leads, scheduling callbacks, and converting leads.
   - Fast 1-click role switcher directly in the UI for effortless testing and evaluation.

---

## 🔑 Default Login Credentials

| Role | Email | Password | Access Level |
|---|---|---|---|
| **Admin** | `admin@crmx.io` | `admin123` | Full System Access (John Davis) |
| **Manager** | `manager@crmx.io` | `manager123` | Sales Head / Team View (Sarah Jenkins) |
| **Agent** | `agent@crmx.io` | `agent123` | Senior Agent (Alex Turner) |
| **Agent** | `emma@crmx.io` | `agent123` | Field Agent (Emma Wilson) |

---

## 🚀 Running the Project

### 1. Start the Backend API (Server)
```bash
cd server
npm run dev
```
*Backend runs at:* `http://localhost:5000`  
*Health Check:* `http://localhost:5000/api/health`

### 2. Start the Frontend (Client)
```bash
cd client
npm run dev
```
*Frontend runs at:* `http://localhost:5173`

---

## 🛠️ Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React icons, Vite
- **Backend**: Node.js, Express, SQLite (`better-sqlite3`), JSON Web Tokens (JWT), bcryptjs
- **Database**: Embedded SQLite with WAL mode, foreign keys, and indexes on phone numbers, codes, and IDs
