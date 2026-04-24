# HMS API (via API Gateway)

Base URL (browser / docker frontend): `/api`

Authentication:

- Send `Authorization: Bearer <JWT>` on protected routes.
- Roles: `ADMIN`, `DOCTOR`, `PATIENT`

## Auth

### POST `/api/auth/register` (Patient self-service)

Body:

```json
{ "email": "patient@example.com", "password": "Password@123", "name": "Patient Name" }
```

### POST `/api/auth/login`

Body:

```json
{ "email": "admin@hospital.local", "password": "Admin@12345" }
```

### GET `/api/auth/me` (Protected)

## Public directory

### GET `/api/doctors`

Lists onboarded doctors (from User Service).

### GET `/api/doctors/:id/availability`

Public doctor availability view: only `enabled` + not booked + not expired slots.

## Doctor availability (doctor-only)

### GET `/api/doctor/availability`

Returns signed-in doctor's availability grouped by date.

### POST `/api/doctor/availability`

Adds availability slots for a date.

```json
{ "date": "2026-04-24", "slots": [{ "time": "09:00-09:30" }] }
```

Invalid selection is rejected with:

```json
{ "error": "Invalid time selection" }
```

### PATCH `/api/doctor/availability/:slotId`

Enable/disable a slot.

```json
{ "enabled": false }
```

### DELETE `/api/doctor/availability/:slotId`

Deletes a slot (only if not booked).

## Profiles

### GET `/api/users/me` (Protected)

Returns doctor/patient profile row when present.

## Admin — workforce & population

### POST `/api/admin/doctors` (Admin)

Creates an auth user (`DOCTOR`) and doctor profile.

```json
{
  "name": "Dr. Neo",
  "specialization": "Neurology",
  "email": "neo@hospital.local",
  "password": "TempPass@123",
  "experienceYears": 6,
  "availabilitySlots": ["Mon 09:00", "Wed 14:00"]
}
```

### GET `/api/admin/doctors`

### GET `/api/admin/patients`

### GET `/api/admin/analytics`

Returns merged analytics:

- `totalAppointments`, `appointmentsByStatus`, `activeDoctors` (from Appointment Service)
- `doctorProfiles`, `patientProfiles` (counts from User Service)

### GET `/api/admin/doctors/:id`

Doctor profile + appointments + derived prescription history.

### GET `/api/admin/patients/:id`

Patient profile + appointments + prescriptions.

### GET `/api/admin/appointments`

### GET `/api/admin/activities`

Audit-style activity feed (Notification Service).

## Appointments

Statuses: `PENDING | ACCEPTED | REJECTED | COMPLETED`

Overlap prevention only considers `PENDING` and `ACCEPTED` appointments (completed / rejected slots are freed).

### POST `/api/appointments` (Patient)

```json
{ "doctorId": "<doctorAuthUserId>", "startTime": "2026-04-24T10:00:00.000Z", "durationMinutes": 30 }
```

Errors:

- `409 SLOT_UNAVAILABLE`

### GET `/api/appointments/me` (Patient)

### GET `/api/doctor/appointments` (Doctor)

### GET `/api/appointments/:id` (Doctor / Patient / Admin)

### PATCH `/api/appointments/:id/decision` (Doctor)

```json
{ "status": "ACCEPTED" }
```

### PATCH `/api/appointments/:id/consultation-notes` (Doctor)

Allowed while status is `PENDING` or `ACCEPTED`.

```json
{ "consultationNotes": "Patient counseled on lifestyle modifications." }
```

### POST `/api/appointments/:id/prescription` (Doctor)

Requires `ACCEPTED`. Stores structured medicines with dosing windows used by the Notification Service scheduler.

```json
{
  "medicines": [
    {
      "name": "Paracetamol",
      "instructions": "500mg after meals",
      "schedule": ["MORNING", "NIGHT"]
    }
  ],
  "notes": "Hydration emphasis"
}
```

`schedule` values must be one or more of: `MORNING`, `NOON`, `NIGHT` (mapped to 08:30 / 12:30 / 19:30 in the reminder engine).

### POST `/api/appointments/:id/consultation` (Doctor)

Completes an `ACCEPTED` appointment (`COMPLETED`).

Rules:

- Requires non-empty `consultationNotes` **or** an existing prescription with medicines (from earlier prescription POST or medicines included in this call).

```json
{
  "consultationNotes": "Stable. Continue meds.",
  "medicines": [{ "name": "Vitamin D", "instructions": "Once daily", "schedule": ["MORNING"] }],
  "prescriptionNotes": "Optional prescription-level notes",
  "followUpRecommended": true,
  "followUpDate": "2026-05-01T10:00:00.000Z"
}
```

## Notifications

### GET `/api/notifications` (Protected)

### POST `/api/notifications/:id/read`

```json
{ "read": true }
```

### Internal medicine reminder engine

The Notification Service stores `ReminderJob` documents whenever prescriptions include schedules. At **08:30**, **12:30**, and **19:30** in `MED_REMINDER_TZ` (default `UTC`), cron jobs emit `MEDICINE_REMINDER` notifications once per local day per slot.

## Seed users (docker-compose defaults)

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Admin   | admin@hospital.local | Admin@12345 |
| Doctor  | doctor@hospital.local | Doctor@12345 |
| Patient | patient@hospital.local | Patient@12345 |
