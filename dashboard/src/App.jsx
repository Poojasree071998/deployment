import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  Plus, 
  ExternalLink, 
  RefreshCw, 
  Terminal, 
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  ChevronRight,
  Database,
  Server,
  HardDrive
} from 'lucide-react';

const GitHubIcon = ({ size = 20, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
const SOCKET_URL = API_BASE.replace('/api', '');

function App() {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', gitUrl: '', subdomain: '', provider: 'local' });
  const [selectedProject, setSelectedProject] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [openLogs, setOpenLogs] = useState({});
  const [activeTab, setActiveTab] = useState('deployments'); // 'deployments' or 'env'
  const [envVars, setEnvVars] = useState([]);
  const [newEnvVar, setNewEnvVar] = useState({ key: '', value: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);
  const [repoDetails, setRepoDetails] = useState(null);
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token'));
  const [userRepos, setUserRepos] = useState([]);
  const [publicUrl, setPublicUrl] = useState(localStorage.getItem('public_url') || '');
  const [setupStatus, setSetupStatus] = useState(null);
  const [view, setView] = useState('projects'); // 'projects' or 'databases'
  const [databases, setDatabases] = useState([]);
  const [showCreateDB, setShowCreateDB] = useState(false);
  const [newDB, setNewDB] = useState({ name: '', type: 'mongodb' });

  useEffect(() => {
    fetchProjects();
    fetchDatabases();
    
    // Check for github_token in URL (after redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('github_token');
    if (token) {
      localStorage.setItem('github_token', token);
      setGithubToken(token);
      window.history.replaceState({}, document.title, "/"); // Clean URL
    }

    // Connect to Socket.io for real-time logs
    const socket = io(SOCKET_URL);
    
    socket.on('log', ({ deploymentId, log }) => {
      setDeployments(prev => prev.map(dep => 
        dep._id === deploymentId 
          ? { ...dep, logs: [...(dep.logs || []), log] }
          : dep
      ));
    });

    socket.on('deployment-status', ({ deploymentId, status }) => {
      setDeployments(prev => prev.map(dep => 
        dep._id === deploymentId ? { ...dep, status } : dep
      ));
    });

    socket.on('database-status', ({ dbId, status, connectionString }) => {
      setDatabases(prev => prev.map(db => 
        db._id === dbId ? { ...db, status, connectionString } : db
      ));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchDeployments(selectedProject._id);
      fetchEnvVars(selectedProject._id);
    }
  }, [selectedProject]);

  const handleValidate = async (url) => {
    if (!url || !url.includes('github.com')) return;
    setValidating(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/projects/validate`, { url });
      setRepoDetails(res.data);
      // Auto-fill project name if empty
      if (!newProject.name) {
        setNewProject(prev => ({ ...prev, name: res.data.name, subdomain: res.data.name }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Validation failed');
      setRepoDetails(null);
    } finally {
      setValidating(false);
    }
  };

  const fetchUserRepos = async () => {
    if (!githubToken) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/github/repos`, {
        headers: { Authorization: `token ${githubToken}` }
      });
      setUserRepos(res.data);
    } catch (err) {
      setError('Failed to fetch repositories');
      if (err.response?.status === 401) {
        setGithubToken(null);
        localStorage.removeItem('github_token');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvVars = async (projectId) => {
    try {
      const res = await axios.get(`${API_BASE}/env/${projectId}`);
      setEnvVars(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEnvVar = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/env/${selectedProject._id}`, newEnvVar);
      setNewEnvVar({ key: '', value: '' });
      fetchEnvVars(selectedProject._id);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to add variable. Check if your backend is running.');
    }
  };

  const handleDeleteEnvVar = async (key) => {
    try {
      await axios.delete(`${API_BASE}/env/${selectedProject._id}/${key}`);
      fetchEnvVars(selectedProject._id);
    } catch (err) {
      alert('Failed to delete variable');
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`);
      setProjects(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      setError('Connection to API failed. Please ensure the server is running.');
    }
  };

  const fetchDatabases = async () => {
    try {
      const res = await axios.get(`${API_BASE}/databases`);
      setDatabases(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch databases:', err);
    }
  };

  const fetchDeployments = async (projectId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/deployments/${projectId}`);
      setDeployments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/projects`, newProject);
      setShowCreate(false);
      setNewProject({ name: '', gitUrl: '', subdomain: '', provider: 'local', branch: 'main' });
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create project');
    }
  };

  const handleDeploy = async (projectId) => {
    try {
      await axios.post(`${API_BASE}/deployments/${projectId}`);
      fetchDeployments(projectId);
    } catch (err) {
      alert('Deployment failed to trigger');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await axios.delete(`${API_BASE}/projects/${projectId}`);
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const handleCreateDB = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/databases`, newDB);
      setShowCreateDB(false);
      setNewDB({ name: '', type: 'mongodb' });
      fetchDatabases();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create database');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDB = async (dbId) => {
    if (!confirm('Are you sure you want to delete this database? All data will be lost!')) return;
    try {
      await axios.delete(`${API_BASE}/databases/${dbId}`);
      fetchDatabases();
    } catch (err) {
      alert('Failed to delete database');
    }
  };

  const handleSetupWebhook = async () => {
    if (!publicUrl) {
      alert('Please set your Public Tunnel URL first!');
      return;
    }
    setLoading(true);
    setSetupStatus('Setting up...');
    try {
      await axios.post(`${API_BASE}/github/setup-webhook`, {
        gitUrl: selectedProject.gitUrl,
        token: githubToken,
        publicUrl,
        secret: selectedProject.webhookSecret
      });
      setSetupStatus('✅ Webhook Created!');
      setTimeout(() => setSetupStatus(null), 3000);
    } catch (err) {
      setSetupStatus('❌ Setup Failed');
      alert(err.response?.data?.details || 'Failed to setup webhook');
      setTimeout(() => setSetupStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar / Project List */}
      <div className="fixed left-0 top-0 bottom-0 w-80 bg-[#0a0a0a] border-r border-white/5 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-9 h-9 bg-[#5833ff] rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-purple-600/20">
            <span className="text-xl">P</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Mini PaaS</h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8">
          {/* View Switcher */}
          <div className="space-y-1">
            <button 
              onClick={() => { setView('projects'); setSelectedProject(null); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'projects' && !selectedProject ? 'bg-blue-600/10 text-blue-400 border border-blue-500/10' : 'text-gray-400 hover:bg-white/[0.03]'}`}
            >
              <HardDrive size={18} />
              <span className="font-bold text-sm uppercase tracking-wider">Projects</span>
            </button>
            <button 
              onClick={() => { setView('databases'); setSelectedProject(null); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'databases' ? 'bg-purple-600/10 text-purple-400 border border-purple-500/10' : 'text-gray-400 hover:bg-white/[0.03]'}`}
            >
              <Database size={18} />
              <span className="font-bold text-sm uppercase tracking-wider">Databases</span>
            </button>
          </div>

          {/* Project List */}
          <div className="space-y-1">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-80">Your Projects</span>
              <button 
                onClick={() => setShowCreate(true)} 
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <Plus size={16} />
              </button>
            </div>

            {projects.map(project => (
              <button 
                key={project._id}
                onClick={() => { setSelectedProject(project); setView('projects'); }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${selectedProject?._id === project._id ? 'bg-[#1a1c2e] text-blue-400 border border-blue-500/20' : 'hover:bg-white/[0.03] text-gray-400 border border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center rounded bg-white/5 text-gray-500">
                    <Terminal size={12} />
                  </div>
                  <span className="font-medium text-[14px] truncate max-w-[140px]">{project.name}</span>
                </div>
                <ChevronRight size={14} className={`transition-all duration-300 ${selectedProject?._id === project._id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
              </button>
            ))}
            {projects.length === 0 && <div className="px-2 py-4 text-xs text-gray-600 italic">No projects yet.</div>}
          </div>

          {/* Independent Platform Branding */}
          <div className="pt-4 px-2 opacity-30 pointer-events-none">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Independent Infrastructure</span>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="ml-80 p-12 max-w-5xl mx-auto">
        {selectedProject ? (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 text-gray-500 mb-4 group cursor-default">
                  <Terminal size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                  <span className="text-sm font-mono opacity-70 group-hover:opacity-100 transition-opacity">{selectedProject.gitUrl}</span>
                </div>
                <h2 className="text-5xl font-bold text-white tracking-tight">{selectedProject.name}</h2>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleDeleteProject(selectedProject._id)}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  title="Delete Project"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => handleDeploy(selectedProject._id)}
                  className="bg-white text-black px-6 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all shadow-[0_8px_30px_rgb(255,255,255,0.1)] flex items-center gap-2 active:scale-95"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Redeploy
                </button>
              </div>
            </div>

            <div className="flex gap-8 border-b border-white/5 mb-8">
              <button 
                onClick={() => setActiveTab('deployments')}
                className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all ${activeTab === 'deployments' ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                DEPLOYMENTS
              </button>
              <button 
                onClick={() => setActiveTab('env')}
                className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all ${activeTab === 'env' ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                ENVIRONMENT
              </button>
              <button 
                onClick={() => setActiveTab('webhooks')}
                className={`pb-4 px-2 text-sm font-bold tracking-widest transition-all ${activeTab === 'webhooks' ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                WEBHOOKS
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {activeTab === 'deployments' ? (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                  <h3 className="font-bold text-white text-lg">Deployments</h3>
                  <span className="text-xs font-medium text-gray-500 bg-white/5 px-2.5 py-1 rounded-full">{deployments.length} total</span>
                </div>
                <div className="divide-y divide-white/5">
                  {deployments.map(dep => (
                    <div key={dep._id} className="p-8 hover:bg-white/[0.01] transition-colors group">
                      <div className="flex items-center justify-between mb-0">
                        <div className="flex items-center gap-8">
                          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${dep.status === 'deployed' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                            {dep.status === 'deployed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {dep.status.toUpperCase()}
                          </div>
                          <div className="text-sm text-gray-500 font-medium">{new Date(dep.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })}</div>
                        </div>
                        <div className="flex items-center gap-6">
                          {dep.url && (
                            <a href={dep.url} target="_blank" className="text-gray-400 hover:text-white flex items-center gap-1.5 text-sm font-medium transition-colors">
                              Visit <ExternalLink size={14} />
                            </a>
                          )}
                          <button 
                            onClick={() => setOpenLogs(prev => ({...prev, [dep._id]: !prev[dep._id]}))}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${openLogs[dep._id] ? 'bg-white/10 text-white' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}
                          >
                            <Terminal size={18} />
                          </button>
                        </div>
                      </div>

                      {openLogs[dep._id] && (
                        <div className="mt-6 bg-[#050505] rounded-2xl p-6 font-mono text-[12px] leading-relaxed text-gray-400 border border-white/5 max-h-80 overflow-y-auto shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                          {dep.logs?.length > 0 ? (
                            dep.logs.map((l, i) => (
                              <div key={i} className="flex gap-4 mb-1 last:mb-0">
                                <span className="text-gray-600 shrink-0 select-none">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                                <span className="text-gray-300">{l.message}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-600 italic">No logs available for this build.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {deployments.length === 0 && (
                    <div className="p-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-700">
                        <RefreshCw size={24} />
                      </div>
                      <p className="text-gray-500 font-medium">Push code to trigger your first deployment.</p>
                    </div>
                  )}
                </div>
              </div>
              ) : activeTab === 'env' ? (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl p-8 space-y-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-lg">Environment Variables</h3>
                    <p className="text-xs text-gray-500 italic">Changes will take effect on next redeploy.</p>
                  </div>

                  <form onSubmit={handleAddEnvVar} className="grid grid-cols-3 gap-4">
                    <input 
                      required
                      placeholder="KEY (e.g. DATABASE_URL)"
                      className="bg-[#111] border border-white/5 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500/50"
                      value={newEnvVar.key}
                      onChange={e => setNewEnvVar({...newEnvVar, key: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                    />
                    <input 
                      required
                      placeholder="VALUE"
                      className="bg-[#111] border border-white/5 rounded-xl p-4 text-xs font-mono text-white outline-none focus:border-blue-500/50"
                      value={newEnvVar.value}
                      onChange={e => setNewEnvVar({...newEnvVar, value: e.target.value})}
                    />
                    <button type="submit" className="bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all">
                      Add Variable
                    </button>
                  </form>

                  <div className="space-y-2 pt-4">
                    {envVars.map(v => (
                      <div key={v._id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl group">
                        <div className="flex gap-4 items-center">
                          <code className="text-blue-400 font-bold text-xs">{v.key}</code>
                          <span className="text-gray-500 text-xs">=</span>
                          <code className="text-gray-300 text-xs truncate max-w-md">{v.value.replace(/./g, '*')}</code>
                        </div>
                        <button onClick={() => handleDeleteEnvVar(v.key)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {envVars.length === 0 && <div className="text-center py-10 text-gray-600 italic">No environment variables configured.</div>}
                  </div>
                </div>
              ) : (
                <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl p-8 space-y-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white text-lg">GitHub Webhooks</h3>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black tracking-widest">
                      <CheckCircle size={12} /> ACTIVE
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Payload URL</label>
                      <div className="flex gap-4">
                        <code className="flex-1 bg-[#111] border border-white/5 rounded-xl p-4 text-xs text-blue-400 truncate">
                          {publicUrl ? `${publicUrl.replace(/\/$/, '')}/api/webhooks/github` : `${window.location.protocol}//${window.location.hostname}:5000/api/webhooks/github`}
                        </code>
                        <button 
                          onClick={() => navigator.clipboard.writeText(publicUrl ? `${publicUrl.replace(/\/$/, '')}/api/webhooks/github` : `${window.location.protocol}//${window.location.hostname}:5000/api/webhooks/github`)}
                          className="px-4 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Public Tunnel URL (ngrok)</label>
                      <div className="flex gap-4">
                        <input 
                          placeholder="https://a1b2-c3d4.ngrok-free.app"
                          className="flex-1 bg-[#111] border border-white/5 rounded-xl p-4 text-xs text-white outline-none focus:border-blue-500/50"
                          value={publicUrl}
                          onChange={e => {
                            setPublicUrl(e.target.value);
                            localStorage.setItem('public_url', e.target.value);
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-600 ml-1 italic">GitHub needs this to send push notifications to your local machine.</p>
                    </div>

                    {githubToken && (
                      <div className="pt-2">
                        <button 
                          onClick={handleSetupWebhook}
                          disabled={loading || !publicUrl}
                          className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 ${setupStatus?.includes('✅') ? 'bg-green-600/20 text-green-400 border border-green-500/20' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <GitHubIcon size={18} />
                          {setupStatus || 'Setup Webhook Automatically'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Webhook Secret</label>
                      <div className="flex gap-4">
                        <code className="flex-1 bg-[#111] border border-white/5 rounded-xl p-4 text-xs text-purple-400">
                          {selectedProject.webhookSecret || '••••••••••••••••'}
                        </code>
                        {selectedProject.webhookSecret && (
                          <button 
                            onClick={() => navigator.clipboard.writeText(selectedProject.webhookSecret)}
                            className="px-4 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                          >
                            Copy
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-6 space-y-4">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <GitHubIcon size={16} /> Setup Instructions
                      </h4>
                      <ol className="text-xs text-gray-400 space-y-3 list-decimal ml-4 leading-relaxed">
                        <li>Go to your repository on GitHub.</li>
                        <li>Navigate to <b>Settings</b> &gt; <b>Webhooks</b> &gt; <b>Add webhook</b>.</li>
                        <li>Paste the <b>Payload URL</b> above.</li>
                        <li>Set Content type to <b>application/json</b>.</li>
                        <li>Paste the <b>Secret</b> if provided (recommended).</li>
                        <li>Click <b>Add webhook</b> and you're done!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : view === 'databases' ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-5xl font-bold text-white tracking-tight mb-4">Databases</h2>
                <p className="text-gray-500 max-w-xl leading-relaxed">Provision managed MongoDB instances directly on your VPS with full persistence and isolation.</p>
              </div>
              <button 
                onClick={() => setShowCreateDB(true)}
                className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2 active:scale-95"
              >
                <Plus size={20} /> Create MongoDB
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {databases.map(db => (
                <div key={db._id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.01] transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDeleteDB(db._id)} className="text-gray-600 hover:text-red-400 p-2">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div className="flex items-start gap-8">
                    <div className="w-16 h-16 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-400 shadow-inner">
                      <Database size={32} />
                    </div>
                    <div className="space-y-6 flex-1">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">{db.name}</h3>
                        <div className="flex items-center gap-4">
                          <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            db.status === 'running' ? 'bg-green-500/10 text-green-500' : 
                            db.status === 'creating' ? 'bg-blue-500/10 text-blue-400 animate-pulse' : 
                            'bg-red-500/10 text-red-500'
                          }`}>
                            {db.status === 'running' ? <CheckCircle size={10} /> : 
                             db.status === 'creating' ? <RefreshCw size={10} className="animate-spin" /> : 
                             <AlertCircle size={10} />} 
                            {db.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-600 font-mono">PORT: {db.port}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Connection String</label>
                        <div className="flex gap-4">
                          <code className="flex-1 bg-[#050505] border border-white/5 rounded-xl p-4 text-xs text-purple-300 font-mono truncate">
                            {db.status === 'creating' ? 'Provisioning connection string...' : (db.connectionString || `mongodb://localhost:${db.port}/${db.name}`)}
                          </code>
                          <button 
                            disabled={db.status === 'creating'}
                            onClick={(e) => {
                              navigator.clipboard.writeText(db.connectionString || `mongodb://localhost:${db.port}/${db.name}`);
                              const btn = e.currentTarget;
                              const originalText = btn.innerText;
                              btn.innerText = 'Copied!';
                              btn.classList.add('text-green-400');
                              setTimeout(() => {
                                btn.innerText = originalText;
                                btn.classList.remove('text-green-400');
                              }, 2000);
                            }}
                            className="px-6 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/5 disabled:opacity-50"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {databases.length === 0 && (
                <div className="bg-[#0a0a0a] border border-dashed border-white/10 rounded-[3rem] p-24 text-center space-y-6">
                  <div className="w-20 h-20 bg-purple-600/5 rounded-full flex items-center justify-center mx-auto text-purple-900">
                    <Database size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">No databases yet</h3>
                    <p className="text-gray-500 max-w-xs mx-auto">Create your first isolated MongoDB instance to start storing data.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[70vh] flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-700">
              <Terminal size={40} />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Select a Project</h3>
              <p className="text-gray-500">Choose a project from the sidebar to manage deployments.</p>
            </div>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <form onSubmit={handleCreate} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[3rem] w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl animate-in zoom-in-95 duration-300 scrollbar-hide">
            <div>
              <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">New Project</h2>
              <p className="text-gray-500 text-sm">Connect your repository and deploy in seconds.</p>
            </div>

            {githubToken && userRepos.length === 0 && (
              <button 
                type="button" 
                onClick={fetchUserRepos}
                className="w-full flex items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
              >
                <GitHubIcon size={18} className="mr-3" />
                Load GitHub Repositories
              </button>
            )}

            {githubToken && userRepos.length > 0 && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Import from GitHub</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                  {userRepos.map(repo => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => {
                        setNewProject({
                          ...newProject,
                          name: repo.name,
                          gitUrl: repo.clone_url,
                          subdomain: repo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
                        });
                        handleValidate(repo.clone_url);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-blue-500/50 hover:bg-blue-600/5 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <GitHubIcon size={14} className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-300">{repo.name}</span>
                      </div>
                      <span className="text-[9px] text-gray-600 uppercase font-bold">{repo.language || 'Code'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Project Name</label>
                <input 
                  required
                  placeholder="my-awesome-app"
                  className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 text-white placeholder:text-gray-700 focus:border-blue-500/50 focus:bg-[#151515] outline-none transition-all duration-300 shadow-inner"
                  value={newProject.name}
                  onChange={e => setNewProject({...newProject, name: e.target.value})}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Git Repository URL</label>
                <div className="relative">
                  <input 
                    required
                    placeholder="https://github.com/username/repo"
                    className={`w-full bg-[#111] border rounded-2xl p-5 text-white placeholder:text-gray-700 focus:bg-[#151515] outline-none transition-all duration-300 shadow-inner ${error ? 'border-red-500/50' : repoDetails ? 'border-green-500/50' : 'border-white/5 focus:border-blue-500/50'}`}
                    value={newProject.gitUrl}
                    onChange={e => {
                      setNewProject({...newProject, gitUrl: e.target.value});
                      if (e.target.value.length > 15) handleValidate(e.target.value);
                    }}
                  />
                  {validating && <RefreshCw size={18} className="absolute right-5 top-5 text-blue-500 animate-spin" />}
                  {repoDetails && !validating && <CheckCircle size={18} className="absolute right-5 top-5 text-green-500" />}
                </div>
                {repoDetails && (
                  <div className="flex items-center gap-2 mt-2 ml-1">
                    <span className="text-[9px] font-bold bg-blue-600/20 text-blue-400 px-2 py-1 rounded uppercase tracking-wider">
                      Detected: {repoDetails.framework}
                    </span>
                    <span className="text-[9px] font-bold bg-gray-800 text-gray-400 px-2 py-1 rounded uppercase tracking-wider">
                      {repoDetails.visibility}
                    </span>
                  </div>
                )}
                {error && <p className="text-red-400 text-[10px] mt-2 ml-1 font-medium">{error}</p>}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Subdomain</label>
                <div className="flex items-center gap-4">
                  <input 
                    required
                    placeholder="my-app"
                    className="flex-1 bg-[#111] border border-white/5 rounded-xl p-5 text-white placeholder:text-gray-700 focus:border-blue-500/50 focus:bg-[#151515] outline-none transition-all duration-300 shadow-inner"
                    value={newProject.subdomain}
                    onChange={e => setNewProject({...newProject, subdomain: e.target.value})}
                  />
                  <span className="text-gray-600 font-mono text-xl select-none">.localhost</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Branch</label>
                <input 
                  required
                  placeholder="main"
                  className="w-full bg-[#111] border border-white/5 rounded-xl p-5 text-white placeholder:text-gray-700 focus:border-blue-500/50 focus:bg-[#151515] outline-none transition-all duration-300 shadow-inner"
                  value={newProject.branch || 'main'}
                  onChange={e => setNewProject({...newProject, branch: e.target.value})}
                />
              </div>
              
              <div className="space-y-3 pt-4">
                <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Independent VPS Deployer</h4>
                    <p className="text-[10px] text-gray-500">Deploying via Local Docker & Nginx Proxy</p>
                  </div>
                </div>
              </div>
            </div>
 
            <div className="flex items-center gap-8 pt-4">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
              <button type="submit" className="flex-[2] bg-[#1d4ed8] py-5 rounded-[1.5rem] text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/20 active:scale-95">Create Project</button>
            </div>
          </form>
        </div>
      )}
      {/* Create Database Modal */}
      {showCreateDB && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <form onSubmit={handleCreateDB} className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[3.5rem] w-full max-w-md space-y-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-purple-600/20 rounded-3xl flex items-center justify-center text-purple-400 mx-auto shadow-xl shadow-purple-600/10">
                <Database size={40} />
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight">New Database</h2>
              <p className="text-gray-500 text-sm">Deploy an isolated MongoDB instance.</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Database Name</label>
                <input 
                  required
                  placeholder="production-db"
                  className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 text-white placeholder:text-gray-700 focus:border-purple-500/50 focus:bg-[#151515] outline-none transition-all duration-300 shadow-inner"
                  value={newDB.name}
                  onChange={e => setNewDB({...newDB, name: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-')})}
                />
              </div>
              
              <div className="p-4 bg-purple-600/5 border border-purple-500/10 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400">
                  <Server size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Managed MongoDB</h4>
                  <p className="text-[10px] text-gray-500">v7.0 • Isolated Container • SSD Storage</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <button type="button" onClick={() => setShowCreateDB(false)} className="flex-1 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-[2] bg-purple-600 py-5 rounded-[1.5rem] text-white font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/20 active:scale-95 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Instance'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
