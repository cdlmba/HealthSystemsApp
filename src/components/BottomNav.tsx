import React from 'react';
import { CalendarCheck, UtensilsCrossed, Dumbbell, BarChart3, Settings2, Sparkles } from 'lucide-react';

const TABS = [
  { value: 'today',   icon: CalendarCheck,   label: 'Today'   },
  { value: 'food',    icon: UtensilsCrossed,  label: 'Food'    },
  { value: 'workout', icon: Dumbbell,         label: 'Workout' },
  { value: 'weekly',  icon: BarChart3,        label: 'Weekly'  },
  { value: 'coach',   icon: Sparkles,         label: 'Coach'   },
  { value: 'plan',    icon: Settings2,        label: 'Plan'    },
];

interface BottomNavProps {
  active: string;
  onChange: (tab: string) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {TABS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          id={`nav-${value}`}
          aria-label={label}
          aria-current={active === value ? 'page' : undefined}
          onClick={() => onChange(value)}
          className={`bottom-nav-item${active === value ? ' nav-active' : ''}`}
        >
          <Icon className="w-6 h-6" strokeWidth={active === value ? 2.2 : 1.7} />
          {label}
        </button>
      ))}
    </nav>
  );
}
