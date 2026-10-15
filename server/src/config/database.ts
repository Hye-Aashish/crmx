import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = path.join(__dirname, '..', '..', 'crm.sqlite');
export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export interface PermissionDef {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const AVAILABLE_PERMISSIONS: PermissionDef[] = [
  { id: 'view_analytics', name: 'View Analytics', description: 'Access KPI metrics, revenue cards and charts', category: 'Dashboard' },
  { id: 'export_reports', name: 'Export Reports', description: 'Export sales reports, customer lists, and audit logs', category: 'Dashboard' },
  
  { id: 'view_leads', name: 'View Leads', description: 'Access leads list and view assigned leads', category: 'Leads' },
  { id: 'view_all_leads', name: 'View All Leads', description: 'View leads across all sales reps without restriction', category: 'Leads' },
  { id: 'create_leads', name: 'Create Leads', description: 'Add new leads manually or via lead capture', category: 'Leads' },
  { id: 'edit_leads', name: 'Edit Leads', description: 'Update lead details, add activity logs and remarks', category: 'Leads' },
  { id: 'delete_leads', name: 'Delete Leads', description: 'Remove leads permanently from the CRM', category: 'Leads' },
  { id: 'convert_leads', name: 'Convert Leads', description: '1-Click convert qualified leads into customers', category: 'Leads' },
  { id: 'bulk_actions', name: 'Bulk Lead Actions', description: 'Bulk assign agents and bulk change stages', category: 'Leads' },

  { id: 'view_pipeline', name: 'View Funnel Pipeline', description: 'View Kanban sales funnel board', category: 'Pipeline' },
  { id: 'move_pipeline_stages', name: 'Move Deal Stages', description: 'Drag and drop lead cards between stages', category: 'Pipeline' },
  { id: 'manage_stages', name: 'Manage Stages', description: 'Create, edit, reorder or delete pipeline stages', category: 'Pipeline' },

  { id: 'view_orders', name: 'View Orders', description: 'View order records, amounts, and buyer details', category: 'Orders' },
  { id: 'create_orders', name: 'Create Orders', description: 'Create and place new sales orders', category: 'Orders' },
  { id: 'update_order_location', name: 'Update Transit Tracking', description: 'Log current checkpoints and update tracking statuses', category: 'Orders' },

  { id: 'view_customers', name: 'View Customers', description: 'Access customer profiles and lifetime orders', category: 'Customers' },
  { id: 'edit_customers', name: 'Edit Customers', description: 'Edit customer address, company and contact info', category: 'Customers' },

  { id: 'manage_followups', name: 'Manage Follow-ups', description: 'Schedule, complete and reschedule follow-up reminders', category: 'Follow-ups' },

  { id: 'manage_users', name: 'Manage Users', description: 'Add team members and change user credentials', category: 'Administration' },
  { id: 'manage_roles', name: 'Manage Roles & Permissions', description: 'Create custom roles and customize permission matrices', category: 'Administration' },
  { id: 'manage_forms', name: 'Manage Lead Forms', description: 'Create and configure public lead capture forms and embed codes', category: 'Forms' }
];

export function initDatabase() {
  // Migrate users table if it has restrictive CHECK constraint
  try {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql?: string } | undefined;
    if (tableInfo?.sql && tableInfo.sql.includes("CHECK(role IN")) {
      db.pragma('foreign_keys = OFF');
      db.exec(`
        CREATE TABLE users_migrated (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          phone TEXT,
          avatar TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users_migrated (id, name, email, password, role, phone, avatar, status, created_at, updated_at)
        SELECT id, name, email, password, role, phone, avatar, status, created_at, updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_migrated RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      `);
      db.pragma('foreign_keys = ON');
    }
  } catch (migErr) {
    console.error('Users table check migration note:', migErr);
  }

  // Users & Agents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  // Roles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#10b981',
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_roles_slug ON roles(slug);
  `);

  // Role Permissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_slug TEXT NOT NULL,
      permission TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(role_slug) REFERENCES roles(slug) ON DELETE CASCADE,
      UNIQUE(role_slug, permission)
    );

    CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_slug);
  `);

  // Lead Sources table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_sources (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      icon TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Sales Funnel Stages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS funnel_stages (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      order_index INTEGER NOT NULL,
      color TEXT DEFAULT '#3b82f6',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      phone_normalized TEXT NOT NULL,
      alternate_phone TEXT,
      email TEXT,
      company TEXT,
      city TEXT,
      address TEXT,
      linked_lead_id TEXT,
      assigned_agent_id TEXT,
      total_orders INTEGER DEFAULT 0,
      total_order_value REAL DEFAULT 0,
      latest_order_date DATETIME,
      latest_order_status TEXT,
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone_normalized ON customers(phone_normalized);
    CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
  `);

  // Leads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      lead_code TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      phone_normalized TEXT NOT NULL,
      alternate_phone TEXT,
      email TEXT,
      company_name TEXT,
      city TEXT,
      lead_source TEXT NOT NULL,
      campaign_name TEXT,
      assigned_agent_id TEXT,
      stage_id TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')),
      conversion_likelihood TEXT DEFAULT 'Medium' CHECK(conversion_likelihood IN ('Low', 'Medium', 'High')),
      estimated_deal_value REAL DEFAULT 0,
      is_converted INTEGER DEFAULT 0,
      converted_customer_id TEXT,
      converted_at DATETIME,
      converted_by TEXT,
      lost_reason TEXT,
      next_followup_at DATETIME,
      last_contacted_at DATETIME,
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(stage_id) REFERENCES funnel_stages(id),
      FOREIGN KEY(converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON leads(phone_normalized);
    CREATE INDEX IF NOT EXISTS idx_leads_code ON leads(lead_code);
    CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage_id);
    CREATE INDEX IF NOT EXISTS idx_leads_agent ON leads(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(is_converted);
    CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON leads(next_followup_at);
  `);

  // Lead Activities Timeline
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_activities (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      activity_type TEXT NOT NULL CHECK(activity_type IN ('call', 'whatsapp', 'email', 'meeting', 'note', 'status_change', 'agent_assignment', 'stage_change', 'system')),
      title TEXT NOT NULL,
      notes TEXT,
      outcome TEXT,
      user_id TEXT,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
  `);

  // Follow-ups & Reminders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      customer_id TEXT,
      assigned_user_id TEXT NOT NULL,
      scheduled_at DATETIME NOT NULL,
      purpose TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'rescheduled', 'cancelled')),
      completed_at DATETIME,
      outcome TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_user ON follow_ups(assigned_user_id);
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_code TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_phone_normalized TEXT NOT NULL,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      order_amount REAL NOT NULL,
      payment_status TEXT DEFAULT 'Pending' CHECK(payment_status IN ('Pending', 'Partial', 'Paid', 'Refunded')),
      order_status TEXT DEFAULT 'Order Placed',
      start_location TEXT DEFAULT 'New York Logistics Center',
      current_location TEXT DEFAULT 'Processing Facility',
      end_location TEXT DEFAULT 'Customer Delivery Address',
      last_location_update DATETIME DEFAULT CURRENT_TIMESTAMP,
      expected_delivery_date DATETIME,
      delivery_notes TEXT,
      assigned_staff_id TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY(assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_phone_norm ON orders(customer_phone_normalized);
    CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
  `);

  // Safe table migration for existing database
  try {
    const existingColumns = (db.prepare("PRAGMA table_info(orders)").all() as any[]).map(c => c.name);
    if (!existingColumns.includes('start_location')) {
      db.exec("ALTER TABLE orders ADD COLUMN start_location TEXT DEFAULT 'New York Logistics Center'");
    }
    if (!existingColumns.includes('end_location')) {
      db.exec("ALTER TABLE orders ADD COLUMN end_location TEXT DEFAULT 'Customer Delivery Address'");
    }

    // Update existing orders to English localization
    db.prepare(`
      UPDATE orders SET
        customer_name = 'Robert Miller',
        customer_phone = '+1 (555) 234-5678',
        customer_phone_normalized = '5552345678',
        start_location = 'New York Logistics Center (Warehouse A)',
        current_location = 'Chicago Distribution Center',
        end_location = '742 Evergreen Terrace, New York, NY (Customer Address)'
      WHERE id = 'ord-5001'
    `).run();
    db.prepare(`
      UPDATE orders SET
        customer_name = 'Robert Miller',
        customer_phone = '+1 (555) 234-5678',
        customer_phone_normalized = '5552345678',
        start_location = 'Austin Tech Logistics Depot',
        current_location = 'Boston Fulfillment Hub',
        end_location = 'Suite 400, 100 Broadway, New York, NY (Corporate Office)'
      WHERE id = 'ord-5002'
    `).run();

    // Update users to English names and credentials
    db.prepare(`UPDATE users SET name = 'John Davis (Admin)', phone = '+1 (555) 019-2831' WHERE email = 'admin@crmx.io'`).run();
    db.prepare(`UPDATE users SET name = 'Sarah Jenkins (Sales Head)', phone = '+1 (555) 014-9283' WHERE email = 'manager@crmx.io'`).run();
    db.prepare(`UPDATE users SET name = 'Alex Turner (Senior Agent)', email = 'agent@crmx.io', phone = '+1 (555) 017-8294' WHERE email = 'amit@crmx.io' OR email = 'agent@crmx.io'`).run();
    db.prepare(`UPDATE users SET name = 'Emma Wilson (Agent)', email = 'emma@crmx.io', phone = '+1 (555) 016-3728' WHERE email = 'sneha@crmx.io' OR email = 'emma@crmx.io'`).run();

    // Update customers to English data
    db.prepare(`
      UPDATE customers SET
        name = 'Robert Miller',
        phone = '+1 (555) 234-5678',
        phone_normalized = '5552345678',
        email = 'robert@millerenterprises.com',
        company = 'Miller Global Enterprises',
        city = 'New York',
        address = '742 Evergreen Terrace, New York, NY'
      WHERE id = 'cust-101' OR customer_code = 'CUST-001'
    `).run();
    db.prepare(`
      UPDATE customers SET
        name = 'David Clark',
        phone = '+1 (555) 345-6789',
        phone_normalized = '5553456789',
        email = 'david@apexlogistics.com',
        company = 'Apex Logistics',
        city = 'Chicago',
        address = '123 Michigan Ave, Chicago, IL'
      WHERE customer_code = 'CUST-0002'
    `).run();
    db.prepare(`
      UPDATE customers SET
        name = 'James Anderson',
        phone = '+1 (555) 789-0123',
        phone_normalized = '5557890123',
        email = 'james@andersonco.com',
        company = 'Anderson & Co. Global',
        city = 'Boston',
        address = '450 Boylston St, Boston, MA'
      WHERE customer_code = 'CUST-0003'
    `).run();

    // Update leads to English data
    db.prepare(`UPDATE leads SET customer_name = 'Robert Miller', phone = '+1 (555) 234-5678', phone_normalized = '5552345678', email = 'robert@millerenterprises.com', company_name = 'Miller Global Enterprises', city = 'New York' WHERE id = 'lead-101'`).run();
    db.prepare(`UPDATE leads SET customer_name = 'David Clark', phone = '+1 (555) 345-6789', phone_normalized = '5553456789', email = 'david@apexlogistics.com', company_name = 'Apex Logistics', city = 'Chicago' WHERE id = 'lead-102'`).run();
    db.prepare(`UPDATE leads SET customer_name = 'Emily Watson', phone = '+1 (555) 456-7890', phone_normalized = '5554567890', email = 'emily@technovaresolutions.com', company_name = 'Technovare Solutions', city = 'San Francisco' WHERE id = 'lead-103'`).run();
    db.prepare(`UPDATE leads SET customer_name = 'Michael Taylor', phone = '+1 (555) 567-8901', phone_normalized = '5555678901', email = 'michael@taylormfg.com', company_name = 'Taylor Manufacturing', city = 'Austin' WHERE id = 'lead-104'`).run();
    db.prepare(`UPDATE leads SET customer_name = 'Olivia Harris', phone = '+1 (555) 678-9012', phone_normalized = '5556789012', email = 'olivia@harrishealth.com', company_name = 'Harris Healthcare Systems', city = 'Seattle' WHERE id = 'lead-105'`).run();
    db.prepare(`UPDATE leads SET customer_name = 'James Anderson', phone = '+1 (555) 789-0123', phone_normalized = '5557890123', email = 'james@andersonco.com', company_name = 'Anderson & Co. Global', city = 'Boston' WHERE id = 'lead-106'`).run();

    // Update dynamically created orders & tracking
    db.prepare(`
      UPDATE orders SET
        customer_name = 'James Anderson',
        customer_phone = '+1 (555) 789-0123',
        customer_phone_normalized = '5557890123',
        start_location = 'New York Logistics Center (Warehouse B)',
        current_location = 'Philadelphia Regional Transit Hub',
        end_location = '450 Boylston St, Boston, MA'
      WHERE order_code = 'ORD-0003'
    `).run();

    // Update order tracking
    db.prepare(`UPDATE order_tracking SET location = 'New York Logistics Center (Warehouse A)', updated_by_name = 'John Davis' WHERE id = 'trk-1'`).run();
    db.prepare(`UPDATE order_tracking SET location = 'Chicago Distribution Center', updated_by_name = 'John Davis' WHERE id = 'trk-2'`).run();
    db.prepare(`UPDATE order_tracking SET location = 'Boston Fulfillment Hub', updated_by_name = 'John Davis' WHERE id = 'trk-3'`).run();
    db.prepare(`UPDATE order_tracking SET location = 'Philadelphia Regional Transit Hub', remarks = 'Checkpoint updated: Philadelphia Regional Transit Hub (Status: In Transit)' WHERE location = 'Jaipur National Highway Transit Checkpoint' AND remarks LIKE '%Jaipur%'`).run();
    db.prepare(`UPDATE order_tracking SET location = 'Philadelphia Regional Transit Hub', remarks = 'Truck cleared regional transit hub' WHERE location = 'Jaipur National Highway Transit Checkpoint'`).run();
    db.prepare(`UPDATE order_tracking SET location = 'New York Logistics Center (Warehouse B)', remarks = 'Order initiated: New York Logistics Center (Warehouse B) ➔ Destination: 450 Boylston St, Boston, MA' WHERE location = 'Delhi Warehouse Terminal B'`).run();
    db.prepare(`UPDATE order_tracking SET updated_by_name = 'Alex Turner (Senior Agent)' WHERE updated_by_name = 'Amit Verma (Senior Agent)'`).run();
    db.prepare(`UPDATE order_tracking SET updated_by_name = 'John Davis (Admin)' WHERE updated_by_name = 'Rajesh Sharma (Admin)' OR updated_by_name = 'Rajesh Sharma'`).run();

    // Update lead activities and follow-ups
    db.prepare(`UPDATE lead_activities SET user_name = 'John Davis (Admin)' WHERE user_id = 'usr-admin-1'`).run();
    db.prepare(`UPDATE lead_activities SET user_name = 'Alex Turner (Senior Agent)' WHERE user_id = 'usr-agt-1'`).run();
    db.prepare(`UPDATE follow_ups SET purpose = 'Follow-up with David Clark' WHERE lead_id = 'lead-102'`).run();
    db.prepare(`UPDATE follow_ups SET purpose = 'Follow-up with Emily Watson' WHERE lead_id = 'lead-103'`).run();
    db.prepare(`UPDATE follow_ups SET purpose = 'Follow-up with Michael Taylor' WHERE lead_id = 'lead-104'`).run();
    db.prepare(`UPDATE follow_ups SET purpose = 'Follow-up with Olivia Harris' WHERE lead_id = 'lead-105'`).run();
    db.prepare(`UPDATE follow_ups SET purpose = 'Follow-up with James Anderson' WHERE lead_id = 'lead-106'`).run();
  } catch (err) {
    console.error('Migration error on orders table:', err);
  }

  // Order Tracking History table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_tracking (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      order_status TEXT NOT NULL,
      location TEXT NOT NULL,
      remarks TEXT,
      is_manual INTEGER DEFAULT 1,
      courier_reference TEXT,
      updated_by_id TEXT,
      updated_by_name TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
  `);

  // Audit Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  `);

  // Web Forms table
  db.exec(`
    CREATE TABLE IF NOT EXISTS web_forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      source_name TEXT DEFAULT 'Website Form',
      assigned_agent_id TEXT,
      stage_id TEXT DEFAULT 'stg-1',
      fields TEXT NOT NULL,
      theme_color TEXT DEFAULT '#10b981',
      button_text TEXT DEFAULT 'Submit Inquiry',
      success_message TEXT DEFAULT 'Thank you! Your information has been received. Our team will contact you shortly.',
      redirect_url TEXT,
      submission_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(stage_id) REFERENCES funnel_stages(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_web_forms_slug ON web_forms(slug);
    CREATE INDEX IF NOT EXISTS idx_web_forms_active ON web_forms(is_active);
  `);

  // Auto-grant manage_forms to admin and manager
  try {
    db.prepare("INSERT OR IGNORE INTO role_permissions (id, role_slug, permission) VALUES ('rp-admin-manage_forms', 'admin', 'manage_forms')").run();
    db.prepare("INSERT OR IGNORE INTO role_permissions (id, role_slug, permission) VALUES ('rp-manager-manage_forms', 'manager', 'manage_forms')").run();
  } catch (permErr) {
    console.error('Role permission sync note:', permErr);
  }

  seedInitialData();
}

// Function to normalize phone numbers for robust search
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');
  // If starts with 1 (US / North America) and length 11, take last 10 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(-10);
  }
  // If starts with 91 (India) and length > 10, take last 10 digits for flexible matching
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(-10);
  }
  return digits;
}

function seedInitialData() {
  // Roles & Permissions Seeding
  const existingRoles = db.prepare('SELECT count(*) as count FROM roles').get() as { count: number };
  if (existingRoles.count === 0) {
    const defaultRoles = [
      {
        id: 'role-admin',
        name: 'Administrator',
        slug: 'admin',
        description: 'Super-user with unrestricted access to all operations, security configurations, analytics, and data.',
        color: '#059669', // Emerald
        is_system: 1,
        permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
      },
      {
        id: 'role-manager',
        name: 'Sales Manager',
        slug: 'manager',
        description: 'Supervises sales pipelines, team assignments, customer accounts, and order tracking checkpoints.',
        color: '#0d9488', // Teal
        is_system: 1,
        permissions: [
          'view_analytics', 'view_leads', 'view_all_leads', 'create_leads', 'edit_leads',
          'convert_leads', 'bulk_actions', 'view_pipeline', 'move_pipeline_stages',
          'manage_stages', 'view_orders', 'create_orders', 'update_order_location',
          'view_customers', 'edit_customers', 'manage_followups'
        ]
      },
      {
        id: 'role-agent',
        name: 'Sales Agent',
        slug: 'agent',
        description: 'Front-line sales representative handling assigned leads, follow-ups, and lead-to-customer conversion.',
        color: '#64748b', // Slate
        is_system: 1,
        permissions: [
          'view_leads', 'create_leads', 'edit_leads', 'convert_leads',
          'view_pipeline', 'move_pipeline_stages', 'view_orders',
          'view_customers', 'manage_followups'
        ]
      }
    ];

    const insertRole = db.prepare(`
      INSERT INTO roles (id, name, slug, description, color, is_system)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertPerm = db.prepare(`
      INSERT OR IGNORE INTO role_permissions (id, role_slug, permission)
      VALUES (?, ?, ?)
    `);

    for (const r of defaultRoles) {
      insertRole.run(r.id, r.name, r.slug, r.description, r.color, r.is_system);
      for (const p of r.permissions) {
        insertPerm.run(`rp-${r.slug}-${p}`, r.slug, p);
      }
    }
  }

  // Check if users already exist
  const existingUsers = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (existingUsers.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const adminPassword = bcrypt.hashSync('admin123', salt);
    const managerPassword = bcrypt.hashSync('manager123', salt);
    const agentPassword = bcrypt.hashSync('agent123', salt);

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password, role, phone, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('usr-admin-1', 'John Davis (Admin)', 'admin@crmx.io', adminPassword, 'admin', '+1 (555) 019-2831', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
    insertUser.run('usr-mgr-1', 'Sarah Jenkins (Sales Head)', 'manager@crmx.io', managerPassword, 'manager', '+1 (555) 014-9283', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150');
    insertUser.run('usr-agt-1', 'Alex Turner (Senior Agent)', 'agent@crmx.io', agentPassword, 'agent', '+1 (555) 017-8294', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150');
    insertUser.run('usr-agt-2', 'Emma Wilson (Agent)', 'emma@crmx.io', agentPassword, 'agent', '+1 (555) 016-3728', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150');
  }

  // Lead Sources
  const existingSources = db.prepare('SELECT count(*) as count FROM lead_sources').get() as { count: number };
  if (existingSources.count === 0) {
    const sources = [
      { id: 'src-1', name: 'Manual Entry', icon: 'UserPlus' },
      { id: 'src-2', name: 'Website', icon: 'Globe' },
      { id: 'src-3', name: 'Meta Lead Ads', icon: 'Target' },
      { id: 'src-4', name: 'Facebook', icon: 'Facebook' },
      { id: 'src-5', name: 'Instagram', icon: 'Instagram' },
      { id: 'src-6', name: 'WhatsApp', icon: 'MessageCircle' },
      { id: 'src-7', name: 'Phone Call', icon: 'Phone' },
      { id: 'src-8', name: 'Referral', icon: 'Users' },
      { id: 'src-9', name: 'Other', icon: 'Tag' }
    ];
    const insertSource = db.prepare('INSERT INTO lead_sources (id, name, icon) VALUES (?, ?, ?)');
    for (const s of sources) {
      insertSource.run(s.id, s.name, s.icon);
    }
  }

  // Funnel Stages
  const existingStages = db.prepare('SELECT count(*) as count FROM funnel_stages').get() as { count: number };
  if (existingStages.count === 0) {
    const stages = [
      { id: 'stg-1', name: 'New Lead', order_index: 1, color: '#3b82f6' },
      { id: 'stg-2', name: 'Contact Pending', order_index: 2, color: '#6366f1' },
      { id: 'stg-3', name: 'Contacted', order_index: 3, color: '#8b5cf6' },
      { id: 'stg-4', name: 'Interested', order_index: 4, color: '#06b6d4' },
      { id: 'stg-5', name: 'Follow-up Required', order_index: 5, color: '#eab308' },
      { id: 'stg-6', name: 'Qualified', order_index: 6, color: '#10b981' },
      { id: 'stg-7', name: 'Proposal/Quotation Sent', order_index: 7, color: '#f97316' },
      { id: 'stg-8', name: 'Negotiation', order_index: 8, color: '#ec4899' },
      { id: 'stg-9', name: 'Confirmed', order_index: 9, color: '#14b8a6' },
      { id: 'stg-10', name: 'Converted', order_index: 10, color: '#22c55e' },
      { id: 'stg-11', name: 'Lost', order_index: 11, color: '#ef4444' }
    ];
    const insertStage = db.prepare('INSERT INTO funnel_stages (id, name, order_index, color) VALUES (?, ?, ?, ?)');
    for (const stg of stages) {
      insertStage.run(stg.id, stg.name, stg.order_index, stg.color);
    }
  }

  // Sample Leads & Customers & Orders if empty
  const leadCount = db.prepare('SELECT count(*) as count FROM leads').get() as { count: number };
  if (leadCount.count === 0) {
    // 1. Seed Converted Customer with original lead
    const custId = 'cust-101';
    const custPhone = '+1 (555) 234-5678';
    const normPhone = normalizePhone(custPhone);
    db.prepare(`
      INSERT INTO customers (id, customer_code, name, phone, phone_normalized, email, company, city, address, assigned_agent_id, total_orders, total_order_value, latest_order_date, latest_order_status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `).run(custId, 'CUST-001', 'Robert Miller', custPhone, normPhone, 'robert@millerenterprises.com', 'Miller Global Enterprises', 'New York', '742 Evergreen Terrace, New York, NY', 'usr-agt-1', 2, 85000, 'In Transit', 'usr-admin-1');

    // Linked Lead
    const leadId1 = 'lead-101';
    db.prepare(`
      INSERT INTO leads (id, lead_code, customer_name, phone, phone_normalized, email, company_name, city, lead_source, assigned_agent_id, stage_id, priority, conversion_likelihood, estimated_deal_value, is_converted, converted_customer_id, converted_at, converted_by, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
    `).run(leadId1, 'LD-1001', 'Robert Miller', custPhone, normPhone, 'robert@millerenterprises.com', 'Miller Global Enterprises', 'New York', 'Website', 'usr-agt-1', 'stg-10', 'High', 'High', 85000, 1, custId, 'usr-admin-1', 'Converted after product demo and commercial pricing sign-off.', 'usr-admin-1');

    // Update customer linked_lead_id
    db.prepare('UPDATE customers SET linked_lead_id = ? WHERE id = ?').run(leadId1, custId);

    // Activity for Lead 1
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_id, user_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('act-1', leadId1, 'status_change', 'Lead Converted to Customer', 'Customer account CUST-001 created successfully', 'Converted', 'usr-admin-1', 'John Davis (Admin)');

    // 2. Orders for Customer 1
    const order1Id = 'ord-5001';
    db.prepare(`
      INSERT INTO orders (id, order_code, customer_id, customer_name, customer_phone, customer_phone_normalized, product_name, quantity, order_amount, payment_status, order_status, start_location, current_location, end_location, assigned_staff_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(order1Id, 'ORD-5001', custId, 'Robert Miller', custPhone, normPhone, 'Enterprise CRM Suite Annual License', 1, 60000, 'Paid', 'In Transit', 'New York Logistics Center (Warehouse A)', 'Chicago Distribution Center', '742 Evergreen Terrace, New York, NY (Customer Address)', 'usr-agt-1', 'usr-admin-1');

    // Order 1 tracking
    db.prepare(`
      INSERT INTO order_tracking (id, order_id, order_status, location, remarks, updated_by_id, updated_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('trk-1', order1Id, 'Order Placed', 'New York Logistics Center (Warehouse A)', 'Contract approved, package packed at origin warehouse.', 'usr-admin-1', 'John Davis');
    db.prepare(`
      INSERT INTO order_tracking (id, order_id, order_status, location, remarks, updated_by_id, updated_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('trk-2', order1Id, 'In Transit', 'Chicago Distribution Center', 'Server hardware & security keys reached transit checkpoint.', 'usr-admin-1', 'John Davis');

    const order2Id = 'ord-5002';
    db.prepare(`
      INSERT INTO orders (id, order_code, customer_id, customer_name, customer_phone, customer_phone_normalized, product_name, quantity, order_amount, payment_status, order_status, start_location, current_location, end_location, assigned_staff_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(order2Id, 'ORD-5002', custId, 'Robert Miller', custPhone, normPhone, 'Dedicated Cloud Backup Addon', 1, 25000, 'Paid', 'Confirmed', 'Austin Tech Logistics Depot', 'Boston Fulfillment Hub', 'Suite 400, 100 Broadway, New York, NY (Corporate Office)', 'usr-agt-1', 'usr-admin-1');

    db.prepare(`
      INSERT INTO order_tracking (id, order_id, order_status, location, remarks, updated_by_id, updated_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('trk-3', order2Id, 'Confirmed', 'Boston Fulfillment Hub', 'Cloud provisioning verified and activation scheduled.', 'usr-admin-1', 'John Davis');

    // 3. Active Leads in Different Stages
    const activeLeads = [
      {
        id: 'lead-102',
        code: 'LD-1002',
        name: 'David Clark',
        phone: '+1 (555) 345-6789',
        email: 'david@apexlogistics.com',
        company: 'Apex Logistics',
        city: 'Chicago',
        source: 'Meta Lead Ads',
        stage: 'stg-1', // New Lead
        priority: 'High',
        likelihood: 'High',
        deal: 45000,
        notes: 'Inquired from Facebook lead form about ERP integration.'
      },
      {
        id: 'lead-103',
        code: 'LD-1003',
        name: 'Emily Watson',
        phone: '+1 (555) 456-7890',
        email: 'emily@technovaresolutions.com',
        company: 'Technovare Solutions',
        city: 'San Francisco',
        source: 'WhatsApp',
        stage: 'stg-4', // Interested
        priority: 'Urgent',
        likelihood: 'High',
        deal: 120000,
        notes: 'Requested complete quotation for 25 sales agent seats.'
      },
      {
        id: 'lead-104',
        code: 'LD-1004',
        name: 'Michael Taylor',
        phone: '+1 (555) 567-8901',
        email: 'michael@taylormfg.com',
        company: 'Taylor Manufacturing',
        city: 'Austin',
        source: 'Phone Call',
        stage: 'stg-5', // Follow-up Required
        priority: 'Medium',
        likelihood: 'Medium',
        deal: 35000,
        notes: 'Callback scheduled for tomorrow morning 11 AM.'
      },
      {
        id: 'lead-105',
        code: 'LD-1005',
        name: 'Olivia Harris',
        phone: '+1 (555) 678-9012',
        email: 'olivia@harrishealth.com',
        company: 'Harris Healthcare Systems',
        city: 'Seattle',
        source: 'Referral',
        stage: 'stg-7', // Proposal Sent
        priority: 'High',
        likelihood: 'High',
        deal: 95000,
        notes: 'Formal proposal sent via email. Review meeting scheduled.'
      },
      {
        id: 'lead-106',
        code: 'LD-1006',
        name: 'James Anderson',
        phone: '+1 (555) 789-0123',
        email: 'james@andersonco.com',
        company: 'Anderson & Co. Global',
        city: 'Boston',
        source: 'Manual Entry',
        stage: 'stg-3', // Contacted
        priority: 'Low',
        likelihood: 'Low',
        deal: 18000,
        notes: 'Contacted; budget constraints reported. Re-checking next week.'
      }
    ];

    const today = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    for (let i = 0; i < activeLeads.length; i++) {
      const al = activeLeads[i];
      const pNorm = normalizePhone(al.phone);
      // Diversify dates: 2 for today, 1 for yesterday (overdue), remainder for tomorrow (upcoming)
      const followupDate = i < 2 ? today : (al.id === 'lead-104' ? yesterday : tomorrow);
      db.prepare(`
        INSERT INTO leads (id, lead_code, customer_name, phone, phone_normalized, email, company_name, city, lead_source, assigned_agent_id, stage_id, priority, conversion_likelihood, estimated_deal_value, next_followup_at, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(al.id, al.code, al.name, al.phone, pNorm, al.email, al.company, al.city, al.source, 'usr-agt-1', al.stage, al.priority, al.likelihood, al.deal, followupDate, al.notes, 'usr-admin-1');

      // Initial activity
      db.prepare(`
        INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, user_id, user_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(`act-${al.id}`, al.id, 'call', 'Initial Discovery Call', al.notes, 'usr-agt-1', 'Alex Turner (Senior Agent)');

      // Add a follow-up
      db.prepare(`
        INSERT INTO follow_ups (id, lead_id, assigned_user_id, scheduled_at, purpose, notes, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(`fup-${al.id}`, al.id, 'usr-agt-1', followupDate, `Follow-up with ${al.name}`, al.notes, 'pending', 'usr-admin-1');
    }
  }

  // Seed Default Public Lead Capture Form if none exist
  const existingForms = db.prepare('SELECT count(*) as count FROM web_forms').get() as { count: number };
  if (existingForms.count === 0) {
    const defaultFields = [
      { id: 'field_name', label: 'Full Name', type: 'text', placeholder: 'e.g. Jane Doe', required: true, mapToLeadField: 'customer_name' },
      { id: 'field_phone', label: 'Phone Number', type: 'phone', placeholder: '+1 (555) 234-5678', required: true, mapToLeadField: 'phone' },
      { id: 'field_email', label: 'Business Email', type: 'email', placeholder: 'jane@company.com', required: true, mapToLeadField: 'email' },
      { id: 'field_company', label: 'Company / Organization', type: 'text', placeholder: 'Acme Corporation', required: false, mapToLeadField: 'company_name' },
      { id: 'field_city', label: 'City / Region', type: 'text', placeholder: 'San Francisco, CA', required: false, mapToLeadField: 'city' },
      { id: 'field_budget', label: 'Estimated Deal / Budget (₹)', type: 'number', placeholder: '15000', required: false, mapToLeadField: 'estimated_deal_value' },
      { id: 'field_service', label: 'Interested Solution', type: 'select', placeholder: 'Select solution...', required: false, options: ['Enterprise CRM Suite', 'Cloud Data Migration', 'API & ERP Integration', 'Sales Pipeline Automation', 'Dedicated Account Support'] },
      { id: 'field_notes', label: 'Project Scope & Requirements', type: 'textarea', placeholder: 'Tell us about your team size, current sales workflow, and timeline...', required: false, mapToLeadField: 'notes' }
    ];

    db.prepare(`
      INSERT INTO web_forms (id, title, slug, description, source_name, assigned_agent_id, stage_id, fields, theme_color, button_text, success_message, submission_count, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'form-demo-quote',
      'Enterprise Consultation & Quote Request',
      'consultation-quote',
      'Fill out the details below to receive a personalized CRM consultation and customized pricing proposal from our enterprise team.',
      'Website Contact Form',
      'usr-agt-1',
      'stg-1',
      JSON.stringify(defaultFields),
      '#10b981',
      'Request Free Consultation',
      'Thank you! Your inquiry has been received. One of our enterprise solutions experts will reach out to you within 24 hours.',
      0,
      1,
      'usr-admin-1'
    );
  }
}
