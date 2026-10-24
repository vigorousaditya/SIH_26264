const mongoose = require('mongoose');
const { Schema } = mongoose;

// User Schema
const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'official', 'senior_officer'], required: true },
  department: { type: String },
  officialId: { type: String },
  avatar: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Official Schema
const OfficialSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, required: true }, // 'Regulation Bureau (RB)', 'Public Grievance Redressal Cell (PGRC)', 'Approval Bureau (AB)', 'Faculty Development Cell (FDC)'
  designation: { type: String, default: 'Bureau Official' },
  expertiseCategories: [{ type: String }],
  availabilityStatus: { type: String, enum: ['Available', 'On Leave', 'Busy', 'Unavailable'], default: 'Available' },
  maxActiveCases: { type: Number, default: 10 },
  activeCasesCount: { type: Number, default: 0 },
  role: { type: String, default: 'official' },
  phone: { type: String },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Institution Schema
const InstitutionSchema = new Schema({
  id: { type: String, required: true, unique: true },
  permanentId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Engineering & Technology' },
  region: { type: String, required: true }, // 'Northern', 'Southern', 'Western', 'Eastern', 'Central', 'South-Western'
  state: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  contactEmail: { type: String },
  contactPhone: { type: String },
  principalName: { type: String },
  accreditationStatus: { type: String, default: 'NBA Accredited' },
  totalCases: { type: Number, default: 0 },
  pendingCases: { type: Number, default: 0 },
  overdueCases: { type: Number, default: 0 },
  lastActivityDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

// Case Schema
const CaseSchema = new Schema({
  id: { type: String, required: true, unique: true }, // e.g. "CB-2026-101"
  institutionId: { type: String, required: true },
  institutionName: { type: String, required: true },
  institutionPermanentId: { type: String, required: true },
  category: { type: String, required: true }, // 'Faculty Salary & Non-Payment', 'Capitation Fee & Refund', 'Infrastructure & Lab Deficiencies', 'Admission Malpractice', 'Faculty Qualifications & Ghost Faculty', 'Examination & Grading Irregularities'
  description: { type: String, required: true },
  complainantName: { type: String, default: 'Confidential Complainant' },
  complainantType: { type: String, enum: ['Faculty', 'Student', 'Parent', 'Anonymous', 'Public Representative'], default: 'Faculty' },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  department: { type: String, required: true },
  assignedOfficialId: { type: String, default: null },
  assignedOfficialName: { type: String, default: 'Unassigned' },
  status: { type: String, enum: ['Pending', 'Under Process', 'Transferred', 'Escalated', 'Disposed'], default: 'Pending' },
  receivedAt: { type: Date, default: Date.now },
  expectedDisposalAt: { type: Date, required: true },
  lastActionDate: { type: Date, default: Date.now },
  nextAction: { type: String, default: 'Initial Verification Required' },
  issueGroupId: { type: String, default: null },
  assignmentReason: { type: String },
  assignedBy: { type: String, default: 'System Auto-Assignment' },
  findings: { type: String, default: '' },
  disposalRemarks: { type: String, default: '' },
  createdBy: { type: String, default: 'Online Portal' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// CaseHistory Schema
const CaseHistorySchema = new Schema({
  id: { type: String, required: true, unique: true },
  caseId: { type: String, required: true },
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true }, // 'REGISTERED', 'ASSIGNED', 'STATUS_CHANGE', 'REMARKED', 'TRANSFERRED', 'ESCALATED', 'GROUPED', 'DISPOSED'
  previousValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  remarks: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// IssueGroup Schema (Common Issue Intelligence)
const IssueGroupSchema = new Schema({
  id: { type: String, required: true, unique: true }, // e.g. "GRP-2026-001"
  institutionId: { type: String, required: true },
  institutionName: { type: String, required: true },
  title: { type: String, required: true },
  issueSummary: { type: String, required: true },
  primaryCategory: { type: String, required: true },
  linkedCaseIds: [{ type: String }],
  leadOfficialId: { type: String },
  leadOfficialName: { type: String },
  status: { type: String, enum: ['Suggested', 'Approved', 'Rejected', 'Resolved'], default: 'Approved' },
  similarityScore: { type: Number, default: 85 },
  keywordsMatched: [{ type: String }],
  suggestedAt: { type: Date, default: Date.now },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// CaseRelationship Schema (Case Dependency & Impact Map)
const CaseRelationshipSchema = new Schema({
  id: { type: String, required: true, unique: true },
  sourceCaseId: { type: String, required: true },
  targetCaseId: { type: String, required: true },
  relationshipType: { 
    type: String, 
    enum: ['Same institution', 'Similar issue', 'Possible dependency', 'Needs review', 'Duplicate complaint'],
    required: true 
  },
  explanation: { type: String, required: true },
  confidenceScore: { type: Number, default: 80 },
  reviewStatus: { type: String, enum: ['Suggested', 'Confirmed', 'Dismissed'], default: 'Confirmed' },
  reviewedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Notification Schema
const NotificationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  recipientId: { type: String, default: 'ALL_OFFICIALS' },
  recipientRole: { type: String, default: 'ALL' },
  type: { 
    type: String, 
    enum: ['OVERDUE_ALERT', 'DEADLINE_NEARING', 'UNASSIGNED_CASE', 'WORKLOAD_LIMIT', 'SIMILAR_COMPLAINTS', 'IMPACT_ALERT', 'ASSIGNMENT', 'ESCALATION'],
    required: true 
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedCaseId: { type: String },
  relatedInstitutionId: { type: String },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// AuditLog Schema
const AuditLogSchema = new Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true }, // 'Case', 'Official', 'Institution', 'IssueGroup', 'Relationship', 'Alert'
  entityId: { type: String, required: true },
  details: { type: String, required: true },
  previousValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  ipAddress: { type: String, default: '127.0.0.1' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = {
  UserSchema,
  OfficialSchema,
  InstitutionSchema,
  CaseSchema,
  CaseHistorySchema,
  IssueGroupSchema,
  CaseRelationshipSchema,
  NotificationSchema,
  AuditLogSchema
};
