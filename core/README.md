# BatchSphere Core

Spring Boot backend for BatchSphere, with an independent frontend app in [`ui/`](/Users/induraghav/gitrepo/batchsphere/core/ui).

## Backend

```bash
./mvnw spring-boot:run
```

## Frontend

```bash
cd ui
npm install
npm run dev
```

The frontend is intentionally separate from Maven so it can evolve without coupling frontend build concerns into the backend project.
