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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SERVER_URL } from "../lib/api";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [editNameOpen, setEditNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const profilePicUrl = user?.profilepic
    ? `${SERVER_URL}/user/profilepic?id=${user.profilepic}`
    : null;

  const roleDescriptions = {
    OWNER: [
      "Full access to the system",
      "Manage all users and permissions",
      "Configure system settings and billing",
      "Delete and terminate accounts",
    ],
    ADMIN: [
      "Manage standard users",
      "View all analytics and reports",
      "Cannot change billing or terminate owners",
    ],
    MANAGER: [
      "Manage team workflows",
      "View department-level data",
      "Limited access to user management",
    ],
    USER: [
      "Access own files and folders",
      "Share files with other users",
      "Manage personal account settings",
    ],
  };

  const getRoleStyle = (role) => {
    switch (role?.toUpperCase()) {
      case "OWNER":
        return "text-purple-500 border-purple-500/30 bg-purple-500/10";
      case "ADMIN":
        return "text-pink-500 border-pink-500/30 bg-pink-500/10";
      case "MANAGER":
        return "text-amber-500 border-amber-500/30 bg-amber-500/10";
      case "USER":
        return "text-[#14b8a6] border-[#14b8a6]/30 bg-[#14b8a6]/10";
      default:
        return "text-gray-500 border-gray-500/30 bg-gray-500/10";
    }
  };

  const userRole = user?.role?.toUpperCase() || "USER";
  const userPermissions = roleDescriptions[userRole] || roleDescriptions.USER;

  const handleUpdateName = async (e) => {
    e.preventDefault();
    const newName = e.target.name.value;
    console.log("Updating name to:", newName);
    try {
      await fetch(`${SERVER_URL}/user/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
        credentials: "include",
      });
      setEditNameOpen(false);
      // In a real app, update AuthContext user
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const currentPassword = e.target.currentPassword?.value;
    const newPassword = e.target.newPassword.value;
    console.log("Updating password...");
    try {
      if (currentPassword) {
        await fetch(`${SERVER_URL}/user/password`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, password: newPassword }),
          credentials: "include",
        });
      } else {
        await fetch(`${SERVER_URL}/user/password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
          credentials: "include",
        });
      }
      setPasswordOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white p-8 relative overflow-hidden font-sans pt-24">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#14b8a6]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] bg-[#3b82f6]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} />
          </div>
          <span className="font-semibold text-sm">Back to Dashboard</span>
        </button>

        <header className="mb-12">
          <h1 className="text-5xl font-black mb-4 tracking-tight">
            Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] via-[#10b981] to-[#3b82f6]">
              Profile
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Manage your personal settings and preferences
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-8"
          >
            {/* Identity Card */}
            <div className="bg-[#101014] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#14b8a6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-start gap-6 relative z-10">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-[#14b8a6]/20 flex items-center justify-center border border-[#14b8a6]/30 shadow-[0_0_20px_rgba(20,184,166,0.15)] relative group/avatar">
                  {profilePicUrl ? (
                    <img
                      src={profilePicUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-teal-400 select-none">
                      {user?.name?.[0]?.toUpperCase() ||
                        user?.email?.[0]?.toUpperCase() ||
                        "A"}
                    </span>
                  )}
                </div>
                <div className="flex-1 mt-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {user?.name}
                    </h2>
                    <button
                      onClick={() => setEditNameOpen(true)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Edit Name"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <p className="text-gray-400 mb-4">{user?.email}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border tracking-widest bg-[#14b8a6]/10 border-[#14b8a6]/30 text-teal-400">
                    <Shield size={14} />
                    {userRole} ACCOUNT
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Card */}
            <div className="bg-[#101014] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="text-blue-400" size={20} /> Storage Quota
                </h3>
                <span className="text-sm font-bold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                  8.0% Used
                </span>
              </div>
              <div className="relative z-10">
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-3 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "8%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full relative"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:10px_10px] animate-[slide_1s_linear_infinite]" />
                  </motion.div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">39.8 MB used</span>
                  <span className="text-gray-500 font-medium">500 MB total</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            {/* Permissions Card */}
            <div className="bg-[#101014] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                <Shield className="text-purple-400" size={18} /> Role Capabilities
              </h3>
              <ul className="space-y-4 relative z-10">
                {userPermissions.map((perm, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="text-purple-400 shrink-0 mt-0.5" size={16} />
                    <span className="leading-relaxed">{perm}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Security Card */}
            <div className="bg-[#101014] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
                <Lock className="text-emerald-400" size={18} /> Security
              </h3>
              <div className="relative z-10">
                <button
                  onClick={() => setPasswordOpen(true)}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-gray-300 hover:text-white flex items-center justify-center gap-2"
                >
                  Set or Change Password
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {editNameOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setEditNameOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#101014] border border-[#14b8a6]/20 rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleUpdateName}>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Edit Name</h3>
                    <button
                      type="button"
                      onClick={() => setEditNameOpen(false)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={user?.name}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#14b8a6]/50 focus:ring-1 focus:ring-[#14b8a6]/50 transition-all"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-black/20 p-6 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditNameOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#14b8a6] hover:bg-[#0d9488] text-white transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {passwordOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setPasswordOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#101014] border border-[#14b8a6]/20 rounded-3xl shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleUpdatePassword}>
                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Security Settings</h3>
                    <button
                      type="button"
                      onClick={() => setPasswordOpen(false)}
                      className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">
                        Current Password (Optional if OAuth)
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#14b8a6]/50 focus:ring-1 focus:ring-[#14b8a6]/50 transition-all"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#14b8a6]/50 focus:ring-1 focus:ring-[#14b8a6]/50 transition-all"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>
                </div>
                <div className="bg-black/20 p-6 flex justify-end gap-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setPasswordOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#14b8a6] hover:bg-[#0d9488] text-white transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
