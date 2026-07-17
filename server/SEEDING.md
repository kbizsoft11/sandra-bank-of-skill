# Bank of Skill - Demo Data Seeding Guide

This guide explains how to populate your Bank of Skill development database with realistic demo data.

## Quick Start

```bash
cd server
npm run seed
```

That's it! The script will automatically:
- Connect to your MongoDB database
- Clear existing demo data
- Create realistic companies, employees, and skills
- Display progress and summary

## What Gets Created

### 📊 Data Summary

| Entity | Count | Details |
|--------|-------|---------|
| **Companies** | 4 | TechNova Ltd, NextGen Solutions, Bright Future Pvt Ltd, CodeCraft |
| **Employees** | 40-80 | 10-20 employees per company |
| **Skill Categories** | 10 | Frontend, Backend, DevOps, Data Science, Mobile, Leadership, etc. |
| **Skills** | 200-1200 | 5-15 skills per employee |

### 🏢 Companies Created

1. **TechNova Ltd** (United States)
   - Technology company, 51-200 employees
   - Admin: `admin@technovaltd.example.com`

2. **NextGen Solutions** (United Kingdom)
   - IT Services, 201-500 employees
   - Admin: `admin@nextgensolutions.example.com`

3. **Bright Future Pvt Ltd** (India)
   - E-commerce, 11-50 employees
   - Admin: `admin@brightfuturepvtltd.example.com`

4. **CodeCraft** (Canada)
   - Software Development, 1-10 employees
   - Admin: `admin@codecraft.example.com`

## Login Credentials

All seeded users use the same password for easy testing:

**Password:** `Password123!`

### Example Logins

**Company Admin:**
```
Email: admin@technovaltd.example.com
Password: Password123!
Role: company
```

**Employee:**
```
Email: john.smith@technovaltd.example.com
Password: Password123!
Role: employee
```

## Understanding the Data Structure

### Company Hierarchy

```
Organisation (Company)
  ├── Owner User (role: company)
  ├── Tenant ID (unique identifier)
  └── Employees (role: employee)
       └── Skills
            └── Skill Category
```

### Skills Distribution

Each employee gets:
- **5-15 random skills** from various categories
- **Skill levels**: Beginner, Intermediate, Advanced, Expert
- **Skill scores**: 0-100 (randomly assigned)
- **Realistic descriptions** based on skill level

### Skill Categories

The following categories are seeded with relevant skills:

1. **Frontend Development**: Angular, React, Vue.js, TypeScript, JavaScript, HTML/CSS, Webpack, Redux
2. **Backend Development**: Node.js, Express, MongoDB, PostgreSQL, Python, Django, REST API, GraphQL
3. **DevOps**: Docker, Kubernetes, AWS, CI/CD, Jenkins, Terraform, Linux, Azure
4. **Data Science**: Machine Learning, TensorFlow, Data Analysis, SQL, R, Statistics, Pandas
5. **Mobile Development**: iOS Development, Android Development, React Native, Flutter, Swift, Kotlin
6. **Leadership**: Team Management, Strategic Planning, Decision Making, Mentoring, Conflict Resolution
7. **Communication**: Public Speaking, Technical Writing, Presentation Skills, Active Listening, Collaboration
8. **Project Management**: Agile, Scrum, Kanban, JIRA, Risk Management, Budget Planning, Stakeholder Management
9. **Sales & Marketing**: Digital Marketing, SEO, Content Strategy, Lead Generation, CRM, Negotiation, Sales Strategy
10. **Human Resources**: Recruitment, Onboarding, Employee Relations, Performance Management, Training & Development

## Script Options

### Available Commands

```bash
# Run the seed script
npm run seed

# Alternative command (same behavior)
npm run seed:demo
```

### What the Script Does

1. ✅ Connects to MongoDB using your `.env` configuration
2. ✅ Clears all existing demo data (safe operation)
3. ✅ Seeds skill categories (10 categories)
4. ✅ Seeds companies with owners (4 companies)
5. ✅ Seeds employees (10-20 per company)
6. ✅ Seeds skills for each employee (5-15 per employee)
7. ✅ Links skill categories to companies
8. ✅ Displays progress and summary

## Prerequisites

Before running the seed script, ensure:

1. **MongoDB is running**
   ```bash
   # Check if MongoDB is accessible
   mongosh
   ```

2. **Environment variables are configured**
   - Ensure `server/.env` file exists
   - Verify `MONGO_URI` is correctly set
   ```env
   MONGO_URI=mongodb://localhost:27017/bank-of-skill
   ```

3. **Dependencies are installed**
   ```bash
   cd server
   npm install
   ```

## Advanced Usage

### Customizing Demo Data

To modify what data gets created, edit `server/scripts/seed.ts`:

```typescript
// Change number of employees per company (line ~144)
const employeeCount = Math.floor(Math.random() * 11) + 10; // 10-20

// Change number of skills per employee (line ~184)
const skillCount = Math.floor(Math.random() * 11) + 5; // 5-15
```

### Adding More Companies

Add entries to the `companies` array in `seed.ts`:

```typescript
const companies = [
  // ... existing companies
  {
    organisationName: 'Your Company Name',
    industry: 'Your Industry',
    companySize: '51-200' as const,
    country: 'Your Country',
    website: 'https://yourcompany.example.com',
    description: 'Your company description.',
  },
];
```

### Adding More Skills

Add skills to the `skillsByCategory` object:

```typescript
const skillsByCategory: Record<string, string[]> = {
  'Frontend Development': ['Angular', 'React', 'Your New Skill'],
  // ... other categories
};
```

## Troubleshooting

### Issue: MongoDB Connection Failed

**Solution:**
- Verify MongoDB is running: `mongosh`
- Check `MONGO_URI` in `.env` file
- Ensure network connectivity to MongoDB server

### Issue: Duplicate Key Error

**Solution:**
- The script handles duplicates gracefully
- If persistent, manually clear the database:
  ```bash
  mongosh
  use bank-of-skill
  db.dropDatabase()
  ```

### Issue: Out of Memory

**Solution:**
- Reduce employee count per company
- Reduce skills per employee
- Process in smaller batches

### Issue: Permission Denied

**Solution:**
- Ensure MongoDB user has write permissions
- Check authentication credentials in `MONGO_URI`

## Testing the Seeded Data

After running the seed script, verify the data:

### Using MongoDB Shell

```bash
mongosh
use bank-of-skill

# Check companies
db.organisations.countDocuments()

# Check employees
db.users.countDocuments({ role: "employee" })

# Check skills
db.skills.countDocuments()

# Check skill categories
db.skillcategories.countDocuments()
```

### Using the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd ../client
   npm start
   ```

3. Log in with any seeded credentials
4. Navigate through companies, employees, and skills

## Script Architecture

The seed script follows best practices:

- ✅ **Uses existing repositories** (not direct MongoDB operations)
- ✅ **Respects data models** and validation rules
- ✅ **Maintains referential integrity** (foreign key relationships)
- ✅ **Generates unique identifiers** (UUID for tenantId)
- ✅ **Properly hashes passwords** (bcrypt)
- ✅ **Idempotent operations** (safe to run multiple times)
- ✅ **Comprehensive error handling**
- ✅ **Detailed logging and progress tracking**

## Performance

Typical execution time (approximate):

| Operation | Time | Items |
|-----------|------|-------|
| Clear data | 1-2s | All collections |
| Seed categories | <1s | 10 categories |
| Seed companies | 1-2s | 4 companies |
| Seed employees | 3-5s | 40-80 employees |
| Seed skills | 10-20s | 200-1200 skills |
| Link categories | <1s | Links |
| **Total** | **15-30s** | **Complete dataset** |

## Safety Notes

⚠️ **Important Warnings:**

1. **This script clears existing data** - It removes all:
   - Skills
   - Users (employees and company admins)
   - Organisations
   - Company-skill-category links
   - Skill categories

2. **Development Only** - Do NOT run in production

3. **Backup First** - If you have important data, back it up:
   ```bash
   mongodump --db bank-of-skill --out ./backup
   ```

4. **Review Before Running** - Check the script matches your requirements

## Next Steps

After seeding:

1. ✅ Verify data in MongoDB
2. ✅ Test login with seeded credentials
3. ✅ Explore company dashboards
4. ✅ Test employee skill management
5. ✅ Verify multi-tenancy (each company isolated)

## Getting Help

For more information:

- **Script Details**: See `server/scripts/README.md`
- **Source Code**: Check `server/scripts/seed.ts`
- **API Documentation**: Review `server/src/routes/`
- **Model Schemas**: Check `server/src/models/`

## Contributing

To improve the seed script:

1. Add more realistic data sources
2. Implement data generation libraries (faker.js)
3. Add command-line options
4. Support partial seeding
5. Add data export/import features

---

**Happy Testing! 🚀**
