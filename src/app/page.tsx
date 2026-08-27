"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLabourData, saveLabourData, fetchFromFirebase } from "../lib/storage";
import { User, Lock, LogIn, UserPlus, Phone, AlertCircle, CheckCircle, ArrowRight, Building2, Users, Receipt, ShieldCheck, Zap, X, Sun, Moon, Mail } from "lucide-react";

// Firebase Auth Imports
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function HomeAuthPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"hidden" | "login" | "signup">("hidden");
  const [isAnimating, setIsAnimating] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("light"); 
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loadingText, setLoadingText] = useState("Verifying Details...");
  
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState(""); 
  
  const [toast, setToast] = useState<{msg: string, type: "success" | "error"} | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
    if (savedTheme) setTheme(savedTheme);

    const session = localStorage.getItem("bhatta_session");
    if (session === "admin") router.push("/admin");
    else if (session?.startsWith("user_")) router.push(`/labour/${session.split("_")[1]}`);
  }, [router]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500); 
  };

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setTimeout(() => setIsAnimating(true), 10);
  };

  const closeAuth = () => {
    if (isAuthenticating) return; 
    setIsAnimating(false);
    setTimeout(() => setAuthMode("hidden"), 500); 
  };

  // 🟢 100% SECURE FIREBASE LOGIN (No Hardcoded Passwords)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !password) return showToast("ID and Password are required!", "error");

    setIsAuthenticating(true);
    setLoadingText("Verifying Account...");

    try {
      // 1. Fetch Latest Cloud Data
      const cloudAdmins = await fetchFromFirebase("bhatta_admins");
      if (cloudAdmins) localStorage.setItem("bhatta_admins", JSON.stringify(cloudAdmins));
      
      const cloudLab = await fetchFromFirebase("bhatta_labourers");
      if (cloudLab) localStorage.setItem("bhatta_labourers", JSON.stringify(cloudLab));

      const cloudBhatta = await fetchFromFirebase("bhattas_list");
      if (cloudBhatta) localStorage.setItem("bhattas_list", JSON.stringify(cloudBhatta));

      // 2. Format Login ID
      const inputId = id.toLowerCase().trim();
      let loginEmail = inputId;
      if (!loginEmail.includes("@")) {
        loginEmail = `${loginEmail}@bhattapro.com`; // Invisible email system
      }

      // 3. FIREBASE AUTHENTICATION (The Ultimate Security Check)
      const auth = getAuth();
      try {
        await signInWithEmailAndPassword(auth, loginEmail, password);
      } catch (authError: any) {
        if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password') {
          showToast("Access Denied! Incorrect ID or Password.", "error");
        } else {
          showToast("Network Error. Please try again.", "error");
        }
        setIsAuthenticating(false);
        return;
      }

      // 4. Admin Check (After successful Firebase Auth)
      const savedAdmins = JSON.parse(localStorage.getItem("bhatta_admins") || "[]");
      const masterAdmins = ["nadeemxsalar@gmail.com", "realheronadeem@gmail.com"];
      const dynamicAdmins = savedAdmins.map((a: string) => a.includes("@") ? a.toLowerCase() : `${a.toLowerCase()}@bhattapro.com`); 
      
      const allAdmins = [...masterAdmins, ...dynamicAdmins];

      if (allAdmins.includes(loginEmail)) {
        localStorage.setItem("bhatta_session", "admin");
        setLoadingText("Loading Workspace...");
        showToast("Welcome Back, Master Admin!", "success");
        setTimeout(() => router.push("/admin"), 1000);
        return;
      }

      // 5. Labour Check
      const labourers = getLabourData("bhatta_labourers") || [];
      const rawId = id.trim();
      const labour = labourers.find((l: any) => l.loginId === rawId || l.phone === rawId);

      if (labour) {
        localStorage.setItem("bhatta_session", `user_${labour.id}`);
        setLoadingText("Loading Your Ledger...");
        showToast("Login Successful!", "success");
        setTimeout(() => router.push(`/labour/${labour.id}`), 1000);
      } else {
        showToast("Authentication successful, but profile missing.", "error");
        setIsAuthenticating(false);
      }

    } catch (error) {
      console.error("Login Auth Error:", error);
      showToast("Something went wrong. Please try again.", "error");
      setIsAuthenticating(false);
    }
  };

  // 🟢 FIREBASE SIGNUP SYSTEM (Only for Labourers)
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return showToast("All details are required!", "error");

    setIsAuthenticating(true);
    setLoadingText("Creating Secure Account...");

    try {
      const cloudLab = await fetchFromFirebase("bhatta_labourers");
      if (cloudLab) localStorage.setItem("bhatta_labourers", JSON.stringify(cloudLab));

      const labourers = getLabourData("bhatta_labourers") || [];
      
      if (contact && labourers.some((l: any) => l.phone === contact)) {
        setIsAuthenticating(false);
        return showToast("This Phone/Email is already registered!", "error");
      }

      let maxId = 1000;
      labourers.forEach((l: any) => {
        const num = parseInt(l.loginId, 10);
        if (!isNaN(num) && num > maxId) maxId = num;
      });
      const newLoginId = (maxId + 1).toString();

      // Firebase Invisible Email Registration
      const signupEmail = `${newLoginId}@bhattapro.com`;
      const auth = getAuth();

      // 1. Create User in Firebase Authentication
      await createUserWithEmailAndPassword(auth, signupEmail, password);

      // 2. Save User Data to Local/Cloud Database
      const newLabour: any = {
        id: Date.now().toString(), bhattaId: "bhatta_default", name, loginId: newLoginId, phone: contact, ratePerThousand: 0, ratePerPaya: 0, paya: "-", totalBricks: 0, totalPaye: 0, totalKharcha: 0, totalPeshgi: 0, entries: []
      };

      const updatedList = [...labourers, newLabour];
      saveLabourData("bhatta_labourers", updatedList); 
      
      localStorage.setItem("bhatta_session", `user_${newLabour.id}`);
      setLoadingText("Account Ready!");
      showToast(`Account Created! Your Login ID is: ${newLoginId}`, "success");
      
      setTimeout(() => router.push(`/labour/${newLabour.id}`), 2500);

    } catch (error: any) {
      console.error("Signup Auth Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        showToast("This Account already exists!", "error");
      } else if (error.code === 'auth/weak-password') {
        showToast("Password must be at least 6 characters.", "error");
      } else {
        showToast("Network Error. Please try again.", "error");
      }
      setIsAuthenticating(false);
    }
  };

  const handleGoogleAuth = () => {
    showToast("Google Authentication system coming soon!", "success");
  };

  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#0f172a] text-white" : "bg-slate-50 text-slate-900";
  const cardClass = isDark ? "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 text-slate-300" : "bg-white border-slate-200 shadow-lg hover:shadow-xl text-slate-600";
  const inputClass = isDark ? "bg-slate-900/40 border-slate-700 focus:border-emerald-500 text-white placeholder-slate-500 disabled:opacity-50" : "bg-white border-slate-300 focus:border-emerald-500 text-slate-900 placeholder-slate-400 shadow-sm disabled:opacity-50";
  const authBgClass = isDark ? "bg-[#0b1221] md:bg-slate-800/90 border-slate-700/50" : "bg-slate-50 md:bg-white/95 border-slate-200 shadow-2xl";
  const toggleBgClass = isDark ? "bg-slate-900/60 border-slate-700/50" : "bg-slate-100 border-slate-200";
  const toggleThumbClass = isDark ? "bg-slate-700" : "bg-white shadow-md";
  const navTextClass = isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900";
  const overlayClass = isDark ? "bg-[#0f172a]/80" : "bg-slate-900/50";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const headingTextClass = isDark ? "text-white" : "text-slate-900";
  const btnSecondary = isDark ? "bg-slate-800 hover:bg-slate-700 text-white border-slate-700" : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-md";

  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/30 relative overflow-hidden transition-colors duration-500 ${bgMain}`}>
      
      {toast && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={22} /> : <CheckCircle size={22} />}
          <span className="font-semibold text-sm">{toast.msg}</span>
        </div>
      )}

      <div className={`transition-all duration-700 ease-in-out ${isAnimating ? "scale-95 opacity-30 pointer-events-none blur-sm" : "scale-100 opacity-100"}`}>
        
        <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 p-2 rounded-xl">
              <Building2 className="text-emerald-500 w-6 h-6" />
            </div>
            <span className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">Bhatta Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-md hover:bg-slate-50'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => openAuth("login")} className={`px-4 md:px-5 py-2 rounded-xl text-sm font-bold transition-colors ${navTextClass}`}>Login</button>
            <button onClick={() => openAuth("signup")} className="px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all active:scale-95 hidden sm:block">Sign Up</button>
          </div>
        </nav>

        <div className="relative max-w-7xl mx-auto px-6 pt-12 pb-20 md:pt-24 md:pb-32 flex flex-col items-center text-center z-10">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] blur-[120px] rounded-full pointer-events-none -z-10 ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/20'}`}></div>
          
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-emerald-500 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
            <Zap size={14} className="fill-emerald-500 text-emerald-500"/> India's #1 Brick Kiln Software
          </div>
          
          <h1 className={`text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 ${headingTextClass}`}>
            Ditch the Paperwork, <br/>
            <span className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">Embrace the Digital Ledger.</span>
          </h1>
          
          <p className={`${textMuted} text-base md:text-xl max-w-2xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200`}>
            Complete management for your brick kiln. Track labour advances, daily expenses, and payroll in one secure app. Generate instant PDF receipts!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <button onClick={() => openAuth("signup")} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 group">
              Create New Account <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
            </button>
            <button onClick={() => openAuth("login")} className={`px-8 py-4 border rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${btnSecondary}`}>
              <LogIn size={20}/> Login Now
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className={`backdrop-blur-sm border p-6 rounded-3xl transition-colors ${cardClass}`}>
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-2xl mb-4"><Users size={24}/></div>
            <h3 className={`text-xl font-bold mb-2 ${headingTextClass}`}>Smart Labour Sync</h3>
            <p className="text-sm leading-relaxed">Keep all your labour data in one place. Use CSV imports to add bulk details instantly without any manual effort.</p>
          </div>
          <div className={`backdrop-blur-sm border p-6 rounded-3xl transition-colors ${cardClass}`}>
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 flex items-center justify-center rounded-2xl mb-4"><Receipt size={24}/></div>
            <h3 className={`text-xl font-bold mb-2 ${headingTextClass}`}>PDF Receipts</h3>
            <p className="text-sm leading-relaxed">No more confusion. Generate and share clear PDF receipts showing total earnings, expenses, and advances in one click.</p>
          </div>
          <div className={`backdrop-blur-sm border p-6 rounded-3xl transition-colors ${cardClass}`}>
            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 flex items-center justify-center rounded-2xl mb-4"><ShieldCheck size={24}/></div>
            <h3 className={`text-xl font-bold mb-2 ${headingTextClass}`}>100% Secure & Private</h3>
            <p className="text-sm leading-relaxed">Your ledger is completely safe. Password protection and individualized accounts ensure full privacy for everyone.</p>
          </div>
        </div>
      </div>

      {authMode !== "hidden" && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center overflow-hidden">
          <div 
            className={`absolute inset-0 backdrop-blur-xl transition-opacity duration-500 ${overlayClass} ${isAnimating ? "opacity-100" : "opacity-0"}`} 
            onClick={closeAuth}
          ></div>
          
          <div 
            className={`w-full h-[100dvh] md:h-auto md:max-w-md backdrop-blur-3xl md:border p-6 md:p-8 rounded-none md:rounded-[2rem] relative flex flex-col justify-center overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${authBgClass} ${isAnimating ? "translate-y-0" : "translate-y-full"}`}
          >
            {isDark && (
              <>
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/10 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[80px] rounded-full pointer-events-none"></div>
              </>
            )}

            {!isAuthenticating && (
              <>
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-end md:hidden z-50">
                  <button onClick={closeAuth} className={`p-3 backdrop-blur-md rounded-full border transition-colors ${isDark ? 'bg-slate-800/80 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200 shadow-sm'}`}>
                    <X size={24} />
                  </button>
                </div>
                <button onClick={closeAuth} className={`absolute top-5 right-5 p-2 rounded-full transition-colors hidden md:block z-50 ${isDark ? 'bg-slate-700/50 hover:bg-slate-600 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'}`}>
                  <X size={20} />
                </button>
              </>
            )}

            <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col">
              
              {isAuthenticating ? (
                <div className="flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in duration-300">
                  <div className="relative flex items-center justify-center w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                    <Building2 size={32} className="text-blue-500 absolute animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                    {loadingText}
                  </h2>
                  <p className={`text-sm mt-2 font-medium ${textMuted}`}>Connecting to secure server...</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-8 pt-10 md:pt-0">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border shadow-inner mb-4 ${isDark ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50' : 'bg-white border-slate-200 shadow-lg'}`}>
                      <Building2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-2">
                      Bhatta Pro
                    </h1>
                    <p className={`${textMuted} text-sm`}>Your ledger, in your hands.</p>
                  </div>

                  <div className={`flex p-1.5 rounded-xl border mb-8 relative shadow-inner ${toggleBgClass}`}>
                    <div className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] rounded-lg transition-transform duration-300 ease-in-out ${toggleThumbClass} ${authMode === "login" ? 'translate-x-0' : 'translate-x-[calc(100%+12px)]'}`}></div>
                    <button onClick={() => setAuthMode("login")} className={`flex-1 py-3 text-sm font-bold relative z-10 transition-colors ${authMode === "login" ? (isDark ? 'text-white' : 'text-slate-900') : textMuted}`}>Login</button>
                    <button onClick={() => setAuthMode("signup")} className={`flex-1 py-3 text-sm font-bold relative z-10 transition-colors ${authMode === "signup" ? (isDark ? 'text-white' : 'text-slate-900') : textMuted}`}>Sign Up</button>
                  </div>

                  <div className="mt-2 w-full">
                    {authMode === "login" ? (
                      <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative">
                          <User size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input type="text" value={id} onChange={(e) => setId(e.target.value)} placeholder="Email, Phone or ID" className={`w-full rounded-xl pl-12 pr-4 py-4 text-base md:text-sm outline-none transition-all border ${inputClass}`} required disabled={isAuthenticating}/>
                        </div>
                        <div className="relative">
                          <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter Password" className={`w-full rounded-xl pl-12 pr-4 py-4 text-base md:text-sm outline-none transition-all border ${inputClass}`} required disabled={isAuthenticating}/>
                        </div>
                        
                        <button type="submit" disabled={isAuthenticating} className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 group text-base md:text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                          <LogIn size={20} /> Secure Login <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleSignup} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="relative">
                          <User size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className={`w-full rounded-xl pl-12 pr-4 py-4 text-base md:text-sm outline-none transition-all border ${inputClass}`} required disabled={isAuthenticating}/>
                        </div>
                        <div className="relative">
                          <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone Number or Email" className={`w-full rounded-xl pl-12 pr-4 py-4 text-base md:text-sm outline-none transition-all border ${inputClass}`} disabled={isAuthenticating}/>
                        </div>
                        <div className="relative">
                          <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create Password (min 6 chars)" className={`w-full rounded-xl pl-12 pr-4 py-4 text-base md:text-sm outline-none transition-all border ${inputClass}`} required disabled={isAuthenticating} minLength={6}/>
                        </div>

                        <button type="submit" disabled={isAuthenticating} className="w-full py-4 mt-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 group text-base md:text-sm disabled:opacity-70 disabled:cursor-not-allowed">
                          Create Account <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"/>
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="mt-10 mb-4 w-full flex flex-col items-center">
                    <span className={`${textMuted} text-xs uppercase tracking-widest font-bold mb-6`}>Or continue with</span>
                    
                    <button 
                      type="button" 
                      onClick={handleGoogleAuth}
                      disabled={isAuthenticating}
                      className="relative flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg hover:shadow-2xl transition-all hover:scale-110 active:scale-95 group disabled:opacity-50 disabled:hover:scale-100"
                      title="Sign in with Google"
                    >
                      <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-blue-500"></div>
                      <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-blue-400 via-emerald-400 to-yellow-400 blur-sm animate-spin-slow"></div>
                      <div className="relative z-10 w-full h-full bg-white rounded-full flex items-center justify-center">
                        <GoogleIcon />
                      </div>
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}