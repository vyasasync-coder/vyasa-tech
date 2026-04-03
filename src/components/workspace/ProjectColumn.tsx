import React, { useState } from 'react';
import type { Project } from '../../store/workspaceStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { MarkdownViewer } from '../markdown/MarkdownViewer';
import { KnowledgeBase } from './KnowledgeBase';
import { InceptionChat } from '../inception/InceptionChat';

interface ProjectColumnProps {
  project: Project;
}

type Tab = 'tasks' | 'knowledge' | 'inception';

export const ProjectColumn: React.FC<ProjectColumnProps> = ({ project }) => {
  const { removeProject } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  const TABS: { id: Tab; label: string; icon?: string; color: string; activeColor: string }[] = [
    {
      id: 'tasks',
      label: 'Checklist',
      color: 'text-vyasa-100/50 hover:text-vyasa-100',
      activeColor: 'border-saffron-500 text-saffron-500',
    },
    {
      id: 'knowledge',
      label: '✧ Knowledge',
      color: 'text-vyasa-100/50 hover:text-vyasa-100',
      activeColor: 'border-sky-400 text-sky-400',
    },
    {
      id: 'inception',
      label: '⚡ Inception',
      color: 'text-vyasa-100/50 hover:text-saffron-300',
      activeColor: 'border-saffron-400 text-saffron-400',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-vyasa-900/60 border border-saffron-500/30 rounded-lg overflow-hidden glass-panel-vedic hover:shadow-[0_0_20px_rgba(244,180,26,0.1)] transition-shadow">

      {/* Column Header */}
      <div className="flex flex-col bg-gradient-to-r from-vyasa-800 to-vyasa-900 border-b border-saffron-500/20 shadow-sm shrink-0">

        {/* Top Row: Title & Close */}
        <div className="flex justify-between items-center px-5 py-3">
          <h3 className="text-saffron-400 font-sans font-bold tracking-wider truncate flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-saffron-500 shadow-[0_0_5px_#f4b41a]" />
            {project.name.toUpperCase()}
          </h3>
          <button
            onClick={() => removeProject(project.id)}
            className="text-vyasa-100/40 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-colors"
            title="Fechar Projeto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-5 gap-5 text-xs uppercase tracking-widest font-bold">
          {TABS.map(tab => (
            (!project.handle && tab.id === 'inception') ? null : (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? tab.activeColor + ' border-current'
                    : 'border-transparent ' + tab.color
                }`}
              >
                {tab.label}
              </button>
            )
          ))}
        </div>
      </div>

      {/* Column Content */}
      <div className={`flex-grow overflow-hidden ${activeTab === 'inception' ? '' : 'p-5 overflow-y-auto'}`}>
        {!project.handle ? (
          <div className="p-5 border border-saffron-500/10 rounded bg-vyasa-800/40 m-5">
            <p className="text-sm text-vyasa-100/50 italic">Sem referência local de arquivo.</p>
          </div>
        ) : activeTab === 'tasks' ? (
          <MarkdownViewer projectHandle={project.handle} />
        ) : activeTab === 'knowledge' ? (
          <KnowledgeBase projectHandle={project.handle} />
        ) : (
          /* Aba Inception — inline, sem fullscreen */
          <InceptionChat
            projectHandle={project.handle}
            projectName={project.name}
            onFinish={() => setActiveTab('tasks')}
            inline
          />
        )}
      </div>
    </div>
  );
};
