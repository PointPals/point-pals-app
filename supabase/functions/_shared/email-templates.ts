// Shared Resend template IDs for PointPals.
// Import in edge functions: import { TEMPLATES } from "../_shared/email-templates.ts";

export const TEMPLATES = {
  // Transactional
  WELCOME:                 "c47b8f0c-0424-48b9-8298-aea923ae161d",
  SUBSCRIPTION_RECEIPT:    "f349804b-9024-44e5-baf5-da4d18c3701a",
  SUBSCRIPTION_RENEWAL:    "af7030c6-a449-4d85-beb7-b35f19a4d5fb",
  PAYMENT_FAILED:          "be31e3d1-c51d-4255-91fc-db501d76bf08",
  CONTACT_CONFIRMATION:    "267dc7da-55bb-4d22-9512-3b6012f61b75",
  SUBSCRIPTION_CANCELLED:  "9bbe49aa-223d-44f1-af8d-88560d4a6ae2",
  TRIAL_ENDING:            "929843c3-c808-4643-9ce5-3a686917f651",

  // Nurture / onboarding tips
  HABIT_FADING_TIPS:       "c61044aa-2146-4715-98c3-030fadc33646",
  PARENTING_TIP_LABEL_PRAISE: "d12adf3c-3874-4abf-94f3-ed04b349257c",
  PARENTING_TIP_START_SMALL:  "f8fbb7b8-b955-48a6-b3aa-1079aeefd569",

  // Memory retention
  MEMORY_EXPIRY_WARNING:    "9f3e2a11-7b44-4f22-bd12-4c6012f62b85",
  MEMORY_MONTAGE_READY:     "8d2e1b22-6a33-4c11-ac01-3b5012f61c74",
};
