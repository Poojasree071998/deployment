"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Github, Globe, Database, Cpu } from 'lucide-react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

interface CreationModalProps {
  type: string;
  onClose: () => void;
  onSuccess: () => void;
  project?: any;
}

export default function CreationModal({ type, onClose, onSuccess, project }: CreationModalProps) {
  const [loading, setLoading] = useState(false);
  const [envVars, setEnvVars] = useState<Array<{ key: string, value: string }>>(project?.envVars || []);
  const [formData, setFormData] = useState({
    name: project?.name || (type === 'mern' ? 'task-manager-pro' : ''),
    gitUrl: project?.gitUrl || (type === 'mern' ? 'https://github.com/daksh-s/mern-test-app' : ''),
    subdomain: project?.subdomain || (type === 'mern' ? 'tasks' : ''),
    dbName: '',
  });

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnvVar = (index: number) => setEnvVars(envVars.filter((_, i) => i !== index));
  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const newVars = [...envVars];
    newVars[index][field] = val;
    setEnvVars(newVars);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'mongodb') {
        await axios.post(`${API_BASE}/databases`, { name: formData.dbName });
      } else if (type === 'settings' && project) {
        await axios.put(`${API_BASE}/projects/${project._id}`, {
          envVars: envVars.filter(v => v.key && v.value)
        });
      } else if (type === 'mern') {
        // Full MERN orchestration
        await axios.post(`${API_BASE}/databases`, { name: `${formData.name}-db` });
        await axios.post(`${API_BASE}/projects`, {
          name: `${formData.name}-backend`,
          gitUrl: formData.gitUrl,
          subdomain: `api-${formData.subdomain}`,
          projectType: 'backend'
        });
        await axios.post(`${API_BASE}/projects`, {
          name: formData.name,
          gitUrl: formData.gitUrl,
          subdomain: formData.subdomain,
          projectType: 'frontend'
        });
      } else {
        // Single project (Frontend/Backend)
        await axios.post(`${API_BASE}/projects`, {
          name: formData.name,
          gitUrl: formData.gitUrl,
          subdomain: formData.subdomain,
          projectType: type
        });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create:', error);
      alert(`Provisioning failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<string, string> = {
    frontend: 'Deploy Frontend',
    backend: 'Deploy Backend',
    mongodb: 'Create MongoDB',
    mern: 'Deploy Full MERN App',
    settings: `Project Settings: ${project?.name}`
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-xl bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] p-10 relative shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full transition"
        >
          <X size={24} />
        </button>

        <div className="mb-8">
          <h2 className="text-3xl font-bold">{titles[type]}</h2>
          <p className="text-gray-500 mt-2">
            {type === 'settings' ? 'Configure environment variables for your deployment.' : 'Enter the details to provision your resource.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'settings' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-400">Environment Variables</label>
                <button 
                  type="button"
                  onClick={addEnvVar}
                  className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1 rounded-full transition text-blue-500 font-bold"
                >
                  + Add New
                </button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {envVars.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition"
                      placeholder="KEY"
                      value={v.key}
                      onChange={e => updateEnvVar(i, 'key', e.target.value)}
                    />
                    <input 
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-blue-500 transition"
                      placeholder="VALUE"
                      value={v.value}
                      onChange={e => updateEnvVar(i, 'value', e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => removeEnvVar(i)}
                      className="p-2 text-gray-500 hover:text-red-500 transition"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {envVars.length === 0 && (
                  <p className="text-center py-6 text-gray-600 text-sm italic">No variables added yet.</p>
                )}
              </div>
            </div>
          ) : type === 'mongodb' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Database Name</label>
              <div className="relative">
                <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition"
                  placeholder="my-cool-db"
                  value={formData.dbName}
                  onChange={e => setFormData({...formData, dbName: e.target.value})}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Project Name</label>
                <input 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-blue-500 transition"
                  placeholder="my-awesome-app"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">GitHub Repository URL</label>
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition"
                    placeholder="https://github.com/user/repo"
                    value={formData.gitUrl}
                    onChange={e => setFormData({...formData, gitUrl: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Subdomain</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition"
                    placeholder="app-name"
                    value={formData.subdomain}
                    onChange={e => setFormData({...formData, subdomain: e.target.value})}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm">.localhost</span>
                </div>
              </div>
            </>
          )}

          <button 
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Cpu size={20} />
                {type === 'settings' ? 'Save Changes' : 'Provision Now'}
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
