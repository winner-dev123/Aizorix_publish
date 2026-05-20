import type { MessageRole } from "@prisma/client";

export type Action = "BOOK" | "RESCHEDULE" | "CANCEL" | "INFO" | "NONE" | "PAUSED";

export type EnvelopeMetadata = {
  appointmentId?: string;
  treatmentId?: string;
  technicianId?: string;
  startsAt?: string;
  endsAt?: string;
  patientId?: string;
  matchStatus?: string;
  candidates?: unknown;
  reason?: string;
};

export type OrchestratorEnvelope = {
  respuesta: string;
  accion: Action;
  requiresHuman: boolean;
  metadata: EnvelopeMetadata;
  conversationId: string;
};

export type OrchestrateInput = {
  clinicId: string;
  channel?: "WHATSAPP" | "WEB" | "SMS" | "PHONE";
  externalChatId: string;
  fromName?: string;
  message: string;
  now?: Date;
};

export type TranscriptMessage = {
  role: MessageRole;
  content: string;
  metadata?: unknown;
};
