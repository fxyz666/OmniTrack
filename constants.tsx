
import React from 'react';
import { 
  Smartphone, Tablet, Monitor, Clock, Cloud, Settings, 
  BarChart3, List, Download, Trash2, ShieldCheck, Zap,
  Briefcase, GraduationCap, Gamepad2, Coffee, MoreHorizontal,
  ChevronLeft, ChevronRight, FileJson, FileSpreadsheet
} from 'lucide-react';
import { DeviceType, ActivityCategory } from './types';

export const DeviceIcons = {
  [DeviceType.Mobile]: <Smartphone className="w-5 h-5" />,
  [DeviceType.Tablet]: <Tablet className="w-5 h-5" />,
  [DeviceType.PC]: <Monitor className="w-5 h-5" />,
};

export const CategoryIcons = {
  [ActivityCategory.Work]: <Briefcase className="w-4 h-4" />,
  [ActivityCategory.Study]: <GraduationCap className="w-4 h-4" />,
  [ActivityCategory.Entertainment]: <Gamepad2 className="w-4 h-4" />,
  [ActivityCategory.Life]: <Coffee className="w-4 h-4" />,
  [ActivityCategory.Other]: <MoreHorizontal className="w-4 h-4" />,
};

export const CategoryColors = {
  [ActivityCategory.Work]: 'bg-indigo-600',
  [ActivityCategory.Study]: 'bg-emerald-600',
  [ActivityCategory.Entertainment]: 'bg-rose-600',
  [ActivityCategory.Life]: 'bg-amber-600',
  [ActivityCategory.Other]: 'bg-slate-600',
};

export const DeviceColors = {
  [DeviceType.Mobile]: 'bg-indigo-500',
  [DeviceType.Tablet]: 'bg-emerald-500',
  [DeviceType.PC]: 'bg-amber-500',
};

// Add Smartphone and Tablet to AppIcons to allow resizing them in App.tsx
export const AppIcons = {
  Clock, Cloud, Settings, BarChart3, List, Download, Trash2, ShieldCheck, Zap,
  ChevronLeft, ChevronRight, FileJson, FileSpreadsheet, Monitor, Smartphone, Tablet
};
