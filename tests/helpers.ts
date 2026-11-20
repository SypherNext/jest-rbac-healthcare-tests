// tests/helpers.ts
//
// Shared helpers for talking to the real rbac-healthcare-system backend.
// Every function here makes an actual HTTP call to a running server -- there
// is no mock, no stand-in array, no local fixture. Point BASE_URL at your own
// running backend (see README.md) before running the suite.

import {
  LoginResponse,
  TestAppointment,
  CreateAppointmentResponse,
  TestMedicalRecord,
  CreateMedicalRecordResponse,
  TestUser,
} from "./types";

export const BASE_URL = process.env.RBAC_API_BASE_URL || "http://localhost:5000";

// Seeded accounts that ship with rbac-healthcare-system. Every account
// except the default admin uses the same password (verified live against
// the running backend).
export const SEEDED_USERS = {
  admin: { username: "admin", password: "admin123" },
  doctor: { username: "doctor1", password: "pass@123" },
  nurse: { username: "nurse1", password: "pass@123" },
  patient: { username: "patient1", password: "pass@123" },
} as const;

/** Low-level fetch wrapper -- resolves the path against BASE_URL. */
export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
}

/** Authenticated fetch wrapper -- adds the bearer token header. */
export async function apiRequestAs(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return apiRequest(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
}

/** Logs in with raw credentials and returns the full response body. */
export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(`Login failed for ${username}: ${response.status}`);
  }
  return response.json();
}

export async function loginAsAdmin(): Promise<string> {
  const { token } = await login(
    SEEDED_USERS.admin.username,
    SEEDED_USERS.admin.password
  );
  return token;
}

export async function loginAsDoctor(): Promise<string> {
  const { token } = await login(
    SEEDED_USERS.doctor.username,
    SEEDED_USERS.doctor.password
  );
  return token;
}

export async function loginAsNurse(): Promise<string> {
  const { token } = await login(
    SEEDED_USERS.nurse.username,
    SEEDED_USERS.nurse.password
  );
  return token;
}

export async function loginAsPatient(): Promise<string> {
  const { token } = await login(
    SEEDED_USERS.patient.username,
    SEEDED_USERS.patient.password
  );
  return token;
}

/**
 * Creates a real appointment through the API and returns the full record.
 *
 * Two details that cost real debugging time, and are worth repeating here:
 * the API expects snake_case fields (patient_id, doctor_id,
 * appointment_date, reason), not the camelCase you'd normally reach for in
 * TypeScript -- and POST /api/appointments only responds with
 * { message, appointmentId }, not the created record. So this helper POSTs,
 * then makes a second GET to fetch the full appointment back.
 */
export async function createTestAppointment(
  token: string,
  patientId: number,
  doctorId: number,
  reason = "Routine checkup",
  notes?: string
): Promise<TestAppointment> {
  const createResponse = await apiRequestAs(token, "/api/appointments", {
    method: "POST",
    body: JSON.stringify({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: new Date().toISOString(),
      reason,
      ...(notes ? { notes } : {}),
    }),
  });

  if (!createResponse.ok) {
    throw new Error(
      `Failed to create appointment: ${createResponse.status} ${await createResponse.text()}`
    );
  }

  const { appointmentId }: CreateAppointmentResponse = await createResponse.json();
  return getAppointment(token, appointmentId);
}

export async function getAppointment(
  token: string,
  id: number
): Promise<TestAppointment> {
  const response = await apiRequestAs(token, `/api/appointments/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch appointment ${id}: ${response.status}`);
  }
  return response.json();
}

export async function getAppointments(token: string): Promise<TestAppointment[]> {
  const response = await apiRequestAs(token, "/api/appointments");
  if (!response.ok) {
    throw new Error(`Failed to fetch appointments: ${response.status}`);
  }
  return response.json();
}

export async function updateAppointmentStatus(
  token: string,
  id: number,
  status: "scheduled" | "completed" | "cancelled"
): Promise<Response> {
  return apiRequestAs(token, `/api/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export async function createTestMedicalRecord(
  token: string,
  patientId: number,
  diagnosis = "Routine check, nothing notable"
): Promise<CreateMedicalRecordResponse | null> {
  const response = await apiRequestAs(token, "/api/medical-records", {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId, diagnosis }),
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function getMedicalRecords(token: string): Promise<TestMedicalRecord[]> {
  const response = await apiRequestAs(token, "/api/medical-records");
  if (!response.ok) {
    throw new Error(`Failed to fetch medical records: ${response.status}`);
  }
  return response.json();
}

export async function getUsers(token: string): Promise<TestUser[]> {
  const response = await apiRequestAs(token, "/api/users");
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.status}`);
  }
  return response.json();
}
