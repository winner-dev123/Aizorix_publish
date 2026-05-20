export type BusinessHoursRow = {
  dayOfWeek: number; // 0=Sun .. 6=Sat
  opensAt: string; // "HH:mm" in clinic timezone
  closesAt: string;
};

export type ResolvedWindow = {
  opensAt: Date; // UTC
  closesAt: Date; // UTC
};

export type ExistingAppointment = {
  startsAt: Date;
  endsAt: Date;
  technicianId: string;
};

export type BlockedRange = {
  startsAt: Date;
  endsAt: Date;
  technicianId: string | null; // null = clinic-wide
};

export type Slot = {
  startsAt: Date;
  endsAt: Date;
  technicianId: string;
};

export type SlotGenerationInput = {
  windows: ResolvedWindow[];
  treatmentDurationMinutes: number;
  bufferMinutes?: number;
  granularityMinutes?: number;
  technicianIds: string[];
  existingAppointments: ExistingAppointment[];
  blocked: BlockedRange[];
  now: Date;
  minLeadMinutes?: number;
};
