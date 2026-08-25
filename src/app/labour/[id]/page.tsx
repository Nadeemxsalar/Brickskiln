"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getLabourData, saveLabourData } from "../../../lib/storage";
import { Labour } from "../../../types";
import { IndianRupee, ArrowLeft, Layers, MessageSquare, MessageSquareText, Check, LayoutList, Table, Edit3, X, PlusCircle, LogOut, Calculator, Download } from "lucide-react";
import Link from "next/link";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function LabourView({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params); 
  const [labour, setLabour] = useState<Labour | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const [editingRemark, setEditingRemark] = useState<{ date: string; text: string } | null>(null);
  const [editingRowDate, setEditingRowDate] = useState<string | null>(null);
  const [editPaye, setEditPaye] = useState<string>("");
  const [editKharcha, setEditKharcha] = useState<string>("");

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  
  const [includePeshgi, setIncludePeshgi] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("bhatta_session");

    if (session === "admin") {
      setIsAdmin(true);
      setIsAuthorized(true);
    } else if (session === `user_${id}`) {
      setIsAdmin(false); 
      setIsAuthorized(true);
    } else {
      router.push("/");
      return;
    }

    const data: Labour[] = getLabourData("bhatta_labourers") || [];
    const foundLabour = data.find((l) => l.id === id);
    if (foundLabour) setLabour(foundLabour);
  }, [id, router]);

  const handleLogout = () => {
    localStorage.removeItem("bhatta_session");
    router.push("/");
  };

  if (!isAuthorized || !labour) return <div className="min-h-screen flex items-center justify-center text-white bg-[#0f172a] font-sans">Loading Data...</div>;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getEntryForDate = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const safeEntries = Array.isArray(labour.entries) ? labour.entries : [];
    return { entry: safeEntries.find((e) => e.date === formattedDate), formattedDate };
  };

  const handleSaveRemark = (dateStr: string) => {
    if (!editingRemark || editingRemark.date !== dateStr) return;
    const allLabourers = getLabourData("bhatta_labourers") || [];
    
    const updatedLabourers = allLabourers.map((l: any) => {
      if (l.id === labour.id) {
        let entryExists = false;
        const updatedEntries = (Array.isArray(l.entries) ? l.entries : []).map((e: any) => {
          if (e.date === dateStr) { entryExists = true; return { ...e, remark: editingRemark.text }; }
          return e;
        });

        if (!entryExists && editingRemark.text.trim() !== "") {
          updatedEntries.push({ 
            id: Date.now().toString() + Math.random().toString(), 
            date: dateStr, 
            payeCount: 0, 
            customRatePerPaya: l.ratePerPaya || 0,
            kharcha: 0, 
            peshgi: 0, 
            remark: editingRemark.text 
          });
        }
        const updatedL = { ...l, entries: updatedEntries };
        setLabour(updatedL); 
        return updatedL;
      }
      return l;
    });
    saveLabourData("bhatta_labourers", updatedLabourers);
    setEditingRemark(null);
  };

  const handleSaveRowData = (dateStr: string) => {
    if (!isAdmin) return; 
    const newPaye = Number(editPaye) || 0;
    const newKharcha = Number(editKharcha) || 0;
    const currentDefaultRate = labour.ratePerPaya || 0;

    const allLabourers = getLabourData("bhatta_labourers") || [];
    let totalPayeSum = 0;
    let totalKharchaSum = 0;

    const updatedLabourers = allLabourers.map((l: any) => {
      if (l.id === labour.id) {
        let entryFound = false;
        const updatedEntries = (Array.isArray(l.entries) ? l.entries : []).map((e: any) => {
          if (e.date === dateStr) {
            entryFound = true;
            const finalRate = e.customRatePerPaya !== undefined ? e.customRatePerPaya : currentDefaultRate;
            return { ...e, payeCount: newPaye, customRatePerPaya: finalRate, kharcha: newKharcha };
          }
          return e;
        });

        if (!entryFound && (newPaye > 0 || newKharcha > 0)) {
          updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: dateStr, payeCount: newPaye, customRatePerPaya: currentDefaultRate, kharcha: newKharcha, peshgi: 0 });
        }

        totalPayeSum = updatedEntries.reduce((sum: number, e: any) => sum + (e.payeCount || 0), 0);
        totalKharchaSum = updatedEntries.reduce((sum: number, e: any) => sum + (e.kharcha || 0), 0);

        const updatedLabour = { ...l, totalPaye: totalPayeSum, totalKharcha: totalKharchaSum, entries: updatedEntries };
        setLabour(updatedLabour);
        return updatedLabour;
      }
      return l;
    });

    saveLabourData("bhatta_labourers", updatedLabourers);
    setEditingRowDate(null);
  };

  const defaultPayeRate = labour.ratePerPaya || 0;
  let lifetimeEarned = 0;
  const safeEntries = Array.isArray(labour.entries) ? labour.entries : [];
  
  safeEntries.forEach(e => {
    const activeRate = e.customRatePerPaya !== undefined ? e.customRatePerPaya : defaultPayeRate;
    lifetimeEarned += (e.payeCount || 0) * activeRate;
  });

  const lifetimeKharcha = labour.totalKharcha || 0;
  const lifetimePeshgi = labour.totalPeshgi !== undefined ? labour.totalPeshgi : ((labour as any).totalAdvance || 0);

  const deductions = lifetimeKharcha + (includePeshgi ? lifetimePeshgi : 0);
  const grandTotal = lifetimeEarned - deductions;

  const downloadMyParchi = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175); 
    doc.text(`Bhatta Pro - Hisaab Parchi`, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Labour Name: ${labour.name}`, 14, 32);
    doc.text(`Login ID: ${(labour as any).loginId || "-"}`, 14, 40);
    doc.text(`Mobile: ${labour.phone || "-"}`, 14, 48);
    doc.text(`Location: ${labour.paya || "-"}`, 14, 56);
    
    doc.setFontSize(12);
    doc.text(`Total Kamai: Rs ${lifetimeEarned.toLocaleString()}`, 120, 32);
    doc.text(`Total Kharcha: Rs ${lifetimeKharcha.toLocaleString()}`, 120, 40);
    doc.text(`Total Peshgi: Rs ${lifetimePeshgi.toLocaleString()}`, 120, 48);
    
    doc.setFont("helvetica", "bold");
    if(grandTotal < 0) {
      doc.setTextColor(220, 38, 38); 
      const text = isAdmin ? "(Labour Par Nikal Rahe Hain)" : "(Aap par Advance nikal raha hai)";
      doc.text(`Final Balance: Rs ${Math.abs(grandTotal).toLocaleString()} ${text}`, 120, 56);
    } else {
      doc.setTextColor(16, 185, 129); 
      const text = isAdmin ? "(Labour Ko Dene Hain)" : "(Aapko lene hain)";
      doc.text(`Final Balance: Rs ${grandTotal.toLocaleString()} ${text}`, 120, 56);
    }

    const tableData = (labour.entries || [])
      .filter((e:any) => e.payeCount > 0 || e.kharcha > 0 || e.peshgi !== 0 || e.remark)
      .map((e:any) => [
        e.date,
        e.payeCount || 0,
        (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (labour.ratePerPaya || 0)),
        e.kharcha || 0,
        e.peshgi || 0,
        e.remark || "-"
      ]);

    autoTable(doc, {
      startY: 65,
      head: [['Date', 'Paye', 'Earned', 'Kharcha', 'Peshgi', 'Remark']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });

    doc.save(`${labour.name}_Full_Parchi.pdf`);
  };

  let monthTotalPaye = 0;
  let monthTotalEarnings = 0;
  let monthTotalExpenses = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = safeEntries.find((e: any) => e.date === formattedDate);

    if (entry) {
      const paye = entry.payeCount || 0;
      const kharcha = entry.kharcha || 0;
      const activeRate = entry.customRatePerPaya !== undefined ? entry.customRatePerPaya : defaultPayeRate;

      monthTotalPaye += paye;
      monthTotalEarnings += (paye * activeRate);
      monthTotalExpenses += kharcha;
    }
  }

  const isCard = viewMode === "card";
  const inputBaseStyle = "bg-[#1e293b] border border-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-md px-3 py-1.5 text-sm outline-none transition-all shadow-inner";

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 font-sans pb-20 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* NAYA: Header Mobile Fix - Logout right side on top */}
        <div className="flex items-start justify-between gap-3 md:gap-4">
          <div className="flex items-start gap-3 md:gap-4">
            {isAdmin && (
              <Link href="/admin" className="p-2 md:p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition border border-slate-700 shrink-0 shadow-sm mt-1">
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
              </Link>
            )}
            <div>
              <h1 className="text-xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent drop-shadow-sm flex items-center gap-2 md:gap-3 flex-wrap">
                {labour.name} 
                {(labour as any).loginId && (
                  <span className="text-[10px] md:text-xl font-bold bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-0.5 md:px-3 md:py-1 rounded-lg">
                    ID: {(labour as any).loginId}
                  </span>
                )}
              </h1>
              <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-3">
                {isAdmin && ( 
                  <span className="text-emerald-300 text-[10px] md:text-sm font-medium bg-emerald-500/10 px-2.5 py-1 md:px-3 rounded-full border border-emerald-500/20 flex items-center gap-1 md:gap-1.5 backdrop-blur-sm">
                    <IndianRupee className="w-3 md:w-3.5 h-3 md:h-3.5" /> Rate: ₹{defaultPayeRate}
                  </span>
                )}
                <span className="text-blue-300 text-[10px] md:text-sm font-medium bg-blue-500/10 px-2.5 py-1 md:px-3 rounded-full border border-blue-500/20 flex items-center gap-1 md:gap-1.5 backdrop-blur-sm">
                  <Layers className="w-3 md:w-3.5 h-3 md:h-3.5" /> Loc: {labour.paya || "-"}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="shrink-0 flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition text-xs md:text-sm font-semibold border border-red-500/20 mt-1"
          >
            <LogOut size={14} className="md:w-[18px] md:h-[18px]" /> Logout
          </button>
        </div>

        {/* ================= GRAND TOTAL SECTION (Mobile Optimized) ================= */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-5 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            <div className="flex-1 w-full">
              <p className="text-slate-400 font-bold tracking-widest text-xs uppercase mb-2 flex items-center gap-2">
                <Calculator size={16} /> Final Net Balance
              </p>
              <h2 className={`text-4xl md:text-5xl font-extrabold ${grandTotal < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                {grandTotal < 0 ? "-" : ""}₹{Math.abs(grandTotal).toLocaleString()}
                
                <span className="block md:inline-block text-sm md:text-lg font-semibold ml-0 md:ml-3 mt-1 md:mt-0 text-slate-300 opacity-90">
                  {grandTotal < 0 
                    ? (isAdmin ? "(Labour Par Nikal Rahe Hain)" : "(Aap par Advance nikal raha hai)") 
                    : (isAdmin ? "(Labour Ko Dene Hain)" : "(Aapko Bhatte se lene hain)")}
                </span>
              </h2>
              
              <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6 pt-5 border-t border-slate-700/50">
                <div className="bg-slate-900/60 p-2.5 md:p-4 rounded-xl border border-cyan-500/20 text-center flex flex-col justify-center">
                  <span className="text-[10px] md:text-xs text-cyan-500/80 uppercase tracking-widest font-bold mb-1">Kamai</span>
                  <span className="text-sm md:text-xl font-extrabold text-cyan-400">₹{lifetimeEarned.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 md:p-4 rounded-xl border border-orange-500/20 text-center flex flex-col justify-center">
                  <span className="text-[10px] md:text-xs text-orange-500/80 uppercase tracking-widest font-bold mb-1">Kharcha</span>
                  <span className="text-sm md:text-xl font-extrabold text-orange-400">₹{lifetimeKharcha.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/60 p-2.5 md:p-4 rounded-xl border border-rose-500/20 text-center flex flex-col justify-center">
                  <span className="text-[10px] md:text-xs text-rose-500/80 uppercase tracking-widest font-bold mb-1">Peshgi</span>
                  <span className="text-sm md:text-xl font-extrabold text-rose-400">₹{lifetimePeshgi.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Actions: Toggle & Download */}
            <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 mt-2 lg:mt-0">
              <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 w-full lg:w-auto flex flex-1 lg:flex-none">
                <button 
                  onClick={() => setIncludePeshgi(true)} 
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${includePeshgi ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Include Peshgi
                </button>
                <button 
                  onClick={() => setIncludePeshgi(false)} 
                  className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${!includePeshgi ? "bg-slate-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}
                >
                  Exclude Peshgi
                </button>
              </div>

              <button 
                onClick={downloadMyParchi} 
                title="Download PDF Parchi"
                className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md active:scale-95 border border-indigo-500/50 flex-shrink-0"
              >
                <Download size={22}/>
              </button>
            </div>

          </div>
        </div>

        {/* Month Selector & Monthly Summary */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
          <div className="col-span-2 xl:col-span-1 bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <button onClick={() => { if(currentMonth===0){setCurrentMonth(11); setCurrentYear(p=>p-1);} else setCurrentMonth(p=>p-1); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">Prev</button>
            <div className="text-center">
              <h2 className="text-lg font-bold tracking-wide">{monthNames[currentMonth]} {currentYear}</h2>
            </div>
            <button onClick={() => { if(currentMonth===11){setCurrentMonth(0); setCurrentYear(p=>p+1);} else setCurrentMonth(p=>p+1); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">Next</button>
          </div>

          <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-500/30 p-4 md:p-5 rounded-2xl shadow-lg">
            <p className="text-xs text-cyan-300 font-semibold uppercase tracking-wider mb-1">Earned (This Month)</p>
            <h3 className="text-2xl md:text-3xl font-bold text-cyan-400">₹{monthTotalEarnings.toLocaleString()}</h3>
          </div>

          <div className="bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 p-4 md:p-5 rounded-2xl shadow-lg">
            <p className="text-xs text-orange-300 font-semibold uppercase tracking-wider mb-1">Expenses (This Month)</p>
            <h3 className="text-2xl md:text-3xl font-bold text-orange-400">₹{monthTotalExpenses.toLocaleString()}</h3>
          </div>

          <div className="col-span-2 xl:col-span-1 bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/30 p-4 md:p-5 rounded-2xl shadow-lg">
            <p className="text-xs text-rose-300 font-semibold uppercase tracking-wider mb-1">Total Advance</p>
            <h3 className="text-2xl md:text-3xl font-bold text-rose-400">₹{lifetimePeshgi.toLocaleString()}</h3>
          </div>
        </div>

        {/* View Toggle */}
        <div className="md:hidden flex justify-end items-center px-1">
          <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700 shadow-inner">
            <button onClick={() => setViewMode("card")} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${isCard ? "bg-slate-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}><LayoutList size={14}/> Cards</button>
            <button onClick={() => setViewMode("table")} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all ${!isCard ? "bg-slate-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}><Table size={14}/> Table</button>
          </div>
        </div>

        {/* Table/Card View */}
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-2xl md:rounded-3xl shadow-xl overflow-x-auto relative">
          <table className={`w-full text-left border-collapse ${isCard ? "block md:table" : "min-w-[700px]"}`}>
            <thead className={`${isCard ? "hidden md:table-header-group" : ""} bg-slate-800/80 text-slate-300 text-xs tracking-widest uppercase border-b border-slate-700/60`}>
              <tr>
                <th className="p-4 md:px-6 font-semibold w-28 md:w-36">Date</th>
                <th className="p-4 md:px-6 font-semibold text-emerald-400">Paye Details</th>
                <th className="p-4 md:px-6 font-semibold text-cyan-400">Daily Earning</th>
                <th className="p-4 md:px-6 font-semibold text-orange-400">Expenses</th>
                {isAdmin && <th className="p-4 md:px-6 font-semibold text-center w-32">Actions</th>}
                {!isAdmin && <th className="p-4 md:px-6 font-semibold text-blue-300 w-52">Remark / Note</th>}
              </tr>
            </thead>

            <tbody className={`${isCard ? "block md:table-row-group md:divide-y md:divide-slate-700/50 space-y-4 md:space-y-0 p-4 md:p-0" : "divide-y divide-slate-700/50"} text-slate-200 text-sm`}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const { entry, formattedDate } = getEntryForDate(day);
                const payeCount = entry?.payeCount || 0;
                const kharcha = entry?.kharcha || 0;
                const remark = entry?.remark || "";

                const activePayeRate = entry?.customRatePerPaya !== undefined ? entry.customRatePerPaya : defaultPayeRate;
                const dailyEarning = payeCount * activePayeRate;

                const hasEntry = payeCount > 0 || kharcha > 0 || remark !== "";
                const isEditingThisRow = editingRowDate === formattedDate && isAdmin;
                const isEditingRemarkThisRow = editingRemark?.date === formattedDate; 

                const liveEarning = (Number(editPaye) || 0) * activePayeRate;

                return (
                  <tr key={day} className={`${isCard 
                    ? `block md:table-row rounded-xl md:rounded-none md:bg-transparent border md:border-none transition-colors duration-200 ${hasEntry || isEditingThisRow || isEditingRemarkThisRow ? 'bg-slate-800/80 border-slate-700 shadow-md' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60'}`
                    : `hover:bg-slate-700/30 transition-colors duration-150 ${hasEntry || isEditingThisRow ? 'bg-slate-800/40' : ''}`
                  }`}>

                    <td className={isCard ? "flex justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 border-slate-700/50 font-medium" : "p-4 md:px-6 font-medium text-slate-300"}>
                      {isCard && <span className="md:hidden text-xs text-slate-500 uppercase tracking-wider font-bold">Date</span>}
                      <span className="whitespace-nowrap">{String(day).padStart(2, '0')} {monthNames[currentMonth]}</span>
                    </td>

                    <td className={isCard ? `${!hasEntry && !isEditingThisRow && !isEditingRemarkThisRow ? 'hidden' : 'flex'} justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 border-slate-700/50` : "p-4 md:px-6 font-medium text-emerald-300"}>
                      {isCard && <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest">Paye</span>}
                      {isEditingThisRow ? (
                        <div className="flex items-center gap-2 w-fit">
                          <input type="number" autoFocus value={editPaye} onChange={(e)=>setEditPaye(e.target.value)} className={`${inputBaseStyle} w-20 text-emerald-300 font-bold placeholder:text-slate-600`} placeholder="Qty"/>
                          <span className="text-slate-500 text-xs font-medium bg-slate-900/50 px-2 py-1.5 rounded-md border border-slate-700">@ ₹{activePayeRate}</span>
                        </div>
                      ) : (
                        <span className={payeCount > 0 ? "text-emerald-400 font-bold" : "text-slate-600"}>
                          {payeCount > 0 ? (
                            <>
                              {payeCount} 
                              {isAdmin && <span className="text-slate-500 text-xs ml-1 font-normal" title="Rate">(@ ₹{activePayeRate})</span>}
                            </>
                          ) : '-'}
                        </span>
                      )}
                    </td>

                    <td className={isCard ? `${!hasEntry && !isEditingThisRow && !isEditingRemarkThisRow ? 'hidden' : 'flex'} justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 border-slate-700/50` : "p-4 md:px-6 font-medium text-cyan-300"}>
                      {isCard && <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest">Earned</span>}
                      {isEditingThisRow ? (
                        <span className="text-cyan-400 font-bold px-2 bg-cyan-900/20 py-1 rounded-md border border-cyan-500/20">₹{liveEarning.toFixed(0)}</span>
                      ) : (
                        <span className={dailyEarning > 0 ? "text-cyan-400 font-bold" : "text-slate-600"}>{dailyEarning > 0 ? `₹${dailyEarning.toFixed(0)}` : '-'}</span>
                      )}
                    </td>

                    <td className={isCard ? `${!hasEntry && !isEditingThisRow && !isEditingRemarkThisRow ? 'hidden' : 'flex'} justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 border-slate-700/50` : "p-4 md:px-6 font-medium text-orange-300"}>
                      {isCard && <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest">Expenses</span>}
                      {isEditingThisRow ? (
                        <div className="flex items-center gap-2 w-fit relative">
                          <span className="absolute left-2.5 text-slate-500 text-sm font-bold">₹</span>
                          <input type="number" value={editKharcha} onChange={(e)=>setEditKharcha(e.target.value)} className={`${inputBaseStyle} w-24 pl-6 text-orange-400 font-bold placeholder:text-slate-600`} placeholder="0"/>
                        </div>
                      ) : (
                        <span className={kharcha > 0 ? "text-orange-400 font-bold" : "text-slate-600"}>{kharcha > 0 ? `₹${kharcha}` : '-'}</span>
                      )}
                    </td>
                    
                    {isAdmin && (
                      <td className={`p-3 md:px-6 md:py-4 align-middle text-center ${isCard ? 'flex justify-between items-center md:table-cell border-t border-slate-700/30 mt-2' : ''}`}>
                        {isCard && <span className="md:hidden text-[10px] text-blue-400/70 uppercase font-bold tracking-widest">Actions</span>}
                        <div className="flex items-center justify-end md:justify-center gap-2 relative">
                          {isEditingThisRow ? (
                            <div className="flex items-center gap-1.5 bg-slate-800 p-1.5 rounded-xl shadow-lg border border-slate-600">
                              <button onClick={()=>setEditingRowDate(null)} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"><X size={16}/></button>
                              <button onClick={()=>handleSaveRowData(formattedDate)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"><Check size={14}/> Save</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setEditingRowDate(formattedDate); setEditPaye(payeCount ? payeCount.toString() : ""); setEditKharcha(kharcha ? kharcha.toString() : ""); }}
                              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all border ${hasEntry ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-slate-300' : 'border-dashed border-slate-600/50 text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'}`}
                            >
                              {hasEntry ? <Edit3 size={15}/> : <PlusCircle size={15} />}
                            </button>
                          )}

                          {isEditingRemarkThisRow ? (
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveRemark(formattedDate); }} className="flex items-center gap-1.5 absolute right-full mr-2 md:right-12 bg-slate-800 p-1.5 rounded-xl border border-blue-500/40 shadow-xl z-20 w-[180px]">
                              <input type="text" autoFocus value={editingRemark.text} onChange={(e) => setEditingRemark({ ...editingRemark, text: e.target.value })} className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-blue-200 outline-none focus:border-blue-500" placeholder="Type note..."/>
                              <button type="submit" className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"><Check size={14} /></button>
                            </form>
                          ) : (!isEditingThisRow && (
                            <button onClick={() => setEditingRemark({ date: formattedDate, text: remark })} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all border ${remark ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-transparent text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'}`}>
                              {remark ? <MessageSquareText size={16} /> : <MessageSquare size={16} />}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}

                    {!isAdmin && (
                      <td className={isCard ? `flex justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 border-slate-700/50` : "p-4 md:px-6 font-medium text-blue-300"}>
                        {isCard && <span className="md:hidden text-[10px] text-slate-500 uppercase font-bold tracking-widest">Remark</span>}
                        
                        {isEditingRemarkThisRow ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleSaveRemark(formattedDate); }} className="flex items-center gap-1.5 w-full max-w-[220px]">
                            <input type="text" autoFocus value={editingRemark.text} onChange={(e) => setEditingRemark({ ...editingRemark, text: e.target.value })} className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-blue-200 outline-none focus:border-blue-500" placeholder="Apna note likhein..."/>
                            <button type="submit" className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"><Check size={14} /></button>
                          </form>
                        ) : (
                          <div className={`flex items-center ${isCard ? 'justify-end' : ''} gap-3`}>
                            <span className="text-slate-300 text-sm whitespace-pre-wrap">{remark ? remark : <span className="text-slate-600 italic">No remark</span>}</span>
                            <button onClick={() => setEditingRemark({ date: formattedDate, text: remark })} className={`p-1.5 rounded-md transition border flex shrink-0 ${remark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'border-dashed border-slate-600/50 text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'}`} title="Add/Edit Remark">
                              {remark ? <Edit3 size={14} /> : <MessageSquare size={14} />}
                            </button>
                          </div>
                        )}
                      </td>
                    )}

                  </tr>
                );
              })}
            </tbody>

            <tfoot className={`${isCard ? "hidden md:table-footer-group" : ""} bg-slate-800 border-t-2 border-slate-600/50 text-sm`}>
              <tr>
                <td className="p-4 md:px-6 font-bold text-slate-300 uppercase tracking-widest text-xs">Monthly Total</td>
                <td className="p-4 md:px-6 font-bold text-emerald-400 text-lg">{monthTotalPaye} <span className="text-sm font-normal text-slate-400 ml-1">Paye</span></td>
                <td className="p-4 md:px-6 font-bold text-cyan-400 text-lg">₹{monthTotalEarnings.toFixed(0)}</td>
                <td className="p-4 md:px-6 font-bold text-orange-400 text-lg">₹{monthTotalExpenses.toLocaleString()}</td>
                {isAdmin && <td className="p-4"></td>}
                {!isAdmin && <td className="p-4"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}