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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SERVER_URL } from "../lib/api";
import { formatSize, getUser } from "../lib/utils";
import PhoneVerificationModal from "../components/auth/PhoneVerificationModal";
import SecondaryRecoveryEmailModal from "../components/auth/SecondaryRecoveryEmailModal";
import TwoFactorSetupModal from "../components/auth/TwoFactorSetupModal";
import TwoFactorManageModal from "../components/auth/TwoFactorManageModal";

const Profile = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [twoFactorSetupOpen, setTwoFactorSetupOpen] = useState(false);
  const [twoFactorManageOpen, setTwoFactorManageOpen] = useState(false);
  const [recoveryEmailOpen, setRecoveryEmailOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [nameMessage, setNameMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const refreshUser = () => getUser(setUser);

  const profilePicUrl = user?.profilepic
    ? `${SERVER_URL}/user/profilepic?id=${user.profilepic}`
    : null;

  const maxStorage = user?.maxStorage || 1024 * 1024 * 500;
  const usedStorage = user?.usedStorage || 0;
  const usedPercent = Math.min(100, Math.max(0, ((usedStorage / maxStorage) * 100).toFixed(1)));

  const roleDescriptions = {
    OWNER: [
      "Full access to the system and global parameters",
      "Manage all system users, permissions, and roles",
      "Configure subscription plans, features, and limits",
      "Delete and terminate user accounts",
    ],
    ADMIN: [
      "Manage standard user accounts and permissions",
      "View system analytics and user data",
      "Cannot modify owner billing or terminate owner accounts",
    ],
    MANAGER: [
      "Manage team workflows and file sharing",
      "View department-level data",
      "Limited access to user management",
    ],
    USER: [
      "Access personal cloud vault files and folders",
      "Create cryptographic share links for external users",
      "Manage personal account settings and security",
    ],
  };

  const getRoleBadgeStyle = (role) => {
    switch (role?.toUpperCase()) {
      case "OWNER":
        return "bg-purple-500/10 text-purple-300 border-purple-500/30";
      case "ADMIN":
        return "bg-rose-500/10 text-rose-300 border-rose-500/30";
      case "MANAGER":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "USER":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-white/5 text-white/50 border-white/10";
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
    <div className="min-h-screen bg-vault-bg text-slate-900 dark:text-white p-6 sm:p-8 relative overflow-hidden font-sans pt-20 pb-24">
      {/* Subtle Atmospheric Gradient Background Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-accent-primary/10 via-accent-soft/5 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 -right-48 w-96 h-96 bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10 space-y-10">
        {/* Navigation Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm"
              title="Return to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">
                <User size={14} /> Vault Account Settings
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Profile & Security
              </h1>
              <p className="text-white/50 text-sm font-medium mt-1">
                Manage your personal information, storage quota, and account security.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Identity & Storage Cards */}
          <div className="lg:col-span-2 space-y-8">
            {/* Identity Hero Card */}
            <div className="rounded-3xl p-6 sm:p-8 bg-vault-surface/80 border border-white/10 backdrop-blur-xl shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group">
              <div className="flex items-center gap-6 z-10">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shrink-0 bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  {profilePicUrl ? (
                    <img
                      src={profilePicUrl}
                      alt={user?.name || "Profile"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 select-none">
                      {user?.name?.[0]?.toUpperCase() ||
                        user?.email?.[0]?.toUpperCase() ||
                        "U"}
                    </span>
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black text-white tracking-tight truncate">
                      {user?.name}
                    </h2>
                    <button
                      onClick={() => setEditNameOpen(true)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
                      title="Edit Display Name"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-white/50 font-medium truncate">
                    {user?.email}
                  </p>
                  <div className="pt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getRoleBadgeStyle(
                        userRole
                      )}`}
                    >
                      <Shield size={12} /> {userRole} ACCOUNT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Quota Card */}
            <div className="rounded-3xl p-6 sm:p-8 bg-vault-surface/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <HardDrive size={16} className="text-emerald-400" /> Vault Storage Allocation
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  {usedPercent}% Quota Used
                </span>
              </div>

              <div className="space-y-2 pt-2">
                <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPercent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-white/60 pt-1">
                  <span>Used: {formatSize(usedStorage)}</span>
                  <span>Total Quota: {formatSize(maxStorage)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Capabilities & Security */}
          <div className="space-y-8">
            {/* Role Capabilities */}
            <div className="rounded-3xl p-6 sm:p-8 bg-vault-surface/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Role Capabilities</h3>
                  <p className="text-xs text-white/40 font-medium">Assigned permissions</p>
                </div>
              </div>

              <ul className="space-y-3">
                {userPermissions.map((perm, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs text-white/80 font-medium">
                    <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={15} />
                    <span className="leading-relaxed">{perm}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account Security */}
            <div className="rounded-3xl p-6 sm:p-8 bg-vault-surface/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Security & Recovery</h3>
                    <p className="text-xs text-white/40 font-medium">Authentication, backup emails & phone</p>
                  </div>
                </div>
              </div>

              {/* 1. Two-Factor Authentication (TOTP 2FA) */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <ShieldCheck size={16} />
                    </div>
                    <span className="text-xs font-bold text-white">Two-Factor Authentication</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user?.twoFactorEnabled
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-white/10 text-white/50 border border-white/10"
                    }`}
                  >
                    {user?.twoFactorEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Protect your Vault account by requiring an authenticator app (Google Authenticator, Authy, 1Password) code on login.
                </p>
                {user?.twoFactorEnabled ? (
                  <button
                    onClick={() => setTwoFactorManageOpen(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Key size={13} /> Manage 2FA / Backup Codes
                  </button>
                ) : (
                  <button
                    onClick={() => setTwoFactorSetupOpen(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={14} /> Enable Two-Factor Auth
                  </button>
                )}
              </div>

              {/* 2. Secondary Recovery Email */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                      <Mail size={16} />
                    </div>
                    <span className="text-xs font-bold text-white">Secondary Recovery Email</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user?.secondaryRecoveryEmailVerified
                        ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                        : "bg-white/10 text-white/50 border border-white/10"
                    }`}
                  >
                    {user?.secondaryRecoveryEmailVerified ? "Verified" : "Not Set"}
                  </span>
                </div>
                {user?.secondaryRecoveryEmailVerified ? (
                  <div className="flex items-center justify-between text-xs text-white/80 font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="truncate">{user.secondaryRecoveryEmail}</span>
                    <CheckCircle2 size={14} className="text-teal-400 shrink-0 ml-2" />
                  </div>
                ) : (
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Add a verified secondary email to recover your account and receive password resets if you lose access to your primary email.
                  </p>
                )}
                <button
                  onClick={() => setRecoveryEmailOpen(true)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={13} /> {user?.secondaryRecoveryEmailVerified ? "Update Recovery Email" : "Set Recovery Email"}
                </button>
              </div>

              {/* 3. Phone Number Verification (Free Trial & Security) */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Smartphone size={16} />
                    </div>
                    <span className="text-xs font-bold text-white">Phone Verification</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user?.phoneVerified
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {user?.phoneVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
                {user?.phoneVerified ? (
                  <div className="flex items-center justify-between text-xs text-white/80 font-mono bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <span className="truncate">{user.phone}</span>
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 ml-2" />
                  </div>
                ) : (
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Verify your phone via SMS to claim your 30-day Free Trial and protect against account takeover.
                  </p>
                )}
                <button
                  onClick={() => setPhoneModalOpen(true)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                    user?.phoneVerified
                      ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                      : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-95 text-white shadow-md shadow-teal-500/20"
                  }`}
                >
                  <Smartphone size={13} /> {user?.phoneVerified ? "Change Phone Number" : "Verify Phone Number"}
                </button>
              </div>

              {/* 4. Password */}
              <button
                onClick={() => setPasswordOpen(true)}
                className="w-full py-3 rounded-2xl text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Lock size={14} /> Update Account Password
              </button>
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
              className="relative w-full max-w-md bg-vault-surface border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setEditNameOpen(false)}
                className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <User className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Display Name</h3>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                    Profile Configuration
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateName} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={user?.name}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter your name"
                  />
                </div>

                {nameMessage && (
                  <div
                    className={`text-xs px-4 py-2.5 rounded-xl font-semibold border ${
                      nameMessage.type === "success"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {nameMessage.text}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditNameOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20 hover:opacity-95 transition-opacity"
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
              className="relative w-full max-w-md bg-vault-surface border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Lock className="text-emerald-400" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Security Settings</h3>
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                    Account Password
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter current password (if set)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    placeholder="Enter new password"
                  />
                </div>

                {passwordMessage && (
                  <div
                    className={`text-xs px-4 py-2.5 rounded-xl font-semibold border ${
                      passwordMessage.type === "success"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {passwordMessage.text}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20 hover:opacity-95 transition-opacity"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PHONE VERIFICATION MODAL ── */}
      <PhoneVerificationModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        onSuccess={refreshUser}
        title="Verify Phone Number"
        subtitle="Verify your phone number to secure your account and unlock your 30-day Free Trial eligibility."
        purpose="security"
      />

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
};

export default Profile;

