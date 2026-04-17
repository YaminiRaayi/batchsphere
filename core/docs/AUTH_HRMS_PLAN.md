# Auth And HRMS Integration Plan

## Purpose

This note captures the recommended design for introducing authentication now without blocking or conflicting with the future HRMS module.

The key rule is:

- Auth handles identity and access.
- HRMS handles employee and competency data.
- HRMS should extend auth, not replace it.

## Current Situation

- Frontend currently uses placeholder user context from Zustand.
- Backend security still needs a proper auth implementation.
- Future modules like VMS, QMS, LIMS, and HRMS will depend on reliable user identity and role checks.

## Recommended Auth Design

Create a small auth/security domain now with the following model.

### User

- `id: UUID`
- `username: String`
- `email: String`
- `passwordHash: String`
- `role: UserRole`
- `isActive: boolean`
- `employeeId: UUID?`
- `createdAt: LocalDateTime`
- `updatedAt: LocalDateTime`

### UserRole

Start with coarse application roles:

- `SUPER_ADMIN`
- `WAREHOUSE_OP`
- `QC_ANALYST`
- `QC_MANAGER`
- `PROCUREMENT`
- `VIEWER`

These can be refined later if needed.

## Backend Components To Add

- `User` entity
- `UserRole` enum
- `UserRepository`
- `CustomUserDetailsService`
- `PasswordEncoder`
- `JwtService`
- `JwtAuthenticationFilter`
- `AuthController`

Initial auth endpoints:

- `POST /api/auth/login`

Later:

- `POST /api/auth/refresh`
- `POST /api/auth/logout`

## JWT Guidance

Keep JWT payload small. Recommended claims:

- `sub` = username
- `userId`
- `role`
- `employeeId` if linked

Do not put full HRMS profile data in the token.

## Frontend Components To Add

Create an auth store, for example `authStore.ts`, with:

- `token`
- `user`
- `isAuthenticated`
- `login()`
- `logout()`

Recommended `user` shape:

- `id`
- `username`
- `displayName`
- `role`
- `employeeId?`

The current shell user placeholder should later be replaced by authenticated user context.

## Why `employeeId` Exists On User

Add `employeeId` now as a nullable field even before HRMS exists.

This gives two advantages:

- auth can be implemented immediately without waiting for HRMS
- later HRMS records can be linked without redesigning the auth model

## Future HRMS Design

When HRMS is introduced, keep it as a separate module.

### Employee

- `id: UUID`
- `employeeCode: String`
- `fullName: String`
- `email: String`
- `department: String`
- `designation: String`
- `managerId: UUID?`
- `employmentStatus: String`
- `dateOfJoining: LocalDate`
- `isActive: boolean`

Likely related tables later:

- `TrainingRecord`
- `Competency`
- `PermissionAssignment` or `RoleAssignment`
- `ESignAuthorization`

Linking model:

- `User.employeeId -> Employee.id`

## Responsibility Split

### Auth Module

Responsible for:

- login
- password verification
- JWT/session handling
- authenticated identity
- coarse application roles
- protected routes and API access

### HRMS Module

Responsible for:

- employee master data
- department and reporting structure
- training records
- competency records
- authorization eligibility for regulated workflows
- future e-signature readiness

## Audit Field Guidance

Short term:

- frontend may still submit `createdBy` or `updatedBy` if current APIs require it
- values should come from authenticated user context, not hardcoded strings

Long term:

- backend should derive actor identity from the security context
- audit fields should not rely on client-supplied names

## Recommended Implementation Order

1. Add `User` and `UserRole`
2. Seed one default admin user
3. Add password hashing
4. Add login endpoint
5. Add JWT generation and validation
6. Replace `permitAll()` with secured route rules
7. Add frontend auth store and login page
8. Replace placeholder shell user with authenticated user
9. Later connect `User.employeeId` to HRMS `Employee`

## Main Principle

Do not design HRMS as the login system.

Use auth for identity and security.
Use HRMS for employee and competency data.
Link them through `employeeId`.

That keeps the current platform buildable and keeps future HRMS integration clean.
