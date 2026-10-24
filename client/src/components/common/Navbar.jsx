import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { 
  Bell, 
  RotateCcw, 
  User, 
  ChevronDown, 
  LogOut, 
  Database,
  Building2,
  Check,
  ShieldAlert,
  Menu,
  X
} from 'lucide-react';
import { RoleBadge } from './Badge';

export const Navbar = ({ mobileNavOpen, onToggleMenu }) => {
  const { user, logout, demoSwitch, resetDataToSeed, dbMode } = useAuth();
  const { unreadCount, showToast } = useAlert();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const navigate = useNavigate();

  const handleDemoSwitch = async (role) => {
    try {
      const res = await demoSwitch(role);
      showToast(`Switched persona: ${res.user.name} (${res.user.role})`, 'success');
      setShowRoleMenu(false);
      setShowProfileMenu(false);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetData = async () => {
    if (window.confirm('Reset database to original baseline demo data? All simulated test changes will be reverted.')) {
      try {
        await resetDataToSeed();
        showToast('System data reset to initial baseline seed.', 'success');
        window.location.reload();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  };

  return (
    <header className="bg-gov-navyDark text-white border-b border-gov-navy border-opacity-60 sticky top-0 z-30 select-none">
      {/* Top GIGW Emblem & Identity Bar */}
      <div className="px-3 sm:px-5 py-2 flex items-center justify-between border-b border-gov-navy border-opacity-40 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={onToggleMenu}
            className="md:hidden p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors shrink-0"
            title={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileNavOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Emblem Placeholder (Ashoka Lion / AICTE Seal Placeholder) */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 border border-slate-600 bg-white/10 rounded-xs flex flex-col items-center justify-center text-center p-0.5 shrink-0" title="AICTE Government Seal">
            <span className="text-[7.5px] sm:text-[8px] font-bold tracking-tight text-amber-300 leading-none">AICTE</span>
            <span className="text-[6px] sm:text-[6.5px] text-slate-300 font-mono leading-none mt-0.5">अभातशिप</span>
          </div>

          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-300 tracking-wide uppercase leading-tight truncate hidden md:block">
              अखिल भारतीय तकनीकी शिक्षा परिषद • All India Council for Technical Education
            </div>
            <div className="text-xs sm:text-sm font-bold text-white tracking-normal flex items-center gap-1.5 truncate">
              <span className="truncate">CaseBridge</span>
              <span className="hidden sm:inline text-slate-400 font-normal truncate">— Complaint Portal</span>
              <span className="text-[9px] sm:text-[10px] font-normal px-1 sm:px-1.5 py-0.2 rounded-xs bg-gov-saffron text-white font-mono shrink-0">
                SIH26264
              </span>
            </div>
          </div>
        </div>

        {/* Right Info: Status + Reset + Role Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Evaluation Role Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="text-xs px-2 sm:px-2.5 py-1 rounded-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1 sm:gap-1.5 transition-colors"
              title="Select Role for Evaluation"
            >
              <span className="text-slate-400 font-normal hidden sm:inline">Role:</span>
              <span className="font-semibold text-white hidden sm:inline">{user?.name?.split(' ')[0]} ({user?.role})</span>
              <span className="font-semibold text-white sm:hidden capitalize text-xxs sm:text-xs">{user?.role?.replace('_', ' ')}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {showRoleMenu && (
              <div 
                className="absolute right-0 mt-1 w-64 bg-white text-gov-text border border-gov-border shadow-dropdown rounded-xs py-1 z-50 animate-in fade-in text-xs"
                onMouseLeave={() => setShowRoleMenu(false)}
              >
                <div className="px-3 py-1.5 border-b border-gov-border bg-gov-bg text-xxs font-bold uppercase text-gov-textMuted tracking-wider">
                  Select Judge Demo Persona
                </div>
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('admin')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between border-b border-gov-borderLight"
                >
                  <div>
                    <div className="font-bold text-gov-text">Dr. Rajeshwar Sharma</div>
                    <div className="text-xxs text-gov-textLight">Administrator (Bureau Coordination)</div>
                  </div>
                  {user?.role === 'admin' && <Check className="w-3.5 h-3.5 text-gov-navy" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('official')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between border-b border-gov-borderLight"
                >
                  <div>
                    <div className="font-bold text-gov-text">Dr. Ananya Sen</div>
                    <div className="text-xxs text-gov-textLight">Bureau Official (Regulation Bureau)</div>
                  </div>
                  {user?.role === 'official' && <Check className="w-3.5 h-3.5 text-gov-navy" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('senior_officer')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-gov-text">Dr. Manisha Mukherjee</div>
                    <div className="text-xxs text-gov-textLight">Senior Officer (Apex Oversight)</div>
                  </div>
                  {user?.role === 'senior_officer' && <Check className="w-3.5 h-3.5 text-gov-navy" />}
                </button>
              </div>
            )}
          </div>

          {/* Database Mode Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-xxs font-mono bg-slate-800 text-slate-300 border border-slate-700" title="Active Storage Mode">
            <Database className="w-3 h-3 text-slate-400" />
            <span>{dbMode === 'mongodb' ? 'MongoDB' : 'Demo Local Store'}</span>
          </div>

          {/* Reset Baseline Seed */}
          <button
            type="button"
            onClick={handleResetData}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors"
            title="Reset system dataset to baseline seed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Notifications Bell */}
          <Link
            to="/notifications"
            className="relative p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xs transition-colors"
            title="Alerts and Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-1 text-xxs font-bold bg-gov-saffron text-white rounded-xs px-1 leading-none py-0.5 border border-gov-navyDark">
                {unreadCount}
              </span>
            )}
          </Link>

          {/* User Profile Badge */}
          <div className="border-l border-slate-700 pl-2.5 flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight">{user?.name}</div>
              <div className="text-xxs text-slate-400 truncate max-w-[140px]">{user?.department || 'AICTE Official'}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1 text-slate-300 hover:text-red-300 hover:bg-slate-800 rounded-xs transition-colors"
              title="Log out of session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
