"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, ArrowRight, User, ShieldCheck } from "lucide-react";
import { getLabourData } from "../lib/storage"; 
import { Labour } from "../types";

export default function HomePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loginRole, setLoginRole] = useState<"admin" | "labour">("labour");

  // Login inputs
  const [loginId, setLoginId] = useState(""); // NAYA: Mobile ki jagah Labour ID
  const [adminPassword, setAdminPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    setErrorMsg(""); 
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (loginRole === "admin") {
      // Admin Login Logic
      if (adminPassword === "admin123") {
        localStorage.setItem("bhatta_session", "admin");
        router.push("/admin");
      } else {
        setErrorMsg("Galat Password! Kripya sahi password dalein.");
      }
    } else {
      // Labour Login Logic
      if (!loginId) {
        setErrorMsg("Kripya apni Labour ID dalein.");
        return;
      }

      const labourers: any[] = getLabourData("bhatta_labourers") || [];
      
      // NAYA: Ab mobile ki jagah loginId se check hoga
      const foundLabour = labourers.find((lab) => lab.loginId === loginId);

      if (foundLabour) {
        localStorage.setItem("bhatta_session", `user_${foundLabour.id}`);
        router.push(`/labour/${foundLabour.id}`);
      } else {
        setErrorMsg("Ye Labour ID registered nahi hai. Admin se sampark karein.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/30 rounded-full blur-3xl pointer-events-none"></div>

      {/* Navbar */}
      <nav className="relative z-10 flex justify-between items-center p-6 lg:px-12 backdrop-blur-sm border-b border-white/10">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Bhatta Pro
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition"
        >
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      {/* Main Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
          Brick Kiln Management <br className="hidden md:block" /> 
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Simplified
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mb-10">
          Complete control for Administrators and transparent ledgers for Labourers. 
          Manage advances, raw bricks, and monthly records all in one place.
        </p>
        <button 
          onClick={toggleSidebar}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-semibold text-lg hover:scale-105 transition shadow-[0_0_20px_rgba(59,130,246,0.5)]"
        >
          Login / Get Started <ArrowRight className="w-5 h-5" />
        </button>
      </main>

      {/* Side Drawer (Login/Signup Panel) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar Content */}
      <div 
        className={`fixed top-0 right-0 h-full w-full md:w-[400px] bg-slate-900/95 border-l border-white/10 backdrop-blur-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Login Portal</h2>
            <button onClick={toggleSidebar} className="p-2 bg-white/5 rounded-full hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Role Toggle */}
          <div className="flex bg-black/40 p-1 rounded-xl mb-8 border border-white/5">
            <button 
              onClick={() => { setLoginRole("labour"); setErrorMsg(""); }}
              className={`flex-1 py-3 rounded-lg flex justify-center items-center gap-2 font-medium transition ${loginRole === "labour" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              <User className="w-4 h-4" /> Labour
            </button>
            <button 
              onClick={() => { setLoginRole("admin"); setErrorMsg(""); }}
              className={`flex-1 py-3 rounded-lg flex justify-center items-center gap-2 font-medium transition ${loginRole === "admin" ? "bg-purple-600 text-white shadow-sm" : "text-gray-400 hover:text-white"}`}
            >
              <ShieldCheck className="w-4 h-4" /> Admin
            </button>
          </div>

          {/* Login Form */}
          <div className="flex-1">
            <p className="text-gray-400 mb-6 text-sm">
              {loginRole === "admin" 
                ? "Login as Kiln Owner/Manager for full system access." 
                : "Enter your Labour ID to view your ledger and add remarks."}
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* If Labour Role is selected, show Labour ID input */}
              {loginRole === "labour" && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Labour ID</label>
                  <input 
                    type="text" 
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition" 
                    placeholder="E.g., 1001"
                  />
                </div>
              )}

              {/* If Admin Role is selected, show Password input */}
              {loginRole === "admin" && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Admin Password</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition" 
                    placeholder="Enter master password"
                  />
                </div>
              )}

              {/* Error Message Display */}
              {errorMsg && (
                <p className="text-red-400 text-sm font-medium p-2 bg-red-900/20 border border-red-500/20 rounded-lg">
                  {errorMsg}
                </p>
              )}
              
              <button 
                type="submit"
                className={`w-full text-center mt-4 py-3 rounded-xl font-semibold transition ${
                  loginRole === "admin" ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Login as {loginRole === "admin" ? "Admin" : "Labour"}
              </button>
            </form>
          </div>

          <div className="text-center text-sm text-gray-500 pb-4 mt-auto">
            Secured by Bhatta Pro v1.0
          </div>
        </div>
      </div>
    </div>
  );
}