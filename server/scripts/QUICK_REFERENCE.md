# Demo Data Seeding - Quick Reference Card

## 🎯 Command

```bash
cd server && npm run seed
```

## 🔑 Default Password

```
Password123!
```

## 👥 Sample Logins

### Company Admins (role: company)
```
admin@technovaltd.example.com
admin@nextgensolutions.example.com
admin@brightfuturepvtltd.example.com
admin@codecraft.example.com
```

### Employees (role: employee)
```
john.smith@technovaltd.example.com
emily.johnson@nextgensolutions.example.com
david.brown@brightfuturepvtltd.example.com
sophia.wilson@codecraft.example.com
```

## 📊 Data Created

| Item | Count |
|------|-------|
| Companies | 4 |
| Employees | 40-80 |
| Skill Categories | 10 |
| Skills | 200-1200 |

## 🏢 Companies

1. **TechNova Ltd** - Technology, United States
2. **NextGen Solutions** - IT Services, United Kingdom
3. **Bright Future Pvt Ltd** - E-commerce, India
4. **CodeCraft** - Software Development, Canada

## 🎓 Skill Categories

1. Frontend Development
2. Backend Development
3. DevOps
4. Data Science
5. Mobile Development
6. Leadership
7. Communication
8. Project Management
9. Sales & Marketing
10. Human Resources

## 💡 Sample Skills

**Technical:**
- Angular, React, Vue.js
- Node.js, Express, MongoDB
- Docker, Kubernetes, AWS
- Python, TensorFlow, ML

**Soft Skills:**
- Leadership, Communication
- Project Management
- Recruitment, Sales

## ⚙️ Prerequisites

- ✅ MongoDB running
- ✅ `server/.env` configured
- ✅ `npm install` completed

## ⚠️ Warning

**Clears all existing:**
- Skills
- Users (employees & admins)
- Organisations
- Skill categories

## 🔧 Customization

Edit `server/scripts/seed.ts`:

```typescript
// Line ~144: Employees per company
const employeeCount = Math.floor(Math.random() * 11) + 10; // 10-20

// Line ~184: Skills per employee
const skillCount = Math.floor(Math.random() * 11) + 5; // 5-15
```

## 📝 Execution Time

~15-30 seconds for complete dataset

## 🐛 Troubleshooting

**Connection Error?**
```bash
# Check MongoDB
mongosh

# Verify .env
cat server/.env | grep MONGO_URI
```

**Dependencies Error?**
```bash
cd server
npm install
```

## 📖 Full Documentation

- `server/SEEDING.md` - Complete guide
- `server/scripts/README.md` - Technical details
- `DEMO_DATA_SETUP.md` - Quick start

---

**Print this card and keep it handy! 📌**
