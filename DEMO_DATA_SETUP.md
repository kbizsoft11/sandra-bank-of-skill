# Bank of Skill - Demo Data Setup

Quick guide to populate your development database with realistic demo data.

## 🚀 Quick Start

```bash
# Navigate to server directory
cd server

# Run the seed script
npm run seed
```

## 📊 What You Get

- **4 Companies**: TechNova Ltd, NextGen Solutions, Bright Future Pvt Ltd, CodeCraft
- **40-80 Employees**: 10-20 employees per company with realistic profiles
- **10 Skill Categories**: Frontend, Backend, DevOps, Data Science, Mobile, Leadership, etc.
- **200-1200 Skills**: 5-15 skills per employee with varying proficiency levels

## 🔑 Login Credentials

All seeded users have the same password for easy testing:

**Password:** `Password123!`

### Example Company Admin Login:
- Email: `admin@technovaltd.example.com`
- Password: `Password123!`

### Example Employee Login:
- Email: `john.smith@technovaltd.example.com`
- Password: `Password123!`

## 📖 Detailed Documentation

For more information, see:
- **Detailed Guide**: `server/SEEDING.md`
- **Script Documentation**: `server/scripts/README.md`
- **Script Source**: `server/scripts/seed.ts`

## ⚠️ Important Notes

1. **Clears Existing Data**: The script removes all existing demo data before seeding
2. **Development Only**: Do NOT run this in production
3. **Prerequisites**: 
   - MongoDB must be running
   - `server/.env` must be configured with `MONGO_URI`
   - Dependencies must be installed (`npm install`)

## 🛠️ Troubleshooting

### MongoDB Connection Error
- Check if MongoDB is running
- Verify `MONGO_URI` in `server/.env`

### Dependencies Not Found
```bash
cd server
npm install
```

## 📝 Summary of Created Data

| Entity | Details |
|--------|---------|
| Companies | 4 multi-national companies with different industries |
| Company Admins | 1 admin per company (role: 'company') |
| Employees | 10-20 per company with departments, titles, locations |
| Skill Categories | 10 categories covering technical and soft skills |
| Skills | 5-15 per employee with levels (Beginner to Expert) |
| Skill Scores | 0-100 randomly assigned per skill |

## 🎯 Next Steps

After seeding:

1. Start the backend server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd client
   npm start
   ```

3. Log in and explore!

---

**Happy Testing! 🚀**
