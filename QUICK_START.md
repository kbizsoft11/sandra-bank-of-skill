# Admin Companies Module - Quick Start Guide

## 🚀 Getting Started

### For Admins
1. Log in as an admin user
2. Look for "Companies" in the sidebar menu
3. Click it to view all companies

### For Developers

#### Setup
```bash
# Install dependencies
npm install

# Build backend
cd server && npm run build

# Build frontend
cd client && npm run build

# Start development
npm run dev
```

#### Routes
- **List Companies:** `/admin/companies`
- **Company Details:** `/admin/companies/:id`
- **Org Employees:** `/admin/organisation/:organisationId/employees`
- **Employee Skills:** `/admin/employee/:employeeId/skills`

#### API Endpoints
```
GET    /api/organisations/admin/companies
GET    /api/organisations/admin/companies/:companyId
GET    /api/organisations/admin/organisations/:organisationId/employees
GET    /api/organisations/admin/employees/:employeeId/skills
PUT    /api/organisations/admin/companies/:companyId/status
```

#### Service Usage
```typescript
import { CompanyService } from '../core/services/company.service';

constructor(private company: CompanyService) {}

// Get all companies
this.company.getAllCompanies({ page: 1, limit: 20 })

// Get company details
this.company.getCompanyDetails(companyId)

// Get org employees
this.company.getOrganisationEmployees(orgId)

// Get employee skills
this.company.getEmployeeSkills(employeeId)

// Update status
this.company.updateCompanyStatus(companyId, true)
```

---

## 📋 Features

### Companies List
- ✅ Search by name/email
- ✅ Filter by status
- ✅ Pagination
- ✅ Activate/Deactivate actions
- ✅ View company details

### Company Details
- ✅ Basic info (name, email, phone, website, etc.)
- ✅ Statistics (employees, skills, etc.)
- ✅ Quick action to view employees

### Organisation Employees
- ✅ Filter by status
- ✅ Search by name/email
- ✅ Pagination
- ✅ View skills for each employee

### Employee Skills
- ✅ Read-only display
- ✅ Proficiency levels
- ✅ Skill scores
- ✅ Last updated dates

---

## 🔒 Security

- **Role-Based Access:** Admin only
- **Route Guards:** Enforced at router level
- **Data Isolation:** Company employees filtered by organization
- **Read-Only Skills:** No modification capabilities

---

## 📁 File Locations

**Backend:**
- Service: `server/src/services/organisation.service.ts`
- Controller: `server/src/controllers/organisation.controller.ts`
- Routes: `server/src/routes/organisation.routes.ts`

**Frontend:**
- Service: `client/src/app/core/services/company.service.ts`
- Components: `client/src/app/features/admin-companies/*/`
- Routes: `client/src/app/routes/dashboard.routes.ts`
- Menu: `client/src/app/shared/components/dashboard-sidebar/`

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Module not found | Run `npm install` and rebuild |
| Build fails | Clear cache and rebuild |
| Routing not working | Check role guards in routes |
| Menu not showing | Verify admin role is set |

---

## ✅ Build Status

- ✅ Backend: PASSING
- ✅ Frontend: PASSING
- ✅ All tests: PASSING

---

## 📝 Notes

- Old `/admin/users` routes are kept for backward compatibility
- Company Portal functionality is unaffected
- All components are standalone Angular components
- Uses signals for reactive state management
- Bootstrap 5 for responsive design

---

**Last Updated:** 2026-07-21  
**Status:** ✅ Production Ready
