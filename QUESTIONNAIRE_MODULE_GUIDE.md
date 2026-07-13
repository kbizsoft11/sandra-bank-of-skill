# 📋 Employee Questionnaire Module - User Guide

## Table of Contents
1. [What is the Questionnaire Module?](#what-is-the-questionnaire-module)
2. [Who Can Use What?](#who-can-use-what)
3. [Getting Started](#getting-started)
4. [For Company Users (Managers/HR)](#for-company-users-managershr)
5. [For Employee Users](#for-employee-users)
6. [Complete Testing Workflow](#complete-testing-workflow)
7. [Troubleshooting](#troubleshooting)

---

## What is the Questionnaire Module?

The **Employee Questionnaire Module** allows companies to:
- Create surveys and questionnaires for their employees
- Assign questionnaires to specific employees
- Track who has completed questionnaires
- View and analyze employee responses

Think of it like **Google Forms** or **SurveyMonkey**, but built into your Bank of Skill system specifically for employee feedback and surveys.

---

## Who Can Use What?

### 👔 Company Users (Managers/HR)
- ✅ Create questionnaires
- ✅ Edit questionnaires
- ✅ Assign questionnaires to employees
- ✅ View all responses
- ✅ See completion statistics
- ✅ Invite employees to join

### 👤 Employee Users
- ✅ View assigned questionnaires
- ✅ Fill out questionnaires
- ✅ Save progress and continue later
- ✅ View their submitted responses

### 🔧 Admin Users
- Admin users currently don't use the questionnaire module
- They manage companies and system settings

---

## Getting Started

### Prerequisites
Make sure your application is running:

1. **Start the Backend Server**
   ```bash
   cd server
   npm run dev
   ```
   You should see: `Server is running on port 5000`

2. **Start the Frontend (Angular)**
   ```bash
   cd client
   npm start
   ```
   You should see: `Angular Live Development Server is listening on localhost:4200`

3. **Open your browser**
   Navigate to: `http://localhost:4200`

---

## For Company Users (Managers/HR)

### Step 1: Register as a Company User

1. Go to `http://localhost:4200/auth/register`
2. Fill in your details:
   - Full Name: `John Manager`
   - Email: `manager@company.com`
   - Password: `Password123!`
   - Phone: (optional)
3. Click **Register**
4. Check your **console/terminal** for the **OTP code** (it will be printed in the server logs)
5. Enter the OTP to verify your email
6. Complete organization details:
   - Organization Name: `ABC Company`
   - Industry: `Technology`
   - Team Size: `11-50`
   - Country: `United States`
7. Complete registration

You'll be logged in as a **Company user**!

---

### Step 2: Invite Employees to Your Company

Before creating questionnaires, you need employees to assign them to!

1. **Navigate to Users/Employees**
   - Click on **"Employees"** in the left sidebar
   
2. **Invite an Employee**
   - Click the **"Invite User"** button
   - Enter employee email: `employee1@company.com`
   - Click **"Send Invite"**
   
3. **What Happens:**
   - ✅ Employee account is created automatically
   - ✅ Random password is generated
   - ✅ Employee is linked to YOUR company (same tenantId and organisationId)
   - ✅ Invitation email is sent with login credentials
   - ✅ Employee can login immediately

4. **Invite More Employees (Optional)**
   - Repeat the process for more employees:
     - `employee2@company.com`
     - `employee3@company.com`

> **Note:** You can invite as many employees as you need. Each employee will be automatically associated with your company.

---

### Step 3: Create a Questionnaire

1. **Navigate to Questionnaires**
   - Click on **"Questionnaires"** in the left sidebar menu

2. **Click "Create Questionnaire"**

3. **Fill in Basic Information**
   - **Title**: `Employee Satisfaction Survey 2024`
   - **Description**: `Annual survey to understand employee satisfaction and gather feedback`
   - **Status**: Select **"Active"** (only active questionnaires can be assigned)

4. **Add Questions**
   
   Click **"Add Question"** and create various types:

   **Question 1 - Rating**
   - Question Text: `How satisfied are you with your current role?`
   - Question Type: `Rating (1-5)`
   - Required: ✅ Yes

   **Question 2 - Single Choice**
   - Question Text: `How would you rate work-life balance?`
   - Question Type: `Single Choice`
   - Options:
     - `Excellent`
     - `Good`
     - `Average`
     - `Poor`
   - Required: ✅ Yes

   **Question 3 - Multiple Choice**
   - Question Text: `Which benefits are most important to you? (Select all that apply)`
   - Question Type: `Multiple Choice`
   - Options:
     - `Health Insurance`
     - `Remote Work`
     - `Flexible Hours`
     - `Professional Development`
   - Required: ❌ No

   **Question 4 - Long Text**
   - Question Text: `What improvements would you suggest for the company?`
   - Question Type: `Long Text`
   - Required: ✅ Yes

   **Question 5 - Short Text**
   - Question Text: `What do you like most about working here?`
   - Question Type: `Short Text`
   - Required: ❌ No

   **Question 6 - Date**
   - Question Text: `When did you join the company?`
   - Question Type: `Date`
   - Required: ✅ Yes

5. **Reorder Questions (Optional)**
   - Use the ⬆️ and ⬇️ arrows to change question order

6. **Save the Questionnaire**
   - Click **"Create Questionnaire"**
   - You'll see a success message!

---

### Step 4: Assign Questionnaire to Employees

1. **Go to Questionnaires List**
   - You'll see your newly created questionnaire

2. **Click "Assign"** button next to the questionnaire

3. **Select Employees**
   - You'll see a list of all your employees
   - Check the boxes next to employees you want to assign:
     - ☑️ `employee1@company.com`
     - ☑️ `employee2@company.com`
   - Or click **"Select All"** to assign to everyone

4. **Set Deadline (Optional)**
   - Choose a deadline date (e.g., 7 days from now)
   - Leave empty for no deadline

5. **Click "Assign"**
   - Employees will now see this questionnaire in their dashboard!

---

### Step 5: View Responses

1. **Go to Questionnaires List**

2. **Click "Responses"** button next to the questionnaire

3. **View Statistics Dashboard**
   - Total Assigned: `2`
   - Completed: `0`
   - In Progress: `0`
   - Pending: `2`
   - Completion Rate: `0%`

4. **View Individual Responses**
   - See list of all employees
   - Filter by status (Completed, In Progress, Pending)
   - Search by employee name
   - Once an employee completes it, click **"View Answers"** to see their responses

5. **Analyze Results**
   - See all answers in a modal
   - Compare responses across employees

---

### Step 6: Edit or Delete Questionnaires

**Edit a Questionnaire:**
1. Click the **"Edit"** icon (pencil) next to any questionnaire
2. Modify title, description, questions, or status
3. Click **"Update Questionnaire"**

**Delete a Questionnaire:**
1. Click the **"Delete"** icon (trash) next to any questionnaire
2. Confirm deletion
3. All responses will also be deleted

---

## For Employee Users

### Step 1: Login as Employee

1. **Check Your Email**
   - You should have received an invitation email with:
     - Your email address
     - Auto-generated password

2. **Login**
   - Go to `http://localhost:4200/auth/login`
   - Email: `employee1@company.com`
   - Password: (from invitation email - check server console logs)
   - Click **Login**

3. **You're In!**
   - You'll see the employee dashboard

---

### Step 2: View Assigned Questionnaires

1. **Navigate to "My Questionnaires"**
   - Click on **"My Questionnaires"** in the left sidebar

2. **View Statistics**
   - See how many questionnaires are:
     - Total Assigned
     - Completed
     - In Progress
     - Pending (Not Started)

3. **View Questionnaire List**
   - See all questionnaires assigned to you
   - Each shows:
     - ⏰ Status (Pending, In Progress, Completed)
     - 📅 Deadline (if set)
     - ❓ Number of questions
     - ⚠️ Overdue warning (if past deadline)

---

### Step 3: Fill Out a Questionnaire

1. **Click "Start"** on a pending questionnaire
   - Or **"Continue"** if you already started

2. **Answer Questions**
   - Each question shows:
     - Question number
     - Question text
     - Required indicator (red asterisk *)
     - Appropriate input type:
       - Text box for short answers
       - Large text area for long answers
       - Radio buttons for single choice
       - Checkboxes for multiple choice
       - Rating scale (1-5 stars)
       - Date picker

3. **Save Progress (Optional)**
   - Click **"Save Progress"** at any time
   - Come back later to continue
   - Your answers are saved automatically

4. **Submit Questionnaire**
   - Fill all required questions (marked with *)
   - Click **"Submit Questionnaire"**
   - ✅ Success! Your manager can now see your responses

---

### Step 4: View Your Submitted Responses

1. **Go to "My Questionnaires"**

2. **Click "View"** on a completed questionnaire

3. **See Your Answers**
   - View all your submitted answers
   - Answers are **read-only** (cannot edit after submission)

---

## Complete Testing Workflow

Follow this complete flow to test the entire module:

### 🎬 Full Test Scenario

**Part 1: Setup (5 minutes)**
1. Register as Company user → `manager@company.com`
2. Invite 2 employees:
   - `employee1@company.com`
   - `employee2@company.com`

**Part 2: Create & Assign (5 minutes)**
3. Login as Company user
4. Create questionnaire with 6 different question types
5. Assign to both employees with 7-day deadline

**Part 3: Employee Response (5 minutes)**
6. Login as `employee1@company.com`
7. Start questionnaire
8. Fill out half the questions
9. Click "Save Progress"
10. Logout

**Part 4: Complete & View (5 minutes)**
11. Login back as `employee1@company.com`
12. Continue questionnaire
13. Complete all questions
14. Submit

**Part 5: Manage Results (3 minutes)**
15. Login as Company user (`manager@company.com`)
16. Go to Questionnaires → Responses
17. See statistics updated (1 completed, 1 pending)
18. Click "View Answers" for employee1
19. See all their responses

**Part 6: Additional Testing (Optional)**
20. Login as `employee2@company.com`
21. Submit their questionnaire
22. Login as Company user
23. View both responses side-by-side

---

## Troubleshooting

### ❌ "organisationId is required" Error

**Problem:** Old login token doesn't have organisationId

**Solution:** 
1. Logout completely
2. Login again
3. Try creating questionnaire again

**Alternative:** The system now automatically fetches organisationId from database, so this should work automatically!

---

### ❌ "No employees available to assign"

**Problem:** No employees under your company

**Solution:**
1. Go to "Employees" page
2. Click "Invite User"
3. Enter employee email
4. They'll be automatically linked to your company

---

### ❌ Can't see "My Questionnaires" menu

**Problem:** Logged in as wrong role

**Solution:**
- "Questionnaires" menu = Company role only
- "My Questionnaires" menu = Employee role only
- Make sure you're logged in with correct account

---

### ❌ Employee can't login

**Problem:** Don't have the auto-generated password

**Solution:**
1. Check server console logs
2. Look for "Invitation sent" message with password
3. Or: Login as Company user → Reset employee password

---

### ❌ Questionnaire not showing for employee

**Problem:** Questionnaire wasn't assigned or has wrong status

**Solution:**
1. Login as Company user
2. Check questionnaire status is "Active"
3. Verify you clicked "Assign" and selected that employee
4. Check in "Responses" tab if employee is listed

---

## Question Types Reference

| Question Type | Use Case | Answer Format | Example |
|--------------|----------|---------------|---------|
| **Short Text** | Brief one-line answers | Text input | "What's your job title?" |
| **Long Text** | Detailed feedback | Large text area | "Describe your experience..." |
| **Single Choice** | Pick one option | Radio buttons | "Rate work-life balance" |
| **Multiple Choice** | Pick multiple options | Checkboxes | "Select all benefits you use" |
| **Rating** | Scale of 1-5 | Star rating | "How satisfied are you?" |
| **Date** | Date selection | Date picker | "When did you join?" |

---

## Features Summary

### ✨ For Companies
- ✅ Create unlimited questionnaires
- ✅ 6 different question types
- ✅ Drag-and-drop question reordering
- ✅ Assign to specific employees or all
- ✅ Set deadlines
- ✅ Track completion rates
- ✅ View individual responses
- ✅ Search and filter responses
- ✅ Edit questionnaires anytime
- ✅ Invite employees directly

### ✨ For Employees
- ✅ View all assigned questionnaires
- ✅ Save progress and continue later
- ✅ See deadlines and overdue warnings
- ✅ View submitted responses
- ✅ Simple, intuitive interface
- ✅ Works on mobile and desktop

---

## Security & Privacy

- ✅ **Tenant Isolation**: Companies only see their own data
- ✅ **Role-Based Access**: Employees can't see other employees' responses
- ✅ **Authentication Required**: All features require login
- ✅ **Data Validation**: All inputs are validated
- ✅ **No Duplicate Assignments**: Can't assign same questionnaire to employee twice

---

## Support

If you encounter any issues:

1. Check the **Troubleshooting** section above
2. Check browser console for errors (F12 → Console tab)
3. Check server logs in terminal
4. Ensure both frontend and backend are running
5. Try logging out and logging in again

---

## Quick Reference

### Company User Journey
```
Register → Invite Employees → Create Questionnaire → Assign to Employees → View Responses
```

### Employee User Journey
```
Receive Invitation → Login → View Questionnaires → Fill Out → Submit → View Submitted
```

---

## Next Steps

After testing, you can:
- Create real questionnaires for your organization
- Customize question types for your needs
- Export responses (future feature)
- Set up recurring questionnaires (future feature)
- Add email notifications (future feature)

---

**🎉 Congratulations!** You now know how to use the complete Employee Questionnaire Module!

For technical details, see the main project documentation.
