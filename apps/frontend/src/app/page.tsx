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
  Github
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:5000/api';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`);
      setProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">P</div>
          <span className="font-bold text-xl tracking-tight">PaaS</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          <SidebarItem icon={<Box size={18}/>} label="Projects" active />
          <SidebarItem icon={<Activity size={18}/>} label="Deployments" />
          <SidebarItem icon={<Terminal size={18}/>} label="Logs" />
          <SidebarItem icon={<Settings size={18}/>} label="Settings" />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button className="flex items-center gap-3 text-gray-500 hover:text-white transition w-full p-2 rounded-lg">
            <LogOut size={18}/>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold">Overview</h1>
              <p className="text-gray-500 mt-2">Manage your applications and deployments.</p>
            </div>
            <button className="bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-gray-200 transition flex items-center gap-2">
              <Plus size={20}/> New Project
            </button>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {projects.map((project: any) => (
                <ProjectCard key={project._id} project={project} />
              ))}
            </AnimatePresence>
            
            {projects.length === 0 && !loading && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                  <Github size={32}/>
                </div>
                <h3 className="text-xl font-medium">No projects found</h3>
                <p className="text-gray-500 mt-2">Connect a GitHub repository to get started.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={`flex items-center gap-3 w-full p-3 rounded-xl transition ${active ? 'bg-white/5 text-white' : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ProjectCard({ project }: { project: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] hover:border-blue-500/30 transition group cursor-pointer"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-600/10 transition">
          <Github size={24} className="text-gray-400 group-hover:text-blue-500 transition" />
        </div>
        <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold tracking-wider uppercase">
          Active
        </div>
      </div>
      
      <h3 className="text-xl font-bold mb-1 truncate">{project.name}</h3>
      <p className="text-sm text-gray-500 font-mono mb-6 truncate">{project.gitUrl}</p>
      
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <span className="text-xs text-gray-600">Updated 2m ago</span>
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full border-2 border-[#0a0a0a] bg-blue-600 flex items-center justify-center text-[8px] font-bold">JD</div>
        </div>
      </div>
    </motion.div>
  );
}
