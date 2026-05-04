"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Terminal, 
  Settings, 
  Activity, 
  Box, 
  LogOut,
  Github,
  Database,
  ExternalLink,
  ShieldCheck,
  Server,
  Globe,
  Save,
  Layout,
  Image as ImageIcon,
  Monitor,
  X,
  RefreshCw,
  Eye
} from 'lucide-react';
import CreationModal from '@/components/CreationModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:5000/api';

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [platformSettings, setPlatformSettings] = useState({ 
    rootDomain: 'localhost', 
    mockMode: true,
    platformName: 'PaaS',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [showPreview, setShowPreview] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const openModal = (type) => setModalType(type);
  const closeModal = () => {
    setModalType(null);
    setSelectedProject(null);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000); // 10s refresh for stability
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      if (activeTab === 'projects') {
        const [projRes, dbRes, settingsRes] = await Promise.all([
          axios.get(`${API_BASE}/projects`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/databases`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/platform`).catch(() => ({ data: { rootDomain: 'localhost', platformName: 'PaaS' } }))
        ]);
        setProjects(Array.isArray(projRes.data) ? projRes.data : []);
        setDatabases(Array.isArray(dbRes.data) ? dbRes.data : []);
        if (settingsRes.data) setPlatformSettings(prev => ({ ...prev, ...settingsRes.data }));
      } else if (activeTab === 'deployments') {
        const res = await axios.get(`${API_BASE}/projects/deployments`).catch(() => ({ data: [] }));
        setDeployments(Array.isArray(res.data) ? res.data : []);
      } else if (activeTab === 'settings') {
        const res = await axios.get(`${API_BASE}/platform`).catch(() => ({ data: platformSettings }));
        if (res.data) setPlatformSettings(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlatformSettings = async () => {
    setIsSaving(true);
    try {
      await axios.put(`${API_BASE}/platform`, platformSettings);
      alert('Settings updated!');
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0a0a0a] border-r border-white/5 flex flex-col">
        <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
            {platformSettings.platformName ? platformSettings.platformName.charAt(0) : 'P'}
          </div>
          <span className="font-bold text-2xl tracking-tighter truncate">{platformSettings.platformName}</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarItem icon={<Box size={18}/>} label="Projects" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
          <SidebarItem icon={<Activity size={18}/>} label="Deployments" active={activeTab === 'deployments'} onClick={() => setActiveTab('deployments')} />
          <SidebarItem icon={<Settings size={18}/>} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
          {activeTab === 'projects' && (
            <>
              <div>
                <h1 className="text-4xl font-bold">Infrastructure Control</h1>
                <p className="text-gray-500 mt-2">Manage your high-performance deployments</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionButton icon={<Box className="text-blue-500"/>} label="Frontend" description="React / Next.js" onClick={() => openModal('frontend')} />
                <ActionButton icon={<Terminal className="text-green-500"/>} label="Backend" description="Node.js / Go" onClick={() => openModal('backend')} />
                <ActionButton icon={<Database className="text-orange-500"/>} label="Database" description="MongoDB Instance" onClick={() => openModal('mongodb')} />
                <ActionButton icon={<Plus className="text-purple-500"/>} label="Full Stack" description="Complete MERN" onClick={() => openModal('mern')} primary />
              </div>

              <div className="pt-10 border-t border-white/5">
                <h2 className="text-2xl font-bold mb-6">Active Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((p) => (
                    <ProjectCard key={p._id} project={p} rootDomain={platformSettings.rootDomain} onPreview={setShowPreview} />
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <h1 className="text-4xl font-bold">Settings</h1>
              <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3rem] space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-400">Platform Name</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 focus:border-purple-500 outline-none"
                    value={platformSettings.platformName}
                    onChange={e => setPlatformSettings({...platformSettings, platformName: e.target.value})}
                  />
                </div>
                <button onClick={handleSavePlatformSettings} className="bg-blue-600 px-6 py-3 rounded-xl font-bold">
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Wrapper (No Animations) */}
      {modalType && (
        <CreationModal type={modalType} onClose={closeModal} onSuccess={fetchData} project={selectedProject} />
      )}

      {/* Preview Wrapper */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
          <div className="w-full max-w-4xl bg-[#0d0d0d] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
              <span className="text-xs font-mono text-gray-400">Preview: {showPreview.subdomain}.{platformSettings.rootDomain}</span>
              <button onClick={() => setShowPreview(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-20 text-center bg-white text-black">
              <h2 className="text-4xl font-black mb-4">Welcome to {showPreview.name}</h2>
              <p className="text-gray-500 mb-8">This app is running live on your PaaS.</p>
              <button className="px-8 py-3 bg-black text-white rounded-xl font-bold">Get Started</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 w-full p-4 rounded-2xl transition ${active ? 'bg-white/5 text-blue-500' : 'text-gray-500 hover:text-white'}`}>
      {icon}
      <span className="font-bold">{label}</span>
    </button>
  );
}

function ActionButton({ icon, label, description, onClick, primary }) {
  return (
    <button onClick={onClick} className={`p-6 rounded-3xl border text-left transition ${primary ? 'bg-blue-600 border-blue-500' : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'}`}>
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">{icon}</div>
      <h3 className="font-bold text-xl">{label}</h3>
      <p className="text-sm text-gray-500 mt-2">{description}</p>
    </button>
  );
}

function ProjectCard({ project, rootDomain, onPreview }) {
  const url = `http://${project.subdomain}.${rootDomain}`;
  return (
    <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] hover:border-blue-500/30 transition">
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-500"><Box size={24}/></div>
        <button onClick={() => onPreview(project)} className="p-2 bg-blue-500/10 rounded-xl text-blue-400 hover:bg-blue-500/20 transition"><Eye size={18}/></button>
      </div>
      <h3 className="text-2xl font-bold mb-2">{project.name}</h3>
      <p className="text-xs text-gray-500 font-mono truncate mb-6">{project.gitUrl}</p>
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-500 font-bold hover:underline">
        <ExternalLink size={16}/> Visit Live Site
      </a>
    </div>
  );
}
