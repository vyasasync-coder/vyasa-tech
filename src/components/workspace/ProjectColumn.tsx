import React, { useState } from 'react';
import type { Project } from '../../store/workspaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { MarkdownViewer } from '../markdown/MarkdownViewer';
import { KnowledgeBase } from './KnowledgeBase';

interface ProjectColumnProps {
  project: Project;
}

export const ProjectColumn: React.FC<ProjectColumnProps> = ({ project }) => {
  const { removeProject } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<'tasks' | 'knowledge'>('tasks');

  return (
    <div className="h-full flex flex-col bg-vyasa-900/60 border border-saffron-500/30 rounded-lg overflow-hidden glass-panel-vedic hover:shadow-[0_0_20px_rgba(244,180,26,0.1)] transition-shadow">
      {/* Column Header */}
      <div className="flex flex-col bg-gradient-to-r from-vyasa-800 to-vyasa-900 border-b border-saffron-500/20 shadow-sm shrink-0">
        
        {/* Top Row: Title & Close */}
        <div className="flex justify-between items-center px-5 py-3">
          <h3 className="text-saffron-400 font-sans font-bold tracking-wider truncate flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 shadow-[0_0_5px_#f4b41a]"></span>
            {project.name.toUpperCase()}
          </h3>
          <button 
            onClick={() => removeProject(project.id)}
            className="text-vyasa-100/60 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-colors"
            title="Fechar Projeto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Bottom Row: Tabs */}
        <div className="flex px-5 gap-6 text-xs uppercase tracking-widest font-bold">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`pb-2 border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-saffron-500 text-saffron-500' : 'border-transparent text-vyasa-100/50 hover:text-vyasa-100'}`}
          >
            Checklist (task)
          </button>
          <button 
            onClick={() => setActiveTab('knowledge')}
            className={`pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'knowledge' ? 'border-sky-400 text-sky-400' : 'border-transparent text-vyasa-100/50 hover:text-vyasa-100'}`}
          >
            <span className="text-[10px] opacity-70">✧</span> Knowledge Base
          </button>
        </div>
      </div>
      
      {/* Column Content */}
      <div className="flex-grow p-5 overflow-y-auto">
        {project.handle ? (
          activeTab === 'tasks' 
            ? <MarkdownViewer projectHandle={project.handle} />
            : <KnowledgeBase projectHandle={project.handle} />
        ) : (
          <div className="border border-saffron-500/10 rounded bg-vyasa-800/40 p-4">
            <p className="text-sm text-vyasa-100/50 mb-2 italic">Carregado via dev data (Sem referência local de arquivo para leitura Markdown)</p>
          </div>
        )}
      </div>
    </div>
  );
};
