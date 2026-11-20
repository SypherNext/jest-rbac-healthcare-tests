// tests/types.ts
//
// Shared types for the test suite. These mirror the *real* shapes the
// rbac-healthcare-system backend sends and expects -- verified against the
// live server at http://localhost:5000, not guessed from the README.

export type Role = "Administrator" | "Doctor" | "Nurse" | "Patient";

export interface TestUser {
  id: number;
  username: string;
  email: string;
  role: Role;
  full_name: string;
}

export interface LoginResponse {
  token: string;
  user: TestUser;
}

export interface TestAppointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  status: "scheduled" | "completed" | "cancelled";
  reason: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient_name: string;
  patient_email?: string;
  doctor_name: string;
  doctor_email?: string;
}

// What POST /api/appointments actually responds with -- NOT the full
// appointment record. Fetch the record separately (see
// createTestAppointment in helpers.ts) if you need the full shape.
export interface CreateAppointmentResponse {
  message: string;
  appointmentId: number;
}

export interface TestMedicalRecord {
  id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis: string;
  prescription: string | null;
  notes: string | null;
  visit_date: string;
  created_at: string;
  updated_at: string;
  patient_name: string;
  doctor_name: string;
}

export interface CreateMedicalRecordResponse {
  message: string;
  recordId: number;
}

export interface ApiErrorResponse {
  error: string;
  requiredRoles?: Role[];
  userRole?: Role;
}
