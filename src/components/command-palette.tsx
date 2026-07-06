'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { 
  Search, 
  Clock, 
  Calendar, 
  BarChart3, 
  LayoutTemplate, 
  Settings, 
  Play, 
  Pause, 
  Check, 
  Sun, 
  Moon, 
  Plus, 
  X,
  Keyboard
} from 'lucide-react';

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const tasks = useFlowTimeStore((state) => state.tasks);
  const activeTaskId = useFlowTimeStore((state) => state.activeTaskId);
  const timerStatus = useFlowTimeStore((state) => state.timerStatus);
  const selectedDate = useFlowTimeStore((state) => state.selectedDate);
  const settings = useFlowTimeStore((state) => state.settings);
  const updateSettings = useFlowTimeStore((state) => state.updateSettings);
  const startTask = useFlowTimeStore((state) => state.startTask);
  const pauseTask = useFlowTimeStore((state) => state.pauseTask);
  const finishTask = useFlowTimeStore((state) => state.finishTask);

  // Filter tasks for today's date
  const todaysTasks = tasks.filter(t => t.date === selectedDate);

  // Command items
  const navigationItems = [
    { label: 'Go to Dashboard', icon: Clock, action: () => router.push('/dashboard'), category: 'Navigation' },
    { label: 'Go to Schedule', icon: Calendar, action: () => router.push('/schedule'), category: 'Navigation' },
    { label: 'Go to Analytics', icon: BarChart3, action: () => router.push('/analytics'), category: 'Navigation' },
    { label: 'Go to Templates', icon: LayoutTemplate, action: () => router.push('/templates'), category: 'Navigation' },
    { label: 'Go to Settings', icon: Settings, action: () => router.push('/settings'), category: 'Navigation' },
  ];

  const themeItems = [
    { label: 'Switch to Dark Mode', icon: Moon, action: () => updateSettings({ theme: 'dark' }), category: 'Preferences' },
    { label: 'Switch to Light Mode', icon: Sun, action: () => updateSettings({ theme: 'light' }), category: 'Preferences' },
    { label: 'Switch to System Theme', icon: Keyboard, action: () => updateSettings({ theme: 'system' }), category: 'Preferences' },
  ];

  const runningTask = todaysTasks.find(t => t.id === activeTaskId);

  const timerItems = runningTask 
    ? [
        { label: `Pause: ${runningTask.title}`, icon: Pause, action: () => pauseTask(runningTask.id), category: 'Active Task' },
        { label: `Complete: ${runningTask.title}`, icon: Check, action: () => finishTask(runningTask.id), category: 'Active Task' }
      ]
    : todaysTasks.filter(t => t.status !== 'completed' && t.status !== 'skipped').slice(0, 3).map(t => ({
        label: `Start: ${t.title}`,
        icon: Play,
        action: () => startTask(t.id),
        category: 'Tasks'
      }));

  // Combine items
  const allItems = [
    ...timerItems,
    ...navigationItems,
    ...themeItems
  ];

  // Filter based on query
  const filteredItems = allItems.filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      // Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle arrow key selection and Enter
  useEffect(() => {
    if (!isOpen) return;
    setSelectedIndex(0);
  }, [query, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setIsOpen(false);
        setQuery('');
      }
    }
  };

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4 font-sans">
      <div 
        ref={containerRef}
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-white/5 bg-zinc-950/40">
          <Search className="w-5 h-5 text-zinc-500 mr-3" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search tasks (Ctrl + K to close)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 bg-transparent text-white border-none outline-none text-sm placeholder-zinc-500 focus:ring-0"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md hover:bg-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 text-sm flex flex-col items-center gap-1">
              <Clock className="w-8 h-8 opacity-40 mb-1" />
              No matching commands found.
            </div>
          ) : (
            <div>
              {/* Group items by category */}
              {['Active Task', 'Tasks', 'Navigation', 'Preferences'].map(category => {
                const categoryItems = filteredItems.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category} className="mb-2 last:mb-0">
                    <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {category}
                    </div>
                    {categoryItems.map(item => {
                      // Find overall index
                      const itemIndex = filteredItems.indexOf(item);
                      const isSelected = itemIndex === selectedIndex;
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.label}
                          onClick={() => {
                            item.action();
                            setIsOpen(false);
                            setQuery('');
                          }}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/10' 
                              : 'text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-zinc-500'}`} />
                            <span>{item.label}</span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-medium">
                              Enter
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-zinc-950/20 text-[10px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
          <span className="font-mono">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
