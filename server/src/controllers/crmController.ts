import { Response } from 'express';
import { db, normalizePhone, AVAILABLE_PERMISSIONS } from '../config/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { syncRecordToMongo, deleteRecordFromMongo } from '../config/mongodb';
import bcrypt from 'bcryptjs';

// --- HELPER FUNCTIONS ---
function generateCode(prefix: string, table: string, column: string): string {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
  const num = (row.count + 1).toString().padStart(4, '0');
  const code = `${prefix}-${num}`;
  // Ensure uniqueness
  const exists = db.prepare(`SELECT id FROM ${table} WHERE ${column} = ?`).get(code);
  if (exists) {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return code;
}

function logAudit(userId: string | undefined, userName: string | undefined, action: string, entityType: string, entityId: string | string[], details: string) {
  try {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const auditRecord = {
      id,
      user_id: userId || 'system',
      user_name: userName || 'System',
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      details,
      created_at: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, auditRecord.user_id, auditRecord.user_name, action, entityType, String(entityId), details);

    // Sync audit log to MongoDB Atlas
    syncRecordToMongo('audit_logs', auditRecord);

    // Automatically sync updated or created entity to MongoDB Atlas
    const tableMap: Record<string, string> = {
      lead: 'leads',
      customer: 'customers',
      order: 'orders',
      user: 'users',
      role: 'roles',
      funnel_stage: 'funnel_stages',
      follow_up: 'follow_ups',
      lead_activity: 'lead_activities',
      web_form: 'web_forms'
    };

    const targetTable = tableMap[entityType];
    if (targetTable && typeof entityId === 'string') {
      if (action.startsWith('DELETE')) {
        deleteRecordFromMongo(targetTable, entityId);
      } else {
        const updatedRow = db.prepare(`SELECT * FROM ${targetTable} WHERE id = ?`).get(entityId);
        if (updatedRow) {
          syncRecordToMongo(targetTable, updatedRow);
        }
      }
    }
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// ================= AUTH CONTROLLERS =================
export const login = (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { generateToken } = require('../middleware/auth');
  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  const { password: _, ...userWithoutPassword } = user;
  return res.json({ token, user: userWithoutPassword });
};

export const getMe = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  const user = db.prepare('SELECT id, name, email, role, phone, avatar, status FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });
  const perms = db.prepare('SELECT permission FROM role_permissions WHERE role_slug = ?').all(user.role) as { permission: string }[];
  user.permissions = perms.map(p => p.permission);
  return res.json(user);
};

// ================= USERS & AGENTS CONTROLLERS =================
export const getUsers = (req: AuthenticatedRequest, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, phone, avatar, status, created_at FROM users ORDER BY name ASC').all();
  return res.json(users);
};

export const createUser = (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const id = `usr-${Date.now()}`;
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, phone, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, email, hashedPassword, role, phone || '', `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`);

  logAudit(req.user?.id, req.user?.name, 'CREATE_USER', 'user', id, `Created user ${name} with role ${role}`);
  return res.status(201).json({ message: 'User created successfully', id });
};

export const updateUserRole = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'Role is required' });
  }

  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const roleExists = db.prepare('SELECT slug FROM roles WHERE slug = ?').get(role);
  if (!roleExists) {
    return res.status(400).json({ error: `Role '${role}' does not exist` });
  }

  db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(role, id);
  logAudit(req.user?.id, req.user?.name, 'UPDATE_USER_ROLE', 'user', id, `Changed role of user ${user.name} to ${role}`);

  return res.json({ message: 'User role updated successfully' });
};

export const deleteUser = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (req.user?.id === id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  logAudit(req.user?.id, req.user?.name, 'DELETE_USER', 'user', id, `Deleted user ${user.name}`);

  return res.json({ message: 'User deleted successfully' });
};

// ================= ROLES & PERMISSIONS CONTROLLERS =================
export const getRoles = (req: AuthenticatedRequest, res: Response) => {
  const roles = db.prepare('SELECT * FROM roles ORDER BY is_system DESC, name ASC').all() as any[];
  const perms = db.prepare('SELECT role_slug, permission FROM role_permissions').all() as any[];
  const userCounts = db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all() as any[];
  
  const countMap: Record<string, number> = {};
  for (const uc of userCounts) {
    countMap[uc.role] = uc.count;
  }

  const permMap: Record<string, string[]> = {};
  for (const p of perms) {
    if (!permMap[p.role_slug]) permMap[p.role_slug] = [];
    permMap[p.role_slug].push(p.permission);
  }

  const result = roles.map(r => ({
    ...r,
    permissions: permMap[r.slug] || [],
    user_count: countMap[r.slug] || 0
  }));

  return res.json(result);
};

export const getAvailablePermissions = (req: AuthenticatedRequest, res: Response) => {
  return res.json(AVAILABLE_PERMISSIONS);
};

export const createRole = (req: AuthenticatedRequest, res: Response) => {
  const { name, slug, description, color, permissions } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Role name is required' });
  }

  let finalSlug = slug ? slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_') : name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (!finalSlug) {
    finalSlug = `role_${Date.now()}`;
  }

  const existing = db.prepare('SELECT id FROM roles WHERE slug = ?').get(finalSlug);
  if (existing) {
    return res.status(400).json({ error: `A role with identifier '${finalSlug}' already exists.` });
  }

  const id = `role-${Date.now()}`;
  const roleColor = color || '#10b981';

  db.prepare(`
    INSERT INTO roles (id, name, slug, description, color, is_system)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(id, name.trim(), finalSlug, description || '', roleColor);

  if (Array.isArray(permissions) && permissions.length > 0) {
    const insertPerm = db.prepare(`
      INSERT OR IGNORE INTO role_permissions (id, role_slug, permission)
      VALUES (?, ?, ?)
    `);
    for (const p of permissions) {
      insertPerm.run(`rp-${finalSlug}-${p}`, finalSlug, p);
    }
  }

  logAudit(req.user?.id, req.user?.name, 'CREATE_ROLE', 'role', id, `Created role '${name}' (${finalSlug})`);
  return res.status(201).json({ message: 'Role created successfully', id, slug: finalSlug });
};

export const updateRolePermissions = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;

  const role = db.prepare('SELECT * FROM roles WHERE id = ? OR slug = ?').get(id, id) as any;
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  if (role.slug === 'admin') {
    return res.status(400).json({ error: 'Administrator role retains all permissions permanently.' });
  }

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array of strings' });
  }

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_slug = ?').run(role.slug);
    const insertPerm = db.prepare(`
      INSERT INTO role_permissions (id, role_slug, permission)
      VALUES (?, ?, ?)
    `);
    for (const p of permissions) {
      insertPerm.run(`rp-${role.slug}-${p}-${Date.now()}`, role.slug, p);
    }
  });

  transaction();
  logAudit(req.user?.id, req.user?.name, 'UPDATE_ROLE_PERMISSIONS', 'role', role.id, `Updated permissions for role ${role.name}`);

  return res.json({ message: 'Role permissions updated successfully' });
};

export const updateRole = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, color } = req.body;

  const role = db.prepare('SELECT * FROM roles WHERE id = ? OR slug = ?').get(id, id) as any;
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  db.prepare(`
    UPDATE roles
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        color = COALESCE(?, color)
    WHERE id = ?
  `).run(name, description, color, role.id);

  logAudit(req.user?.id, req.user?.name, 'UPDATE_ROLE', 'role', role.id, `Updated role ${role.name}`);
  return res.json({ message: 'Role updated successfully' });
};

export const deleteRole = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const role = db.prepare('SELECT * FROM roles WHERE id = ? OR slug = ?').get(id, id) as any;
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  if (role.is_system === 1) {
    return res.status(400).json({ error: 'System standard roles cannot be deleted.' });
  }

  const assignedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role.slug) as { count: number };
  if (assignedUsers.count > 0) {
    return res.status(400).json({ error: `Cannot delete role. There are ${assignedUsers.count} users currently assigned to this role. Reassign them first.` });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_slug = ?').run(role.slug);
    db.prepare('DELETE FROM roles WHERE id = ?').run(role.id);
  })();

  logAudit(req.user?.id, req.user?.name, 'DELETE_ROLE', 'role', role.id, `Deleted role ${role.name}`);
  return res.json({ message: 'Role deleted successfully' });
};

// ================= SOURCES & STAGES CONTROLLERS =================
export const getSources = (req: AuthenticatedRequest, res: Response) => {
  const sources = db.prepare('SELECT * FROM lead_sources WHERE is_active = 1 ORDER BY name ASC').all();
  return res.json(sources);
};

export const createSource = (req: AuthenticatedRequest, res: Response) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Source name is required' });
  const id = `src-${Date.now()}`;
  try {
    db.prepare('INSERT INTO lead_sources (id, name, icon) VALUES (?, ?, ?)').run(id, name, icon || 'Tag');
    return res.status(201).json({ message: 'Source created', id });
  } catch (err: any) {
    return res.status(400).json({ error: 'Source already exists' });
  }
};

export const getFunnelStages = (req: AuthenticatedRequest, res: Response) => {
  const stages = db.prepare(`
    SELECT fs.*, 
      COUNT(l.id) as lead_count,
      COALESCE(SUM(l.estimated_deal_value), 0) as total_deal_value
    FROM funnel_stages fs
    LEFT JOIN leads l ON l.stage_id = fs.id AND l.is_converted = 0
    WHERE fs.is_active = 1
    GROUP BY fs.id
    ORDER BY fs.order_index ASC
  `).all();
  return res.json(stages);
};

export const createFunnelStage = (req: AuthenticatedRequest, res: Response) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Stage name is required' });
  }

  // Get next order index
  const lastStage = db.prepare('SELECT MAX(order_index) as max_idx FROM funnel_stages').get() as { max_idx: number | null };
  const nextIdx = (lastStage?.max_idx || 0) + 1;
  const id = `stg-${Date.now()}`;

  try {
    db.prepare(`
      INSERT INTO funnel_stages (id, name, order_index, color, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(id, name.trim(), nextIdx, color || '#6366f1');

    logAudit(req.user?.id, req.user?.name, 'CREATE_STAGE', 'funnel_stage', id, `Created stage ${name}`);
    return res.status(201).json({ message: 'Stage created successfully', id });
  } catch (err: any) {
    return res.status(400).json({ error: 'A stage with this name already exists' });
  }
};

export const updateFunnelStage = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, color, order_index } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Stage name is required' });
  }

  try {
    db.prepare(`
      UPDATE funnel_stages 
      SET name = ?, color = COALESCE(?, color), order_index = COALESCE(?, order_index)
      WHERE id = ?
    `).run(name.trim(), color, order_index, id);

    logAudit(req.user?.id, req.user?.name, 'UPDATE_STAGE', 'funnel_stage', id, `Updated stage ${name}`);
    return res.json({ message: 'Stage updated successfully' });
  } catch (err: any) {
    return res.status(400).json({ error: 'Failed to update stage: ' + err.message });
  }
};

export const deleteFunnelStage = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { fallback_stage_id } = req.body;

  // Check how many leads currently belong to this stage
  const leadsInStage = db.prepare('SELECT COUNT(*) as count FROM leads WHERE stage_id = ?').get(id) as { count: number };

  if (leadsInStage.count > 0) {
    if (!fallback_stage_id) {
      // Find default fallback stage (any other stage)
      const altStage = db.prepare('SELECT id, name FROM funnel_stages WHERE id != ? AND is_active = 1 LIMIT 1').get(id) as { id: string; name: string } | undefined;
      if (!altStage) {
        return res.status(400).json({ error: 'Cannot delete the only available stage' });
      }
      // Reassign leads to fallback
      db.prepare('UPDATE leads SET stage_id = ? WHERE stage_id = ?').run(altStage.id, id);
    } else {
      db.prepare('UPDATE leads SET stage_id = ? WHERE stage_id = ?').run(fallback_stage_id, id);
    }
  }

  db.prepare('DELETE FROM funnel_stages WHERE id = ?').run(id);
  logAudit(req.user?.id, req.user?.name, 'DELETE_STAGE', 'funnel_stage', id, `Deleted stage ${id}`);
  return res.json({ message: 'Stage deleted successfully' });
};

export const reorderFunnelStages = (req: AuthenticatedRequest, res: Response) => {
  const { stages } = req.body; // array of { id, order_index } or array of stage IDs in desired order
  if (!Array.isArray(stages)) {
    return res.status(400).json({ error: 'stages array is required' });
  }

  const updateStmt = db.prepare('UPDATE funnel_stages SET order_index = ? WHERE id = ?');
  const tx = db.transaction((items) => {
    items.forEach((item: any, index: number) => {
      const stageId = typeof item === 'string' ? item : item.id;
      const orderIdx = typeof item === 'object' && item.order_index !== undefined ? item.order_index : index + 1;
      updateStmt.run(orderIdx, stageId);
    });
  });

  tx(stages);
  logAudit(req.user?.id, req.user?.name, 'REORDER_STAGES', 'funnel_stages', 'all', 'Reordered pipeline stages sequence');
  return res.json({ message: 'Stages reordered successfully' });
};

// ================= LEADS CONTROLLERS =================
export const getLeads = (req: AuthenticatedRequest, res: Response) => {
  const { stage_id, source, agent_id, priority, likelihood, status, search, from_date, to_date, page = 1, limit = 50 } = req.query;

  let query = `
    SELECT l.*, 
      u.name as assigned_agent_name, 
      fs.name as stage_name, 
      fs.color as stage_color
    FROM leads l
    LEFT JOIN users u ON l.assigned_agent_id = u.id
    LEFT JOIN funnel_stages fs ON l.stage_id = fs.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Role filtering: agent only sees their own leads
  if (req.user?.role === 'agent') {
    query += ` AND l.assigned_agent_id = ?`;
    params.push(req.user.id);
  } else if (agent_id) {
    query += ` AND l.assigned_agent_id = ?`;
    params.push(agent_id);
  }

  if (stage_id) {
    query += ` AND l.stage_id = ?`;
    params.push(stage_id);
  }
  if (source) {
    query += ` AND l.lead_source = ?`;
    params.push(source);
  }
  if (priority) {
    query += ` AND l.priority = ?`;
    params.push(priority);
  }
  if (likelihood) {
    query += ` AND l.conversion_likelihood = ?`;
    params.push(likelihood);
  }
  if (status === 'converted') {
    query += ` AND l.is_converted = 1`;
  } else if (status === 'lost') {
    query += ` AND fs.name = 'Lost'`;
  } else if (status === 'active') {
    query += ` AND l.is_converted = 0 AND fs.name != 'Lost'`;
  }

  if (from_date) {
    query += ` AND date(l.created_at) >= date(?)`;
    params.push(from_date);
  }
  if (to_date) {
    query += ` AND date(l.created_at) <= date(?)`;
    params.push(to_date);
  }

  if (search) {
    const s = `%${search}%`;
    const sNorm = `%${normalizePhone(String(search))}%`;
    query += ` AND (l.customer_name LIKE ? OR l.lead_code LIKE ? OR l.company_name LIKE ? OR l.phone LIKE ? OR l.phone_normalized LIKE ?)`;
    params.push(s, s, s, s, sNorm);
  }

  query += ` ORDER BY l.created_at DESC`;

  const offset = (Number(page) - 1) * Number(limit);
  const pagedQuery = `${query} LIMIT ? OFFSET ?`;
  const pagedParams = [...params, Number(limit), offset];

  const leads = db.prepare(pagedQuery).all(...pagedParams);
  const totalCount = db.prepare(`SELECT count(*) as total FROM (${query})`).get(...params) as { total: number };

  return res.json({
    data: leads,
    pagination: {
      total: totalCount.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount.total / Number(limit))
    }
  });
};

export const getLeadById = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const lead = db.prepare(`
    SELECT l.*, 
      u.name as assigned_agent_name, 
      fs.name as stage_name, 
      fs.color as stage_color
    FROM leads l
    LEFT JOIN users u ON l.assigned_agent_id = u.id
    LEFT JOIN funnel_stages fs ON l.stage_id = fs.id
    WHERE l.id = ?
  `).get(id) as any;

  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  // Permissions check for agent
  if (req.user?.role === 'agent' && lead.assigned_agent_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this lead' });
  }

  const activities = db.prepare(`
    SELECT * FROM lead_activities 
    WHERE lead_id = ? 
    ORDER BY created_at DESC
  `).all(id);

  const followups = db.prepare(`
    SELECT f.*, u.name as assigned_user_name 
    FROM follow_ups f
    LEFT JOIN users u ON f.assigned_user_id = u.id
    WHERE f.lead_id = ? 
    ORDER BY f.scheduled_at DESC
  `).all(id);

  return res.json({ lead, activities, followups });
};

export const createLead = (req: AuthenticatedRequest, res: Response) => {
  const {
    customer_name,
    phone,
    alternate_phone,
    email,
    company_name,
    city,
    lead_source,
    campaign_name,
    assigned_agent_id,
    stage_id,
    priority,
    conversion_likelihood,
    estimated_deal_value,
    notes,
    next_followup_at
  } = req.body;

  if (!customer_name || !phone || !lead_source) {
    return res.status(400).json({ error: 'Customer name, phone number, and lead source are required' });
  }

  const id = `lead-${Date.now()}`;
  const lead_code = generateCode('LD', 'leads', 'lead_code');
  const phone_normalized = normalizePhone(phone);

  // Default stage to first stage if not provided
  let targetStageId = stage_id;
  if (!targetStageId) {
    const firstStage = db.prepare('SELECT id FROM funnel_stages ORDER BY order_index ASC LIMIT 1').get() as { id: string };
    targetStageId = firstStage?.id || 'stg-1';
  }

  const agentId = assigned_agent_id || (req.user?.role === 'agent' ? req.user.id : null);

  const insert = db.prepare(`
    INSERT INTO leads (
      id, lead_code, customer_name, phone, phone_normalized, alternate_phone, email,
      company_name, city, lead_source, campaign_name, assigned_agent_id, stage_id,
      priority, conversion_likelihood, estimated_deal_value, notes, next_followup_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    lead_code,
    customer_name,
    phone,
    phone_normalized,
    alternate_phone || null,
    email || null,
    company_name || null,
    city || null,
    lead_source,
    campaign_name || null,
    agentId,
    targetStageId,
    priority || 'Medium',
    conversion_likelihood || 'Medium',
    Number(estimated_deal_value) || 0,
    notes || null,
    next_followup_at || null,
    req.user?.id || 'system'
  );

  // Log creation activity
  db.prepare(`
    INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, user_id, user_name)
    VALUES (?, ?, 'system', 'Lead Created', ?, ?, ?)
  `).run(`act-${Date.now()}`, id, `Created lead from source: ${lead_source}`, req.user?.id, req.user?.name);

  // If next follow-up specified, create follow-up record
  if (next_followup_at) {
    db.prepare(`
      INSERT INTO follow_ups (id, lead_id, assigned_user_id, scheduled_at, purpose, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `fup-${Date.now()}`,
      id,
      agentId || req.user?.id,
      next_followup_at,
      'Initial follow-up',
      notes || 'Scheduled upon lead creation',
      req.user?.id
    );
  }

  logAudit(req.user?.id, req.user?.name, 'CREATE_LEAD', 'lead', id, `Created lead ${lead_code} (${customer_name})`);

  return res.status(201).json({ message: 'Lead created successfully', id, lead_code });
};

export const updateLead = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const {
    customer_name,
    phone,
    alternate_phone,
    email,
    company_name,
    city,
    lead_source,
    campaign_name,
    assigned_agent_id,
    stage_id,
    priority,
    conversion_likelihood,
    estimated_deal_value,
    notes,
    lost_reason,
    next_followup_at
  } = req.body;

  const phone_normalized = phone ? normalizePhone(phone) : lead.phone_normalized;

  // Track changes for timeline
  if (assigned_agent_id && assigned_agent_id !== lead.assigned_agent_id) {
    const newAgent = db.prepare('SELECT name FROM users WHERE id = ?').get(assigned_agent_id) as any;
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, user_id, user_name)
      VALUES (?, ?, 'agent_assignment', 'Agent Reassigned', ?, ?, ?)
    `).run(`act-${Date.now()}-1`, id, `Assigned to ${newAgent?.name || 'Agent'}`, req.user?.id, req.user?.name);
  }

  if (stage_id && stage_id !== lead.stage_id) {
    const newStage = db.prepare('SELECT name FROM funnel_stages WHERE id = ?').get(stage_id) as any;
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_id, user_name)
      VALUES (?, ?, 'stage_change', 'Funnel Stage Updated', ?, ?, ?, ?)
    `).run(`act-${Date.now()}-2`, id, `Moved to stage: ${newStage?.name || stage_id}`, newStage?.name, req.user?.id, req.user?.name);
  }

  db.prepare(`
    UPDATE leads SET
      customer_name = COALESCE(?, customer_name),
      phone = COALESCE(?, phone),
      phone_normalized = COALESCE(?, phone_normalized),
      alternate_phone = COALESCE(?, alternate_phone),
      email = COALESCE(?, email),
      company_name = COALESCE(?, company_name),
      city = COALESCE(?, city),
      lead_source = COALESCE(?, lead_source),
      campaign_name = COALESCE(?, campaign_name),
      assigned_agent_id = COALESCE(?, assigned_agent_id),
      stage_id = COALESCE(?, stage_id),
      priority = COALESCE(?, priority),
      conversion_likelihood = COALESCE(?, conversion_likelihood),
      estimated_deal_value = COALESCE(?, estimated_deal_value),
      notes = COALESCE(?, notes),
      lost_reason = COALESCE(?, lost_reason),
      next_followup_at = COALESCE(?, next_followup_at),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    customer_name,
    phone,
    phone_normalized,
    alternate_phone,
    email,
    company_name,
    city,
    lead_source,
    campaign_name,
    assigned_agent_id,
    stage_id,
    priority,
    conversion_likelihood,
    estimated_deal_value !== undefined ? Number(estimated_deal_value) : null,
    notes,
    lost_reason,
    next_followup_at,
    id
  );

  return res.json({ message: 'Lead updated successfully' });
};

// Update Stage (Drag and Drop Endpoint)
export const updateLeadStage = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { stage_id, lost_reason } = req.body;

  if (!stage_id) return res.status(400).json({ error: 'Stage ID is required' });

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const targetStage = db.prepare('SELECT name FROM funnel_stages WHERE id = ?').get(stage_id) as any;
  if (!targetStage) return res.status(400).json({ error: 'Invalid funnel stage' });

  db.prepare(`
    UPDATE leads 
    SET stage_id = ?, lost_reason = COALESCE(?, lost_reason), updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(stage_id, lost_reason || null, id);

  // Log activity
  db.prepare(`
    INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_id, user_name)
    VALUES (?, ?, 'stage_change', 'Pipeline Stage Moved', ?, ?, ?, ?)
  `).run(
    `act-${Date.now()}`,
    id,
    `Lead dragged to stage: ${targetStage.name}${lost_reason ? ` (Reason: ${lost_reason})` : ''}`,
    targetStage.name,
    req.user?.id,
    req.user?.name
  );

  logAudit(req.user?.id, req.user?.name, 'STAGE_CHANGE', 'lead', id, `Moved lead ${lead.lead_code} to ${targetStage.name}`);

  return res.json({ message: 'Lead stage updated successfully', stage_name: targetStage.name });
};

// Add Activity (Calls, WhatsApp, Notes, Quick Follow-up)
export const addLeadActivity = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { activity_type, title, notes, outcome, next_followup_at, follow_up_purpose } = req.body;

  if (!activity_type || !title) {
    return res.status(400).json({ error: 'Activity type and title are required' });
  }

  const actId = `act-${Date.now()}`;
  db.prepare(`
    INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_id, user_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(actId, id, activity_type, title, notes || null, outcome || null, req.user?.id, req.user?.name);

  // Update last_contacted_at on lead
  db.prepare(`UPDATE leads SET last_contacted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);

  // If next follow-up requested
  if (next_followup_at) {
    const fupId = `fup-${Date.now()}`;
    db.prepare(`
      INSERT INTO follow_ups (id, lead_id, assigned_user_id, scheduled_at, purpose, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(fupId, id, req.user?.id, next_followup_at, follow_up_purpose || 'Scheduled follow-up', notes || null, req.user?.id);

    db.prepare(`UPDATE leads SET next_followup_at = ? WHERE id = ?`).run(next_followup_at, id);
  }

  return res.status(201).json({ message: 'Activity logged successfully' });
};

// Bulk Assign Leads
export const bulkAssignLeads = (req: AuthenticatedRequest, res: Response) => {
  const { lead_ids, agent_id } = req.body;
  if (!Array.isArray(lead_ids) || !agent_id) {
    return res.status(400).json({ error: 'lead_ids array and agent_id are required' });
  }

  const agent = db.prepare('SELECT name FROM users WHERE id = ?').get(agent_id) as any;
  if (!agent) return res.status(400).json({ error: 'Agent not found' });

  const updateStmt = db.prepare('UPDATE leads SET assigned_agent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const actStmt = db.prepare(`
    INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, user_id, user_name)
    VALUES (?, ?, 'agent_assignment', 'Bulk Assignment', ?, ?, ?)
  `);

  const tx = db.transaction((ids) => {
    for (const lid of ids) {
      updateStmt.run(agent_id, lid);
      actStmt.run(`act-${Date.now()}-${lid}`, lid, `Bulk assigned to ${agent.name}`, req.user?.id, req.user?.name);
    }
  });

  tx(lead_ids);
  return res.json({ message: `Successfully assigned ${lead_ids.length} leads to ${agent.name}` });
};

// Bulk Status Update
export const bulkStatusUpdate = (req: AuthenticatedRequest, res: Response) => {
  const { lead_ids, stage_id } = req.body;
  if (!Array.isArray(lead_ids) || !stage_id) {
    return res.status(400).json({ error: 'lead_ids array and stage_id are required' });
  }

  const stage = db.prepare('SELECT name FROM funnel_stages WHERE id = ?').get(stage_id) as any;
  if (!stage) return res.status(400).json({ error: 'Stage not found' });

  const updateStmt = db.prepare('UPDATE leads SET stage_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const actStmt = db.prepare(`
    INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_id, user_name)
    VALUES (?, ?, 'stage_change', 'Bulk Stage Update', ?, ?, ?, ?)
  `);

  const tx = db.transaction((ids) => {
    for (const lid of ids) {
      updateStmt.run(stage_id, lid);
      actStmt.run(`act-${Date.now()}-${lid}`, lid, `Bulk moved to ${stage.name}`, stage.name, req.user?.id, req.user?.name);
    }
  });

  tx(lead_ids);
  return res.json({ message: `Successfully moved ${lead_ids.length} leads to ${stage.name}` });
};

// ================= ONE-CLICK CONVERT LEAD TO CUSTOMER =================
export const convertLeadToCustomer = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;

  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (lead.is_converted) {
    return res.status(400).json({
      error: 'Lead is already converted',
      customer_id: lead.converted_customer_id
    });
  }

  // Check if an existing customer already has this phone number
  const existingCust = db.prepare('SELECT * FROM customers WHERE phone_normalized = ?').get(lead.phone_normalized) as any;

  let targetCustomerId = '';
  let isLinkedToExisting = false;

  const conversionTx = db.transaction(() => {
    if (existingCust) {
      targetCustomerId = existingCust.id;
      isLinkedToExisting = true;
    } else {
      // Create new customer
      targetCustomerId = `cust-${Date.now()}`;
      const customer_code = generateCode('CUST', 'customers', 'customer_code');

      db.prepare(`
        INSERT INTO customers (
          id, customer_code, name, phone, phone_normalized, alternate_phone,
          email, company, city, address, linked_lead_id, assigned_agent_id, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        targetCustomerId,
        customer_code,
        lead.customer_name,
        lead.phone,
        lead.phone_normalized,
        lead.alternate_phone,
        lead.email,
        lead.company_name,
        lead.city,
        lead.city ? `${lead.city}` : '',
        lead.id,
        lead.assigned_agent_id,
        lead.notes,
        req.user?.id || 'system'
      );
    }

    // Find "Converted" stage
    let convStage = db.prepare("SELECT id FROM funnel_stages WHERE name = 'Converted'").get() as any;
    const stageId = convStage ? convStage.id : lead.stage_id;

    // Update Lead record
    db.prepare(`
      UPDATE leads SET
        is_converted = 1,
        converted_customer_id = ?,
        converted_at = CURRENT_TIMESTAMP,
        converted_by = ?,
        stage_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(targetCustomerId, req.user?.id, stageId, lead.id);

    // Record activity
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_id, user_name)
      VALUES (?, ?, 'status_change', 'Lead Converted to Customer', ?, 'Converted', ?, ?)
    `).run(
      `act-${Date.now()}`,
      lead.id,
      isLinkedToExisting
        ? `Linked to existing customer profile (${existingCust.name} - ${existingCust.customer_code})`
        : `New customer account created: ${lead.customer_name}`,
      req.user?.id,
      req.user?.name
    );

    // If existing customer, update notes or link
    if (isLinkedToExisting && !existingCust.linked_lead_id) {
      db.prepare('UPDATE customers SET linked_lead_id = ? WHERE id = ?').run(lead.id, targetCustomerId);
    }
  });

  try {
    conversionTx();
    logAudit(req.user?.id, req.user?.name, 'CONVERT_LEAD', 'lead', lead.id, `Converted lead ${lead.lead_code} to customer ${targetCustomerId}`);

    return res.json({
      message: isLinkedToExisting ? 'Lead linked to existing customer profile' : 'Customer created successfully from lead',
      customer_id: targetCustomerId,
      is_existing_customer: isLinkedToExisting
    });
  } catch (err: any) {
    console.error('Conversion transaction failed:', err);
    return res.status(500).json({ error: 'Failed to convert lead: ' + err.message });
  }
};

// ================= CUSTOMERS CONTROLLERS =================
export const getCustomers = (req: AuthenticatedRequest, res: Response) => {
  const { search, agent_id, from_date, to_date, page = 1, limit = 50 } = req.query;

  let query = `
    SELECT c.*, u.name as assigned_agent_name, l.lead_code as original_lead_code
    FROM customers c
    LEFT JOIN users u ON c.assigned_agent_id = u.id
    LEFT JOIN leads l ON c.linked_lead_id = l.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (agent_id) {
    query += ` AND c.assigned_agent_id = ?`;
    params.push(agent_id);
  }

  if (from_date) {
    query += ` AND date(c.created_at) >= date(?)`;
    params.push(from_date);
  }
  if (to_date) {
    query += ` AND date(c.created_at) <= date(?)`;
    params.push(to_date);
  }

  if (search) {
    const s = `%${search}%`;
    const sNorm = `%${normalizePhone(String(search))}%`;
    query += ` AND (c.name LIKE ? OR c.customer_code LIKE ? OR c.company LIKE ? OR c.phone LIKE ? OR c.phone_normalized LIKE ? OR c.email LIKE ? OR c.city LIKE ?)`;
    params.push(s, s, s, s, sNorm, s, s);
  }

  query += ` ORDER BY c.created_at DESC`;

  const offset = (Number(page) - 1) * Number(limit);
  const pagedQuery = `${query} LIMIT ? OFFSET ?`;
  const pagedParams = [...params, Number(limit), offset];

  const customers = db.prepare(pagedQuery).all(...pagedParams);
  const totalCount = db.prepare(`SELECT count(*) as total FROM (${query})`).get(...params) as { total: number };

  return res.json({
    data: customers,
    pagination: {
      total: totalCount.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount.total / Number(limit))
    }
  });
};

export const getCustomerById = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const customer = db.prepare(`
    SELECT c.*, u.name as assigned_agent_name, l.lead_code as original_lead_code, l.lead_source as original_lead_source
    FROM customers c
    LEFT JOIN users u ON c.assigned_agent_id = u.id
    LEFT JOIN leads l ON c.linked_lead_id = l.id
    WHERE c.id = ?
  `).get(id) as any;

  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  // Customer orders
  const orders = db.prepare(`
    SELECT o.*, u.name as assigned_staff_name
    FROM orders o
    LEFT JOIN users u ON o.assigned_staff_id = u.id
    WHERE o.customer_id = ?
    ORDER BY o.order_date DESC
  `).all(id);

  // Customer linked follow-ups
  const followups = db.prepare(`
    SELECT f.*, u.name as assigned_user_name
    FROM follow_ups f
    LEFT JOIN users u ON f.assigned_user_id = u.id
    WHERE f.customer_id = ? OR f.lead_id = ?
    ORDER BY f.scheduled_at DESC
  `).all(id, customer.linked_lead_id || '');

  // Activities from linked lead
  let activities: any[] = [];
  if (customer.linked_lead_id) {
    activities = db.prepare(`
      SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC
    `).all(customer.linked_lead_id);
  }

  return res.json({ customer, orders, followups, activities });
};

export const createCustomer = (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, alternate_phone, email, company, city, address, assigned_agent_id, notes } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

  const id = `cust-${Date.now()}`;
  const customer_code = generateCode('CUST', 'customers', 'customer_code');
  const phone_normalized = normalizePhone(phone);

  db.prepare(`
    INSERT INTO customers (
      id, customer_code, name, phone, phone_normalized, alternate_phone,
      email, company, city, address, assigned_agent_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, customer_code, name, phone, phone_normalized, alternate_phone || null,
    email || null, company || null, city || null, address || null,
    assigned_agent_id || req.user?.id, notes || null, req.user?.id
  );

  return res.status(201).json({ message: 'Customer created successfully', id, customer_code });
};

export const updateCustomer = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, alternate_phone, email, company, city, address, assigned_agent_id, notes } = req.body;

  const phone_normalized = phone ? normalizePhone(phone) : null;

  db.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      phone_normalized = COALESCE(?, phone_normalized),
      alternate_phone = COALESCE(?, alternate_phone),
      email = COALESCE(?, email),
      company = COALESCE(?, company),
      city = COALESCE(?, city),
      address = COALESCE(?, address),
      assigned_agent_id = COALESCE(?, assigned_agent_id),
      notes = COALESCE(?, notes),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, phone, phone_normalized, alternate_phone, email, company, city, address, assigned_agent_id, notes, id);

  return res.json({ message: 'Customer updated successfully' });
};

// ================= ORDERS & MANUAL TRACKING CONTROLLERS =================
export const getOrders = (req: AuthenticatedRequest, res: Response) => {
  const { search, customer_id, order_status, payment_status, phone, from_date, to_date, page = 1, limit = 50 } = req.query;

  let query = `
    SELECT o.*, c.customer_code, u.name as assigned_staff_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.assigned_staff_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (customer_id) {
    query += ` AND o.customer_id = ?`;
    params.push(customer_id);
  }
  if (order_status) {
    query += ` AND o.order_status = ?`;
    params.push(order_status);
  }
  if (payment_status) {
    query += ` AND o.payment_status = ?`;
    params.push(payment_status);
  }
  if (phone) {
    const pNorm = normalizePhone(String(phone));
    query += ` AND o.customer_phone_normalized LIKE ?`;
    params.push(`%${pNorm}%`);
  }
  if (from_date) {
    query += ` AND date(o.order_date) >= date(?)`;
    params.push(from_date);
  }
  if (to_date) {
    query += ` AND date(o.order_date) <= date(?)`;
    params.push(to_date);
  }
  if (search) {
    const s = `%${search}%`;
    const sNorm = `%${normalizePhone(String(search))}%`;
    query += ` AND (
      o.order_code LIKE ?
      OR o.customer_name LIKE ?
      OR o.product_name LIKE ?
      OR o.start_location LIKE ?
      OR o.current_location LIKE ?
      OR o.end_location LIKE ?
      OR c.customer_code LIKE ?
      OR o.customer_phone LIKE ?
      OR o.customer_phone_normalized LIKE ?
    )`;
    params.push(s, s, s, s, s, s, s, s, sNorm);
  }

  query += ` ORDER BY o.order_date DESC`;

  const offset = (Number(page) - 1) * Number(limit);
  const pagedQuery = `${query} LIMIT ? OFFSET ?`;
  const pagedParams = [...params, Number(limit), offset];

  const orders = db.prepare(pagedQuery).all(...pagedParams);
  const totalCount = db.prepare(`SELECT count(*) as total FROM (${query})`).get(...params) as { total: number };

  return res.json({
    data: orders,
    pagination: {
      total: totalCount.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount.total / Number(limit))
    }
  });
};

export const getOrderById = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const order = db.prepare(`
    SELECT o.*, c.customer_code, c.email as customer_email, c.address as customer_address, u.name as assigned_staff_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.assigned_staff_id = u.id
    WHERE o.id = ?
  `).get(id) as any;

  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Get full tracking history
  const trackingHistory = db.prepare(`
    SELECT * FROM order_tracking
    WHERE order_id = ?
    ORDER BY recorded_at DESC, rowid DESC
  `).all(id);

  return res.json({ order, trackingHistory });
};

export const createOrder = (req: AuthenticatedRequest, res: Response) => {
  const {
    customer_id,
    product_name,
    quantity,
    order_amount,
    payment_status,
    order_status,
    start_location,
    current_location,
    end_location,
    expected_delivery_date,
    delivery_notes,
    assigned_staff_id
  } = req.body;

  if (!customer_id || !product_name || order_amount === undefined) {
    return res.status(400).json({ error: 'Customer ID, product name, and order amount are required' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id) as any;
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const id = `ord-${Date.now()}`;
  const order_code = generateCode('ORD', 'orders', 'order_code');
  const initialStatus = order_status || 'Order Placed';
  const initialStartLocation = (start_location && String(start_location).trim()) ? String(start_location).trim() : 'New York Logistics Center';
  const initialEndLocation = (end_location && String(end_location).trim())
    ? String(end_location).trim()
    : (customer.address ? `${customer.address}, ${customer.city || ''}`.trim() : (customer.city ? `${customer.city} Delivery Address` : 'Customer Delivery Address'));
  const initialLocation = (current_location && String(current_location).trim()) ? String(current_location).trim() : initialStartLocation;

  const orderTx = db.transaction(() => {
    // 1. Insert order with 3 locations
    db.prepare(`
      INSERT INTO orders (
        id, order_code, customer_id, customer_name, customer_phone, customer_phone_normalized,
        product_name, quantity, order_amount, payment_status, order_status,
        start_location, current_location, end_location,
        expected_delivery_date, delivery_notes, assigned_staff_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      order_code,
      customer.id,
      customer.name,
      customer.phone,
      customer.phone_normalized,
      product_name,
      Number(quantity) || 1,
      Number(order_amount),
      payment_status || 'Pending',
      initialStatus,
      initialStartLocation,
      initialLocation,
      initialEndLocation,
      expected_delivery_date || null,
      delivery_notes || null,
      assigned_staff_id || req.user?.id,
      req.user?.id
    );

    // 2. Add initial tracking event
    db.prepare(`
      INSERT INTO order_tracking (
        id, order_id, order_status, location, remarks, is_manual, updated_by_id, updated_by_name
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      `trk-${Date.now()}`,
      id,
      initialStatus,
      initialLocation,
      delivery_notes || `Order initiated: ${initialStartLocation} ➔ Destination: ${initialEndLocation}`,
      req.user?.id,
      req.user?.name
    );

    // 3. Update customer aggregate metrics (Total Orders, Total Order Value, Latest Status)
    db.prepare(`
      UPDATE customers SET
        total_orders = total_orders + 1,
        total_order_value = total_order_value + ?,
        latest_order_date = CURRENT_TIMESTAMP,
        latest_order_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(Number(order_amount), initialStatus, customer.id);
  });

  orderTx();
  logAudit(req.user?.id, req.user?.name, 'CREATE_ORDER', 'order', id, `Created order ${order_code} for ${customer.name}`);

  return res.status(201).json({ message: 'Order created successfully', id, order_code });
};

// MANUAL LOCATION & STATUS UPDATE CONTROLLER (Supports 3 locations and tracking history)
export const updateOrderLocationAndStatus = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { current_location, start_location, end_location, order_status, remarks, payment_status } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const newStartLocation = (start_location !== undefined && String(start_location).trim()) ? String(start_location).trim() : (order.start_location || 'Central Origin Hub');
  const newEndLocation = (end_location !== undefined && String(end_location).trim()) ? String(end_location).trim() : (order.end_location || 'Customer Delivery Address');
  const newStatus = order_status || order.order_status;

  // If status is Delivered and no specific current_location was given, it is at destination
  let newLocation = (current_location && String(current_location).trim()) ? String(current_location).trim() : order.current_location;
  if (newStatus === 'Delivered' && (!current_location || !String(current_location).trim())) {
    newLocation = newEndLocation;
  }

  const newPayment = payment_status || order.payment_status;

  const updateTx = db.transaction(() => {
    // 1. Update order
    db.prepare(`
      UPDATE orders SET
        start_location = ?,
        current_location = ?,
        end_location = ?,
        order_status = ?,
        payment_status = ?,
        last_location_update = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStartLocation, newLocation, newEndLocation, newStatus, newPayment, id);

    // 2. Create permanent tracking entry
    db.prepare(`
      INSERT INTO order_tracking (
        id, order_id, order_status, location, remarks, is_manual, updated_by_id, updated_by_name
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      `trk-${Date.now()}`,
      id,
      newStatus,
      newLocation,
      remarks || `Checkpoint updated: ${newLocation} (Status: ${newStatus})`,
      req.user?.id,
      req.user?.name
    );

    // 3. Update customer's latest order status
    db.prepare(`
      UPDATE customers SET latest_order_status = ? WHERE id = ?
    `).run(newStatus, order.customer_id);
  });

  updateTx();
  logAudit(req.user?.id, req.user?.name, 'UPDATE_ORDER_LOCATION', 'order', id, `Updated checkpoint to ${newLocation}, status to ${newStatus}`);

  return res.json({
    message: 'Order location and checkpoint updated successfully',
    start_location: newStartLocation,
    current_location: newLocation,
    end_location: newEndLocation,
    order_status: newStatus
  });
};

// ================= FOLLOW-UP MANAGEMENT CONTROLLERS =================
export const getFollowUps = (req: AuthenticatedRequest, res: Response) => {
  const { filter, assigned_user_id, client_date } = req.query; // filter: today, upcoming, overdue, all
  const todayDate = (typeof client_date === 'string' && client_date.trim()) || new Date().toISOString().split('T')[0];

  let query = `
    SELECT f.*, 
      u.name as assigned_user_name,
      l.customer_name as lead_name,
      l.phone as lead_phone,
      l.lead_code,
      c.name as customer_name,
      c.phone as customer_phone,
      c.customer_code
    FROM follow_ups f
    LEFT JOIN users u ON f.assigned_user_id = u.id
    LEFT JOIN leads l ON f.lead_id = l.id
    LEFT JOIN customers c ON f.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Agent restriction
  if (req.user?.role === 'agent') {
    query += ` AND f.assigned_user_id = ?`;
    params.push(req.user.id);
  } else if (assigned_user_id) {
    query += ` AND f.assigned_user_id = ?`;
    params.push(assigned_user_id);
  }

  if (filter === 'today') {
    query += ` AND (date(f.scheduled_at) = ? OR substr(f.scheduled_at, 1, 10) = ? OR date(f.scheduled_at, 'localtime') = ?) AND f.status IN ('pending', 'rescheduled')`;
    params.push(todayDate, todayDate, todayDate);
  } else if (filter === 'upcoming') {
    query += ` AND (date(f.scheduled_at) > ? AND substr(f.scheduled_at, 1, 10) > ?) AND f.status IN ('pending', 'rescheduled')`;
    params.push(todayDate, todayDate);
  } else if (filter === 'overdue') {
    query += ` AND (date(f.scheduled_at) < ? OR substr(f.scheduled_at, 1, 10) < ?) AND f.status IN ('pending', 'rescheduled')`;
    params.push(todayDate, todayDate);
  } else if (filter === 'completed') {
    query += ` AND f.status = 'completed'`;
  }

  query += ` ORDER BY f.scheduled_at ASC`;

  const followups = db.prepare(query).all(...params);
  return res.json(followups);
};

export const completeFollowUp = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { outcome, notes, schedule_next, next_scheduled_at, next_purpose } = req.body;

  const fup = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id) as any;
  if (!fup) return res.status(404).json({ error: 'Follow-up not found' });

  const tx = db.transaction(() => {
    // 1. Mark completed
    db.prepare(`
      UPDATE follow_ups SET
        status = 'completed',
        outcome = ?,
        notes = COALESCE(?, notes),
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(outcome || 'Completed', notes || null, id);

    // 2. Add activity if associated with lead
    if (fup.lead_id) {
      db.prepare(`
        INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_id, user_name)
        VALUES (?, ?, 'call', 'Follow-up Completed', ?, ?, ?, ?)
      `).run(`act-${Date.now()}`, fup.lead_id, notes || fup.purpose, outcome || 'Completed', req.user?.id, req.user?.name);
    }

    // 3. If user requested another follow-up immediately
    if (schedule_next && next_scheduled_at) {
      const nextId = `fup-${Date.now()}-next`;
      db.prepare(`
        INSERT INTO follow_ups (id, lead_id, customer_id, assigned_user_id, scheduled_at, purpose, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nextId,
        fup.lead_id,
        fup.customer_id,
        fup.assigned_user_id,
        next_scheduled_at,
        next_purpose || 'Subsequent Follow-up',
        notes || null,
        req.user?.id
      );

      if (fup.lead_id) {
        db.prepare('UPDATE leads SET next_followup_at = ? WHERE id = ?').run(next_scheduled_at, fup.lead_id);
      }
    }
  });

  tx();
  return res.json({ message: 'Follow-up completed successfully' });
};

export const rescheduleFollowUp = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { scheduled_at, notes } = req.body;
  if (!scheduled_at) return res.status(400).json({ error: 'New scheduled date/time is required' });

  const fup = db.prepare('SELECT * FROM follow_ups WHERE id = ?').get(id) as any;
  if (!fup) return res.status(404).json({ error: 'Follow-up not found' });

  db.prepare(`
    UPDATE follow_ups SET
      scheduled_at = ?,
      notes = COALESCE(?, notes),
      status = 'pending',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(scheduled_at, notes, id);

  if (fup.lead_id) {
    db.prepare('UPDATE leads SET next_followup_at = ? WHERE id = ?').run(scheduled_at, fup.lead_id);
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, user_id, user_name)
      VALUES (?, ?, 'meeting', 'Follow-up Rescheduled', ?, ?, ?)
    `).run(`act-${Date.now()}`, fup.lead_id, `Rescheduled to ${scheduled_at}. ${notes || ''}`, req.user?.id, req.user?.name);
  }

  return res.json({ message: 'Follow-up rescheduled successfully' });
};

export const createFollowUp = (req: AuthenticatedRequest, res: Response) => {
  const { lead_id, customer_id, assigned_user_id, scheduled_at, purpose, notes } = req.body;
  if (!scheduled_at) return res.status(400).json({ error: 'Scheduled date/time is required' });
  if (!purpose) return res.status(400).json({ error: 'Purpose is required' });

  const id = `fup-${Date.now()}`;
  const assignedId = assigned_user_id || req.user?.id || 'usr-agt-1';

  db.prepare(`
    INSERT INTO follow_ups (id, lead_id, customer_id, assigned_user_id, scheduled_at, purpose, notes, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(id, lead_id || null, customer_id || null, assignedId, scheduled_at, purpose, notes || null, req.user?.id || 'usr-admin-1');

  if (lead_id) {
    db.prepare('UPDATE leads SET next_followup_at = ? WHERE id = ?').run(scheduled_at, lead_id);
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, user_id, user_name)
      VALUES (?, ?, 'meeting', 'Follow-up Scheduled', ?, ?, ?)
    `).run(`act-${Date.now()}`, lead_id, `Follow-up scheduled for ${scheduled_at}: ${purpose}`, req.user?.id, req.user?.name);
  }

  return res.status(201).json({ message: 'Follow-up created successfully', id });
};

// ================= GLOBAL SEARCH CONTROLLER =================
export const globalSearch = (req: AuthenticatedRequest, res: Response) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.json({ customers: [], leads: [], orders: [] });
  }

  const phoneNorm = normalizePhone(query);
  const wildcard = `%${query}%`;
  const wildcardNorm = phoneNorm ? `%${phoneNorm}%` : null;
  const digitsOnly = query.replace(/\D/g, '');
  const numberWildcard = digitsOnly ? `%${digitsOnly}%` : null;

  // 1. Search Customers
  let customerSql = `
    SELECT c.*, u.name as assigned_agent_name, l.lead_code as original_lead_code
    FROM customers c
    LEFT JOIN users u ON c.assigned_agent_id = u.id
    LEFT JOIN leads l ON c.linked_lead_id = l.id
    WHERE c.name LIKE ? OR c.customer_code LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company LIKE ? OR c.city LIKE ? OR c.address LIKE ?
  `;
  const custParams: any[] = [wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard];
  if (wildcardNorm) {
    customerSql += ` OR c.phone_normalized LIKE ?`;
    custParams.push(wildcardNorm);
  }
  if (numberWildcard) {
    customerSql += ` OR c.customer_code LIKE ?`;
    custParams.push(numberWildcard);
  }
  customerSql += ` LIMIT 20`;
  const customers = db.prepare(customerSql).all(...custParams) as any[];

  // 2. Search Leads
  let leadSql = `
    SELECT l.*, u.name as assigned_agent_name, fs.name as stage_name, fs.color as stage_color
    FROM leads l
    LEFT JOIN users u ON l.assigned_agent_id = u.id
    LEFT JOIN funnel_stages fs ON l.stage_id = fs.id
    WHERE l.customer_name LIKE ? OR l.lead_code LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.company_name LIKE ? OR l.city LIKE ? OR l.lead_source LIKE ?
  `;
  const leadParams: any[] = [wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard];
  if (wildcardNorm) {
    leadSql += ` OR l.phone_normalized LIKE ?`;
    leadParams.push(wildcardNorm);
  }
  if (numberWildcard) {
    leadSql += ` OR l.lead_code LIKE ?`;
    leadParams.push(numberWildcard);
  }
  // Role check
  if (req.user?.role === 'agent') {
    leadSql += ` AND l.assigned_agent_id = '${req.user.id}'`;
  }
  leadSql += ` LIMIT 20`;
  const leads = db.prepare(leadSql).all(...leadParams) as any[];

  // 3. Search Orders (including locations, customer code, and number search)
  let orderSql = `
    SELECT o.*, c.customer_code, u.name as assigned_staff_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN users u ON o.assigned_staff_id = u.id
    WHERE o.order_code LIKE ? OR o.customer_name LIKE ? OR o.product_name LIKE ? OR o.customer_phone LIKE ?
      OR o.start_location LIKE ? OR o.current_location LIKE ? OR o.end_location LIKE ? OR c.customer_code LIKE ?
  `;
  const orderParams: any[] = [wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard, wildcard];
  if (wildcardNorm) {
    orderSql += ` OR o.customer_phone_normalized LIKE ?`;
    orderParams.push(wildcardNorm);
  }
  if (numberWildcard) {
    orderSql += ` OR o.order_code LIKE ?`;
    orderParams.push(numberWildcard);
  }
  // Also include orders of any customer found in this search
  if (customers.length > 0) {
    const custIds = customers.map(c => `'${c.id}'`).join(',');
    orderSql += ` OR o.customer_id IN (${custIds})`;
  }
  orderSql += ` ORDER BY o.order_date DESC LIMIT 30`;
  const orders = db.prepare(orderSql).all(...orderParams) as any[];

  // Attach all linked orders directly to customer objects for unified representation
  const customersWithOrders = customers.map(c => {
    const custOrders = orders.filter(o => o.customer_id === c.id);
    return {
      ...c,
      linked_orders: custOrders
    };
  });

  return res.json({
    query,
    phone_normalized: phoneNorm,
    customers: customersWithOrders,
    leads,
    orders
  });
};

// ================= DASHBOARD & ANALYTICS CONTROLLER =================
export const getAnalytics = (req: AuthenticatedRequest, res: Response) => {
  const { range = '30d' } = req.query; // today, 7d, 30d, last_month, all

  let dateFilter = '';
  if (range === 'today') {
    dateFilter = "AND date(created_at) = date('now')";
  } else if (range === '7d') {
    dateFilter = "AND date(created_at) >= date('now', '-7 days')";
  } else if (range === '30d') {
    dateFilter = "AND date(created_at) >= date('now', '-30 days')";
  } else if (range === 'last_month') {
    dateFilter = "AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')";
  }

  // 1. Total Leads
  const totalLeadsRow = db.prepare(`SELECT count(*) as count FROM leads WHERE 1=1 ${dateFilter}`).get() as { count: number };
  const totalLeads = totalLeadsRow.count;

  // 2. Active Leads (in progress, not converted, not lost)
  const activeLeadsRow = db.prepare(`
    SELECT count(*) as count 
    FROM leads l
    JOIN funnel_stages fs ON l.stage_id = fs.id
    WHERE l.is_converted = 0 AND fs.name != 'Lost' ${dateFilter.replace(/created_at/g, 'l.created_at')}
  `).get() as { count: number };
  const activeLeads = activeLeadsRow.count;

  // 3. Converted Leads
  const convertedLeadsRow = db.prepare(`SELECT count(*) as count FROM leads WHERE is_converted = 1 ${dateFilter}`).get() as { count: number };
  const convertedLeads = convertedLeadsRow.count;

  // 4. Total Orders
  const orderDateFilter = dateFilter.replace(/created_at/g, 'order_date');
  const totalOrdersRow = db.prepare(`SELECT count(*) as count, COALESCE(SUM(order_amount), 0) as total_revenue FROM orders WHERE 1=1 ${orderDateFilter}`).get() as { count: number; total_revenue: number };
  const totalOrders = totalOrdersRow.count;
  const totalRevenue = totalOrdersRow.total_revenue;

  // Lead Conversion Rate
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0.0';

  // Leads Generated Over Time (Last 14 days)
  const leadsOverTime = db.prepare(`
    SELECT date(created_at) as date, count(*) as count
    FROM leads
    WHERE date(created_at) >= date('now', '-14 days')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all();

  // Lead Source Performance
  const sourcePerformance = db.prepare(`
    SELECT lead_source, count(*) as total,
      SUM(CASE WHEN is_converted = 1 THEN 1 ELSE 0 END) as converted_count,
      COALESCE(SUM(estimated_deal_value), 0) as total_deal_value
    FROM leads
    WHERE 1=1 ${dateFilter}
    GROUP BY lead_source
    ORDER BY total DESC
  `).all();

  // Agent Performance
  const agentPerformance = db.prepare(`
    SELECT u.name as agent_name, u.avatar,
      COUNT(l.id) as total_leads,
      SUM(CASE WHEN l.is_converted = 1 THEN 1 ELSE 0 END) as converted_leads,
      COALESCE(SUM(l.estimated_deal_value), 0) as total_deal_value
    FROM users u
    LEFT JOIN leads l ON l.assigned_agent_id = u.id ${dateFilter.replace(/created_at/g, 'l.created_at')}
    WHERE u.role IN ('agent', 'manager')
    GROUP BY u.id
    ORDER BY converted_leads DESC, total_leads DESC
  `).all();

  // Sales Funnel Overview
  const funnelOverview = db.prepare(`
    SELECT fs.id, fs.name, fs.color, fs.order_index,
      COUNT(l.id) as lead_count,
      COALESCE(SUM(l.estimated_deal_value), 0) as deal_value
    FROM funnel_stages fs
    LEFT JOIN leads l ON l.stage_id = fs.id AND l.is_converted = 0
    WHERE fs.is_active = 1
    GROUP BY fs.id
    ORDER BY fs.order_index ASC
  `).all();

  // Upcoming & Overdue follow-ups
  const overdueFollowUps = db.prepare(`
    SELECT f.*, l.customer_name as lead_name, l.phone as lead_phone, u.name as agent_name
    FROM follow_ups f
    LEFT JOIN leads l ON f.lead_id = l.id
    LEFT JOIN users u ON f.assigned_user_id = u.id
    WHERE f.scheduled_at < datetime('now') AND f.status = 'pending'
    ORDER BY f.scheduled_at ASC
    LIMIT 5
  `).all();

  const upcomingFollowUps = db.prepare(`
    SELECT f.*, l.customer_name as lead_name, l.phone as lead_phone, u.name as agent_name
    FROM follow_ups f
    LEFT JOIN leads l ON f.lead_id = l.id
    LEFT JOIN users u ON f.assigned_user_id = u.id
    WHERE f.scheduled_at >= datetime('now') AND f.status = 'pending'
    ORDER BY f.scheduled_at ASC
    LIMIT 5
  `).all();

  // Recent Lead Activities
  const recentActivities = db.prepare(`
    SELECT a.*, l.customer_name as lead_name, l.lead_code
    FROM lead_activities a
    LEFT JOIN leads l ON a.lead_id = l.id
    ORDER BY a.created_at DESC
    LIMIT 8
  `).all();

  // Recent Orders
  const recentOrders = db.prepare(`
    SELECT o.*, c.customer_code
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.order_date DESC
    LIMIT 6
  `).all();

  return res.json({
    metrics: {
      totalLeads,
      activeLeads,
      convertedLeads,
      totalOrders,
      totalRevenue,
      conversionRate
    },
    leadsOverTime,
    sourcePerformance,
    agentPerformance,
    funnelOverview,
    overdueFollowUps,
    upcomingFollowUps,
    recentActivities,
    recentOrders
  });
};

// ================= WEB FORMS CONTROLLERS =================

// Public form retrieval (no auth required)
export const getPublicForm = (req: any, res: Response) => {
  const { idOrSlug } = req.params;
  const form = db.prepare(`
    SELECT id, title, slug, description, fields, theme_color, button_text, success_message, redirect_url, is_active
    FROM web_forms
    WHERE (id = ? OR slug = ?) AND is_active = 1
  `).get(idOrSlug, idOrSlug) as any;

  if (!form) {
    return res.status(404).json({ error: 'Form not found or is currently inactive.' });
  }

  try {
    form.fields = JSON.parse(form.fields);
  } catch {
    form.fields = [];
  }

  return res.json(form);
};

// Public form submission (no auth required)
export const submitPublicForm = (req: any, res: Response) => {
  const { idOrSlug } = req.params;
  const { answers } = req.body;

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'Form submission answers are required.' });
  }

  const form = db.prepare(`
    SELECT * FROM web_forms WHERE (id = ? OR slug = ?) AND is_active = 1
  `).get(idOrSlug, idOrSlug) as any;

  if (!form) {
    return res.status(404).json({ error: 'Form not found or is currently inactive.' });
  }

  let fields: any[] = [];
  try {
    fields = JSON.parse(form.fields);
  } catch {
    fields = [];
  }

  // Validate required fields
  for (const f of fields) {
    if (f.required) {
      const val = answers[f.id];
      if (val === undefined || val === null || String(val).trim() === '') {
        return res.status(400).json({ error: `Please provide "${f.label}".` });
      }
    }
  }

  // Extract mapped lead fields
  let customer_name = '';
  let phone = '';
  let email = '';
  let company_name = '';
  let city = '';
  let estimated_deal_value = 0;
  let user_notes = '';

  for (const f of fields) {
    const val = answers[f.id];
    if (val === undefined || val === null) continue;
    const strVal = String(val).trim();

    if (f.mapToLeadField === 'customer_name' || f.id === 'field_name' || f.id === 'name') {
      if (!customer_name) customer_name = strVal;
    } else if (f.mapToLeadField === 'phone' || f.id === 'field_phone' || f.id === 'phone') {
      if (!phone) phone = strVal;
    } else if (f.mapToLeadField === 'email' || f.id === 'field_email' || f.id === 'email') {
      if (!email) email = strVal;
    } else if (f.mapToLeadField === 'company_name' || f.id === 'field_company' || f.id === 'company') {
      if (!company_name) company_name = strVal;
    } else if (f.mapToLeadField === 'city' || f.id === 'field_city' || f.id === 'city') {
      if (!city) city = strVal;
    } else if (f.mapToLeadField === 'estimated_deal_value' || f.id === 'field_budget') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) estimated_deal_value = num;
    } else if (f.mapToLeadField === 'notes' || f.id === 'field_notes') {
      if (strVal) user_notes = user_notes ? `${user_notes}\n${strVal}` : strVal;
    }
  }

  // Fallback customer name if none provided
  if (!customer_name) {
    const firstNonEmpty = fields.find(f => f.type === 'text' && answers[f.id]);
    customer_name = firstNonEmpty ? String(answers[firstNonEmpty.id]).trim() : 'Website Visitor';
  }

  const phone_normalized = normalizePhone(phone);
  const lead_id = `lead-${Date.now()}`;
  const lead_code = generateCode('LD', 'leads', 'lead_code');
  const lead_source = form.source_name || 'Website Form';
  const stage_id = form.stage_id || 'stg-1';
  const assigned_agent_id = form.assigned_agent_id || null;

  // Build full activity details formatted text
  const formattedSummary = fields.map(f => {
    const raw = answers[f.id];
    const displayVal = Array.isArray(raw) ? raw.join(', ') : (raw !== undefined && raw !== null ? String(raw) : '—');
    return `• ${f.label}: ${displayVal}`;
  }).join('\n');

  const fullNotes = user_notes
    ? `${user_notes}\n\n[Form: ${form.title}]\n${formattedSummary}`
    : `[Form: ${form.title}]\n${formattedSummary}`;

  const submitTx = db.transaction(() => {
    // Ensure lead source exists in lead_sources table
    db.prepare(`
      INSERT OR IGNORE INTO lead_sources (id, name, icon)
      VALUES (?, ?, 'Globe')
    `).run(`src-${lead_source.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, lead_source);

    // Insert lead
    db.prepare(`
      INSERT INTO leads (
        id, lead_code, customer_name, phone, phone_normalized, email,
        company_name, city, lead_source, assigned_agent_id, stage_id,
        priority, conversion_likelihood, estimated_deal_value, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'High', 'Medium', ?, ?, 'web_form')
    `).run(
      lead_id,
      lead_code,
      customer_name,
      phone,
      phone_normalized,
      email || null,
      company_name || null,
      city || null,
      lead_source,
      assigned_agent_id,
      stage_id,
      estimated_deal_value,
      fullNotes
    );

    // Insert lead activity
    db.prepare(`
      INSERT INTO lead_activities (id, lead_id, activity_type, title, notes, outcome, user_name)
      VALUES (?, ?, 'system', ?, ?, 'Captured', 'Public Web Form')
    `).run(`act-${Date.now()}`, lead_id, `Online Lead Captured: ${form.title}`, formattedSummary);

    // Increment submission counter
    db.prepare('UPDATE web_forms SET submission_count = submission_count + 1 WHERE id = ?').run(form.id);

    // Audit log
    logAudit('system', 'Public Form', 'CAPTURE_LEAD', 'lead', lead_id, `Captured lead ${customer_name} (${lead_code}) via form "${form.title}"`);
  });

  submitTx();

  return res.json({
    success: true,
    lead_id,
    lead_code,
    message: form.success_message || 'Thank you! Your information has been received.',
    redirect_url: form.redirect_url || null
  });
};

// Admin list all web forms
export const getForms = (req: AuthenticatedRequest, res: Response) => {
  const forms = db.prepare(`
    SELECT f.*, u.name as assigned_agent_name, s.name as stage_name
    FROM web_forms f
    LEFT JOIN users u ON f.assigned_agent_id = u.id
    LEFT JOIN funnel_stages s ON f.stage_id = s.id
    ORDER BY f.created_at DESC
  `).all() as any[];

  const parsed = forms.map(f => {
    try {
      f.fields = JSON.parse(f.fields);
    } catch {
      f.fields = [];
    }
    return f;
  });

  return res.json(parsed);
};

// Admin get single form
export const getFormById = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const form = db.prepare(`
    SELECT f.*, u.name as assigned_agent_name, s.name as stage_name
    FROM web_forms f
    LEFT JOIN users u ON f.assigned_agent_id = u.id
    LEFT JOIN funnel_stages s ON f.stage_id = s.id
    WHERE f.id = ?
  `).get(id) as any;

  if (!form) return res.status(404).json({ error: 'Form not found' });

  try {
    form.fields = JSON.parse(form.fields);
  } catch {
    form.fields = [];
  }

  return res.json(form);
};

// Admin create form
export const createForm = (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    slug,
    description,
    source_name,
    assigned_agent_id,
    stage_id,
    fields,
    theme_color,
    button_text,
    success_message,
    redirect_url
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Form title is required' });
  }

  const id = `form-${Date.now()}`;
  const baseSlug = (slug && slug.trim()) ? slug.trim() : title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let finalSlug = baseSlug || `form-${Math.floor(1000 + Math.random() * 9000)}`;

  // Ensure unique slug
  const existing = db.prepare('SELECT id FROM web_forms WHERE slug = ?').get(finalSlug);
  if (existing) {
    finalSlug = `${finalSlug}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const fieldsJson = Array.isArray(fields) ? JSON.stringify(fields) : '[]';

  db.prepare(`
    INSERT INTO web_forms (
      id, title, slug, description, source_name, assigned_agent_id, stage_id,
      fields, theme_color, button_text, success_message, redirect_url, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title.trim(),
    finalSlug,
    description || '',
    source_name || 'Website Form',
    assigned_agent_id || null,
    stage_id || 'stg-1',
    fieldsJson,
    theme_color || '#10b981',
    button_text || 'Submit Inquiry',
    success_message || 'Thank you! Your information has been received. Our team will contact you shortly.',
    redirect_url || null,
    req.user?.id || 'admin'
  );

  logAudit(req.user?.id, req.user?.name, 'CREATE_FORM', 'web_form', id, `Created lead capture form "${title}"`);

  return res.status(201).json({ id, slug: finalSlug, message: 'Form created successfully' });
};

// Admin update form
export const updateForm = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    slug,
    description,
    source_name,
    assigned_agent_id,
    stage_id,
    fields,
    theme_color,
    button_text,
    success_message,
    redirect_url,
    is_active
  } = req.body;

  const existing = db.prepare('SELECT id, slug FROM web_forms WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Form not found' });

  let finalSlug = existing.slug;
  if (slug && slug.trim() && slug.trim() !== existing.slug) {
    const slugCheck = db.prepare('SELECT id FROM web_forms WHERE slug = ? AND id != ?').get(slug.trim(), id);
    if (slugCheck) {
      return res.status(400).json({ error: 'This URL slug is already taken. Please choose another.' });
    }
    finalSlug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  const fieldsJson = Array.isArray(fields) ? JSON.stringify(fields) : undefined;

  db.prepare(`
    UPDATE web_forms SET
      title = COALESCE(?, title),
      slug = ?,
      description = COALESCE(?, description),
      source_name = COALESCE(?, source_name),
      assigned_agent_id = ?,
      stage_id = COALESCE(?, stage_id),
      fields = COALESCE(?, fields),
      theme_color = COALESCE(?, theme_color),
      button_text = COALESCE(?, button_text),
      success_message = COALESCE(?, success_message),
      redirect_url = ?,
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title ? title.trim() : null,
    finalSlug,
    description !== undefined ? description : null,
    source_name || null,
    assigned_agent_id || null,
    stage_id || null,
    fieldsJson || null,
    theme_color || null,
    button_text || null,
    success_message || null,
    redirect_url !== undefined ? redirect_url : null,
    is_active !== undefined ? is_active : null,
    id
  );

  logAudit(req.user?.id, req.user?.name, 'UPDATE_FORM', 'web_form', String(id), `Updated form "${title || existing.id}"`);

  return res.json({ message: 'Form updated successfully' });
};

// Admin delete form
export const deleteForm = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const form = db.prepare('SELECT title FROM web_forms WHERE id = ?').get(id) as any;
  if (!form) return res.status(404).json({ error: 'Form not found' });

  db.prepare('DELETE FROM web_forms WHERE id = ?').run(id);
  logAudit(req.user?.id, req.user?.name, 'DELETE_FORM', 'web_form', String(id), `Deleted form "${form.title}"`);

  return res.json({ message: 'Form deleted successfully' });
};

// Admin toggle form active/inactive
export const toggleFormStatus = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const form = db.prepare('SELECT id, title, is_active FROM web_forms WHERE id = ?').get(id) as any;
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const newStatus = form.is_active === 1 ? 0 : 1;
  db.prepare('UPDATE web_forms SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);

  logAudit(req.user?.id, req.user?.name, 'TOGGLE_FORM', 'web_form', String(id), `${newStatus === 1 ? 'Activated' : 'Deactivated'} form "${form.title}"`);

  return res.json({ message: `Form ${newStatus === 1 ? 'activated' : 'deactivated'} successfully`, is_active: newStatus });
};
