// tests/login.test.ts
//
// Real login tests against the running rbac-healthcare-system backend, one
// per seeded role. Confirms the token shape and the user object shape that
// POST /api/auth/login actually returns.

import { login, apiRequest, SEEDED_USERS } from "./helpers";

// A JWT is three base64url segments joined by dots: header.payload.signature
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

describe("login", () => {
  it("logs in the default admin and returns a token + user", async () => {
    const result = await login(
      SEEDED_USERS.admin.username,
      SEEDED_USERS.admin.password
    );

    expect(typeof result.token).toBe("string");
    expect(result.token).toMatch(JWT_SHAPE);
    expect(result.user.username).toBe("admin");
    expect(result.user.role).toBe("Administrator");
    expect(result.user).toHaveProperty("id");
    expect(result.user).toHaveProperty("email");
    expect(result.user).toHaveProperty("full_name");
  });

  it("logs in a seeded doctor", async () => {
    const result = await login(
      SEEDED_USERS.doctor.username,
      SEEDED_USERS.doctor.password
    );
    expect(result.token).toMatch(JWT_SHAPE);
    expect(result.user.role).toBe("Doctor");
  });

  it("logs in a seeded nurse", async () => {
    const result = await login(
      SEEDED_USERS.nurse.username,
      SEEDED_USERS.nurse.password
    );
    expect(result.token).toMatch(JWT_SHAPE);
    expect(result.user.role).toBe("Nurse");
  });

  it("logs in a seeded patient", async () => {
    const result = await login(
      SEEDED_USERS.patient.username,
      SEEDED_USERS.patient.password
    );
    expect(result.token).toMatch(JWT_SHAPE);
    expect(result.user.role).toBe("Patient");
  });

  it("rejects a wrong password", async () => {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "not-the-password" }),
    });
    expect(response.ok).toBe(false);
    expect([400, 401, 403]).toContain(response.status);
  });

  it("rejects a username that doesn't exist", async () => {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "nobody-here", password: "whatever" }),
    });
    expect(response.ok).toBe(false);
  });
});
