// tests/permissions.test.ts
//
// This is the same RBAC permission-matrix idea the course capstone builds
// with a local `permissionCases` array and a `hasPermission()` stand-in --
// but here every row is checked against the *real*, running
// rbac-healthcare-system backend instead of a local array. Each `it()`
// below makes an actual HTTP call and asserts on the actual response.
//
// The documented permission matrix (from the app's own README) is:
//
// | Action                  | Admin | Doctor | Nurse | Patient      |
// |--------------------------|-------|--------|-------|--------------|
// | View all users           | Yes   | No     | No    | No           |
// | Delete users              | Yes   | No     | No    | No           |
// | View all appointments    | Yes   | No     | Yes   | No           |
// | View own appointments    | No    | Yes    | No    | Yes          |
// | Schedule appointments    | No    | No     | Yes   | No           |
// | Complete appointments    | No    | Yes    | No    | No           |
// | Cancel appointments      | No    | Yes    | Yes   | No           |
// | Create medical records   | No    | Yes    | No    | No           |
// | View medical records     | Yes   | Yes    | No    | Yes (own)    |
//
// Reading the backend's own source (backend/src/routes/*.js,
// backend/src/middleware/auth.middleware.js) and then verifying live
// against the running server turned up a few rows where the ACTUAL
// enforcement is looser than this table describes. Those are called out
// explicitly below -- this suite asserts what the server really does, not
// what the README claims, and says so where the two disagree.

import {
  loginAsAdmin,
  loginAsDoctor,
  loginAsNurse,
  loginAsPatient,
  apiRequestAs,
  apiRequest,
  getAppointments,
  getMedicalRecords,
  createTestMedicalRecord,
  createTestAppointment,
  updateAppointmentStatus,
} from "./helpers";

const DOCTOR_ID = 5;
const PATIENT_ID = 20;

describe("RBAC permission matrix: View all users (GET /api/users)", () => {
  it("allows admin", async () => {
    const token = await loginAsAdmin();
    const res = await apiRequestAs(token, "/api/users");
    expect(res.status).toBe(200);
  });

  it("denies doctor, nurse, and patient", async () => {
    for (const login of [loginAsDoctor, loginAsNurse, loginAsPatient]) {
      const token = await login();
      const res = await apiRequestAs(token, "/api/users");
      expect(res.status).toBe(403);
    }
  });

  it("denies anyone with no token at all", async () => {
    const res = await apiRequest("/api/users");
    expect(res.status).toBe(401);
  });
});

describe("RBAC permission matrix: Delete users (DELETE /api/users/:id)", () => {
  it("is admin-only -- a nurse gets 403 attempting to delete a user", async () => {
    const token = await loginAsNurse();
    // id 999 doesn't need to exist; the role check runs (and rejects)
    // before the backend ever looks the row up.
    const res = await apiRequestAs(token, "/api/users/999", { method: "DELETE" });
    expect(res.status).toBe(403);
  });
});

describe("RBAC permission matrix: View all appointments (GET /api/appointments)", () => {
  it("admin's list is unfiltered (spans multiple patients/doctors)", async () => {
    const token = await loginAsAdmin();
    const appointments = await getAppointments(token);
    const patientIds = new Set(appointments.map((a) => a.patient_id));
    expect(patientIds.size).toBeGreaterThan(1);
  });

  it("nurse's list is unfiltered too, matching the documented 'Yes'", async () => {
    const token = await loginAsNurse();
    const appointments = await getAppointments(token);
    const doctorIds = new Set(appointments.map((a) => a.doctor_id));
    expect(doctorIds.size).toBeGreaterThan(1);
  });
});

describe("RBAC permission matrix: View own appointments only", () => {
  it("a doctor only ever sees appointments where they are the doctor", async () => {
    const token = await loginAsDoctor();
    const appointments = await getAppointments(token);
    expect(appointments.every((a) => a.doctor_id === DOCTOR_ID)).toBe(true);
  });

  it("a patient only ever sees appointments where they are the patient", async () => {
    const token = await loginAsPatient();
    const appointments = await getAppointments(token);
    expect(appointments.every((a) => a.patient_id === PATIENT_ID)).toBe(true);
  });
});

describe("RBAC permission matrix: Schedule appointments (POST /api/appointments)", () => {
  it("a nurse can schedule an appointment, matching the documented 'Yes'", async () => {
    const token = await loginAsNurse();
    const res = await apiRequestAs(token, "/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        patient_id: PATIENT_ID,
        doctor_id: DOCTOR_ID,
        appointment_date: new Date().toISOString(),
        reason: "Nurse-scheduled checkup",
      }),
    });
    expect(res.status).toBe(201);
  });

  // DISCREPANCY: the README's matrix says only a Nurse can schedule
  // appointments (Doctor/Patient/Admin = "No"). The real route --
  // `router.post('/', authenticateToken, ...)` in appointment.routes.js --
  // has no `authorizeRoles(...)` gate at all. Verified live: every role,
  // including Patient, successfully creates an appointment (201). This
  // test documents the real behavior rather than papering over it.
  it("DISCREPANCY: a patient can also schedule their own appointment -- the route has no role gate", async () => {
    const token = await loginAsPatient();
    const res = await apiRequestAs(token, "/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        patient_id: PATIENT_ID,
        doctor_id: DOCTOR_ID,
        appointment_date: new Date().toISOString(),
        reason: "Patient self-scheduled checkup (undocumented, but allowed)",
      }),
    });
    expect(res.status).toBe(201);
  });
});

describe("RBAC permission matrix: Complete / cancel appointments (PUT /api/appointments/:id)", () => {
  it("a doctor can update an appointment's status", async () => {
    const nurseToken = await loginAsNurse();
    const appointment = await createTestAppointment(nurseToken, PATIENT_ID, DOCTOR_ID);

    const doctorToken = await loginAsDoctor();
    const res = await updateAppointmentStatus(doctorToken, appointment.id, "completed");
    expect(res.status).toBe(200);
  });

  it("a patient cannot update any appointment's status", async () => {
    const nurseToken = await loginAsNurse();
    const appointment = await createTestAppointment(nurseToken, PATIENT_ID, DOCTOR_ID);

    const patientToken = await loginAsPatient();
    const res = await updateAppointmentStatus(patientToken, appointment.id, "cancelled");
    expect(res.status).toBe(403);
  });

  it("a nurse can cancel an appointment, matching the documented 'Yes'", async () => {
    const nurseToken = await loginAsNurse();
    const appointment = await createTestAppointment(nurseToken, PATIENT_ID, DOCTOR_ID);
    const res = await updateAppointmentStatus(nurseToken, appointment.id, "cancelled");
    expect(res.status).toBe(200);
  });

  // DISCREPANCY: the matrix says a Nurse cannot "complete" appointments
  // (that's a Doctor-only "Yes"). The real PUT route gates on
  // `authorizeRoles('Administrator', 'Doctor', 'Nurse')` without
  // distinguishing *which* status value is being set -- so any of those
  // three roles can set status to "completed", not just a Doctor.
  it("DISCREPANCY: a nurse can also mark an appointment completed -- the route doesn't distinguish status values", async () => {
    const nurseToken = await loginAsNurse();
    const appointment = await createTestAppointment(nurseToken, PATIENT_ID, DOCTOR_ID);
    const res = await updateAppointmentStatus(nurseToken, appointment.id, "completed");
    expect(res.status).toBe(200);
  });
});

describe("RBAC permission matrix: Create medical records (POST /api/medical-records)", () => {
  it("a doctor can create a medical record, matching the documented 'Yes'", async () => {
    const token = await loginAsDoctor();
    const result = await createTestMedicalRecord(token, PATIENT_ID, "RBAC suite verification visit");
    expect(result).not.toBeNull();
    expect(result?.recordId).toBeGreaterThan(0);
  });

  it("denies nurse, patient, and admin -- the route is Doctor-only", async () => {
    for (const login of [loginAsNurse, loginAsPatient, loginAsAdmin]) {
      const token = await login();
      const res = await apiRequestAs(token, "/api/medical-records", {
        method: "POST",
        body: JSON.stringify({ patient_id: PATIENT_ID, diagnosis: "should be rejected" }),
      });
      expect(res.status).toBe(403);
    }
  });
});

describe("RBAC permission matrix: View medical records", () => {
  it("a patient only ever sees their own medical records", async () => {
    const token = await loginAsPatient();
    const records = await getMedicalRecords(token);
    expect(records.every((r) => r.patient_id === PATIENT_ID)).toBe(true);
  });

  it("a doctor only sees medical records they personally authored", async () => {
    const token = await loginAsDoctor();
    const records = await getMedicalRecords(token);
    expect(records.every((r) => r.doctor_id === DOCTOR_ID)).toBe(true);
  });

  it("admin sees every medical record, matching the documented 'Yes'", async () => {
    const token = await loginAsAdmin();
    const records = await getMedicalRecords(token);
    const patientIds = new Set(records.map((r) => r.patient_id));
    expect(patientIds.size).toBeGreaterThan(1);
  });

  // DISCREPANCY: the matrix says a Nurse cannot view medical records at
  // all ("No"). The real GET /api/medical-records route only filters for
  // Patient (own) and Doctor (own); Administrator and Nurse both fall
  // through with no WHERE clause and see every record, unfiltered --
  // identical to the admin view above. Verified live: a nurse's list
  // spans multiple patients, not zero and not just one.
  it("DISCREPANCY: a nurse sees every medical record too, unfiltered -- the route only branches on Patient/Doctor", async () => {
    const token = await loginAsNurse();
    const records = await getMedicalRecords(token);
    const patientIds = new Set(records.map((r) => r.patient_id));
    expect(patientIds.size).toBeGreaterThan(1);
  });
});
