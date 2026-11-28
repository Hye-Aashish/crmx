import { Router } from 'express';
import { authenticate, requireRole, requirePermission } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import * as CRM from '../controllers/crmController';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keySuffix: 'login',
  message: 'Too many login attempts. Please wait and try again.'
});

// Public Auth routes
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      sqlite: 'connected'
    }
  });
});

router.post('/auth/login', loginLimiter, CRM.login);

// Protected routes (require Bearer Token)
router.use(authenticate as any);

// Auth Me
router.get('/auth/me', CRM.getMe);

// MongoDB admin tools (must be authenticated + admin)
router.get('/mongodb/status', requireRole(['admin']), async (req, res) => {
  const { getMongoStatus } = await import('../config/mongodb');
  const mongo = await getMongoStatus();
  res.json(mongo);
});

router.post('/mongodb/sync', requireRole(['admin']), async (req, res) => {
  try {
    const { syncAllToMongo } = await import('../config/mongodb');
    const result = await syncAllToMongo();
    res.json({ message: 'MongoDB synchronized successfully', synced: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Users & Agents
router.get('/users', CRM.getUsers);
router.post('/users', requirePermission('manage_users'), CRM.createUser);
router.put('/users/:id/role', requirePermission('manage_users'), CRM.updateUserRole);
router.delete('/users/:id', requirePermission('manage_users'), CRM.deleteUser);

// Roles & Permissions Management
router.get('/roles', requirePermission('manage_roles'), CRM.getRoles);
router.get('/permissions', requirePermission('manage_roles'), CRM.getAvailablePermissions);
router.post('/roles', requirePermission('manage_roles'), CRM.createRole);
router.put('/roles/:id', requirePermission('manage_roles'), CRM.updateRole);
router.put('/roles/:id/permissions', requirePermission('manage_roles'), CRM.updateRolePermissions);
router.delete('/roles/:id', requirePermission('manage_roles'), CRM.deleteRole);

// Sources & Funnel Stages
router.get('/sources', CRM.getSources);
router.post('/sources', requirePermission('manage_roles'), CRM.createSource);

// Lead Tags — authenticated staff can create; catalog edit/delete for managers+
router.get('/tags', CRM.getTags);
router.post('/tags', CRM.createTag);
router.put('/tags/:id', requireRole(['admin', 'manager']), CRM.updateTag);
router.delete('/tags/:id', requireRole(['admin', 'manager']), CRM.deleteTag);

router.get('/funnel/stages', CRM.getFunnelStages);
// IMPORTANT: static path before parameterized :id
router.put('/funnel/stages/reorder', requirePermission('manage_stages'), CRM.reorderFunnelStages);
router.post('/funnel/stages', requirePermission('manage_stages'), CRM.createFunnelStage);
router.put('/funnel/stages/:id', requirePermission('manage_stages'), CRM.updateFunnelStage);
router.delete('/funnel/stages/:id', requirePermission('manage_stages'), CRM.deleteFunnelStage);

// Leads Management
router.get('/leads', requirePermission('view_leads'), CRM.getLeads);
router.get('/leads/:id', requirePermission('view_leads'), CRM.getLeadById);
router.post('/leads', requirePermission('create_leads'), CRM.createLead);
router.post('/leads/import', requirePermission('create_leads'), CRM.importLeads);
router.put('/leads/:id', requirePermission('edit_leads'), CRM.updateLead);
router.put('/leads/:id/tags', requirePermission('edit_leads'), CRM.updateLeadTags);
router.post('/leads/:id/stage', requirePermission('move_pipeline_stages'), CRM.updateLeadStage);
router.post('/leads/:id/activity', requirePermission('edit_leads'), CRM.addLeadActivity);
router.post('/leads/bulk-assign', requirePermission('bulk_actions'), CRM.bulkAssignLeads);
router.post('/leads/bulk-status', requirePermission('bulk_actions'), CRM.bulkStatusUpdate);
router.post('/leads/:id/convert', requirePermission('convert_leads'), CRM.convertLeadToCustomer);
router.delete('/leads/:id', requirePermission('delete_leads'), CRM.deleteLead);

// Customers Management
router.get('/customers', requirePermission('view_customers'), CRM.getCustomers);
router.get('/customers/:id', requirePermission('view_customers'), CRM.getCustomerById);
router.post('/customers', requirePermission('edit_customers'), CRM.createCustomer);
router.put('/customers/:id', requirePermission('edit_customers'), CRM.updateCustomer);

// Orders & Tracking Management
router.get('/orders', requirePermission('view_orders'), CRM.getOrders);
router.get('/orders/:id', requirePermission('view_orders'), CRM.getOrderById);
router.post('/orders', requirePermission('create_orders'), CRM.createOrder);
router.post('/orders/:id/location', requirePermission('update_order_location'), CRM.updateOrderLocationAndStatus);

// Follow-ups & Reminders
router.get('/follow-ups', requirePermission('manage_followups'), CRM.getFollowUps);
router.post('/follow-ups', requirePermission('manage_followups'), CRM.createFollowUp);
router.put('/follow-ups/:id/complete', requirePermission('manage_followups'), CRM.completeFollowUp);
router.put('/follow-ups/:id/reschedule', requirePermission('manage_followups'), CRM.rescheduleFollowUp);
router.put('/follow-ups/:id/tags', requirePermission('manage_followups'), CRM.updateFollowUpTags);

// Global Phone / Name / ID Search
router.get('/search', CRM.globalSearch);

// Dashboard Analytics
router.get('/analytics/overview', requirePermission('view_analytics'), CRM.getAnalytics);

export default router;
