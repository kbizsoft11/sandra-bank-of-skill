# Demo Data Seeding Script

This directory contains scripts for generating realistic demo data for the Bank of Skill application.

## Usage

### Running the Seed Script

From the `server` directory, run:

```bash
npm run seed
```

Or alternatively:

```bash
npm run seed:demo
```

### What the Script Does

The seed script performs the following operations:

1. **Clears existing demo data** (optional - currently enabled)
   - Removes all skills
   - Removes all employees and company owners
   - Removes all organisations
   - Removes all company-skill-category links
   - Removes all skill categories

2. **Seeds skill categories**
   - Creates 10 predefined skill categories:
     - Frontend Development
     - Backend Development
     - DevOps
     - Data Science
     - Mobile Development
     - Leadership
     - Communication
     - Project Management
     - Sales & Marketing
     - Human Resources

3. **Seeds companies**
   - Creates 4 demo companies:
     - TechNova Ltd
     - NextGen Solutions
     - Bright Future Pvt Ltd
     - CodeCraft
   - Each company gets an admin user (role: 'company')
   - Each company has a unique tenantId

4. **Seeds employees**
   - Creates 10-20 employees per company
   - Each employee gets:
     - Unique email address
     - Department assignment
     - Job title
     - Location
     - Completed profile and onboarding

5. **Seeds skills**
   - Each employee receives 5-15 skills
   - Skills are randomly selected from appropriate categories
   - Each skill has:
     - Skill name
     - Skill level (Beginner, Intermediate, Advanced, Expert)
     - Skill score (0-100)
     - Description

6. **Links skill categories to companies**
   - Associates skill categories with companies
   - Enables company-specific skill management

## Demo Data Overview

### Companies

1. **TechNova Ltd**
   - Industry: Technology
   - Size: 51-200 employees
   - Country: United States

2. **NextGen Solutions**
   - Industry: IT Services
   - Size: 201-500 employees
   - Country: United Kingdom

3. **Bright Future Pvt Ltd**
   - Industry: E-commerce
   - Size: 11-50 employees
   - Country: India

4. **CodeCraft**
   - Industry: Software Development
   - Size: 1-10 employees
   - Country: Canada

### Sample Employees

- John Smith - Senior Software Engineer
- Emily Johnson - Product Manager
- David Brown - DevOps Engineer
- Sophia Wilson - UX Designer
- And many more...

### Sample Skills

- **Frontend**: Angular, React, Vue.js, TypeScript, JavaScript
- **Backend**: Node.js, Express, MongoDB, PostgreSQL, Python
- **DevOps**: Docker, Kubernetes, AWS, CI/CD, Jenkins
- **Data Science**: Machine Learning, TensorFlow, Data Analysis
- **Mobile**: iOS Development, Android Development, React Native
- **Soft Skills**: Leadership, Communication, Project Management

## Default Credentials

All seeded users (both company admins and employees) have the same default password:

```
Password123!
```

### Example Login Credentials

**Company Admin:**
- Email: `admin@technovaltd.example.com`
- Password: `Password123!`

**Employee:**
- Email: `john.smith@technovaltd.example.com`
- Password: `Password123!`

## Technical Details

### Architecture

The seed script follows the application's architecture patterns:

- **Uses existing repositories** instead of direct database operations
- **Respects data models** and validation rules
- **Maintains referential integrity** (skills reference users and categories)
- **Generates unique tenantIds** using UUID v4
- **Hashes passwords** using bcrypt (same as production)

### Script Features

- ✅ Idempotent (can be run multiple times safely)
- ✅ Transaction-safe operations
- ✅ Error handling and logging
- ✅ Progress indicators
- ✅ Summary statistics
- ✅ Graceful exit on completion or error

### Customization

To modify the demo data, edit the following sections in `seed.ts`:

1. **skillCategories** - Add or modify skill categories
2. **companies** - Add or modify company data
3. **employeeTemplates** - Add or modify employee profiles
4. **skillsByCategory** - Add or modify skills per category

You can also adjust the randomization ranges:

```typescript
// Number of employees per company (currently 10-20)
const employeeCount = Math.floor(Math.random() * 11) + 10;

// Number of skills per employee (currently 5-15)
const skillCount = Math.floor(Math.random() * 11) + 5;
```

## Troubleshooting

### Database Connection Error

If you see a MongoDB connection error, ensure:
- MongoDB is running
- `.env` file has correct `MONGO_URI`
- Database server is accessible

### Duplicate Key Errors

These are usually handled gracefully by the script. If you see persistent errors:
- Try running the script again (it clears data first)
- Check for unique constraints in your models

### Memory Issues

For very large data generation:
- Reduce the number of employees per company
- Reduce the number of skills per employee
- Process data in smaller batches

## Future Enhancements

Potential improvements to the seeding script:

- [ ] Add command-line arguments for customization
- [ ] Support partial seeding (only specific entities)
- [ ] Add more realistic data (using faker.js)
- [ ] Support seeding without clearing existing data
- [ ] Add progress bars for long operations
- [ ] Export seed data to JSON for reproducibility
- [ ] Add data validation before insertion

## Notes

⚠️ **Important**: This script is intended for **development and testing purposes only**. Do not run it in a production environment as it will **clear existing data**.

For production data migration or initial setup, create a separate migration script with appropriate safeguards.
