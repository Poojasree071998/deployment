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
  History,
  ShieldCheck,
  Server,
  Cloud,
  Eye,
  X,
  RefreshCw,
  Monitor,
  Globe,
  Save,
  Layout,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('projects');
  const [showPreview, setShowPreview] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => {
    setModalType(null);
    setSelectedProject(null);
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh data every 5 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      if (activeTab === 'projects') {
        const [projRes, dbRes, settingsRes] = await Promise.all([
          axios.get(`${API_BASE}/projects`),
          axios.get(`${API_BASE}/databases`),
          axios.get(`${API_BASE}/platform`)
        ]);
        setProjects(projRes.data);
        setDatabases(dbRes.data);
        setPlatformSettings(settingsRes.data);
      } else if (activeTab === 'deployments') {
        const res = await axios.get(`${API_BASE}/projects/deployments`);
        setDeployments(res.data);
      } else if (activeTab === 'settings') {
        const res = await axios.get(`${API_BASE}/platform`);
        setPlatformSettings(res.data);
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
      alert('Branding and platform settings updated!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0a0a0a] border-r border-white/5 flex flex-col">
        <div className="p-8 flex items-center gap-4">
          {platformSettings.logoUrl ? (
            <img src={platformSettings.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/20">
              {platformSettings.platformName.charAt(0)}
            </div>
          )}
          <span className="font-bold text-2xl tracking-tighter truncate">{platformSettings.platformName}</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarItem 
            icon={<Box size={18}/>} 
            label="Projects" 
            active={activeTab === 'projects'} 
            onClick={() => setActiveTab('projects')}
          />
          <SidebarItem 
            icon={<Activity size={18}/>} 
            label="Deployments" 
            active={activeTab === 'deployments'} 
            onClick={() => setActiveTab('deployments')}
          />
          <SidebarItem 
            icon={<Terminal size={18}/>} 
            label="Logs" 
            active={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')}
          />
          <SidebarItem 
            icon={<Settings size={18}/>} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
          />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="flex items-center gap-3 text-gray-500 hover:text-white transition w-full p-2 rounded-lg">
            <LogOut size={18}/>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 relative">
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
          {activeTab === 'projects' && (
            <>
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-bold">{platformSettings.platformName} Engine</h1>
                  <p className="text-gray-500 mt-2">Private Infrastructure Control Plane</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionButton 
                  icon={<Box className="text-blue-500"/>} 
                  label="Deploy Frontend" 
                  description="React, Next.js, or Static"
                  onClick={() => openModal('frontend')}
                />
                <ActionButton 
                  icon={<Terminal className="text-green-500"/>} 
                  label="Deploy Backend" 
                  description="Node.js, Python, or Go"
                  onClick={() => openModal('backend')}
                />
                <ActionButton 
                  icon={<Activity className="text-orange-500"/>} 
                  label="Create MongoDB" 
                  description="Dedicated Docker Container"
                  onClick={() => openModal('mongodb')}
                />
                <ActionButton 
                  icon={<Plus className="text-purple-500"/>} 
                  label="Full MERN App" 
                  description="One-click full stack"
                  onClick={() => openModal('mern')}
                  primary
                />
              </div>

              <div className="pt-10 border-t border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Your Projects</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-full">
                    <Globe size={12} />
                    <span>Domain: <b>*.{platformSettings.rootDomain}</b></span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {projects.map((project: any) => (
                      <ProjectCard 
                        key={project._id} 
                        project={project} 
                        rootDomain={platformSettings.rootDomain}
                        onSettings={(p) => {
                          setSelectedProject(p);
                          openModal('settings');
                        }}
                        onPreview={(p) => setShowPreview(p)}
                      />
                    ))}
                  </AnimatePresence>
                  
                  {projects.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                        <Box size={32} />
                      </div>
                      <h3 className="text-xl font-bold">No projects yet</h3>
                      <p className="text-gray-500 mt-2">Get started by deploying your first app above.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-10 border-t border-white/5">
                <h2 className="text-2xl font-bold mb-6">Databases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {databases.map((db: any) => (
                    <DatabaseCard key={db._id} db={db} />
                  ))}
                  {databases.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/5 rounded-3xl">
                      <p className="text-gray-500">No databases created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'deployments' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold">Deployments</h1>
                <p className="text-gray-500 mt-2">Global history of all provisioning tasks</p>
              </div>

              <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/5">
                    <tr>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Project</th>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
                      <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-gray-400">Deployment ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {deployments.map((d: any) => (
                      <tr key={d._id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${d.status === 'success' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                            <span className="font-bold uppercase text-[10px] tracking-widest">{d.status}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-medium">{projects.find((p:any) => p._id === d.projectId)?.name || 'Unknown Project'}</td>
                        <td className="px-8 py-5 text-sm text-gray-500">{new Date(d.createdAt).toLocaleString()}</td>
                        <td className="px-8 py-5 font-mono text-xs text-gray-600">{d._id}</td>
                      </tr>
                    ))}
                    {deployments.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center text-gray-500">No deployment history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-8 h-full flex flex-col">
              <div>
                <h1 className="text-4xl font-bold">System Logs</h1>
                <p className="text-gray-500 mt-2">Real-time infrastructure activity feed</p>
              </div>

              <div className="flex-1 bg-[#0d0d0d] rounded-[2.5rem] p-8 border border-white/5 font-mono text-sm overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div className="space-y-2">
                  <div className="text-green-500">[INFO] Infrastructure plane ready.</div>
                  <div className="text-blue-500">[SYSTEM] Listening for deployment triggers...</div>
                  <div className="text-gray-600">[DEBUG] Mock Mode enabled: Node processes virtualized.</div>
                  <div className="text-gray-500">[{new Date().toLocaleTimeString()}] - Branding set to: {platformSettings.platformName}</div>
                  <div className="text-gray-500">[10:45:22] - Initializing Nginx reverse proxy containers...</div>
                  {deployments.slice(0, 5).map((d: any, i) => (
                    <div key={i} className="text-gray-400">
                      [{new Date(d.createdAt).toLocaleTimeString()}] - Starting deployment for {d._id}...
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-4xl font-bold">Platform Settings</h1>
                  <p className="text-gray-500 mt-2">Manage your private PaaS branding & configuration</p>
                </div>
                <button 
                  onClick={handleSavePlatformSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-bold transition disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Domain & Branding */}
                <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3rem] space-y-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-500">
                        <Layout size={24} />
                      </div>
                      <h3 className="text-2xl font-bold">Custom Branding</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400">Platform Name</label>
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 focus:outline-none focus:border-purple-500 transition"
                          placeholder="e.g., MyCloud"
                          value={platformSettings.platformName}
                          onChange={e => setPlatformSettings({...platformSettings, platformName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-400">Logo URL</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                          <input 
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-purple-500 transition font-mono text-sm"
                            placeholder="https://example.com/logo.png"
                            value={platformSettings.logoUrl}
                            onChange={e => setPlatformSettings({...platformSettings, logoUrl: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-10 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                        <Globe size={24} />
                      </div>
                      <h3 className="text-2xl font-bold">Domain Configuration</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-400">Root Domain</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 transition font-mono"
                          placeholder="yourdomain.com"
                          value={platformSettings.rootDomain}
                          onChange={e => setPlatformSettings({...platformSettings, rootDomain: e.target.value})}
                        />
                      </div>
                      <p className="text-xs text-gray-600 italic">
                        All project URLs will follow the pattern: <b>subdomain.{platformSettings.rootDomain}</b>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <SettingsCard 
                    icon={<ShieldCheck className="text-green-500" />} 
                    title="Infrastructure Status" 
                    description="Orchestration layer is healthy and listening for job events."
                    status={platformSettings.mockMode ? 'Virtual Cluster (Mock)' : 'Production VPS'}
                  />
                  <SettingsCard 
                    icon={<Server className="text-blue-500" />} 
                    title="API Backend" 
                    description="The core engine managing your containers and databases."
                    status={API_BASE}
                  />
                  <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-10 rounded-[3rem]">
                    <h3 className="text-xl font-bold mb-4">Pro Tip</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      To make your platform fully public, ensure your VPS firewall allows traffic on port 80 and 443. We recommend using Cloudflare for easy SSL management.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {modalType && (
          <CreationModal 
            type={modalType} 
            onClose={closeModal} 
            onSuccess={fetchData} 
            project={selectedProject}
          />
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 40 }}
              className="w-full max-w-5xl h-fit max-h-[90vh] bg-[#0d0d0d] rounded-[2rem] md:rounded-[3rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="bg-white/5 border-b border-white/5 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                  <div className="bg-black/50 border border-white/5 px-4 py-1 rounded-full flex items-center gap-2 text-[10px] font-mono text-gray-500 min-w-[200px] md:min-w-[300px]">
                    <ShieldCheck size={12} className="text-green-500" />
                    <span>http://{showPreview.subdomain}.{platformSettings.rootDomain}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Monitor size={18} className="text-blue-500" />
                  <button 
                    onClick={() => setShowPreview(null)}
                    className="p-1.5 hover:bg-white/5 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 bg-white flex flex-col items-center justify-center text-black p-8 md:p-16 text-center overflow-y-auto">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl">
                  <Box size={40} />
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">Welcome to {showPreview.name}</h1>
                <p className="text-sm md:text-base text-gray-500 max-w-lg leading-relaxed mb-8">
                  This is a **live preview** of your application running on <b>{showPreview.subdomain}.{platformSettings.rootDomain}</b>.
                </p>
                
                <div className="flex gap-3 mb-12">
                  <div className="px-6 py-3 bg-black text-white rounded-xl text-sm font-bold shadow-lg">Documentation</div>
                  <div className="px-6 py-3 border-2 border-black rounded-xl text-sm font-bold">GitHub Repo</div>
                </div>

                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 w-full max-w-2xl text-left">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-[8px] uppercase font-black text-gray-400 block mb-1">Status</span>
                      <p className="font-bold text-sm text-green-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Healthy
                      </p>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-gray-400 block mb-1">Region</span>
                      <p className="font-bold text-sm">VPS (Global)</p>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-gray-400 block mb-1">Subdomain</span>
                      <p className="font-bold text-sm truncate">{showPreview.subdomain}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsCard({ icon, title, description, status }: any) {
  return (
    <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] hover:border-white/10 transition group">
      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</p>
      <div className="px-4 py-2 bg-white/5 rounded-xl text-xs font-mono text-gray-300 w-fit">
        {status}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, description, onClick, primary = false }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-3xl border text-left transition-all duration-300 group ${
        primary 
          ? 'bg-blue-600 border-blue-500 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/20 hover:-translate-y-1' 
          : 'bg-[#0a0a0a] border-white/5 hover:border-white/20 hover:bg-white/[0.02] hover:-translate-y-1'
      }`}
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${primary ? 'bg-white/10' : 'bg-white/5 group-hover:bg-white/10'}`}>
        {React.cloneElement(icon as React.ReactElement, { size: 24 })}
      </div>
      <h3 className="font-bold text-xl">{label}</h3>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{description}</p>
    </button>
  );
}

function DatabaseCard({ db }: { db: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] hover:border-orange-500/30 transition group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-[50px] -mr-16 -mt-16 rounded-full" />
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-orange-600/10 transition shadow-inner">
          <Database size={28} className="text-gray-400 group-hover:text-orange-500 transition" />
        </div>
        <div className={`px-4 py-1.5 ${db.status === 'running' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'} border rounded-full text-[10px] font-black tracking-widest uppercase`}>
          {db.status}
        </div>
      </div>
      
      <h3 className="text-2xl font-bold mb-2 truncate relative z-10">{db.name}</h3>
      <p className={`text-sm font-mono mb-8 truncate relative z-10 ${db.status === 'running' ? 'text-gray-500 opacity-60' : 'text-blue-500 animate-pulse'}`}>
        {db.connectionString || '🚀 Setting up your private instance...'}
      </p>
      
      <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-600 uppercase font-bold tracking-tighter">Port</span>
          <span className="text-lg font-mono text-white/80">{db.port}</span>
        </div>
        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-600 italic text-[10px]">DB</div>
      </div>
    </motion.div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-200 group ${
        active 
          ? 'bg-white/5 text-white shadow-inner' 
          : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
      }`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110 text-blue-500' : 'group-hover:scale-110 group-hover:text-gray-300'}`}>
        {icon}
      </div>
      <span className={`font-bold tracking-tight ${active ? 'text-white' : 'text-gray-500'}`}>{label}</span>
      {active && <motion.div layoutId="activeDot" className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50" />}
    </button>
  );
}

function ProjectCard({ project, rootDomain, onSettings, onPreview }: { project: any, rootDomain: string, onSettings: (p: any) => void, onPreview: (p: any) => void }) {
  const url = `http://${project.subdomain}.${rootDomain}`;
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[2.5rem] hover:border-blue-500/30 transition-all duration-300 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px] -mr-16 -mt-16 rounded-full" />

      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/10 transition shadow-inner">
          <Github size={28} className="text-gray-400 group-hover:text-blue-500 transition" />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onPreview(project); }}
            title="Quick Preview"
            className="p-2.5 bg-blue-500/10 rounded-xl hover:bg-blue-500/20 transition text-blue-400 border border-blue-500/20"
          >
            <Eye size={18} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSettings(project); }}
            className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition text-gray-500 hover:text-white border border-white/5"
          >
            <Settings size={18} />
          </button>
          <div className="px-4 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse" />
            Active
          </div>
        </div>
      </div>
      
      <h3 className="text-2xl font-bold mb-2 truncate relative z-10">{project.name}</h3>
      <div className="flex items-center gap-2 mb-6 relative z-10">
        <span className="text-[9px] bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-gray-400 uppercase font-black tracking-tighter">
          {project.projectType || 'Static'}
        </span>
        <p className="text-xs text-gray-500 font-mono truncate opacity-60">{project.gitUrl}</p>
      </div>

      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-all font-bold mb-8 group/link w-fit relative z-10 hover:translate-x-1"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={16} />
        <span>Visit Live Site</span>
      </a>
      
      <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">Updated recently</span>
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[10px] font-black shadow-lg">JD</div>
        </div>
      </div>
    </motion.div>
  );
}
