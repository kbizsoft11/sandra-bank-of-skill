# Questionnaire-Based Skill Assessment System - Testing Guide

## Overview
This document outlines the complete end-to-end workflow for the new questionnaire-based skill assessment system for employees.

## Workflow Steps

### 1. **Setup: Create a Skill Category and Questionnaire**

**Company Admin Action:**
- Navigate to Questionnaires section
- Create a new questionnaire with:
  - **Title**: "Quality Management Skills Assessment"
  - **Skill Category**: Select existing category (e.g., "Quality Management")
  - **Questions**: Add skill-type questions with:
    - Question Type: "skill"
    - Skill Name: (e.g., "ISO 9001 standard requirements")
    - Skill Description: (e.g., "Understanding of ISO 9001 standard requirements and implementation")

**Expected Result:**
- Questionnaire created and marked as "active"
- Questionnaire ready for assignment

---

### 2. **Assign Questionnaire to Employees**

**Company Admin Action:**
- Open the created questionnaire
- Click "Assign" button
- Select one or more employees
- Optionally set deadline
- Submit assignment

**Expected Result:**
- QuestionnaireResponse records created with status "pending"
- Employees receive notification about new questionnaire

---

### 3. **Employee Completes Questionnaire**

**Employee Action:**
- Navigate to "My Questionnaires"
- Find the assigned questionnaire
- Click "Open" to start
- For each skill question, employee:
  - Reads skill description
  - Selects **Skill Level** (1-5): Beginner → Master
  - Selects **Interest Level** (1-5): Not Interested → Highly Interested
- Click "Submit Questionnaire" to complete

**Expected Result:**
- Questionnaire response status changes from "pending" → "in_progress" → "completed"
- Form shows completion confirmation
- Employee redirected to My Questionnaires list

---

### 4. **Auto-Skill Generation (Backend Processing)**

**System Action (Automatic):**
When questionnaire is marked as "completed":

1. **Question Answer Extraction**
   - System reads all answered questions from QuestionAnswerModel
   - Filters for skill-type questions only
   - Extracts skillLevel (1-5) and interestLevel (1-5)

2. **Skill Calculation**
   - Maps skill level: 1→beginner, 2→intermediate, 3→advanced, 4-5→expert
   - Calculates skill_score: level × 20 (e.g., level 3 = 60 points)
   - Stores interest_level (1-5)

3. **Skill Record Creation**
   - Creates new Skill document with:
     - `skill_name`: From question's skillName
     - `skill_level`: String (beginner/intermediate/advanced/expert)
     - `skill_score`: Number (0-100)
     - `interest_level`: Number (1-5)
     - `isFromQuestionnaire`: true
     - `questionnaireResponseId`: Reference to response
   - Or updates existing skill if already exists

**Expected Result:**
- Employee's skill inventory automatically populated
- Skills marked as "from questionnaire"
- Skill level points recorded (20 points per level)

---

### 5. **Dashboard Metrics Calculated**

**System Action:**
Employee dashboard automatically displays:

**Skill Assessment Metrics (Top right card):**
- **Avg Skill Level**: (1-5 scale) Calculated from all skills' skill_score/20
- **Avg Interest Level**: (1-5 scale) Average of all interest_levels
- **Skill Points**: Total of all skill levels (sum)

**Example Calculation:**
- 3 skills with levels: [3, 4, 2] (advanced, expert, intermediate)
- Avg Skill Level = (3 + 4 + 2) / 3 = 3.0/5 ✓
- 3 skills with interests: [5, 4, 3]
- Avg Interest Level = (5 + 4 + 3) / 3 = 4.0/5 ✓
- Skill Points = 3 + 4 + 2 = 9 ✓

**Top Skills Section:**
- Lists skills sorted by skill_score (descending)
- Shows skill level badge (color-coded 1-5)
- Shows interest level (1-5)
- Shows dual progress bars

**Keen to Improve Section:**
- Shows skills with interest_level ≥ 4 but skill_level ≤ 3
- Calculates "gap" (interest - skill)
- Prioritizes by gap size

**Top Categories:**
- Aggregates skills by category
- Shows average level per category (1-5 scale)

---

### 6. **Skills Integration**

**Employee View:**
- Navigate to "My Skills"
- See all auto-generated skills (no edit/delete buttons)
- Skills show: name, level, category

**Employee Cannot:**
- ❌ Create skills manually
- ❌ Edit auto-generated skills
- ❌ Delete auto-generated skills

**Admin/Company Can:**
- ✓ View all skills in system
- ✓ Create skills for testing (non-questionnaire skills)
- ✓ Edit/delete non-questionnaire skills

---

## Test Scenarios

### Scenario 1: Complete Single Questionnaire
1. Create questionnaire with 3 skill questions
2. Assign to 1 employee
3. Employee completes with mixed levels (1, 3, 5)
4. **Verify:**
   - 3 skills created in database
   - Dashboard shows Avg Skill Level ≈ 3.0
   - Dashboard shows Skill Points = 9
   - Top Skills shows all 3 skills

### Scenario 2: Multiple Questionnaires (Different Categories)
1. Create 2 questionnaires in different categories
2. Assign both to same employee
3. Employee completes both
4. **Verify:**
   - All skills created
   - Dashboard categorizes correctly
   - Top Categories shows both categories

### Scenario 3: Interest vs Skill Gap
1. Create questionnaire with skill questions
2. Employee submits with:
   - Skill Level: 2 (Intermediate), Interest: 5 (Highly Interested) → Gap = 3
   - Skill Level: 3 (Advanced), Interest: 2 (Somewhat) → Should NOT appear
3. **Verify:**
   - Keen to Improve shows only first skill
   - Gap calculated as 5 - 2 = 3

### Scenario 4: Update Existing Skill
1. Employee completes questionnaire (creates Skill A with level 3)
2. Same questionnaire assigned again
3. Employee completes with level 5 for same skill
4. **Verify:**
   - Skill A updated (not duplicated)
   - Level now shows 5
   - Dashboard metrics recalculated

### Scenario 5: Dashboard Accuracy
1. Create questionnaire with skills in "Quality Management" category
2. Assign and complete
3. **Verify Dashboard:**
   - Avg Skill Level (1-5)
   - Avg Interest Level (1-5)
   - Skill Points (total)
   - Top Categories includes "Quality Management"
   - Top Skills sorted by level (descending)
   - Keen to Improve shows high interest, low skill items

---

## Data Validation Checklist

### Skill Record
- [ ] `skill_name` populated correctly
- [ ] `skill_level` is valid string (beginner/intermediate/advanced/expert)
- [ ] `skill_score` = level × 20 (0-100)
- [ ] `interest_level` is 1-5 number
- [ ] `isFromQuestionnaire` = true
- [ ] `questionnaireResponseId` set

### QuestionAnswer Records
- [ ] `skillLevel` stored (1-5)
- [ ] `interestLevel` stored (1-5)
- [ ] `status` = "answered"
- [ ] `answeredAt` timestamp set

### Dashboard Response
- [ ] `averageSkillLevel` calculated (1-5)
- [ ] `averageInterestLevel` calculated (1-5)
- [ ] `skillPoints` = sum of levels
- [ ] `topSkills` returns array with skillLevel, interestLevel
- [ ] `topInterests` returns array sorted by interestLevel desc
- [ ] `keenToImprove` returns only skills with interest ≥ 4, skill ≤ 3
- [ ] `topCategories` shows category-level aggregations

### UI Rendering
- [ ] Metric boxes show correct values
- [ ] Progress bars align with values (level/5 * 100%)
- [ ] Skill cards show both levels
- [ ] Color-coded badges match level (1-5)
- [ ] Keen to Improve shows gap indicator
- [ ] No "Add Skill" button for employees

---

## API Endpoints to Verify

### 1. Questionnaire Response - Submit
**POST** `/api/questionnaires/my/:id/submit`
```json
{
  "answers": [
    {
      "questionId": "q1",
      "answer": {
        "skillLevel": 3,
        "interestLevel": 4
      }
    }
  ],
  "isComplete": true
}
```
**Expected:** Status 200, response marked as completed

### 2. Employee Dashboard Stats
**GET** `/api/dashboard/employee/stats`
**Verify Response Fields:**
- `summary.averageSkillLevel` (1-5)
- `summary.averageInterestLevel` (1-5)
- `summary.skillPoints` (number)
- `topSkills` (array)
- `topInterests` (array)
- `keenToImprove` (array)

### 3. Skill Create (Should work)
**POST** `/api/skills` (by admin/company)
- Should allow creation for non-employees

### 4. Skill Create (Should fail for employee)
**POST** `/api/skills` (by employee)
- Frontend blocks with error message
- Cannot manually add skills

---

## Common Issues & Solutions

### Issue 1: Skills Not Creating
**Check:**
1. Is questionnaire marked as "active"?
2. Is questionnaire response status "completed"?
3. Are skill questions actually "skill" type?
4. Check server logs for errors in questionnaire-skill-processor

**Solution:**
- Verify QuestionnaireModel has `skillCategoryId` set
- Ensure answer has both `skillLevel` and `interestLevel`
- Check that values are integers 1-5

### Issue 2: Dashboard Shows 0/No Skills
**Check:**
1. Are skills actually in database? (MongoDB)
2. Is employee ID correct?
3. Is dashboard endpoint returning data?

**Solution:**
- Query: `db.skills.find({ user_id: employeeId })`
- Verify skill_score is set correctly
- Check dashboard controller calculations

### Issue 3: Metrics Show Wrong Values
**Check:**
1. Are all skills included in calculation?
2. Is skill_score calculated as level * 20?
3. Are interest_levels present?

**Solution:**
- Manually calculate: (sum of levels) / count
- Verify in dashboard controller logs
- Check skill_score vs skill_level interpretation

### Issue 4: Keen to Improve Empty
**Check:**
1. Do any skills have interest_level ≥ 4?
2. Do those skills have skill_level ≤ 3?

**Solution:**
- Employee must complete questionnaire with:
  - High interest (4-5) AND
  - Lower skill (1-3)

---

## Performance Considerations

- Dashboard query returns all skills for employee (can be slow with many skills)
- Consider pagination for topSkills, topInterests
- Aggregation for topCategories may need optimization
- Consider caching dashboard stats

---

## Rollback Plan

If issues occur:
1. Disable questionnaire skill processor in question-answer.service.ts
2. Skills won't auto-generate but questionnaires still work
3. Manually create skills if needed
4. Fix data and re-enable processor

---

## Success Criteria

✅ All tests pass  
✅ Dashboard displays correct metrics  
✅ Skills auto-generate from questionnaires  
✅ Employees cannot manually modify skills  
✅ API endpoints return correct data  
✅ No errors in server logs  
✅ UI matches design requirements  

---

## Sign-Off

- [ ] Backend: Questionnaire processing implemented
- [ ] Backend: Dashboard stats calculated correctly
- [ ] Frontend: Questionnaire UI allows skill/interest selection
- [ ] Frontend: Dashboard displays metrics
- [ ] Frontend: Skills page prevents employee modifications
- [ ] Testing: All scenarios verified
- [ ] Documentation: Complete and accurate

