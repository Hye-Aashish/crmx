import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as CRM from '../controllers/crmController';

const router = Router();

// Public Auth routes
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
router.post('/auth/login', CRM.login);

// Public Lead Capture Form endpoints (accessible without CRM login)
router.get('/public/forms/:idOrSlug', CRM.getPublicForm);
router.post('/public/forms/:idOrSlug/submit', CRM.submitPublicForm);

// Protected routes (require Bearer Token)
router.use(authenticate as any);

// Auth Me
router.get('/auth/me', CRM.getMe);

// Users & Agents
router.get('/users', CRM.getUsers);
router.post('/users', requireRole(['admin']), CRM.createUser);
router.put('/users/:id/role', requireRole(['admin']), CRM.updateUserRole);
router.delete('/users/:id', requireRole(['admin']), CRM.deleteUser);

// Roles & Permissions Management
router.get('/roles', CRM.getRoles);
router.get('/permissions', CRM.getAvailablePermissions);
router.post('/roles', requireRole(['admin']), CRM.createRole);
router.put('/roles/:id', requireRole(['admin']), CRM.updateRole);
router.put('/roles/:id/permissions', requireRole(['admin']), CRM.updateRolePermissions);
router.delete('/roles/:id', requireRole(['admin']), CRM.deleteRole);

// Sources & Funnel Stages
router.get('/sources', CRM.getSources);
router.post('/sources', requireRole(['admin']), CRM.createSource);
router.get('/funnel/stages', CRM.getFunnelStages);
router.post('/funnel/stages', requireRole(['admin', 'manager']), CRM.createFunnelStage);
router.put('/funnel/stages/:id', requireRole(['admin', 'manager']), CRM.updateFunnelStage);
router.delete('/funnel/stages/:id', requireRole(['admin', 'manager']), CRM.deleteFunnelStage);
router.put('/funnel/stages/reorder', requireRole(['admin', 'manager']), CRM.reorderFunnelStages);

// Leads Management
router.get('/leads', CRM.getLeads);
router.get('/leads/:id', CRM.getLeadById);
router.post('/leads', CRM.createLead);
router.put('/leads/:id', CRM.updateLead);
router.post('/leads/:id/stage', CRM.updateLeadStage); // Drag and Drop pipeline
router.post('/leads/:id/activity', CRM.addLeadActivity);
router.post('/leads/bulk-assign', requireRole(['admin', 'manager']), CRM.bulkAssignLeads);
router.post('/leads/bulk-status', requireRole(['admin', 'manager']), CRM.bulkStatusUpdate);
router.post('/leads/:id/convert', CRM.convertLeadToCustomer); // One-click conversion

// Customers Management
router.get('/customers', CRM.getCustomers);
router.get('/customers/:id', CRM.getCustomerById);
router.post('/customers', CRM.createCustomer);
router.put('/customers/:id', CRM.updateCustomer);

// Orders & Tracking Management
router.get('/orders', CRM.getOrders);
router.get('/orders/:id', CRM.getOrderById);
router.post('/orders', CRM.createOrder);
router.post('/orders/:id/location', CRM.updateOrderLocationAndStatus); // Manual location update

// Follow-ups & Reminders
router.get('/follow-ups', CRM.getFollowUps);
router.post('/follow-ups', CRM.createFollowUp);
router.put('/follow-ups/:id/complete', CRM.completeFollowUp);
router.put('/follow-ups/:id/reschedule', CRM.rescheduleFollowUp);

// Global Phone / Name / ID Search
router.get('/search', CRM.globalSearch);

// Dashboard Analytics
router.get('/analytics/overview', CRM.getAnalytics);

// Web Forms Management (Admin & Manager)
router.get('/forms', CRM.getForms);
router.get('/forms/:id', CRM.getFormById);
router.post('/forms', requireRole(['admin', 'manager']), CRM.createForm);
router.put('/forms/:id', requireRole(['admin', 'manager']), CRM.updateForm);
router.delete('/forms/:id', requireRole(['admin', 'manager']), CRM.deleteForm);
router.post('/forms/:id/toggle', requireRole(['admin', 'manager']), CRM.toggleFormStatus);

export default router;
