// The eight clearance offices. Which building each sits in is set in
// campus-overrides.ts. CONFIRM: the real offices, their order and documents.
import type { OfficeDef } from '../game/contentTypes';
import type { OfficeId } from '../game/types';

export const OFFICES: Record<OfficeId, OfficeDef> = {
  admissions: { id: 'admissions', name: 'Admissions Office', docs: { passport: 1, photocopy: 1 }, officerId: 'officer_admissions' },
  registry: { id: 'registry', name: 'Registry', docs: { photocopy: 2 }, officerId: 'officer_registry' },
  bursary: { id: 'bursary', name: 'Bursary', docs: { receipt: 1 }, needsAcceptance: true, officerId: 'officer_bursary' },
  student_affairs: { id: 'student_affairs', name: 'Student Affairs', docs: { passport: 1 }, officerId: 'officer_student_affairs' },
  ict: { id: 'ict', name: 'ICT Unit', docs: { photocopy: 1 }, officerId: 'officer_ict' },
  college_office: { id: 'college_office', name: 'College Office', docs: { photocopy: 1, passport: 1 }, officerId: 'officer_college' },
  hod: { id: 'hod', name: 'Head of Department', docs: { photocopy: 1 }, needs: ['college_office'], officerId: 'officer_hod' },
  medical: { id: 'medical', name: 'Medical Centre', docs: { passport: 1 }, fee: 3000, officerId: 'doctor' },
};

export const OFFICE_ORDER: OfficeId[] = [
  'admissions',
  'registry',
  'bursary',
  'student_affairs',
  'ict',
  'college_office',
  'hod',
  'medical',
];

export const DOC_NAMES: Record<'photocopy' | 'passport' | 'receipt', string> = {
  photocopy: 'photocopy of your credentials',
  passport: 'passport photograph',
  receipt: 'printed acceptance receipt',
};
