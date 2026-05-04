import mongoose from 'mongoose';

const PlatformSettingsSchema = new mongoose.Schema({
  rootDomain: {
    type: String,
    default: 'localhost'
  },
  platformName: {
    type: String,
    default: 'PaaS'
  },
  logoUrl: String,
  mockMode: {
    type: Boolean,
    default: true
  },
  vpsIp: String,
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('PlatformSettings', PlatformSettingsSchema);
