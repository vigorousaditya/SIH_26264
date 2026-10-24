import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { Button } from '../components/common/Button';
import { FormField } from '../components/common/FormField';
import { Shield, Lock, Mail, ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';

const DEMO_PERSONAS = [
  {
    role: 'admin',
    name: 'Dr. Rajeshwar Sharma',
    designation: 'Director, Bureau Coordination',
    email: 'admin@casebridge.gov.in',
    badge: 'Administrator',
  },
  {
    role: 'official',
    name: 'Dr. Ananya Sen',
    designation: 'Senior Inspector, Regulation Bureau',
    email: 'rb.official@casebridge.gov.in',
    badge: 'Bureau Official (RB)',
  },
  {
    role: 'official',
    name: 'Shri Vikramaditya Rao',
    designation: 'Ombudsman, Public Grievances Cell',
    email: 'pgrc.official@casebridge.gov.in',
    badge: 'Bureau Official (PGRC)',
  },
  {
    role: 'senior_officer',
    name: 'Dr. Manisha Mukherjee',
    designation: 'Chief Vigilance & Monitoring Advisor',
    email: 'senior@casebridge.gov.in',
    badge: 'Senior Officer',
  }
];

export const LoginPage = () => {
  const { login, demoSwitch } = useAuth();
  const { showToast } = useAlert();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@casebridge.gov.in');
  const [password, setPassword] = useState('CaseBridge@2026');
  const [loading, setLoading] = useState(false);

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast('Authenticated successfully.', 'success');
      navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSelect = async (persona) => {
    setEmail(persona.email);
    setPassword('CaseBridge@2026');
    setLoading(true);
    try {
      await demoSwitch(persona.role);
      showToast(`Signed in as ${persona.name} (${persona.badge})`, 'success');
      navigate('/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col justify-between font-sans text-gov-text select-none">
      {/* Top Standard Government Header Strip */}
      <header className="bg-gov-navyDark text-white border-b border-gov-navy px-4 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 border border-slate-600 bg-white/10 rounded-xs flex flex-col items-center justify-center text-center p-0.5 shrink-0">
              <span className="text-[8px] sm:text-[9px] font-bold text-amber-300 leading-none">AICTE</span>
              <span className="text-[6px] sm:text-[7px] text-slate-300 font-mono leading-none mt-0.5">अभातशिप</span>
            </div>
            <div className="min-w-0">
              <div className="text-xxs font-medium text-slate-300 uppercase tracking-wide truncate hidden sm:block">
                अखिल भारतीय तकनीकी शिक्षा परिषद • All India Council for Technical Education
              </div>
              <div className="text-xs sm:text-sm font-bold text-white tracking-normal truncate">
                CaseBridge — Institution Complaint Monitoring
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block shrink-0">
            <span className="text-xxs font-mono px-2 py-0.5 rounded-xs bg-gov-navy text-slate-300 border border-slate-700">
              SIH 2026 • Problem Statement: SIH26264
            </span>
          </div>
        </div>
      </header>

      {/* Main Login Panel */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex items-center justify-center">
        <div className="w-full max-w-xl bg-white border border-gov-border rounded-sm shadow-card p-6 sm:p-8">
          {/* Institutional Title Header */}
          <div className="border-b border-gov-border pb-4 mb-5 text-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xs bg-gov-navyMuted text-gov-navy text-xxs font-bold uppercase tracking-wider mb-2 border border-slate-300">
              <Shield className="w-3 h-3 text-gov-navy" /> Official Redressal & Inter-Bureau Portal
            </div>
            <h1 className="text-lg font-bold text-gov-navy">
              Authorised Official Login
            </h1>
            <p className="text-xs text-gov-textMuted mt-1">
              Sign in with institutional credentials to access complaints registry and workload allocations.
            </p>
          </div>

          {/* Quick Evaluator Role Selector (SIH Judges Access) */}
          <div className="mb-6 bg-gov-bg border border-gov-border rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xxs font-bold uppercase text-gov-navy tracking-wider flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-gov-navy" /> SIH Evaluation Quick Roles:
              </span>
              <span className="text-[10px] text-gov-textLight font-mono">1-Click Sign In</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_PERSONAS.map((p) => (
                <button
                  key={p.role + p.name}
                  type="button"
                  onClick={() => handleQuickDemoSelect(p)}
                  className="text-left p-2 rounded-xs border border-gov-border bg-white hover:bg-slate-50 hover:border-gov-navy transition-colors focus-visible:outline-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xxs font-bold text-gov-navy">{p.badge}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </div>
                  <div className="text-xs font-semibold text-gov-text truncate mt-0.5">{p.name}</div>
                  <div className="text-[10px] text-gov-textMuted truncate">{p.designation}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleStandardLogin} className="space-y-3.5">
            <FormField label="Official Email Address" required id="email">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-gov-border rounded-xs focus:ring-1 focus:ring-gov-navy focus:border-gov-navy"
                  required
                />
              </div>
            </FormField>

            <FormField label="Password" required id="password">
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-gov-border rounded-xs focus:ring-1 focus:ring-gov-navy focus:border-gov-navy font-mono"
                  required
                />
              </div>
            </FormField>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full font-bold"
              >
                Sign In to Official Session
              </Button>
            </div>
          </form>

          {/* Statutory Security Disclaimer */}
          <div className="mt-5 pt-3 border-t border-gov-border text-center text-[10px] text-gov-textLight space-y-1">
            <p className="font-semibold text-gov-textMuted">
              Notice: Authorised personnel only.
            </p>
            <p>
              This is a protected government system. Unauthorized attempts to modify data or bypass role restrictions are recorded and punishable under the Information Technology Act, 2000.
            </p>
          </div>
        </div>
      </main>

      {/* Slim Standard Footer */}
      <footer className="bg-white border-t border-gov-border py-2 text-center text-xxs text-gov-textLight">
        All India Council for Technical Education • New Delhi • Prototype Demonstration Platform (SIH 2026)
      </footer>
    </div>
  );
};
