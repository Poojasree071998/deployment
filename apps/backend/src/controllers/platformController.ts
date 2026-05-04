import { Request, Response } from 'express';
import PlatformSettings from '../models/PlatformSettings.js';
import fs from 'fs';
import path from 'path';

const SETTINGS_MOCK_PATH = path.join(process.cwd(), 'data', 'platform-settings.json');

const loadMockSettings = () => {
  if (fs.existsSync(SETTINGS_MOCK_PATH)) {
    return JSON.parse(fs.readFileSync(SETTINGS_MOCK_PATH, 'utf8'));
  }
  return { rootDomain: 'localhost', mockMode: true };
};

const saveMockSettings = (settings: any) => {
  fs.writeFileSync(SETTINGS_MOCK_PATH, JSON.stringify(settings, null, 2));
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    if (process.env.MOCK_MODE === 'true') {
      return res.json(loadMockSettings());
    }
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({ rootDomain: 'localhost' });
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  const { rootDomain, mockMode, vpsIp, platformName, logoUrl } = req.body;
  try {
    if (process.env.MOCK_MODE === 'true') {
      const settings = { ...loadMockSettings(), rootDomain, mockMode, vpsIp, platformName, logoUrl };
      saveMockSettings(settings);
      return res.json(settings);
    }
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings();
    }
    settings.rootDomain = rootDomain;
    settings.mockMode = mockMode;
    settings.vpsIp = vpsIp;
    settings.platformName = platformName;
    settings.logoUrl = logoUrl;
    settings.updatedAt = new Date();
    await settings.save();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
