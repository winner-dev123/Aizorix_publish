export type DomainErrorCode =
  | "CLINIC_NOT_FOUND"
  | "TREATMENT_NOT_FOUND"
  | "TREATMENT_NOT_IN_CLINIC"
  | "PATIENT_NOT_IN_CLINIC"
  | "TECHNICIAN_NOT_IN_CLINIC"
  | "TECHNICIAN_NOT_ELIGIBLE"
  | "TECHNICIAN_NOT_EXCLUSIVE"
  | "TECHNICIAN_INACTIVE"
  | "LEAD_TIME_TOO_SHORT"
  | "OUTSIDE_BUSINESS_HOURS"
  | "OVERLAP"
  | "BLOCKED"
  | "APPOINTMENT_NOT_FOUND"
  | "APPOINTMENT_NOT_CANCELLABLE"
  | "VALIDATION_ERROR";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class BookingError extends DomainError {
  constructor(code: DomainErrorCode, message: string) {
    super(code, message);
    this.name = "BookingError";
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
