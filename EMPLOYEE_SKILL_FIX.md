# Employee Skill Management Fix

## Issue
Employees were having issues viewing and deleting their own skills due to incorrect user_id comparison in the backend controller.

## Root Cause
The `skill.user_id` field is a MongoDB ObjectId that gets populated with the full user object (when using `.populate()`). The original code was trying to compare it directly as a string:

```typescript
// BEFORE (incorrect)
if (userRole === 'employee' && skill.user_id.toString() !== userId) {
  // This fails because populated user_id is an object, not an ObjectId
}
```

## Solution Applied

### Backend Changes

#### 1. `server/src/controllers/skill.controller.ts`
Fixed the authorization checks in `getById`, `update`, and `delete` methods to properly handle populated user_id:

```typescript
// AFTER (correct)
if (userRole === 'employee') {
  const skillUserId = (skill.user_id as any)?._id 
    ? (skill.user_id as any)._id.toString() 
    : skill.user_id.toString();
  
  if (skillUserId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You can only [view/update/delete] your own skills."
    );
  }
}
```

#### 2. `server/src/repositories/skill.repository.ts`
Added support for `organisation_id` filtering so companies can view skills of employees in their organization:

- Added `organisation_id` parameter to `getAll` method
- Implemented filtering logic that populates `user_id` with `organisationId` field
- Filters skills after population to match the company's organisation

#### 3. `server/src/dto/skill.dto.ts`
Added `organisation_id` field to `GetSkillQueryDto` interface:

```typescript
export interface GetSkillQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  cat_id?: string;
  user_id?: string;
  skill_level?: string;
  organisation_id?: string; // NEW
}
```

## Functionality Now Working

### ✅ Employee Skill Management
1. **View Skills**: Employees can see only their own skills at `/my-skills`
2. **Create Skills**: Employees can create new skills at `/my-skills/create`
3. **Edit Skills**: Employees can edit their own skills at `/my-skills/:id/edit`
4. **Delete Skills**: Employees can delete their own skills (delete button in skill list)

### ✅ Authorization
- Backend enforces that employees can only access their own skills
- Proper error messages when trying to access other employees' skills
- Companies can view skills of employees in their organization (read-only)
- Admins can view all skills

## Build Status
- ✅ Backend builds successfully with no TypeScript errors
- ✅ Frontend builds successfully with no errors (1 minor warning about unused import)

## Testing Checklist
- [ ] Employee can log in and navigate to "My Skills"
- [ ] Employee can view their own skills
- [ ] Employee can create a new skill
- [ ] Employee can edit an existing skill
- [ ] Employee can delete a skill
- [ ] Employee cannot access another employee's skills
- [ ] Company can view employee skills (read-only)
- [ ] Company cannot edit or delete employee skills
- [ ] Admin can view all skills

## Related Files
- `server/src/controllers/skill.controller.ts` - Authorization logic
- `server/src/repositories/skill.repository.ts` - Database queries
- `server/src/dto/skill.dto.ts` - DTO interfaces
- `client/src/app/features/skills/skill-list/skill-list.ts` - Frontend skill list
- `client/src/app/features/skills/create-skill/create-skill.ts` - Frontend create skill
- `client/src/app/features/skills/edit-skill/edit-skill.ts` - Frontend edit skill

## Date
July 14, 2026
