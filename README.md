# jest-rbac-healthcare-tests

A real, typed Jest test suite written against the `rbac-healthcare-system`
backend. It's the companion repo for the **TypeScript for Test Automation**
course -- specifically the "Structuring a Simple Typed Test Project" lesson
(which this repo's layout follows exactly) and the capstone (which this
repo's `tests/permissions.test.ts` turns into a real, live-API version of
the permission-matrix pattern taught there).

Every test here makes a real HTTP call against a real running server. There
are no mocks and no local stand-in arrays.

## Project layout

```
jest-rbac-healthcare-tests/
├── jest.config.js
├── tsconfig.json
├── package.json
└── tests/
    ├── types.ts          # TestAppointment, TestUser, TestMedicalRecord, etc.
    ├── helpers.ts         # login helpers + createTestAppointment (POST then GET)
    ├── login.test.ts      # real login tests, one per seeded role
    ├── appointments.test.ts
    └── permissions.test.ts  # live version of the capstone's permission matrix
```

## Prerequisites

- Node.js 18 or newer (this suite uses the global `fetch` API; no extra
  HTTP client dependency).
- A running copy of `rbac-healthcare-system`'s backend, reachable at
  `http://localhost:5000` by default.

This repo does **not** start the backend for you. Clone and run
`rbac-healthcare-system` separately first:

```bash
git clone https://github.com/codedbyabhishekc/rbac-healthcare-system
cd rbac-healthcare-system/backend
npm install
npm start
```

Confirm it's up before running this suite:

```bash
curl http://localhost:5000/api-docs
```

(Swagger UI should respond. If you're on Windows and don't have `curl`,
just open that URL in a browser.)

## Setup (Windows / macOS / Linux)

From this repo's root, on any OS:

```bash
npm install
```

That installs Jest, `ts-jest`, TypeScript, and `@types/jest` as dev
dependencies -- nothing else is needed.

## Running the tests

```bash
npm test
```

This runs every `*.test.ts` file under `tests/` through `ts-jest` against
the live backend. If you've changed the backend's port or you're running it
somewhere other than `localhost:5000`, set `RBAC_API_BASE_URL` before
running the tests:

```bash
# macOS / Linux
RBAC_API_BASE_URL=http://localhost:5050 npm test

# Windows PowerShell
$env:RBAC_API_BASE_URL = "http://localhost:5050"; npm test

# Windows cmd.exe
set RBAC_API_BASE_URL=http://localhost:5050 && npm test
```

## What's actually being tested

- **`login.test.ts`** -- logs in as each of the four seeded roles (admin,
  doctor, nurse, patient) and asserts on the real token/user shape that
  `POST /api/auth/login` returns.
- **`appointments.test.ts`** -- creates real appointments through
  `POST /api/appointments`, fetches them back with a follow-up
  `GET /api/appointments/:id` (the create endpoint only ever returns
  `{ message, appointmentId }`), and checks that each role's appointment
  list is filtered the way the backend actually filters it.
- **`permissions.test.ts`** -- the capstone's permission-matrix idea, but
  pointed at the live API instead of a local array. It checks the
  documented permission table from the app's own README role by role, and
  also calls out (with a `DISCREPANCY:` comment and a passing test) a
  handful of places where the backend's actual enforcement is looser than
  what the README's table claims -- for example, `POST /api/appointments`
  has no role restriction at all, and nurses can see every medical record
  unfiltered. Those tests assert the real, observed behavior, not the
  documented ideal.

## Seeded accounts used by this suite

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Doctor | `doctor1` | `pass@123` |
| Nurse | `nurse1` | `pass@123` |
| Patient | `patient1` | `pass@123` |

These ship with `rbac-healthcare-system`'s seed data -- nothing here creates
new users.

## License

Copyright (C) 2026 SypherNext

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). You may
use, study and change it. If you share a modified version, or run one as a website or service
that other people use, you must make your full modified source code available under the same
license. See [LICENSE](LICENSE) for the full terms.
