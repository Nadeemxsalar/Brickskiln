"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveLabourData, getLabourData } from "../../lib/storage";
import { Labour, DailyEntry, Bhatta } from "../../types";
import { Menu, X, FileText, LayoutDashboard, IndianRupee, Users, Building2, Layers, Wallet, Settings, Check, LogOut, CheckSquare, Search, AlertCircle, CheckCircle, TrendingDown, TrendingUp, ChevronRight, ChevronDown, History } from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [bhattas, setBhattas] = useState<Bhatta[]>([]);
  const [activeBhattaId, setActiveBhattaId] = useState<string | null>(null);
  const [labourers, setLabourers] = useState<Labour[]>([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "eent" | "kharcha" | "peshgi" | "manage">("dashboard");

  // Custom Toast/Popup State
  const [toast, setToast] = useState<{msg: string, type: "success" | "error"} | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paya, setPaya] = useState(""); 
  const [ratePaya, setRatePaya] = useState("");

  // Search States
  const [searchDashboard, setSearchDashboard] = useState("");
  const [searchManage, setSearchManage] = useState("");
  const [searchBulk, setSearchBulk] = useState("");
  const [searchPeshgi, setSearchPeshgi] = useState("");

  // Bulk Entry State
  const [selectedLabourIds, setSelectedLabourIds] = useState<string[]>([]);
  const [payeAmount, setPayeAmount] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

  const [kharchaLabourId, setKharchaLabourId] = useState("");
  const [kharchaAmount, setKharchaAmount] = useState("");

  // Peshgi State
  const [peshgiLabourId, setPeshgiLabourId] = useState("");
  const [peshgiAmount, setPeshgiAmount] = useState("");
  const [peshgiDate, setPeshgiDate] = useState(new Date().toISOString().split("T")[0]);
  const [peshgiType, setPeshgiType] = useState<"add" | "deduct">("add");
  const [expandedPeshgiLabourId, setExpandedPeshgiLabourId] = useState<string | null>(null); // For history toggle

  const [editingLabourId, setEditingLabourId] = useState<string | null>(null);
  const [editLabourData, setEditLabourData] = useState<{name: string, phone: string, paya: string, payeRate: number} | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const session = localStorage.getItem("bhatta_session");
    if (session !== "admin") {
      router.push("/");
      return;
    }

    let savedBhattas = getLabourData("bhattas_list") || [];
    if (savedBhattas.length === 0) {
      const defaultBhatta = { id: "bhatta_default", name: "Main Bhatta" };
      savedBhattas = [defaultBhatta];
      saveLabourData("bhattas_list", savedBhattas);
    }
    setBhattas(savedBhattas);
    setActiveBhattaId(savedBhattas[0].id);

    let data: any[] = getLabourData("bhatta_labourers") || [];
    let dataModified = false;
    
    const migratedData: Labour[] = data.map((lab: any) => {
      let newLab = { ...lab };
      if (!newLab.bhattaId) { newLab.bhattaId = "bhatta_default"; dataModified = true; }
      if (newLab.totalKharcha === undefined) { newLab.totalKharcha = 0; dataModified = true; }
      if (newLab.totalPeshgi === undefined) { newLab.totalPeshgi = newLab.totalAdvance || 0; dataModified = true; }
      if (newLab.ratePerPaya === undefined) { newLab.ratePerPaya = 0; dataModified = true; }
      
      const safeEntries = Array.isArray(newLab.entries) ? newLab.entries : [];
      newLab.entries = safeEntries.map((e: any) => ({
        ...e,
        kharcha: e.kharcha || 0,
        peshgi: e.peshgi !== undefined ? e.peshgi : (e.advance || 0),
        payeCount: e.payeCount || 0
      }));
      return newLab as Labour;
    });
    
    if (dataModified) saveLabourData("bhatta_labourers", migratedData);
    setLabourers(migratedData);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("bhatta_session");
    router.push("/");
  };

  const currentLabourers = labourers.filter(lab => lab.bhattaId === activeBhattaId);
  const activeBhattaName = bhattas.find(b => b.id === activeBhattaId)?.name || "Bhatta";

  const handleAddBhatta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBhattaName) return;
    const newBhatta: Bhatta = { id: `bhatta_${Date.now()}`, name: newBhattaName };
    const updated = [...bhattas, newBhatta];
    setBhattas(updated); saveLabourData("bhattas_list", updated);
    setActiveBhattaId(newBhatta.id); setNewBhattaName(""); setIsAddingBhatta(false); setIsSidebarOpen(false);
  };

  const handleAddLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !activeBhattaId) return showToast("Please fill basic details!", "error");
    const newLabour: Labour = {
      id: Date.now().toString(), bhattaId: activeBhattaId, 
      name, phone, ratePerThousand: 0, ratePerPaya: Number(ratePaya) || 0, paya: paya || "-",
      totalBricks: 0, totalPaye: 0, totalKharcha: 0, totalPeshgi: 0, entries: [], 
    };
    const updatedList = [...labourers, newLabour];
    setLabourers(updatedList); saveLabourData("bhatta_labourers", updatedList);
    setName(""); setPhone(""); setRatePaya(""); setPaya("");
    showToast("Naya labour add ho gaya!", "success");
  };

  const handleAddWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLabourIds.length === 0) return showToast("Kripya kam se kam ek labour select karein!", "error");
    const paye = Number(payeAmount) || 0;
    if (paye === 0) return showToast("Please enter Paye count!", "error");

    let updatedLabourers = [...labourers];

    selectedLabourIds.forEach(id => {
      const labourIndex = updatedLabourers.findIndex(l => l.id === id);
      if (labourIndex === -1) return;
      const selectedLabour = updatedLabourers[labourIndex];
      const activePayeRate = selectedLabour.ratePerPaya || 0; 

      let entryExists = false;
      const updatedEntries = (Array.isArray(selectedLabour.entries) ? selectedLabour.entries : []).map((e: any) => {
        if (e.date === entryDate) {
          entryExists = true;
          return { ...e, payeCount: (e.payeCount || 0) + paye, customRatePerPaya: activePayeRate };
        }
        return e;
      });

      if (!entryExists) {
        updatedEntries.push({
          id: Date.now().toString() + Math.random().toString(),
          date: entryDate, bricks: 0, payeCount: paye, customRatePerPaya: activePayeRate, kharcha: 0, peshgi: 0
        });
      }
      updatedLabourers[labourIndex] = { ...selectedLabour, entries: updatedEntries, totalPaye: (selectedLabour.totalPaye || 0) + paye };
    });

    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setPayeAmount(""); setSelectedLabourIds([]); 
    showToast("Work entry successfully chadh gayi!", "success");
  };

  const handleAddKharcha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kharchaLabourId || !kharchaAmount) return showToast("Select labour and enter amount!", "error");
    const amount = Number(kharchaAmount);
    if (amount <= 0) return showToast("Amount galat hai!", "error");

    const newEntry: DailyEntry = { id: Date.now().toString(), date: new Date().toISOString().split("T")[0], bricks: 0, payeCount: 0, kharcha: amount, peshgi: 0 };
    const updatedLabourers = labourers.map(lab => {
      if (lab.id === kharchaLabourId) return { ...lab, entries: [...lab.entries, newEntry], totalKharcha: (lab.totalKharcha || 0) + amount };
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setKharchaAmount(""); setKharchaLabourId(""); 
    showToast("Kharcha add ho gaya!", "success");
  };

  const handleAddPeshgi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peshgiLabourId || !peshgiAmount) return showToast("Select labour and enter amount!", "error");
    const amount = Number(peshgiAmount);
    if (amount <= 0) return showToast("Amount galat hai!", "error");

    const finalAmount = peshgiType === "add" ? amount : -amount;

    const updatedLabourers = labourers.map(lab => {
      if (lab.id === peshgiLabourId) {
        let entryExists = false;
        const updatedEntries = (Array.isArray(lab.entries) ? lab.entries : []).map((e: any) => {
          if (e.date === peshgiDate) {
            entryExists = true;
            return { ...e, peshgi: (e.peshgi || 0) + finalAmount };
          }
          return e;
        });

        if (!entryExists) {
          updatedEntries.push({
            id: Date.now().toString() + Math.random().toString(),
            date: peshgiDate, bricks: 0, payeCount: 0, customRatePerPaya: lab.ratePerPaya || 0, kharcha: 0, peshgi: finalAmount
          });
        }
        
        const newTotalPeshgi = updatedEntries.reduce((sum: number, e: any) => sum + (e.peshgi || 0), 0);
        return { ...lab, entries: updatedEntries, totalPeshgi: newTotalPeshgi };
      }
      return lab;
    });

    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setPeshgiAmount(""); setPeshgiLabourId(""); 
    showToast(`Peshgi successfully ${peshgiType === 'add' ? 'Add' : 'Jama'} ho gayi!`, "success");
  };

  const handleSaveLabourEdit = (id: string) => {
    if(!editLabourData) return;
    const updatedLabourers = labourers.map(lab => {
      if(lab.id === id) return { ...lab, name: editLabourData.name, phone: editLabourData.phone, paya: editLabourData.paya, ratePerPaya: editLabourData.payeRate };
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setEditingLabourId(null); setEditLabourData(null);
    showToast("Details update ho gayi!", "success");
  };

  const changeTab = (tab: "dashboard" | "eent" | "kharcha" | "peshgi" | "manage") => {
    setActiveTab(tab); setIsSidebarOpen(false);
  };

  // Search Filters
  const filteredDashboard = currentLabourers.filter(l => l.name.toLowerCase().includes(searchDashboard.toLowerCase()));
  const filteredManage = currentLabourers.filter(l => l.name.toLowerCase().includes(searchManage.toLowerCase()));
  const filteredBulk = currentLabourers.filter(l => l.name.toLowerCase().includes(searchBulk.toLowerCase()));
  const filteredPeshgi = currentLabourers.filter(l => l.name.toLowerCase().includes(searchPeshgi.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-blue-500/30">
      
      {/* 🟢 CUSTOM TOAST POPUP */}
      {toast && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={22} /> : <CheckCircle size={22} />}
          <span className="font-semibold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* 🟢 TOP NAVBAR */}
      <nav className="fixed top-0 w-full h-16 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-700/50 z-40 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-xl transition text-white">
            <Menu size={28} />
          </button>
          <div className="ml-4 flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent leading-none">
              Bhatta Pro
            </h1>
            <span className="text-xs text-emerald-400 font-medium">{activeBhattaName}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition text-sm font-semibold border border-red-500/20">
          <LogOut size={16}/> Logout
        </button>
      </nav>

      {/* 🟢 SIDEBAR */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`fixed top-0 left-0 h-full w-72 bg-[#1e293b] border-r border-slate-700/50 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <h2 className="text-xl font-bold">Admin Menu</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-700 rounded-xl"><X size={24} /></button>
        </div>
        
        <div className="p-4 space-y-2 flex-1">
          <button onClick={() => changeTab("dashboard")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "hover:bg-slate-800 text-gray-300"}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => changeTab("manage")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === "manage" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "hover:bg-slate-800 text-gray-300"}`}><Settings size={20} /> Manage Labour</button>
          <button onClick={() => changeTab("eent")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === "eent" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30" : "hover:bg-slate-800 text-gray-300"}`}><Layers size={20} /> Work Entry</button>
          <button onClick={() => changeTab("kharcha")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === "kharcha" ? "bg-orange-600 text-white shadow-lg shadow-orange-500/30" : "hover:bg-slate-800 text-gray-300"}`}><Wallet size={20} /> Expenses</button>
          <button onClick={() => changeTab("peshgi")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === "peshgi" ? "bg-red-600 text-white shadow-lg shadow-red-500/30" : "hover:bg-slate-800 text-gray-300"}`}><IndianRupee size={20} /> Advance (Peshgi)</button>
        </div>

        <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Building2 size={14}/> Work Sites</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3 pr-2 custom-scrollbar">
            {bhattas.map(b => (
              <button key={b.id} onClick={() => { setActiveBhattaId(b.id); setIsSidebarOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition border ${activeBhattaId === b.id ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-transparent hover:bg-slate-700 text-gray-300'}`}>{b.name}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 🟢 MAIN CONTENT */}
      <main className="pt-24 px-4 md:px-8 max-w-6xl mx-auto pb-12">
        
        {/* ===================== DASHBOARD ===================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Users size={20} className="text-blue-400"/> Add New Labour ({activeBhattaName})</h2>
              <form onSubmit={handleAddLabour} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 outline-none" placeholder="Name" /></div>
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Mobile</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 outline-none" placeholder="Number" /></div>
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Work Location (Jagah)</label><input type="text" value={paya} onChange={(e) => setPaya(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 focus:border-blue-500 rounded-lg px-3 py-2 outline-none" placeholder="e.g. Line 1" /></div>
                <div><label className="block text-xs font-bold text-emerald-400 mb-1">Rate Per Paye (₹)</label><input type="number" value={ratePaya} onChange={(e) => setRatePaya(e.target.value)} className="w-full bg-slate-900/50 border border-emerald-500/50 focus:border-emerald-400 rounded-lg px-3 py-2 outline-none" placeholder="e.g. 35" /></div>
                <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition shadow-md md:col-span-1 sm:col-span-2 text-sm">Add Labour</button>
              </form>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-lg font-semibold text-white">Overview ({activeBhattaName}) - {filteredDashboard.length} Labourers</h2>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search labour..." value={searchDashboard} onChange={(e) => setSearchDashboard(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm focus:border-blue-500 outline-none w-full md:w-64" />
                </div>
              </div>

              <div className="space-y-4">
                {filteredDashboard.length === 0 && <p className="text-slate-400 text-center py-4">No results found.</p>}
                {filteredDashboard.map((lab) => {
                  let payeKamai = 0;
                  (lab.entries || []).forEach(e => { payeKamai += (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0)); });
                  const safeTotalKharcha = lab.totalKharcha || 0;
                  const safeTotalPeshgi = lab.totalPeshgi !== undefined ? lab.totalPeshgi : ((lab as any).totalAdvance || 0);

                  return (
                    <div key={lab.id} className="p-4 bg-slate-900/40 rounded-xl border border-slate-700/50 flex flex-col lg:flex-row justify-between items-center gap-4 hover:bg-slate-800/60 transition">
                      <div className="flex-1 w-full text-left">
                        <h3 className="font-bold text-xl text-white">{lab.name}</h3>
                        <p className="text-sm text-slate-400 mt-1">{lab.phone} | Location: <span className="text-blue-300">{lab.paya || "-"}</span></p>
                      </div>
                      <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 justify-start lg:justify-center">
                        <div className="text-left bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50"><p className="text-emerald-400 text-[10px] uppercase tracking-wider">Earned</p><p className="text-lg font-bold">₹{payeKamai.toLocaleString()}</p></div>
                        <div className="text-left bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50"><p className="text-orange-400 text-[10px] uppercase tracking-wider">Expenses</p><p className="text-lg font-bold">₹{safeTotalKharcha.toLocaleString()}</p></div>
                        <div className="text-left bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700/50"><p className="text-rose-400 text-[10px] uppercase tracking-wider">Advance</p><p className="text-lg font-bold">₹{safeTotalPeshgi.toLocaleString()}</p></div>
                      </div>
                      <div className="w-full lg:w-auto flex justify-end">
                        <Link href={`/labour/${lab.id}`} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium whitespace-nowrap shadow-md">
                          <FileText size={18} /> View Register
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================== MANAGE LABOUR TAB ===================== */}
        {activeTab === "manage" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2"><Settings size={24} /> Labour Details & Rates</h2>
                  <p className="text-xs text-slate-400 mt-1">Yahan set kiya gaya Paye Rate aage ki sabhi entries par lagoo hoga.</p>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search..." value={searchManage} onChange={(e) => setSearchManage(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm focus:border-indigo-500 outline-none w-full md:w-64" />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-300 text-xs uppercase tracking-wider border-b border-slate-700">
                      <th className="p-4 font-semibold">Name</th><th className="p-4 font-semibold">Mobile</th><th className="p-4 font-semibold">Location</th><th className="p-4 font-semibold text-emerald-400">Rate Per Paye (₹)</th><th className="p-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-200 text-sm">
                    {filteredManage.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-slate-500">No results found.</td></tr>}
                    {filteredManage.map(lab => {
                      const isEditing = editingLabourId === lab.id;
                      return (
                        <tr key={lab.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.name} onChange={(e)=>setEditLabourData({...editLabourData!, name: e.target.value})} className="w-full bg-slate-900 border border-indigo-500/50 rounded px-2 py-1 outline-none"/> : lab.name}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.phone} onChange={(e)=>setEditLabourData({...editLabourData!, phone: e.target.value})} className="w-full bg-slate-900 border border-indigo-500/50 rounded px-2 py-1 outline-none"/> : lab.phone}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.paya} onChange={(e)=>setEditLabourData({...editLabourData!, paya: e.target.value})} className="w-full bg-slate-900 border border-indigo-500/50 rounded px-2 py-1 outline-none"/> : (lab.paya || "-")}</td>
                          <td className="p-3">{isEditing ? <input type="number" value={editLabourData?.payeRate} onChange={(e)=>setEditLabourData({...editLabourData!, payeRate: Number(e.target.value)})} className="w-full bg-slate-900 border border-emerald-500 rounded px-2 py-1 outline-none text-emerald-400 font-bold"/> : <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-md">₹{lab.ratePerPaya || 0}</span>}</td>
                          <td className="p-3 text-center">{isEditing ? <button onClick={() => handleSaveLabourEdit(lab.id)} className="bg-emerald-600 px-4 py-1.5 rounded-lg text-white font-bold"><Check size={14}/> Save</button> : <button onClick={() => { setEditingLabourId(lab.id); setEditLabourData({name: lab.name, phone: lab.phone, paya: lab.paya || "", payeRate: lab.ratePerPaya || 0}); }} className="bg-slate-700 px-4 py-1.5 rounded-lg text-slate-300 text-xs">Edit</button>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== WORK ENTRY TAB ===================== */}
        {activeTab === "eent" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6">
              
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h2 className="text-xl font-bold mb-2 text-emerald-400 flex items-center gap-2"><CheckSquare size={22} /> Add Bulk Work</h2>
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Date</label><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 text-sm" required /></div>
                <div><label className="block text-xs font-bold text-emerald-400 mb-1">Paye Count (For Selected)</label><input type="number" value={payeAmount} onChange={(e) => setPayeAmount(e.target.value)} className="w-full bg-slate-900/80 border border-emerald-500/50 rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400 text-emerald-100 text-lg font-bold" placeholder="e.g. 5" /></div>
                <div className="mt-2 text-xs text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-700">💡 Jin labourers ko select karenge, un sabhi ke account mein upar likhe hue Paye add ho jayenge unke apne individual rate ke hisaab se.</div>
                <button onClick={handleAddWork} className="w-full mt-auto py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">Submit Bulk Entry</button>
              </div>

              <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Labourers ({selectedLabourIds.length} Selected)</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search..." value={searchBulk} onChange={(e) => setSearchBulk(e.target.value)} className="pl-8 pr-3 py-1.5 bg-slate-900/50 border border-slate-600 rounded-md text-xs focus:border-emerald-500 outline-none w-full sm:w-48" />
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl max-h-[300px] overflow-y-auto custom-scrollbar shadow-inner">
                  <label className="flex items-center gap-3 p-3 hover:bg-slate-800/80 cursor-pointer border-b border-slate-700/50 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
                    <input type="checkbox" className="w-4 h-4 accent-emerald-500 rounded" checked={selectedLabourIds.length === filteredBulk.length && filteredBulk.length > 0} onChange={(e) => { e.target.checked ? setSelectedLabourIds(filteredBulk.map(l => l.id)) : setSelectedLabourIds([]); }} />
                    <span className="text-sm font-bold text-white">Select All ({filteredBulk.length})</span>
                  </label>
                  {filteredBulk.length === 0 && <p className="text-slate-500 text-sm p-4 text-center">No labourers found.</p>}
                  {filteredBulk.map(lab => (
                    <label key={lab.id} className={`flex items-center justify-between p-3 cursor-pointer border-b border-slate-700/30 last:border-0 transition-colors ${selectedLabourIds.includes(lab.id) ? 'bg-emerald-900/20' : 'hover:bg-slate-800/50'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-4 h-4 accent-emerald-500 rounded" checked={selectedLabourIds.includes(lab.id)} onChange={(e) => { e.target.checked ? setSelectedLabourIds([...selectedLabourIds, lab.id]) : setSelectedLabourIds(selectedLabourIds.filter(id => id !== lab.id)); }} />
                        <div><span className={`text-sm font-semibold block ${selectedLabourIds.includes(lab.id) ? 'text-emerald-300' : 'text-slate-300'}`}>{lab.name}</span><span className="text-[10px] text-slate-500 uppercase">{lab.paya || "No Location"}</span></div>
                      </div>
                      <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded-md">Rate: ₹{lab.ratePerPaya}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6">
              <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2">Records for <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{entryDate}</span></h3>
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700"><th className="p-4 font-semibold">Name</th><th className="p-4 font-semibold">Location</th><th className="p-4 font-semibold text-emerald-400">Total Paye</th><th className="p-4 font-semibold text-cyan-400">Earned</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-slate-200 text-sm">
                      {currentLabourers.filter(lab => lab.entries.some(e => e.date === entryDate && e.payeCount > 0)).length === 0 ? (
                        <tr><td colSpan={4} className="p-6 text-center text-slate-500 italic">No work entries found for this date.</td></tr>
                      ) : (
                        currentLabourers.map(lab => {
                          const entry = lab.entries.find(e => e.date === entryDate && e.payeCount > 0);
                          if (!entry) return null;
                          const rate = entry.customRatePerPaya !== undefined ? entry.customRatePerPaya : (lab.ratePerPaya || 0);
                          const earned = entry.payeCount * rate;
                          return (
                            <tr key={lab.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-4 font-medium text-white">{lab.name}</td><td className="p-4 text-slate-400">{lab.paya || "-"}</td><td className="p-4 font-bold text-emerald-400 bg-emerald-900/10">{entry.payeCount} <span className="text-xs text-slate-500 font-normal ml-1">(@ ₹{rate})</span></td><td className="p-4 font-bold text-cyan-400">₹{earned.toLocaleString()}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== KHARCHA TAB ===================== */}
        {activeTab === "kharcha" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-orange-400 flex items-center gap-2"><Wallet size={24} /> Add Expenses</h2>
              <form onSubmit={handleAddKharcha} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label className="block text-xs font-medium text-slate-400 mb-1">Select Labour</label>
                  <select value={kharchaLabourId} onChange={(e) => setKharchaLabourId(e.target.value)} className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 outline-none focus:border-orange-500" required>
                    <option value="">-- Select Labour --</option>
                    {currentLabourers.map(lab => (<option key={lab.id} value={lab.id} className="bg-slate-800">{lab.name}</option>))}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-orange-400 mb-1">Amount (₹)</label><input type="number" value={kharchaAmount} onChange={(e) => setKharchaAmount(e.target.value)} className="w-full bg-slate-900/50 border border-orange-500/50 rounded-lg px-3 py-2 outline-none focus:border-orange-400 text-orange-100" placeholder="e.g. 500" required /></div>
                <button type="submit" className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition shadow-md">Add Expense</button>
              </form>
            </div>
          </div>
        )}

        {/* ===================== NEW PESHGI TAB (HISTORY + ADD/DEDUCT) ===================== */}
        {activeTab === "peshgi" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6">
              
              {/* Peshgi Form */}
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h2 className="text-xl font-bold mb-2 text-rose-400 flex items-center gap-2"><IndianRupee size={22} /> Manage Peshgi</h2>
                
                <form onSubmit={handleAddPeshgi} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                    <input type="date" value={peshgiDate} onChange={(e) => setPeshgiDate(e.target.value)} className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 outline-none focus:border-rose-500 text-sm shadow-inner" required />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Select Labour</label>
                    <select value={peshgiLabourId} onChange={(e) => setPeshgiLabourId(e.target.value)} className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-3 py-2.5 outline-none focus:border-rose-500 text-sm" required>
                      <option value="">-- Select Labour --</option>
                      {currentLabourers.map(lab => (<option key={lab.id} value={lab.id}>{lab.name}</option>))}
                    </select>
                  </div>

                  {/* Add or Deduct Toggle */}
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button type="button" onClick={() => setPeshgiType("add")} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${peshgiType === "add" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"}`}>
                      <TrendingUp size={14}/> Add Advance
                    </button>
                    <button type="button" onClick={() => setPeshgiType("deduct")} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${peshgiType === "deduct" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"}`}>
                      <TrendingDown size={14}/> Jama/Return
                    </button>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1 ${peshgiType === 'add' ? 'text-rose-400' : 'text-emerald-400'}`}>Amount (₹)</label>
                    <input type="number" value={peshgiAmount} onChange={(e) => setPeshgiAmount(e.target.value)} className={`w-full bg-slate-900/80 border rounded-lg px-3 py-2.5 outline-none text-lg font-bold shadow-inner ${peshgiType === 'add' ? 'border-rose-500/50 focus:border-rose-400 text-rose-100' : 'border-emerald-500/50 focus:border-emerald-400 text-emerald-100'}`} placeholder="e.g. 5000" required />
                  </div>

                  <button type="submit" className={`w-full py-3.5 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 ${peshgiType === 'add' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'}`}>
                    Submit Transaction
                  </button>
                </form>
              </div>

              {/* Peshgi Record List with History */}
              <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Advance Details & History</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search..." value={searchPeshgi} onChange={(e) => setSearchPeshgi(e.target.value)} className="pl-8 pr-3 py-1.5 bg-slate-900/50 border border-slate-600 rounded-md text-xs focus:border-rose-500 outline-none w-full sm:w-48" />
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-700">
                      <tr><th className="p-3">Labour Name</th><th className="p-3">Location</th><th className="p-3 text-right text-rose-400">Total Advance</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 text-slate-200 text-sm">
                      {filteredPeshgi.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-slate-500">No records found.</td></tr>}
                      {filteredPeshgi.map(lab => {
                        const totalPeshgi = lab.totalPeshgi !== undefined ? lab.totalPeshgi : ((lab as any).totalAdvance || 0);
                        const isExpanded = expandedPeshgiLabourId === lab.id;
                        
                        // Extracting Peshgi History
                        const peshgiHistory = lab.entries
                          .filter(e => e.peshgi && e.peshgi !== 0)
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return (
                          <React.Fragment key={lab.id}>
                            <tr 
                              onClick={() => setExpandedPeshgiLabourId(isExpanded ? null : lab.id)}
                              className={`hover:bg-slate-800/60 transition-colors cursor-pointer ${isExpanded ? 'bg-slate-800/40' : ''}`}
                            >
                              <td className="p-3 font-semibold flex items-center gap-2">
                                <span className="text-slate-500">{isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span>
                                {lab.name}
                              </td>
                              <td className="p-3 text-slate-400 text-xs">{lab.paya || "-"}</td>
                              <td className={`p-3 text-right font-bold ${totalPeshgi > 0 ? 'text-rose-400' : 'text-slate-500'}`}>₹{totalPeshgi.toLocaleString()}</td>
                            </tr>
                            
                            {/* NAYA: EXPANDABLE HISTORY TABLE */}
                            {isExpanded && (
                              <tr className="bg-slate-950/80">
                                <td colSpan={3} className="p-4 border-l-2 border-rose-500">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><History size={14}/> Transaction History</h4>
                                  {peshgiHistory.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">Koi advance history nahi hai.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {peshgiHistory.map(entry => (
                                        <div key={entry.id} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg border border-slate-700/50">
                                          <span className="text-xs text-slate-300 font-medium">{entry.date}</span>
                                          {entry.peshgi! > 0 ? (
                                            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded">Diya (Given): ₹{entry.peshgi}</span>
                                          ) : (
                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Jama (Returned): ₹{Math.abs(entry.peshgi!)}</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}