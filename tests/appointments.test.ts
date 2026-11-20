// tests/appointments.test.ts
//
// Real appointment creation/listing tests against the running backend.
// Known seeded ids used below (verified via GET /api/users as admin):
// doctor1 = user id 5, nurse1 = user id 13, patient1 = user id 20.

import {
  loginAsNurse,
  loginAsDoctor,
  loginAsPatient,
  createTestAppointment,
  getAppointments,
} from "./helpers";

const DOCTOR_ID = 5;
const PATIENT_ID = 20;

describe("appointment creation", () => {
  it("creates an appointment and fetches the full record back", async () => {
    const token = await loginAsNurse();
    const appointment = await createTestAppointment(
      token,
      PATIENT_ID,
      DOCTOR_ID,
      "Routine checkup"
    );

    expect(appointment.status).toBe("scheduled");
    expect(appointment.patient_id).toBe(PATIENT_ID);
    expect(appointment.doctor_id).toBe(DOCTOR_ID);
    expect(appointment.reason).toBe("Routine checkup");
    // The create endpoint only returns { message, appointmentId }; these
    // extra fields (names/emails) only exist because we followed up with a
    // real GET -- proof the two-step helper actually works end to end.
    expect(appointment.patient_name).toBeTruthy();
    expect(appointment.doctor_name).toBeTruthy();
  });

  it("supports an optional notes field", async () => {
    const token = await loginAsNurse();
    const appointment = await createTestAppointment(
      token,
      PATIENT_ID,
      DOCTOR_ID,
      "Follow-up visit",
      "Patient requested a morning slot"
    );
    expect(appointment.notes).toBe("Patient requested a morning slot");
  });
});

describe("appointment listing", () => {
  it("filters a doctor's appointment list down to their own appointments", async () => {
    const doctorToken = await loginAsDoctor();
    const appointments = await getAppointments(doctorToken);

    expect(appointments.length).toBeGreaterThan(0);
    for (const appt of appointments) {
      expect(appt.doctor_id).toBe(DOCTOR_ID);
    }
  });

  it("filters a patient's appointment list down to their own appointments", async () => {
    const patientToken = await loginAsPatient();
    const appointments = await getAppointments(patientToken);

    expect(appointments.length).toBeGreaterThan(0);
    for (const appt of appointments) {
      expect(appt.patient_id).toBe(PATIENT_ID);
    }
  });

  it("does not filter a nurse's appointment list -- nurses see every appointment", async () => {
    const nurseToken = await loginAsNurse();
    const doctorToken = await loginAsDoctor();

    const allAppointments = await getAppointments(nurseToken);
    const doctorOnlyAppointments = await getAppointments(doctorToken);

    // The nurse's unfiltered list must be a superset of (at least as large
    // as) what a single doctor sees of their own appointments.
    expect(allAppointments.length).toBeGreaterThanOrEqual(
      doctorOnlyAppointments.length
    );
    const patientIds = new Set(allAppointments.map((a) => a.patient_id));
    const doctorIds = new Set(allAppointments.map((a) => a.doctor_id));
    // A real "view all" list spans more than one patient/doctor pairing.
    expect(patientIds.size).toBeGreaterThan(1);
    expect(doctorIds.size).toBeGreaterThan(1);
  });
});
