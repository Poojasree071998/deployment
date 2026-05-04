"use client";

import React, { useState } from 'react';
import { X, Github, Globe, Database, Cpu } from 'lucide-react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:5000/api';

export default function CreationModal({ type, onClose, onSuccess, project }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project?.name || '',
    gitUrl: project?.gitUrl || '',
    subdomain: project?.subdomain || '',
    dbName: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'mongodb') {
        await axios.post(`${API_BASE}/databases`, { name: formData.dbName });
      } else {
        await axios.post(`${API_BASE}/projects`, {
          name: formData.name,
          gitUrl: formData.gitUrl,
          subdomain: formData.subdomain,
          projectType: type
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Action failed:', error);
      alert('Provisioning failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0d0d0d] border border-white/10 rounded-[2.5rem] p-10 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full"><X size={24}/></button>
        <h2 className="text-3xl font-bold mb-8">Provision Resource</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {type === 'mongodb' ? (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Database Name</label>
              <input required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500" value={formData.dbName} onChange={e => setFormData({...formData, dbName: e.target.value})} />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Project Name</label>
                <input required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Git URL</label>
                <input required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500" value={formData.gitUrl} onChange={e => setFormData({...formData, gitUrl: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Subdomain</label>
                <input required className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500" value={formData.subdomain} onChange={e => setFormData({...formData, subdomain: e.target.value})} />
              </div>
            </>
          )}
          <button disabled={loading} className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 transition">
            {loading ? 'Provisioning...' : 'Start Deployment'}
          </button>
        </form>
      </div>
    </div>
  );
}
