'use client';

import React, { useState, useMemo } from 'react';
import { useFlowTimeStore } from '@/store/use-flowtime-store';
import { format, subDays, parseISO, differenceInMinutes } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import {
  BarChart3, Clock, CheckCircle, TrendingUp, Flame, Target,
  Calendar, Award, Zap
} from 'lucide-react';

const COLORS = ['#7c3aed', '#6366f1', '#10b981', '#f97316', '#ec4899'];

export default function AnalyticsPage() {
  const tasks = useFlowTimeStore(s => s.tasks);
  const sessions = useFlowTimeStore(s => s.sessions);
  const [range, setRange] = useState<'week' | 'month'>('week');

  const days = range === 'week' ? 7 : 30;

  // Build daily data
  const dailyData = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd');
      const dayTasks = tasks.filter(t => t.date === date);
      const completed = dayTasks.filter(t => t.status === 'completed');
      const focusSec = dayTasks.reduce((s, t) => s + t.actualDuration, 0);
      const estimatedMin = dayTasks.reduce((s, t) => s + t.estimatedDuration, 0);
      const actualMin = Math.round(focusSec / 60);

      return {
        date: format(parseISO(`${date}T00:00:00`), days === 7 ? 'EEE' : 'MMM d'),
        focusMin: actualMin,
        estimatedMin,
        completed: completed.length,
        total: dayTasks.length,
        completionRate: dayTasks.length > 0 ? Math.round((completed.length / dayTasks.length) * 100) : 0,
      };
    });
  }, [tasks, days, range]);

  // Summary stats
  const totalFocusMin = dailyData.reduce((s, d) => s + d.focusMin, 0);
  const totalCompleted = dailyData.reduce((s, d) => s + d.completed, 0);
  const avgCompletion = dailyData.length > 0
    ? Math.round(dailyData.reduce((s, d) => s + d.completionRate, 0) / dailyData.length)
    : 0;
  const avgFocusMin = dailyData.length > 0 ? Math.round(totalFocusMin / days) : 0;

  // Priority breakdown pie
  const priorityData = useMemo(() => {
    const all = tasks.filter(t => t.status === 'completed');
    const high = all.filter(t => t.priority === 'high').length;
    const medium = all.filter(t => t.priority === 'medium').length;
    const low = all.filter(t => t.priority === 'low').length;
    return [
      { name: 'High', value: high },
      { name: 'Medium', value: medium },
      { name: 'Low', value: low },
    ].filter(d => d.value > 0);
  }, [tasks]);

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
        <p className="font-bold text-white mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-zinc-400">{p.name}:</span>
            <span className="font-semibold text-white">{p.value}{p.dataKey.includes('Min') ? 'm' : p.dataKey.includes('Rate') ? '%' : ''}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Analytics <BarChart3 className="w-5 h-5 text-violet-400" />
          </h1>
          <p className="text-zinc-400 text-xs mt-1">Productivity insights and performance trends</p>
        </div>
        <div className="flex bg-zinc-950/60 border border-white/5 rounded-xl p-1 gap-1">
          {(['week', 'month'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                range === r ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {r === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Focus Time', value: `${Math.floor(totalFocusMin / 60)}h ${totalFocusMin % 60}m`, icon: Clock, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Tasks Completed', value: totalCompleted, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Avg Daily Focus', value: `${avgFocusMin}m`, icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
          { label: 'Avg Completion', value: `${avgCompletion}%`, icon: Target, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`p-5 rounded-2xl border ${stat.bg} flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Focus Time Chart */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5">
          <p className="text-sm font-bold text-white mb-4">Focus Time (minutes)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip content={customTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="focusMin" name="Actual" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              <Bar dataKey="estimatedMin" name="Estimated" fill="#3b82f620" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Rate */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5">
          <p className="text-sm font-bold text-white mb-4">Daily Completion Rate (%)</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Line
                type="monotone"
                dataKey="completionRate"
                name="Completion Rate"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tasks Completed Bar */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5">
          <p className="text-sm font-bold text-white mb-4">Tasks Completed per Day</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <Tooltip content={customTooltip} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="completed" name="Completed" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="total" name="Total" fill="#6366f115" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Priority Breakdown Pie */}
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5">
          <p className="text-sm font-bold text-white mb-4">Priority Breakdown (Completed)</p>
          {priorityData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-zinc-500 text-xs">
              Complete some tasks to see breakdown
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {priorityData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
