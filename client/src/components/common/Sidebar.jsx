import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Clock, 
  GitMerge, 
  Network, 
  Building2, 
  Users2, 
  BellRing, 
  BarChart3, 
  History,
  ShieldCheck,
  AlertOctagon,
  X
} from 'lucide-react';
import { useAlert } from '../../context/AlertContext';

const NAV_SECTIONS = [
  {
    heading: 'Core Operations',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Case Registry', path: '/cases', icon: FileText },
      { name: 'Unassigned Queue', path: '/unassigned', icon: AlertOctagon, isQueue: true },
    ]
  },
  {
    heading: 'Coordination & Intelligence',
    items: [
      { name: 'Similar Issue Groups', path: '/similarity', icon: GitMerge, badge: 'UVP 2' },
      { name: 'Case Dependency Map', path: '/impact-map', icon: Network, badge: 'UVP 3' },
    ]
  },
  {
    heading: 'Administrative Entities',
    items: [
      { name: 'Institutions Directory', path: '/institutions', icon: Building2 },
      { name: 'Officials & Workload', path: '/workload', icon: Users2, badge: 'UVP 1' },
    ]
  },
  {
    heading: 'Oversight & Compliance',
    items: [
      { name: 'Alerts & Notifications', path: '/notifications', icon: BellRing, hasCount: true },
      { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
      { name: 'Audit Trail Ledger', path: '/audit', icon: History },
    ]
  }
];

export const Sidebar = ({ mobileOpen = false, onClose }) => {
  const { unreadCount, unassignedCount } = useAlert();

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-56 bg-gov-navyDark text-slate-300 flex flex-col shrink-0 border-r border-gov-navy select-none min-h-screen text-xs transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
      mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
    }`}>
      {/* Sidebar Top Label */}
      <div className="px-4 py-3 border-b border-gov-navy border-opacity-50 bg-slate-950/30 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            AICTE Portal Navigation
          </div>
          <div className="text-xxs text-slate-400 mt-0.5">
            Grievance Redressal & Inter-Bureau
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="md:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xs transition-colors"
          title="Close Navigation Drawer"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            <div className="px-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
              {section.heading}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2.5 py-1.5 rounded-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gov-navy text-white border-l-2 border-gov-saffron font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <item.icon className="w-4 h-4 shrink-0 text-slate-400" />
                  <span className="truncate">{item.name}</span>
                </div>

                {/* Status Badges */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.badge && (
                    <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded-xs bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                  {item.hasCount && unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-gov-saffron text-white leading-none">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer System Status */}
      <div className="p-3 border-t border-gov-navy border-opacity-50 bg-slate-950/40 text-[10.5px]">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>NIC e-Gov Framework</span>
        </div>
        <p className="text-slate-400 leading-snug">
          GIGW Compliant • Authorised Internal Access Only
        </p>
      </div>
    </aside>
  );
};
