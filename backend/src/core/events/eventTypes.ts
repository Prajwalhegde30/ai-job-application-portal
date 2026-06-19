export enum EventType {
  APPLICATION_CREATED = 'APPLICATION_CREATED',
  APPLICATION_WITHDRAWN = 'APPLICATION_WITHDRAWN',
  APPLICATION_STATUS_CHANGED = 'APPLICATION_STATUS_CHANGED',
  JOB_PUBLISHED = 'JOB_PUBLISHED',
  RESUME_UPLOADED = 'RESUME_UPLOADED',
  RESUME_REPLACED = 'RESUME_REPLACED',
}

export interface ApplicationCreatedPayload {
  applicationId: string;
  userId: string;
  jobId: string;
}

export interface ApplicationWithdrawnPayload {
  applicationId: string;
  userId: string;
  jobId: string;
}

export interface ApplicationStatusChangedPayload {
  applicationId: string;
  userId: string;
  jobId: string;
  oldStatus: string;
  newStatus: string;
  notes?: string | null;
  performedBy: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
}

export interface JobPublishedPayload {
  jobId: string;
}

export interface ResumeUploadedPayload {
  resumeId: string;
  userId: string;
}

export interface ResumeReplacedPayload {
  resumeId: string;
  userId: string;
}

export interface EventPayloadMap {
  [EventType.APPLICATION_CREATED]: ApplicationCreatedPayload;
  [EventType.APPLICATION_WITHDRAWN]: ApplicationWithdrawnPayload;
  [EventType.APPLICATION_STATUS_CHANGED]: ApplicationStatusChangedPayload;
  [EventType.JOB_PUBLISHED]: JobPublishedPayload;
  [EventType.RESUME_UPLOADED]: ResumeUploadedPayload;
  [EventType.RESUME_REPLACED]: ResumeReplacedPayload;
}
