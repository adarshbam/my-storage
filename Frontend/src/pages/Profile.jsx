import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  Zap,
  Lock,
  Edit2,
  CheckCircle2,
  ArrowLeft,
  X,
  HardDrive,
  Sparkles,
  Smartphone,
  Mail,
  ShieldCheck,
  Key,
  ShieldAlert,
  Calendar,
  Check,
  Cpu,
  Layers,
  Activity,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlan } from "../context/PlanContext";
import { SERVER_URL } from "../lib/api";
import { formatSize, getUser, getProfilePicUrl } from "../lib/utils";
import UserAvatar from "../components/ui/UserAvatar";
import SecondaryRecoveryEmailModal from "../components/auth/SecondaryRecoveryEmailModal";
import TwoFactorSetupModal from "../components/auth/TwoFactorSetupModal";
import TwoFactorManageModal from "../components/auth/TwoFactorManageModal";
import AppearanceSection from "../components/profile/AppearanceSection";
import NetworkSpeedSection from "../components/profile/NetworkSpeedSection";

export default function Profile() {
  const { user, setUser } = useAuth();
  const { maxStorage: planMaxStorage, subscription } = usePlan();
  const navigate = useNavigate();

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorManageOpen, setTwoFactorManageOpen] = useState(false);
  const [recoveryEmailOpen, setRecoveryEmailOpen] = useState(false);
  const [nameMessage, setNameMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const refreshUser = () => getUser(setUser);

  const profilePicUrl = getProfilePicUrl(user?.profilepic);

  const maxStorage =
    planMaxStorage ||
    subscription?.maxStorage ||
    subscription?.storageLimit ||
    user?.maxStorage ||
    5368709120;
  const usedStorage = user?.usedStorage || 0;
  const usedPercent = Math.min(100, Math.max(0, ((usedStorage / maxStorage) * 100).toFixed(1)));

  const roleDescriptions = {
    OWNER: [
      "Root administrative clearance with global parameter override",
      "Manage all system accounts, role hierarchies, and live sessions",
      "Configure subscription pricing, plan quotas, and global limits",
      "Full cryptographic access and audit log inspection",
    ],
    ADMIN: [
      "Manage standard user accounts, access approvals, and role levels",
      "Monitor system-wide vault analytics and active storage allocations",
      "Review platform security logs and anomalous access flags",
    ],
    MANAGER: [
      "Orchestrate workspace workflows and multi-node directory sharing",
      "Oversee project repositories and team access delegations",
      "Generate cryptographic relay packages with customized clearances",
    ],
    USER: [
      "Store, encrypt, and organize confidential assets in private vault nodes",
      "Generate time-limited, password-protected Secure Relay links",
      "Integrate external Cloud Storage (Google Drive) & GitHub repositories",
    ],
  };

  const getRoleBadgeStyle = (role) => {
    switch (role?.toUpperCase()) {
      case "OWNER":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]";
      case "ADMIN":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]";
      case "MANAGER":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
      case "USER":
      default:
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
    }
  };

  const userRole = user?.role?.toUpperCase() || "USER";
  const userPermissions = roleDescriptions[userRole] || roleDescriptions.USER;

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setNameMessage(null);
    const newName = e.target.name.value;
    try {
      const res = await fetch(`${SERVER_URL}/user/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setNameMessage({ type: "error", text: data.error || data.message || "Failed to update name" });
      } else {
        setNameMessage({ type: "success", text: data.message || "Name updated successfully!" });
        refreshUser();
        setTimeout(() => setEditNameOpen(false), 1500);
      }
    } catch (err) {
      setNameMessage({ type: "error", text: "Network error occurred." });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);
    const currentPassword = e.target.currentPassword?.value;
    const newPassword = e.target.newPassword.value;

    if (!newPassword || newPassword.trim() === "") {
      setPasswordMessage({ type: "error", text: "New password cannot be empty" });
      return;
    }

    if (currentPassword && currentPassword === newPassword) {
      setPasswordMessage({ type: "error", text: "New password cannot be the same as current password" });
      return;
    }

    try {
      let res;
      if (currentPassword) {
        res = await fetch(`${SERVER_URL}/user/password`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, password: newPassword }),
          credentials: "include",
        });
      } else {
        res = await fetch(`${SERVER_URL}/user/password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
          credentials: "include",
        });
      }
      
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.error || data.message || "Failed to update password" });
      } else {
        setPasswordMessage({ type: "success", text: data.message || "Password updated successfully!" });
        setTimeout(() => setPasswordOpen(false), 1500);
      }
    } catch (err) {
      setPasswordMessage({ type: "error", text: "Network error occurred." });
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* ── TOP HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-3 rounded-2xl bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all shadow-sm hover:scale-105 active:scale-95"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-accent-primary text-xs font-mono font-bold uppercase tracking-widest mb-1">
                <ShieldCheck size={14} /> Vault Identity & Security
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Account Settings
              </h1>
              <p className="text-slate-500 dark:text-white/50 text-xs sm:text-sm font-medium mt-0.5">
                Manage your credentials, encrypted storage quota, and multi-factor security barriers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              to="/dashboard/billing"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent-soft hover:bg-accent-soft/80 border border-accent-border text-accent-primary text-xs font-mono font-bold tracking-wider transition-all shadow-sm hover:shadow-accent-glow"
            >
              <Zap size={14} />
              <span>Storage Plans</span>
            </Link>
          </div>
        </div>

        {/* ── MAIN CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Columns: Identity + Quota */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Identity Hero Card */}
            <div className="rounded-3xl p-5 sm:p-8 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-soft/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4 sm:gap-6 z-10 w-full sm:w-auto">
                <UserAvatar
                  user={user}
                  src={profilePicUrl}
                  size="2xl"
                  glow={true}
                  status="ONLINE"
                  shape="rounded"
                />

                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                      {user?.name || "Vault Operative"}
                    </h2>
                    <button
                      onClick={() => setEditNameOpen(true)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-colors"
                      title="Edit Display Name"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-mono text-slate-500 dark:text-white/50 truncate">
                    {user?.email}
                  </p>
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                        userRole
                      )}`}
                    >
                      <Shield size={12} /> {userRole} CLEARANCE
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60">
                      <Cpu size={12} className="text-accent-primary" /> AES-256 GCM
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Appearance & Color Theme Customizer */}
            <AppearanceSection />

            {/* 3. Transfer Speed Governor */}
            <NetworkSpeedSection />

            {/* 4. Storage Quota Visual Card */}
            <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-white/40 flex items-center gap-2">
                  <HardDrive size={15} className="text-accent-primary" /> Vault Storage Allocation
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-soft border border-accent-border text-accent-primary text-xs font-mono font-bold uppercase tracking-wider">
                  {usedPercent}% Quota Used
                </span>
              </div>

              <div className="space-y-3">
                <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden p-0.5 border border-slate-200 dark:border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-teal-400 via-emerald-500 to-accent-primary rounded-full shadow-[0_0_15px_var(--accent-glow)]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-600 dark:text-white/60 pt-1">
                  <span>Used: <strong className="text-slate-900 dark:text-white">{formatSize(usedStorage)}</strong></span>
                  <span>Total: <strong className="text-slate-900 dark:text-white">{formatSize(maxStorage)}</strong></span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-white/40">
                <span>Free Space: {formatSize(Math.max(0, maxStorage - usedStorage))}</span>
                <Link to="/dashboard/billing" className="text-accent-primary font-bold hover:underline">
                  Upgrade Quota →
                </Link>
              </div>
            </div>

            {/* 3. Security & Multi-Factor Guard */}
            <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-accent-soft border border-accent-border text-accent-primary">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Security & Recovery Protocols
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-white/40 font-medium">
                      Multi-factor authentication, backup channels, and account protection.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 2FA Card */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                          <ShieldCheck size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Auth</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          user?.twoFactorEnabled
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/50 border border-slate-300 dark:border-white/10"
                        }`}
                      >
                        {user?.twoFactorEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-white/50 leading-relaxed">
                      Require an authenticator app (Google Authenticator, Authy, 1Password) security token on every login.
                    </p>
                  </div>

                  {user?.twoFactorEnabled ? (
                    <button
                      onClick={() => setTwoFactorManageOpen(true)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Key size={13} /> Manage 2FA & Backup Codes
                    </button>
                  ) : (
                    <button
                      onClick={() => setTwoFactorSetupOpen(true)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <ShieldCheck size={14} /> Enable Two-Factor Auth
                    </button>
                  )}
                </div>

                {/* Secondary Recovery Email */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500">
                          <Mail size={16} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">Recovery Email</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          user?.secondaryRecoveryEmailVerified
                            ? "bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30"
                            : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/50 border border-slate-300 dark:border-white/10"
                        }`}
                      >
                        {user?.secondaryRecoveryEmailVerified ? "Verified" : "Not Set"}
                      </span>
                    </div>
                    {user?.secondaryRecoveryEmailVerified ? (
                      <div className="flex items-center justify-between text-xs text-slate-800 dark:text-white/90 font-mono bg-white dark:bg-black/30 p-2 rounded-xl border border-slate-200 dark:border-white/5">
                        <span className="truncate">{user.secondaryRecoveryEmail}</span>
                        <CheckCircle2 size={14} className="text-teal-500 shrink-0 ml-2" />
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600 dark:text-white/50 leading-relaxed">
                        Add a verified secondary email to recover your vault assets if you lose access to your primary email.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setRecoveryEmailOpen(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Mail size={13} /> {user?.secondaryRecoveryEmailVerified ? "Update Recovery Email" : "Set Recovery Email"}
                  </button>
                </div>

                {/* Password Management */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-accent-soft text-accent-primary">
                        <Lock size={16} />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Account Password</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-white/50 leading-relaxed">
                      Update your encrypted master password with high-entropy standards.
                    </p>
                  </div>

                  <button
                    onClick={() => setPasswordOpen(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Lock size={13} /> Update Password
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* Right 1 Column: Capabilities & Clearance */}
          <div className="space-y-8">
            
            {/* Clearance Privileges */}
            <div className="rounded-3xl p-6 sm:p-8 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                    Clearance Capabilities
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 font-medium">
                    Permissions for <strong className="text-accent-primary font-mono">{userRole}</strong>
                  </p>
                </div>
              </div>

              <ul className="space-y-3">
                {userPermissions.map((perm, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs text-slate-700 dark:text-white/80 font-medium">
                    <CheckCircle2 className="text-accent-primary shrink-0 mt-0.5" size={15} />
                    <span className="leading-relaxed">{perm}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Navigation Links */}
            <div className="rounded-3xl p-6 bg-white dark:bg-vault-surface/90 border border-slate-200 dark:border-white/10 backdrop-blur-2xl shadow-xl space-y-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-2">
                Quick Actions
              </div>
              <Link
                to="/dashboard/billing"
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white transition-all text-xs font-bold group"
              >
                <div className="flex items-center gap-2.5">
                  <Zap size={14} className="text-accent-primary" />
                  <span>Plans & Subscriptions</span>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              {user?.role?.toUpperCase() === "OWNER" && (
                <Link
                  to="/owner/settings"
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white transition-all text-xs font-bold group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert size={14} className="text-purple-400" />
                    <span>Owner Configuration</span>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              )}
              {["OWNER", "ADMIN"].includes(user?.role?.toUpperCase()) && (
                <Link
                  to="/users"
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white transition-all text-xs font-bold group"
                >
                  <div className="flex items-center gap-2.5">
                    <User size={14} className="text-cyan-400" />
                    <span>System User Management</span>
                  </div>
                  <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* ── EDIT DISPLAY NAME MODAL ── */}
      <AnimatePresence>
        {editNameOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setEditNameOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setEditNameOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent-border flex items-center justify-center shrink-0">
                  <User className="text-accent-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Display Name</h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">
                    Profile Configuration
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateName} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={user?.name}
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
                    placeholder="Enter your name"
                  />
                </div>

                {nameMessage && (
                  <div
                    className={`text-xs px-4 py-2.5 rounded-xl font-semibold border ${
                      nameMessage.type === "success"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {nameMessage.text}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditNameOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-accent-primary text-accent-foreground shadow-lg shadow-accent-glow hover:opacity-95 transition-opacity"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── UPDATE PASSWORD MODAL ── */}
      <AnimatePresence>
        {passwordOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setPasswordOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-vault-surface text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-accent-soft border border-accent-border flex items-center justify-center shrink-0">
                  <Lock className="text-accent-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Security Settings</h3>
                  <p className="text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider font-semibold">
                    Account Password
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
                    placeholder="Enter current password (if set)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-white/60 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-colors"
                    placeholder="Enter new password"
                  />
                </div>

                {passwordMessage && (
                  <div
                    className={`text-xs px-4 py-2.5 rounded-xl font-semibold border ${
                      passwordMessage.type === "success"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {passwordMessage.text}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-accent-primary text-accent-foreground shadow-lg shadow-accent-glow hover:opacity-95 transition-opacity"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SECONDARY RECOVERY EMAIL MODAL ── */}
      <SecondaryRecoveryEmailModal
        isOpen={recoveryEmailOpen}
        onClose={() => setRecoveryEmailOpen(false)}
        currentEmail={user?.secondaryRecoveryEmailVerified ? user.secondaryRecoveryEmail : null}
        onSuccess={refreshUser}
      />

      {/* ── 2FA SETUP MODAL ── */}
      <TwoFactorSetupModal
        isOpen={twoFactorSetupOpen}
        onClose={() => setTwoFactorSetupOpen(false)}
        onSuccess={refreshUser}
      />

      {/* ── 2FA MANAGE MODAL ── */}
      <TwoFactorManageModal
        isOpen={twoFactorManageOpen}
        onClose={() => setTwoFactorManageOpen(false)}
        onSuccess={refreshUser}
      />
    </div>
  );
}
