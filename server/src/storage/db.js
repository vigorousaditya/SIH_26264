const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const {
  UserSchema,
  OfficialSchema,
  InstitutionSchema,
  CaseSchema,
  CaseHistorySchema,
  IssueGroupSchema,
  CaseRelationshipSchema,
  NotificationSchema,
  AuditLogSchema
} = require('../models/schemas');

const seed = require('../seed/seedData');

// Data storage directory and file for persistent local demo mode
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Mongoose Models
let MongooseModels = {};

// In-Memory store
let memoryStore = {
  users: [],
  officials: [],
  institutions: [],
  cases: [],
  caseHistories: [],
  issueGroups: [],
  caseRelationships: [],
  notifications: [],
  auditLogs: []
};

let dbMode = 'uninitialized'; // 'mongodb' or 'local_memory'

// Recalculates active case counts for all officials based on non-disposed cases
function recalculateOfficialWorkloads(casesList, officialsList) {
  const counts = {};
  officialsList.forEach(off => { counts[off.id] = 0; });

  casesList.forEach(c => {
    if (c.assignedOfficialId && c.status !== 'Disposed') {
      counts[c.assignedOfficialId] = (counts[c.assignedOfficialId] || 0) + 1;
    }
  });

  return officialsList.map(off => ({
    ...off,
    activeCasesCount: counts[off.id] || 0
  }));
}

// Recalculates institution case counts
function recalculateInstitutionCounts(casesList, institutionsList) {
  const totals = {};
  const pendings = {};
  const overdues = {};
  const now = Date.now();

  institutionsList.forEach(inst => {
    totals[inst.id] = 0;
    pendings[inst.id] = 0;
    overdues[inst.id] = 0;
  });

  casesList.forEach(c => {
    if (c.institutionId) {
      totals[c.institutionId] = (totals[c.institutionId] || 0) + 1;
      if (c.status !== 'Disposed') {
        pendings[c.institutionId] = (pendings[c.institutionId] || 0) + 1;
        if (new Date(c.expectedDisposalAt).getTime() < now) {
          overdues[c.institutionId] = (overdues[c.institutionId] || 0) + 1;
        }
      }
    }
  });

  return institutionsList.map(inst => ({
    ...inst,
    totalCases: totals[inst.id] || 0,
    pendingCases: pendings[inst.id] || 0,
    overdueCases: overdues[inst.id] || 0
  }));
}

function saveStoreToFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store to file:', err.message);
  }
}

function loadStoreFromFile() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && data.cases && data.cases.length > 0) {
        memoryStore = data;
        // Recalculate workloads
        memoryStore.officials = recalculateOfficialWorkloads(memoryStore.cases, memoryStore.officials);
        memoryStore.institutions = recalculateInstitutionCounts(memoryStore.cases, memoryStore.institutions);
        console.log(`[Storage] Loaded existing database from ${DATA_FILE}`);
        return true;
      }
    } catch (err) {
      console.warn('Failed to parse existing data file, initializing fresh seed data.', err.message);
    }
  }
  return false;
}

function initSeedMemory() {
  memoryStore.users = JSON.parse(JSON.stringify(seed.seedUsers));
  memoryStore.institutions = JSON.parse(JSON.stringify(seed.seedInstitutions));
  memoryStore.cases = JSON.parse(JSON.stringify(seed.seedCases));
  memoryStore.caseHistories = JSON.parse(JSON.stringify(seed.seedCaseHistories));
  memoryStore.issueGroups = JSON.parse(JSON.stringify(seed.seedIssueGroups));
  memoryStore.caseRelationships = JSON.parse(JSON.stringify(seed.seedCaseRelationships));
  memoryStore.notifications = JSON.parse(JSON.stringify(seed.seedNotifications));
  memoryStore.auditLogs = JSON.parse(JSON.stringify(seed.seedAuditLogs));
  memoryStore.officials = recalculateOfficialWorkloads(memoryStore.cases, JSON.parse(JSON.stringify(seed.seedOfficials)));
  memoryStore.institutions = recalculateInstitutionCounts(memoryStore.cases, memoryStore.institutions);
  saveStoreToFile();
  console.log('[Storage] Seeded in-memory store with demo dataset (8+ institutions, 10+ officials, 28+ cases).');
}

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/casebridge';
  try {
    console.log(`[Database] Attempting connection to MongoDB at ${mongoUri} (timeout 2500ms)...`);
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500
    });
    
    dbMode = 'mongodb';
    console.log('✅ [Database] Successfully connected to MongoDB.');

    // Initialize Mongoose Models
    MongooseModels.User = mongoose.model('User', UserSchema);
    MongooseModels.Official = mongoose.model('Official', OfficialSchema);
    MongooseModels.Institution = mongoose.model('Institution', InstitutionSchema);
    MongooseModels.Case = mongoose.model('Case', CaseSchema);
    MongooseModels.CaseHistory = mongoose.model('CaseHistory', CaseHistorySchema);
    MongooseModels.IssueGroup = mongoose.model('IssueGroup', IssueGroupSchema);
    MongooseModels.CaseRelationship = mongoose.model('CaseRelationship', CaseRelationshipSchema);
    MongooseModels.Notification = mongoose.model('Notification', NotificationSchema);
    MongooseModels.AuditLog = mongoose.model('AuditLog', AuditLogSchema);

    // Check if MongoDB collection is empty and seed if necessary
    const count = await MongooseModels.Case.countDocuments();
    if (count === 0) {
      console.log('[Database] MongoDB is empty. Seeding initial records...');
      await MongooseModels.User.insertMany(seed.seedUsers);
      await MongooseModels.Official.insertMany(seed.seedOfficials);
      await MongooseModels.Institution.insertMany(seed.seedInstitutions);
      await MongooseModels.Case.insertMany(seed.seedCases);
      await MongooseModels.CaseHistory.insertMany(seed.seedCaseHistories);
      await MongooseModels.IssueGroup.insertMany(seed.seedIssueGroups);
      await MongooseModels.CaseRelationship.insertMany(seed.seedCaseRelationships);
      await MongooseModels.Notification.insertMany(seed.seedNotifications);
      await MongooseModels.AuditLog.insertMany(seed.seedAuditLogs);
      console.log('✅ [Database] MongoDB successfully seeded.');
    }
  } catch (err) {
    dbMode = 'local_memory';
    console.warn(`⚠️ [Database] MongoDB is not running (${err.message}).`);
    console.log('🚀 [Database] Seamlessly activated High-Reliability Local Demo Storage (Fully Persistent).');
    
    const loaded = loadStoreFromFile();
    if (!loaded) {
      initSeedMemory();
    }
  }
}

// Unified Generic Database Interface
const db = {
  getMode: () => dbMode,

  recalculateWorkloads: () => {
    if (dbMode === 'local_memory') {
      memoryStore.officials = recalculateOfficialWorkloads(memoryStore.cases, memoryStore.officials);
      memoryStore.institutions = recalculateInstitutionCounts(memoryStore.cases, memoryStore.institutions);
      saveStoreToFile();
    }
  },

  resetToSeed: () => {
    initSeedMemory();
    return true;
  },

  // Collections accessors
  users: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.User.find(filter).lean();
      return memoryStore.users.filter(item => matchFilter(item, filter));
    },
    findOne: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.User.findOne(filter).lean();
      return memoryStore.users.find(item => matchFilter(item, filter)) || null;
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.User.create(data)).toObject();
      const doc = { ...data, createdAt: new Date() };
      memoryStore.users.push(doc);
      saveStoreToFile();
      return doc;
    }
  },

  officials: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Official.find(filter).lean();
      db.recalculateWorkloads();
      return memoryStore.officials.filter(item => matchFilter(item, filter));
    },
    findOne: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Official.findOne(filter).lean();
      db.recalculateWorkloads();
      return memoryStore.officials.find(item => matchFilter(item, filter)) || null;
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.Official.create(data)).toObject();
      const doc = { ...data, createdAt: new Date() };
      memoryStore.officials.push(doc);
      db.recalculateWorkloads();
      return doc;
    },
    updateOne: async (filter, update) => {
      if (dbMode === 'mongodb') return await MongooseModels.Official.updateOne(filter, update);
      const index = memoryStore.officials.findIndex(item => matchFilter(item, filter));
      if (index !== -1) {
        memoryStore.officials[index] = { ...memoryStore.officials[index], ...update };
        db.recalculateWorkloads();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }
  },

  institutions: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Institution.find(filter).lean();
      db.recalculateWorkloads();
      return memoryStore.institutions.filter(item => matchFilter(item, filter));
    },
    findOne: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Institution.findOne(filter).lean();
      db.recalculateWorkloads();
      return memoryStore.institutions.find(item => matchFilter(item, filter)) || null;
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.Institution.create(data)).toObject();
      const doc = { ...data, totalCases: 0, pendingCases: 0, overdueCases: 0, createdAt: new Date() };
      memoryStore.institutions.push(doc);
      saveStoreToFile();
      return doc;
    },
    updateOne: async (filter, update) => {
      if (dbMode === 'mongodb') return await MongooseModels.Institution.updateOne(filter, update);
      const index = memoryStore.institutions.findIndex(item => matchFilter(item, filter));
      if (index !== -1) {
        memoryStore.institutions[index] = { ...memoryStore.institutions[index], ...update };
        saveStoreToFile();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }
  },

  cases: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Case.find(filter).sort({ receivedAt: -1 }).lean();
      return memoryStore.cases.filter(item => matchFilter(item, filter))
        .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
    },
    findOne: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Case.findOne(filter).lean();
      return memoryStore.cases.find(item => matchFilter(item, filter)) || null;
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.Case.create(data)).toObject();
      const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
      memoryStore.cases.unshift(doc);
      db.recalculateWorkloads();
      return doc;
    },
    updateOne: async (filter, update) => {
      if (dbMode === 'mongodb') return await MongooseModels.Case.updateOne(filter, update);
      const index = memoryStore.cases.findIndex(item => matchFilter(item, filter));
      if (index !== -1) {
        memoryStore.cases[index] = { ...memoryStore.cases[index], ...update, updatedAt: new Date() };
        db.recalculateWorkloads();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    },
    countDocuments: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Case.countDocuments(filter);
      return memoryStore.cases.filter(item => matchFilter(item, filter)).length;
    }
  },

  caseHistories: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.CaseHistory.find(filter).sort({ timestamp: -1 }).lean();
      return memoryStore.caseHistories.filter(item => matchFilter(item, filter))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.CaseHistory.create(data)).toObject();
      const doc = { ...data, timestamp: data.timestamp || new Date() };
      memoryStore.caseHistories.unshift(doc);
      saveStoreToFile();
      return doc;
    }
  },

  issueGroups: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.IssueGroup.find(filter).sort({ createdAt: -1 }).lean();
      return memoryStore.issueGroups.filter(item => matchFilter(item, filter))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    findOne: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.IssueGroup.findOne(filter).lean();
      return memoryStore.issueGroups.find(item => matchFilter(item, filter)) || null;
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.IssueGroup.create(data)).toObject();
      const doc = { ...data, createdAt: new Date() };
      memoryStore.issueGroups.unshift(doc);
      saveStoreToFile();
      return doc;
    },
    updateOne: async (filter, update) => {
      if (dbMode === 'mongodb') return await MongooseModels.IssueGroup.updateOne(filter, update);
      const index = memoryStore.issueGroups.findIndex(item => matchFilter(item, filter));
      if (index !== -1) {
        memoryStore.issueGroups[index] = { ...memoryStore.issueGroups[index], ...update };
        saveStoreToFile();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }
  },

  caseRelationships: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.CaseRelationship.find(filter).lean();
      return memoryStore.caseRelationships.filter(item => matchFilter(item, filter));
    },
    findOne: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.CaseRelationship.findOne(filter).lean();
      return memoryStore.caseRelationships.find(item => matchFilter(item, filter)) || null;
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.CaseRelationship.create(data)).toObject();
      const doc = { ...data, createdAt: new Date() };
      memoryStore.caseRelationships.unshift(doc);
      saveStoreToFile();
      return doc;
    },
    updateOne: async (filter, update) => {
      if (dbMode === 'mongodb') return await MongooseModels.CaseRelationship.updateOne(filter, update);
      const index = memoryStore.caseRelationships.findIndex(item => matchFilter(item, filter));
      if (index !== -1) {
        memoryStore.caseRelationships[index] = { ...memoryStore.caseRelationships[index], ...update };
        saveStoreToFile();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    },
    deleteOne: async (filter) => {
      if (dbMode === 'mongodb') return await MongooseModels.CaseRelationship.deleteOne(filter);
      const index = memoryStore.caseRelationships.findIndex(item => matchFilter(item, filter));
      if (index !== -1) {
        memoryStore.caseRelationships.splice(index, 1);
        saveStoreToFile();
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    }
  },

  notifications: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Notification.find(filter).sort({ createdAt: -1 }).lean();
      return memoryStore.notifications.filter(item => matchFilter(item, filter))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    findOne: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.Notification.findOne(filter).lean();
      return memoryStore.notifications.find(item => matchFilter(item, filter)) || null;
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.Notification.create(data)).toObject();
      const doc = { ...data, createdAt: new Date() };
      memoryStore.notifications.unshift(doc);
      saveStoreToFile();
      return doc;
    },
    updateOne: async (filter, update) => {
      if (dbMode === 'mongodb') return await MongooseModels.Notification.updateOne(filter, update);
      const index = memoryStore.notifications.findIndex(item => matchFilter(item, filter));
      if (index !== -1) {
        memoryStore.notifications[index] = { ...memoryStore.notifications[index], ...update };
        saveStoreToFile();
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    }
  },

  auditLogs: {
    find: async (filter = {}) => {
      if (dbMode === 'mongodb') return await MongooseModels.AuditLog.find(filter).sort({ timestamp: -1 }).lean();
      return memoryStore.auditLogs.filter(item => matchFilter(item, filter))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    create: async (data) => {
      if (dbMode === 'mongodb') return (await MongooseModels.AuditLog.create(data)).toObject();
      const doc = { ...data, timestamp: new Date() };
      memoryStore.auditLogs.unshift(doc);
      saveStoreToFile();
      return doc;
    }
  }
};

function matchFilter(item, filter) {
  for (const key of Object.keys(filter)) {
    if (filter[key] === undefined) continue;
    // Handle array $in if needed
    if (typeof filter[key] === 'object' && filter[key] !== null) {
      if (filter[key].$in && Array.isArray(filter[key].$in)) {
        if (!filter[key].$in.includes(item[key])) return false;
        continue;
      }
      if (filter[key].$ne !== undefined) {
        if (item[key] === filter[key].$ne) return false;
        continue;
      }
    }
    if (item[key] !== filter[key]) return false;
  }
  return true;
}

module.exports = {
  connectDB,
  db
};
