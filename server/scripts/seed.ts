import { connectDB } from '../src/config/database';
import { userRepository } from '../src/repositories/user.repository';
import { organisationRepository } from '../src/repositories/organisation.repository';
import { SkillCategoryRepository } from '../src/repositories/skill-category.repository';
import { SkillRepository } from '../src/repositories/skill.repository';
import { CompanySkillCategoryRepository } from '../src/repositories/company-skill-category.repository';
import { UserModel } from '../src/models/user.model';
import { Organisation } from '../src/models/organisation.model';
import { SkillCategory } from '../src/models/skillCategory.model';
import { Skill } from '../src/models/skill.model';
import { CompanySkillCategory } from '../src/models/company-skill-category.model';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Initialize repositories
const skillCategoryRepo = new SkillCategoryRepository();
const skillRepo = new SkillRepository();
const companySkillCategoryRepo = new CompanySkillCategoryRepository();

// Demo data definitions
const skillCategories = [
  { cat_name: 'Frontend Development', cat_desc: 'User interface and client-side development' },
  { cat_name: 'Backend Development', cat_desc: 'Server-side and database development' },
  { cat_name: 'DevOps', cat_desc: 'Development operations and infrastructure' },
  { cat_name: 'Data Science', cat_desc: 'Data analysis and machine learning' },
  { cat_name: 'Mobile Development', cat_desc: 'iOS and Android development' },
  { cat_name: 'Leadership', cat_desc: 'Management and leadership abilities' },
  { cat_name: 'Communication', cat_desc: 'Interpersonal and presentation skills' },
  { cat_name: 'Project Management', cat_desc: 'Planning and execution of projects' },
  { cat_name: 'Sales & Marketing', cat_desc: 'Business development and marketing' },
  { cat_name: 'Human Resources', cat_desc: 'Recruitment and employee management' },
];

const companies = [
  {
    organisationName: 'TechNova Ltd',
    industry: 'Technology',
    companySize: '51-200' as const,
    country: 'United States',
    website: 'https://technova.example.com',
    description: 'Leading technology solutions provider specializing in cloud infrastructure and enterprise software.',
  },
  {
    organisationName: 'NextGen Solutions',
    industry: 'IT Services',
    companySize: '201-500' as const,
    country: 'United Kingdom',
    website: 'https://nextgen.example.com',
    description: 'Innovative IT consulting and software development company focused on digital transformation.',
  },
  {
    organisationName: 'Bright Future Pvt Ltd',
    industry: 'E-commerce',
    companySize: '11-50' as const,
    country: 'India',
    website: 'https://brightfuture.example.com',
    description: 'Fast-growing e-commerce platform revolutionizing online shopping experience.',
  },
  {
    organisationName: 'CodeCraft',
    industry: 'Software Development',
    companySize: '1-10' as const,
    country: 'Canada',
    website: 'https://codecraft.example.com',
    description: 'Boutique software development agency creating bespoke applications for startups.',
  },
];

const employeeTemplates = [
  { fullName: 'John Smith', email: 'john.smith', title: 'Senior Software Engineer', department: 'Engineering', location: 'New York' },
  { fullName: 'Emily Johnson', email: 'emily.johnson', title: 'Product Manager', department: 'Product', location: 'San Francisco' },
  { fullName: 'David Brown', email: 'david.brown', title: 'DevOps Engineer', department: 'Engineering', location: 'Seattle' },
  { fullName: 'Sophia Wilson', email: 'sophia.wilson', title: 'UX Designer', department: 'Design', location: 'Austin' },
  { fullName: 'Michael Davis', email: 'michael.davis', title: 'Data Scientist', department: 'Analytics', location: 'Boston' },
  { fullName: 'Emma Martinez', email: 'emma.martinez', title: 'Frontend Developer', department: 'Engineering', location: 'Los Angeles' },
  { fullName: 'James Anderson', email: 'james.anderson', title: 'Backend Developer', department: 'Engineering', location: 'Chicago' },
  { fullName: 'Olivia Thomas', email: 'olivia.thomas', title: 'QA Engineer', department: 'Quality', location: 'Denver' },
  { fullName: 'William Taylor', email: 'william.taylor', title: 'Technical Lead', department: 'Engineering', location: 'Portland' },
  { fullName: 'Ava Moore', email: 'ava.moore', title: 'Marketing Manager', department: 'Marketing', location: 'Miami' },
  { fullName: 'Robert Jackson', email: 'robert.jackson', title: 'Sales Executive', department: 'Sales', location: 'Dallas' },
  { fullName: 'Isabella White', email: 'isabella.white', title: 'HR Manager', department: 'Human Resources', location: 'Phoenix' },
  { fullName: 'Daniel Harris', email: 'daniel.harris', title: 'Scrum Master', department: 'Engineering', location: 'San Diego' },
  { fullName: 'Mia Martin', email: 'mia.martin', title: 'Full Stack Developer', department: 'Engineering', location: 'Atlanta' },
  { fullName: 'Christopher Lee', email: 'christopher.lee', title: 'Cloud Architect', department: 'Engineering', location: 'Washington DC' },
  { fullName: 'Charlotte Walker', email: 'charlotte.walker', title: 'Business Analyst', department: 'Product', location: 'Minneapolis' },
  { fullName: 'Matthew Hall', email: 'matthew.hall', title: 'Security Engineer', department: 'Security', location: 'Houston' },
  { fullName: 'Amelia Allen', email: 'amelia.allen', title: 'Content Writer', department: 'Marketing', location: 'Nashville' },
  { fullName: 'Joseph Young', email: 'joseph.young', title: 'Mobile Developer', department: 'Engineering', location: 'Salt Lake City' },
  { fullName: 'Harper King', email: 'harper.king', title: 'Recruiter', department: 'Human Resources', location: 'Las Vegas' },
];

const skillsByCategory: Record<string, string[]> = {
  'Frontend Development': ['Angular', 'React', 'Vue.js', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Webpack', 'Redux'],
  'Backend Development': ['Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Python', 'Django', 'REST API', 'GraphQL'],
  'DevOps': ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Jenkins', 'Terraform', 'Linux', 'Azure'],
  'Data Science': ['Machine Learning', 'Python', 'TensorFlow', 'Data Analysis', 'SQL', 'R', 'Statistics', 'Pandas'],
  'Mobile Development': ['iOS Development', 'Android Development', 'React Native', 'Flutter', 'Swift', 'Kotlin'],
  'Leadership': ['Team Management', 'Strategic Planning', 'Decision Making', 'Mentoring', 'Conflict Resolution'],
  'Communication': ['Public Speaking', 'Technical Writing', 'Presentation Skills', 'Active Listening', 'Collaboration'],
  'Project Management': ['Agile', 'Scrum', 'Kanban', 'JIRA', 'Risk Management', 'Budget Planning', 'Stakeholder Management'],
  'Sales & Marketing': ['Digital Marketing', 'SEO', 'Content Strategy', 'Lead Generation', 'CRM', 'Negotiation', 'Sales Strategy'],
  'Human Resources': ['Recruitment', 'Onboarding', 'Employee Relations', 'Performance Management', 'Training & Development'],
};

const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

// Helper function to get random items from array
function getRandomItems<T>(array: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper function to get random item
function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Clear existing demo data
async function clearDemoData() {
  console.log('\n🗑️  Clearing existing demo data...');
  
  try {
    await Promise.all([
      Skill.deleteMany({}),
      UserModel.deleteMany({ role: { $in: ['employee', 'company'] } }),
      Organisation.deleteMany({}),
      CompanySkillCategory.deleteMany({}),
      SkillCategory.deleteMany({}),
    ]);
    
    console.log('✅ Demo data cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing demo data:', error);
    throw error;
  }
}

// Seed skill categories
async function seedSkillCategories() {
  console.log('\n📚 Seeding skill categories...');
  
  const createdCategories = [];
  
  for (const category of skillCategories) {
    try {
      const created = await skillCategoryRepo.create(category);
      createdCategories.push(created);
      console.log(`  ✓ Created category: ${category.cat_name}`);
    } catch (error) {
      console.error(`  ✗ Error creating category ${category.cat_name}:`, error);
    }
  }
  
  console.log(`✅ Created ${createdCategories.length} skill categories`);
  return createdCategories;
}

// Seed companies and their owners
async function seedCompanies() {
  console.log('\n🏢 Seeding companies...');
  
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const createdCompanies = [];
  
  for (const companyData of companies) {
    try {
      const tenantId = uuidv4();
      
      // Create company owner (user with 'company' role)
      const owner = await userRepository.create({
        fullName: `${companyData.organisationName} Admin`,
        email: `admin@${companyData.organisationName.toLowerCase().replace(/\s+/g, '')}.example.com`,
        password: hashedPassword,
        role: 'company',
        tenantId: tenantId,
        profileCompleted: true,
        hasCompletedOnboarding: true,
        isActive: true,
        emailVerified: true,
        onboardingStatus: 'completed',
        accountStatus: 'active',
      });
      
      // Create organisation
      const organisation = await organisationRepository.create({
        ...companyData,
        ownerUserId: owner._id.toString(),
        tenantId: tenantId,
      });
      
      // Update owner with organisationId
      await userRepository.update(owner._id.toString(), {
        organisationId: organisation._id.toString(),
      });
      
      createdCompanies.push({
        organisation,
        owner,
        tenantId,
      });
      
      console.log(`  ✓ Created company: ${companyData.organisationName}`);
    } catch (error) {
      console.error(`  ✗ Error creating company ${companyData.organisationName}:`, error);
    }
  }
  
  console.log(`✅ Created ${createdCompanies.length} companies`);
  return createdCompanies;
}

// Seed employees for each company
async function seedEmployees(companies: any[]) {
  console.log('\n👥 Seeding employees...');
  
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const allEmployees = [];
  
  for (const company of companies) {
    const employeeCount = Math.floor(Math.random() * 11) + 10; // 10-20 employees
    const companyEmployees = [];
    
    console.log(`\n  Creating ${employeeCount} employees for ${company.organisation.organisationName}...`);
    
    for (let i = 0; i < employeeCount; i++) {
      const template = getRandomItem(employeeTemplates);
      
      try {
        const employee = await userRepository.create({
          fullName: `${template.fullName} ${i > 0 ? i : ''}`.trim(),
          email: `${template.email}${i > 0 ? i : ''}@${company.organisation.organisationName.toLowerCase().replace(/\s+/g, '')}.example.com`,
          password: hashedPassword,
          role: 'employee',
          tenantId: company.tenantId,
          organisationId: company.organisation._id.toString(),
          department: template.department,
          location: template.location,
          title: template.title,
          profileCompleted: true,
          hasCompletedOnboarding: true,
          isActive: true,
          emailVerified: true,
          onboardingStatus: 'completed',
          accountStatus: 'active',
          bio: `Passionate ${template.title} with experience in ${template.department}`,
        });
        
        companyEmployees.push(employee);
        console.log(`    ✓ Created employee: ${employee.fullName}`);
      } catch (error) {
        console.error(`    ✗ Error creating employee:`, error);
      }
    }
    
    allEmployees.push({
      company,
      employees: companyEmployees,
    });
  }
  
  const totalEmployees = allEmployees.reduce((sum, item) => sum + item.employees.length, 0);
  console.log(`✅ Created ${totalEmployees} employees across all companies`);
  return allEmployees;
}

// Seed skills for employees
async function seedSkills(employeesByCompany: any[], skillCategoriesData: any[]) {
  console.log('\n🎯 Seeding skills for employees...');
  
  let totalSkillsCreated = 0;
  
  for (const { company, employees } of employeesByCompany) {
    console.log(`\n  Adding skills for ${company.organisation.organisationName} employees...`);
    
    for (const employee of employees) {
      const skillCount = Math.floor(Math.random() * 11) + 5; // 5-15 skills per employee
      const categoriesForEmployee = getRandomItems(skillCategoriesData, 2, 5); // 2-5 categories per employee
      
      for (let i = 0; i < skillCount; i++) {
        const category = getRandomItem(categoriesForEmployee);
        const categoryName = category.cat_name;
        const availableSkills = skillsByCategory[categoryName] || [];
        
        if (availableSkills.length === 0) continue;
        
        const skillName = getRandomItem(availableSkills);
        const skillLevel = getRandomItem(skillLevels);
        const skillScore = Math.floor(Math.random() * 101); // 0-100
        
        try {
          // Check if skill already exists for this user
          const existingSkill = await skillRepo.findByName(
            skillName,
            category._id.toString(),
            employee._id.toString()
          );
          
          if (!existingSkill) {
            await skillRepo.create({
              cat_id: category._id.toString(),
              user_id: employee._id.toString(),
              skill_name: skillName,
              skill_desc: `${skillLevel} proficiency in ${skillName}`,
              skill_level: skillLevel,
              skill_score: skillScore,
            });
            
            totalSkillsCreated++;
          }
        } catch (error) {
          // Skip if skill creation fails (likely duplicate)
        }
      }
      
      console.log(`    ✓ Added skills for: ${employee.fullName}`);
    }
  }
  
  console.log(`✅ Created ${totalSkillsCreated} skills across all employees`);
}

// Link skill categories to companies
async function linkSkillCategoriesToCompanies(companies: any[], skillCategoriesData: any[]) {
  console.log('\n🔗 Linking skill categories to companies...');
  
  let totalLinks = 0;
  
  for (const company of companies) {
    const categoriesToLink = getRandomItems(skillCategoriesData, 5, skillCategoriesData.length);
    
    for (const category of categoriesToLink) {
      try {
        await companySkillCategoryRepo.create({
          companyId: company.organisation._id.toString(),
          skillCategoryId: category._id.toString(),
          displayName: category.cat_name,
        });
        
        totalLinks++;
      } catch (error) {
        // Skip if link already exists
      }
    }
    
    console.log(`  ✓ Linked categories to: ${company.organisation.organisationName}`);
  }
  
  console.log(`✅ Created ${totalLinks} company-category links`);
}

// Main seed function
async function seed() {
  console.log('🌱 Starting demo data seeding process...\n');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    // Connect to database
    await connectDB();
    
    // Clear existing demo data
    await clearDemoData();
    
    // Seed skill categories first (required for skills)
    const skillCategoriesData = await seedSkillCategories();
    
    if (skillCategoriesData.length === 0) {
      throw new Error('No skill categories created. Cannot proceed.');
    }
    
    // Seed companies and owners
    const companiesData = await seedCompanies();
    
    if (companiesData.length === 0) {
      throw new Error('No companies created. Cannot proceed.');
    }
    
    // Seed employees
    const employeesByCompany = await seedEmployees(companiesData);
    
    // Seed skills for employees
    await seedSkills(employeesByCompany, skillCategoriesData);
    
    // Link skill categories to companies
    await linkSkillCategoriesToCompanies(companiesData, skillCategoriesData);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Demo data seeding completed successfully!\n');
    
    // Print summary
    console.log('📊 Summary:');
    console.log(`   • ${skillCategoriesData.length} skill categories`);
    console.log(`   • ${companiesData.length} companies`);
    const totalEmployees = employeesByCompany.reduce((sum, item) => sum + item.employees.length, 0);
    console.log(`   • ${totalEmployees} employees`);
    console.log(`   • Skills distributed across all employees`);
    console.log('\n💡 Default password for all users: Password123!');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed function
seed();
