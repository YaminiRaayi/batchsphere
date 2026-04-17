# Auth Usage

## Current State

Authentication is now enabled for the application.

At this stage, there is no public registration flow and no user-management UI yet.

Login works through a bootstrap admin account that is created automatically on backend startup if the configured username does not already exist.

Admin-managed user provisioning is now available on the backend through `SUPER_ADMIN`-only APIs:

- `GET /api/auth/users`
- `POST /api/auth/users`
- `PUT /api/auth/users/{id}`
- `DELETE /api/auth/users/{id}`

## Default Development Credentials

Configured in [`src/main/resources/application.yaml`](/Users/induraghav/gitrepo/batchsphere/core/src/main/resources/application.yaml:1):

- Username: `admin`
- Password: `Admin@123`

## Test Credentials

Configured in [`src/test/resources/application-test.yaml`](/Users/induraghav/gitrepo/batchsphere/core/src/test/resources/application-test.yaml:1):

- Username: `admin`
- Password: `Admin@123`

## Production Bootstrap

Production bootstrap values are environment-driven in [`src/main/resources/application-prod.yaml`](/Users/induraghav/gitrepo/batchsphere/core/src/main/resources/application-prod.yaml:1).

Relevant environment variables:

- `BATCHSPHERE_BOOTSTRAP_ADMIN_USERNAME`
- `BATCHSPHERE_BOOTSTRAP_ADMIN_EMAIL`
- `BATCHSPHERE_BOOTSTRAP_ADMIN_PASSWORD`
- `BATCHSPHERE_BOOTSTRAP_ADMIN_ROLE`

## How It Works

On application startup:

1. the backend checks whether the configured bootstrap username already exists
2. if not, it creates that user
3. the password is stored as a hash
4. login is then available through `/api/auth/login`

Implementation reference:

- [`AuthDataInitializer.java`](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/auth/config/AuthDataInitializer.java:1)

## Why There Is No Registration Yet

This platform is currently being built as an internal operations/QC system.

For this kind of application, public self-registration is usually not the right model.

The better long-term options are:

- admin-created users
- internal user management UI
- enterprise identity / SSO
- future HRMS-linked provisioning

## Recommended Future Direction

Do not add public signup.

Preferred next step later:

- add a frontend admin user-management screen on top of the existing admin-only backend APIs

That keeps access controlled and fits the roadmap better than open registration.
