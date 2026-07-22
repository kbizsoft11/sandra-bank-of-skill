# Admin Dashboard - Quick Reference Guide

## 🚀 Quick Start

### Access the Dashboard
```
URL: /admin/admin-dashboard
Role Required: admin
Route Guard: Yes
Menu: Sidebar → Admin Dashboard
```

### API Base URL
```
Development: http://localhost:5000/api
Production: /api
```

---

## 📂 File Structure

```
client/src/app/
├── core/services/
│   └── admin-dashboard.service.ts          # Service with API methods
├── features/admin-dashboard/
│   ├── admin-dashboard.ts                  # Main component
│   ├── admin-dashboard.html                # Template
│   └── admin-dashboard.scss                # Styles
└── routes/
    └── dashboard.routes.ts                 # Route definition

server/src/
├── models/
│   ├── notification.model.ts               # Notification schema
│   └── activity.model.ts                   # Activity schema
├── repositories/
│   └── admin-dashboard.repository.ts       # Data operations
├── services/
│   └── admin-dashboard.service.ts          # Business logic
├── controllers/
│   └── dashboard.controller.ts             # 6 new methods
└── routes/
    └── dashboard.route.ts                  # 6 new routes
```

---

## 🔑 Key Components

### Service Methods
```typescript
// Statistics
dashboardService.getOverview()          // GET /dashboard/admin/overview
dashboardService.getStats()             // GET /dashboard/admin/stats
dashboardService.getChartData()         // GET /dashboard/admin/charts

// Notifications
dashboardService.getNotifications()     // GET /dashboard/admin/notifications
dashboardService.markNotificationAsRead()    // PUT .../read
dashboardService.markNotificationAsUnread()  // PUT .../unread

// Activities
dashboardService.getRecentActivities()  // GET /dashboard/admin/recent-activities
```

### Component Properties
```typescript
// Signals
stats: Signal<DashboardStats | null>
chartData: Signal<ChartData | null>
notifications: Signal<Notification[]>
activities: Signal<Activity[]>
loading: Signal<boolean>
error: Signal<string | null>

// Filters
notificationFilter: Signal<'recent' | 'unread' | 'read'>
currentTime: Signal<string>
currentDate: Signal<string>
```

### Component Methods
```typescript
onNotificationFilterChange(filter)      // Change notification filter
markNotificationAsRead(notification)    // Mark single notification
markNotificationAsUnread(notification)  // Mark single notification
navigateToAddCompany()                  // Navigate to companies
navigateToAddEmployee()                 // Navigate to users
navigateToAddSkillCategory()            // Navigate to categories
navigateToAddQuestionnaire()            // Navigate to questionnaires
```

---

## 📊 UI Layout

### Header
- Greeting: "Good Morning/Afternoon/Evening, [Name]"
- Current Date & Time (updates every second)
- Quick Action Buttons (Add Company, Add Employee, etc.)

### Statistics Cards (8 Total)
```
Desktop Layout: 4 columns per row
Tablet Layout: 2 columns per row
Mobile Layout: 1 column per row
```

### Charts Section
- 6 placeholder cards (ready for Chart.js)
- Each card has title and description

### Notifications Panel
- Tabs: Recent, Unread, Read
- List of notifications with actions
- Max height: 400px with scrollbar

### Activities Panel
- List of recent activities
- User, activity, type, timestamp
- Max height: 400px with scrollbar

---

## 🎨 Styling Reference

### Color Scheme
```scss
// Primary Colors
$primary: #667eea;          // Sidebar, buttons
$secondary: #764ba2;         // Gradient complement
$success: #43e97b;          // Success badges
$warning: #fee140;          // Warning badges
$danger: #fa709a;           // Error badges
$info: #4facfe;             // Info badges

// Background
$light-bg: #f8f9fa;         // Page background
$card-bg: #ffffff;          // Card background

// Text
$text-dark: #333;
$text-muted: #6c757d;
$text-light: #f8f9fa;
```

### Responsive Breakpoints
```scss
// Bootstrap 5 breakpoints
xs: < 576px      (Mobile)
sm: 576px-768px  (Small devices)
md: 768px-992px  (Tablet)
lg: 992px-1200px (Desktop)
xl: >= 1200px    (Large desktop)

// Grid
col-lg-3: 4 columns on desktop
col-md-6: 2 columns on tablet
col-sm-12: 1 column on mobile
```

---

## 🔒 Security

### Authentication
- JWT token required in Authorization header
- Token validated on all requests

### Authorization
- Admin role required on all endpoints
- Frontend route guard prevents navigation
- Backend middleware validates on API calls

### Role-Based Access
```typescript
// Frontend
canActivate: [roleGuard]
data: { roles: ['admin'] }

// Backend
router.get('/admin/overview', authenticate, allowRoles('admin'), controller)
```

---

## 📈 Data Flow

### Initial Load
```
1. Component ngOnInit()
2. checkAdminAccess()
3. loadDashboardData()
   ├── dashboardService.getStats()
   ├── dashboardService.getChartData()
   ├── dashboardService.getNotifications()
   └── dashboardService.getRecentActivities()
4. Update signals with response data
5. Render template with signals
```

### Real-time Updates
```
1. User interacts (click filter, mark read, etc.)
2. Component method triggered
3. API call made (dashboardService)
4. Signal updated on success
5. Template re-renders automatically
```

---

## 🧪 Testing Quick Commands

### Frontend
```bash
# Build
npm run build

# Serve development
ng serve

# Run tests
npm run test

# Check types
npm run typecheck
```

### Backend
```bash
# Build
npm run build

# Start development
npm run dev

# Run tests
npm run test

# Check types
npm run typecheck
```

---

## 📋 Common Tasks

### Add New Statistic Card
1. Update `admin-dashboard.ts` (component)
2. Add signal for new data
3. Update `admin-dashboard.html` template
4. Add backend API method
5. Update `admin-dashboard.service.ts`

### Add New Chart
1. Create Chart.js instance
2. Add chart container in template
3. Fetch chart data from API
4. Render chart on data received

### Add New Notification Type
1. Update Notification model (add type)
2. Create notification in service
3. Update type badge styling
4. Update notification icon mapping

### Customize Colors
1. Edit `admin-dashboard.scss`
2. Update `$primary` and `$secondary` variables
3. Update card icon colors
4. Update badge colors

---

## 🐛 Debugging Tips

### Frontend Debugging
```javascript
// Check signals
console.log(this.stats());          // Current stats
console.log(this.loading());        // Loading state
console.log(this.error());          // Error message

// Check API response
// Open Network tab → dashboard API calls
// Check response under "Response" tab

// Component state
console.log(this.currentTime());    // Current time
console.log(this.notifications());  // Notifications list
```

### Backend Debugging
```javascript
// Add console logs
console.log('Admin overview request:', userId);

// Check MongoDB logs
// Verify collections exist: Notifications, Activities

// Test endpoints
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/dashboard/admin/overview
```

---

## 📞 Troubleshooting

### Dashboard Not Loading
1. Check browser console for errors
2. Verify user is logged in as admin
3. Check Network tab for 403 Forbidden
4. Verify token in Authorization header

### Statistics Showing Zeros
1. Check database has data
2. Verify user count, company count, etc.
3. Check MongoDB aggregation pipeline
4. Review server logs for errors

### Notifications Not Showing
1. Verify Notification collection exists
2. Check database has notification documents
3. Verify notification filter query
4. Check server logs for errors

### Responsive Design Issues
1. Check Bootstrap grid classes
2. Verify viewport meta tag present
3. Test in different browser widths
4. Check CSS media queries

---

## 📚 Related Documentation

- `ADMIN_DASHBOARD_IMPLEMENTATION.md` - Complete implementation guide
- `ADMIN_DASHBOARD_BUILD_VERIFICATION.md` - Build verification report
- API Endpoints - See Implementation guide
- Bootstrap 5 Docs - https://getbootstrap.com/docs/5.0/
- Angular Docs - https://angular.dev/

---

## 🎯 Key Metrics

| Metric | Value |
|--------|-------|
| Build Time | ~26 seconds |
| Bundle Size | 18.41 kB (admin dashboard) |
| API Endpoints | 6 new endpoints |
| Files Created | 8 files |
| Lines of Code | ~1,290 lines |
| Components | 1 (standalone) |
| Services | 1 main + 1 backend |
| Models | 2 (Notification, Activity) |

---

## ✨ Features Implemented

- [x] 8 Statistics cards with growth metrics
- [x] 6 Chart placeholders (ready for Chart.js)
- [x] Notifications system with filtering
- [x] Recent activities tracking
- [x] Real-time date/time display
- [x] Responsive Bootstrap 5 design
- [x] Role-based access control
- [x] Gradient header design
- [x] Admin-only sidebar menu
- [x] Error handling & loading states

---

**Last Updated**: July 16, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
