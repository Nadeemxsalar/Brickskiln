"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { getLabourData, saveLabourData, fetchFromFirebase } from "../../../lib/storage";
import { Labour } from "../../../types";
import { IndianRupee, ArrowLeft, Layers, MessageSquare, MessageSquareText, Check, LayoutList, Table, Edit3, X, PlusCircle, LogOut, Calculator, Download, UserMinus, Sun, Moon, Loader2, Globe } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(true);
  
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [lang, setLang] = useState<"en" | "hi">("en"); // 🟢 NAYA: Language State

  const [editingRemark, setEditingRemark] = useState<{ date: string; text: string } | null>(null);
  const [editingRowDate, setEditingRowDate] = useState<string | null>(null);
  const [editPaye, setEditPaye] = useState<string>("");
  const [editKharcha, setEditKharcha] = useState<string>("");

  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [includePeshgi, setIncludePeshgi] = useState(true);

  // 🟢 NAYA: Translation Helper
  const t = (en: string, hi: string) => lang === "hi" ? hi : en;

  useEffect(() => {
    const initApp = async () => {
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

      const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
      if (savedTheme) setTheme(savedTheme);

      const savedLang = localStorage.getItem("app_lang") as "en" | "hi";
      if (savedLang) setLang(savedLang);

      try {
        const cloudLab = await fetchFromFirebase("bhatta_labourers");
        if (cloudLab) localStorage.setItem("bhatta_labourers", JSON.stringify(cloudLab));
      } catch (e) {
        console.error("Cloud fetch failed");
      }

      const data: Labour[] = getLabourData("bhatta_labourers") || [];
      const foundLabour = data.find((l) => l.id === id);
      
      if (foundLabour) {
        setLabour(foundLabour);
        const safeEntries = Array.isArray(foundLabour.entries) ? foundLabour.entries : [];
        const validEntries = safeEntries.filter(e => e.payeCount > 0 || e.kharcha > 0 || e.peshgi !== 0 || e.remark || e.isLeave);
        
        if (validEntries.length > 0) {
          validEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const latestDate = new Date(validEntries[0].date);
          setCurrentMonth(latestDate.getMonth());
          setCurrentYear(latestDate.getFullYear());
        } else {
          const now = new Date();
          setCurrentMonth(now.getMonth());
          setCurrentYear(now.getFullYear());
        }
      }
      setIsLoading(false);
    };
    initApp();
  }, [id, router]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  const toggleLanguage = () => {
    const newLang = lang === "en" ? "hi" : "en";
    setLang(newLang);
    localStorage.setItem("app_lang", newLang);
  };

  const handleLogout = () => {
    localStorage.removeItem("bhatta_session");
    router.push("/");
  };

  if (!isAuthorized || isLoading || !labour) {
    const isDark = theme === "dark";
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}`}>
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Loading Ledger...</h2>
      </div>
    );
  }

  const safeEntries = Array.isArray(labour.entries) ? labour.entries : [];
  const validEntries = safeEntries.filter(e => e.payeCount > 0 || e.kharcha > 0 || e.peshgi !== 0 || e.remark || e.isLeave);
  
  const oldestDate = validEntries.length > 0 
    ? new Date(Math.min(...validEntries.map(e => new Date(e.date).getTime()))) 
    : new Date();

  const canGoPrev = new Date(currentYear, currentMonth, 1) > new Date(oldestDate.getFullYear(), oldestDate.getMonth(), 1);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    let tempMonth = currentMonth;
    let tempYear = currentYear;
    for (let i = 0; i < 60; i++) { 
      if (tempMonth === 0) { tempMonth = 11; tempYear--; } 
      else { tempMonth--; }
      const hasData = validEntries.some(e => {
        const d = new Date(e.date);
        return d.getMonth() === tempMonth && d.getFullYear() === tempYear;
      });
      if (hasData) {
        setCurrentMonth(tempMonth);
        setCurrentYear(tempYear);
        return;
      }
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } 
    else { setCurrentMonth(currentMonth + 1); }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getEntryForDate = (day: number) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
          updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: dateStr, payeCount: 0, customRatePerPaya: l.ratePerPaya || 0, kharcha: 0, peshgi: 0, remark: editingRemark.text, isLeave: false });
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
          updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: dateStr, payeCount: newPaye, customRatePerPaya: currentDefaultRate, kharcha: newKharcha, peshgi: 0, isLeave: false });
        }

        const updatedLabour = { ...l, entries: updatedEntries };
        setLabour(updatedLabour);
        return updatedLabour;
      }
      return l;
    });

    saveLabourData("bhatta_labourers", updatedLabourers);
    setEditingRowDate(null);
  };

  const handleToggleLeave = (dateStr: string) => {
    if (!isAdmin) return;
    const allLabourers = getLabourData("bhatta_labourers") || [];
    const updatedLabourers = allLabourers.map((l: any) => {
      if (l.id === labour.id) {
        let entryExists = false;
        const updatedEntries = (Array.isArray(l.entries) ? l.entries : []).map((e: any) => {
          if (e.date === dateStr) {
            entryExists = true;
            return { ...e, isLeave: !e.isLeave };
          }
          return e;
        });

        if (!entryExists) {
          updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: dateStr, payeCount: 0, customRatePerPaya: l.ratePerPaya || 0, kharcha: 0, peshgi: 0, isLeave: true });
        }
        
        const updatedL = { ...l, entries: updatedEntries };
        setLabour(updatedL); 
        return updatedL;
      }
      return l;
    });
    saveLabourData("bhatta_labourers", updatedLabourers);
  };

  const defaultPayeRate = labour.ratePerPaya || 0;
  let calculatedEarned = 0;
  let calculatedKharcha = 0;
  let calculatedPeshgi = 0;
  
  safeEntries.forEach(e => {
    const activeRate = e.customRatePerPaya !== undefined ? e.customRatePerPaya : defaultPayeRate;
    if (!e.isLeave) {
      calculatedEarned += (e.payeCount || 0) * activeRate;
    }
    calculatedKharcha += Number(e.kharcha || 0);
    calculatedPeshgi += Number(e.peshgi !== undefined ? e.peshgi : ((e as any).advance || 0));
  });

  const deductions = calculatedKharcha + (includePeshgi ? calculatedPeshgi : 0);
  const grandTotal = Math.round(calculatedEarned - deductions);

  // 🟢 NAYA: Professional PDF Generation
  const downloadMyParchi = () => {
    const doc = new jsPDF();
    
    // 1. Watermark
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(70);
    doc.text("BHATTA PRO", 40, 160, { angle: 45 });
    
    // 2. Header
    doc.setFontSize(24);
    doc.setTextColor(30, 64, 175); 
    doc.setFont("helvetica", "bold");
    doc.text(`Bhatta Pro - Official Receipt`, 14, 20);
    
    // 3. Sub-header / Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Statement for: ${monthNames[currentMonth]} ${currentYear}`, 14, 34);

    // 4. Labour Details Box
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 40, 85, 38, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Labour Details:`, 18, 48);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${labour.name}`, 18, 56);
    doc.text(`Login ID: ${(labour as any).loginId || "-"}`, 18, 63);
    doc.text(`Mobile: ${labour.phone || "-"}`, 18, 70);
    doc.text(`Location: ${labour.paya || "-"}`, 18, 77);
    
    // 5. Financial Summary Box
    doc.setFillColor(245, 247, 250);
    doc.rect(110, 40, 85, 38, 'F');
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Financial Summary:`, 114, 48);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Kamai: Rs ${calculatedEarned.toLocaleString()}`, 114, 56);
    doc.text(`Total Kharcha: Rs ${calculatedKharcha.toLocaleString()}`, 114, 63);
    doc.text(`Total Peshgi: Rs ${calculatedPeshgi.toLocaleString()}`, 114, 70);
    
    // 6. Final Balance Highlight
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    if(grandTotal < 0) {
      doc.setTextColor(220, 38, 38); 
      const text = isAdmin ? "(Labour Par Nikal Rahe Hain)" : "(Aap par Advance nikal raha hai)";
      doc.text(`Final Balance: Rs ${Math.abs(grandTotal).toLocaleString()} ${text}`, 14, 90);
    } else {
      doc.setTextColor(16, 185, 129); 
      const text = isAdmin ? "(Labour Ko Dene Hain)" : "(Aapko lene hain)";
      doc.text(`Final Balance: Rs ${grandTotal.toLocaleString()} ${text}`, 14, 90);
    }

    // 7. Data Table
    const tableData = safeEntries
      .filter((e:any) => e.payeCount > 0 || e.kharcha > 0 || e.peshgi !== 0 || e.remark || e.isLeave)
      .map((e:any) => [
        e.date,
        e.isLeave ? "LEAVE" : (e.payeCount || 0),
        e.isLeave ? "-" : ((e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : defaultPayeRate)),
        e.kharcha || 0,
        e.peshgi || 0,
        e.remark || "-"
      ]);

    autoTable(doc, {
      startY: 98,
      head: [['Date', 'Paye/Status', 'Earned (Rs)', 'Kharcha (Rs)', 'Peshgi (Rs)', 'Remark']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    // 8. Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text("Authorized Signature", 140, finalY);
    doc.setLineWidth(0.5);
    doc.line(130, finalY - 6, 190, finalY - 6);

    doc.save(`${labour.name}_Official_Parchi.pdf`);
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

      if(!entry.isLeave) {
        monthTotalPaye += paye;
        monthTotalEarnings += (paye * activeRate);
      }
      monthTotalExpenses += kharcha;
    }
  }

  const isCard = viewMode === "card";

  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#0f172a] text-white" : "bg-slate-50 text-slate-900";
  const cardBg = isDark ? "bg-slate-800/60 border-slate-700/80" : "bg-white border-slate-200 shadow-xl";
  const statBoxBg = isDark ? "bg-slate-900/60" : "bg-slate-50";
  const textMain = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const inputBaseStyle = `border rounded-md px-3 py-1.5 text-sm outline-none transition-all shadow-inner ${isDark ? "bg-slate-900 border-slate-600 focus:border-blue-400 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900 placeholder-slate-400"}`;
  
  const tableHeaderBg = isDark ? "bg-slate-800/80 text-slate-300 border-slate-700/60" : "bg-slate-100 text-slate-700 border-slate-200";
  const tableBodyStyle = isDark ? "divide-slate-700/50 text-slate-200" : "divide-slate-200 text-slate-700";
  const tableRowNormal = isDark ? "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60" : "bg-white border-slate-200 hover:bg-slate-50";
  const tableRowActive = isDark ? "bg-slate-800/80 border-slate-700 shadow-md" : "bg-blue-50/50 border-blue-200 shadow-sm";
  const tfootBg = isDark ? "bg-slate-800 border-slate-600/50" : "bg-slate-100 border-slate-300";

  return (
    <div className={`min-h-screen font-sans pb-20 selection:bg-blue-500/30 transition-colors duration-300 p-4 md:p-8 ${bgMain}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-start w-full">
          <div className="flex items-start gap-3">
            {isAdmin && (
              <Link href="/admin" className={`p-2 md:p-2.5 rounded-xl transition border shrink-0 shadow-sm mt-0.5 ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'}`}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-2xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent drop-shadow-sm ${isDark ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400' : 'bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600'}`}>
                  {labour.name} 
                </h1>
                {(labour as any).loginId && (
                  <span className={`text-xs md:text-sm font-bold border px-2.5 py-1 rounded-md ${isDark ? 'bg-blue-900/40 text-blue-300 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    ID: {(labour as any).loginId}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {isAdmin && ( 
                  <span className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${isDark ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                    <IndianRupee className="w-3 h-3" /> {t("Rate: ₹", "रेट: ₹")}{defaultPayeRate}
                  </span>
                )}
                <span className={`text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${isDark ? 'text-blue-300 bg-blue-500/10 border-blue-500/20' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>
                  <Layers className="w-3 h-3" /> {t("Loc: ", "जगह: ")}{labour.paya || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button onClick={toggleLanguage} className={`p-2 rounded-full transition-colors font-bold text-xs flex items-center gap-1 ${isDark ? 'bg-slate-800 text-cyan-400 hover:bg-slate-700' : 'bg-white text-cyan-600 shadow-md hover:bg-slate-50'}`}>
              <Globe size={16} /> {lang === "en" ? "HI" : "EN"}
            </button>
            <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-600 shadow-md hover:bg-slate-50'}`}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition text-xs font-bold border border-red-500/20">
              <LogOut size={16}/> <span className="hidden md:inline">{t("Logout", "लॉगआउट")}</span>
            </button>
          </div>
        </div>

        {/* GRAND TOTAL SECTION */}
        <div className={`border rounded-3xl p-5 md:p-8 relative overflow-hidden transition-colors ${cardBg}`}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            <div className="flex-1 w-full">
              <p className={`font-bold tracking-widest text-xs uppercase mb-2 flex items-center gap-2 ${textMuted}`}>
                <Calculator size={16} /> {t("Final Net Balance (Cut-Pit Ke Baad)", "कुल शुद्ध शेष (कट-पिट के बाद)")}
              </p>
              <h2 className={`text-4xl md:text-5xl font-extrabold ${grandTotal < 0 ? (isDark ? 'text-rose-500' : 'text-rose-600') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}`}>
                {grandTotal < 0 ? "-" : ""}₹{Math.abs(grandTotal).toLocaleString()}
                
                <span className={`block md:inline-block text-sm md:text-lg font-semibold ml-0 md:ml-3 mt-1 md:mt-0 opacity-90 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {grandTotal < 0 
                    ? (isAdmin ? t("(Labour Par Nikal Rahe Hain)", "(मजदूर पर निकल रहे हैं)") : t("(Aap par Advance nikal raha hai)", "(आप पर एडवांस निकल रहा है)")) 
                    : (isAdmin ? t("(Labour Ko Dene Hain)", "(मजदूर को देने हैं)") : t("(Aapko Bhatte se lene hain)", "(आपको भट्ठे से लेने हैं)"))}
                </span>
              </h2>
              
              <div className={`grid grid-cols-3 gap-2 md:gap-4 mt-6 pt-5 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className={`p-3 md:p-4 rounded-xl border text-center flex flex-col justify-center shadow-inner ${statBoxBg} ${isDark ? 'border-cyan-500/20' : 'border-cyan-200'}`}>
                  <span className={`text-[10px] md:text-xs uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-cyan-500/80' : 'text-cyan-600'}`}>{t("Kul Kamai", "कुल कमाई")}</span>
                  <span className={`text-sm md:text-xl font-extrabold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>₹{calculatedEarned.toLocaleString()}</span>
                </div>
                <div className={`p-3 md:p-4 rounded-xl border text-center flex flex-col justify-center shadow-inner ${statBoxBg} ${isDark ? 'border-orange-500/20' : 'border-orange-200'}`}>
                  <span className={`text-[10px] md:text-xs uppercase tracking-widest font-bold mb-1 ${isDark ? 'text-orange-500/80' : 'text-orange-600'}`}>{t("Kharcha Katoti", "खर्चा कटौती")}</span>
                  <span className={`text-sm md:text-xl font-extrabold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>- ₹{calculatedKharcha.toLocaleString()}</span>
                </div>
                <div className={`p-3 md:p-4 rounded-xl text-center flex flex-col justify-center transition-all duration-300 shadow-inner ${statBoxBg} ${includePeshgi ? (isDark ? 'border border-rose-500/20' : 'border border-rose-200') : (isDark ? 'border border-slate-700/50 opacity-50' : 'border border-slate-200 opacity-50')}`}>
                  <span className={`text-[10px] md:text-xs uppercase tracking-widest font-bold mb-1 ${includePeshgi ? (isDark ? 'text-rose-500/80' : 'text-rose-600') : textMuted}`}>{t("Peshgi (Advance)", "पेशगी")}</span>
                  <span className={`text-sm md:text-xl font-extrabold ${includePeshgi ? (isDark ? 'text-rose-400' : 'text-rose-700') : `${textMuted} line-through`}`}>
                    {calculatedPeshgi >= 0 ? `- ₹${calculatedPeshgi.toLocaleString()}` : `+ ₹${Math.abs(calculatedPeshgi).toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 mt-2 lg:mt-0">
              <div className={`p-1.5 rounded-xl border w-full lg:w-auto flex flex-1 lg:flex-none ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <button onClick={() => setIncludePeshgi(true)} className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${includePeshgi ? "bg-blue-600 text-white shadow-md" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
                  {t("Include Peshgi", "पेशगी जोड़ें")}
                </button>
                <button onClick={() => setIncludePeshgi(false)} className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${!includePeshgi ? (isDark ? "bg-slate-600 text-white shadow-md" : "bg-white text-slate-900 shadow-sm border border-slate-200") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}`}>
                  {t("Exclude Peshgi", "पेशगी छोड़ें")}
                </button>
              </div>
              <button onClick={downloadMyParchi} title={t("Download PDF Parchi", "पर्ची डाउनलोड करें")} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md active:scale-95 border border-indigo-500/50 flex-shrink-0">
                <Download size={22}/>
              </button>
            </div>

          </div>
        </div>

        {/* MONTH SUMMARY */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
          <div className={`col-span-2 xl:col-span-1 backdrop-blur-xl border p-4 rounded-2xl flex items-center justify-between shadow-sm transition-colors ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-white border-slate-200'}`}>
            <button 
              onClick={handlePrevMonth} 
              disabled={!canGoPrev}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${!canGoPrev ? 'opacity-40 cursor-not-allowed text-slate-400' : (isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700')}`}
            >
              {t("Prev", "पिछला")}
            </button>
            <div className="text-center">
              <h2 className={`text-lg font-bold tracking-wide ${textMain}`}>{monthNames[currentMonth]} {currentYear}</h2>
            </div>
            <button 
              onClick={handleNextMonth} 
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
            >
              {t("Next", "अगला")}
            </button>
          </div>

          <div className={`p-4 md:p-5 rounded-2xl shadow-sm border transition-colors ${isDark ? 'bg-gradient-to-br from-cyan-900/40 to-slate-900 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>{t("Earned (This Month)", "कमाई (इस महीने)")}</p>
            <h3 className={`text-2xl md:text-3xl font-extrabold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>₹{monthTotalEarnings.toLocaleString()}</h3>
          </div>

          <div className={`p-4 md:p-5 rounded-2xl shadow-sm border transition-colors ${isDark ? 'bg-gradient-to-br from-orange-900/40 to-slate-900 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{t("Expenses (This Month)", "खर्चा (इस महीने)")}</p>
            <h3 className={`text-2xl md:text-3xl font-extrabold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>₹{monthTotalExpenses.toLocaleString()}</h3>
          </div>

          <div className={`col-span-2 xl:col-span-1 p-4 md:p-5 rounded-2xl shadow-sm border transition-colors ${isDark ? 'bg-gradient-to-br from-rose-900/40 to-slate-900 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>{t("Total Advance", "कुल पेशगी")}</p>
            <h3 className={`text-2xl md:text-3xl font-extrabold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>₹{calculatedPeshgi.toLocaleString()}</h3>
          </div>
        </div>

        {/* View Toggle */}
        <div className="md:hidden flex justify-end items-center px-1">
          <div className={`p-1 rounded-xl flex items-center gap-1 border shadow-inner ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <button onClick={() => setViewMode("card")} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${isCard ? (isDark ? "bg-slate-600 text-white shadow-md" : "bg-white text-slate-800 shadow-sm") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800")}`}><LayoutList size={14}/> {t("Cards", "कार्ड्स")}</button>
            <button onClick={() => setViewMode("table")} className={`px-4 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${!isCard ? (isDark ? "bg-slate-600 text-white shadow-md" : "bg-white text-slate-800 shadow-sm") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800")}`}><Table size={14}/> {t("Table", "टेबल")}</button>
          </div>
        </div>

        {/* Table/Card View */}
        <div className={`backdrop-blur-md border rounded-2xl md:rounded-3xl shadow-xl overflow-x-auto relative transition-colors ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200'}`}>
          <table className={`w-full text-left border-collapse ${isCard ? "block md:table" : "min-w-[700px]"}`}>
            <thead className={`${isCard ? "hidden md:table-header-group" : ""} ${tableHeaderBg} text-xs tracking-widest uppercase border-b`}>
              <tr>
                <th className="p-4 md:px-6 font-bold w-28 md:w-36">{t("Date", "तारीख")}</th>
                <th className={`p-4 md:px-6 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{t("Paye Details", "पाये / हाज़री")}</th>
                <th className={`p-4 md:px-6 font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{t("Daily Earning", "रोज की कमाई")}</th>
                <th className={`p-4 md:px-6 font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{t("Expenses", "खर्चा")}</th>
                {isAdmin && <th className="p-4 md:px-6 font-bold text-center w-32">{t("Actions", "बदलाव")}</th>}
                {!isAdmin && <th className={`p-4 md:px-6 font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'} w-52`}>{t("Remark / Note", "नोट")}</th>}
              </tr>
            </thead>

            <tbody className={`${isCard ? "block md:table-row-group md:divide-y space-y-4 md:space-y-0 p-4 md:p-0" : "divide-y"} ${tableBodyStyle}`}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const { entry, formattedDate } = getEntryForDate(day);
                const payeCount = entry?.payeCount || 0;
                const kharcha = entry?.kharcha || 0;
                const remark = entry?.remark || "";
                const isLeave = entry?.isLeave || false;

                const activePayeRate = entry?.customRatePerPaya !== undefined ? entry.customRatePerPaya : defaultPayeRate;
                const dailyEarning = isLeave ? 0 : (payeCount * activePayeRate);

                const hasEntry = payeCount > 0 || kharcha > 0 || remark !== "" || isLeave;
                const isEditingThisRow = editingRowDate === formattedDate && isAdmin;
                const isEditingRemarkThisRow = editingRemark?.date === formattedDate; 

                const liveEarning = (Number(editPaye) || 0) * activePayeRate;

                const rowClass = isCard 
                    ? `block md:table-row rounded-xl md:rounded-none md:bg-transparent border md:border-none transition-colors duration-200 ${hasEntry || isEditingThisRow || isEditingRemarkThisRow ? tableRowActive : tableRowNormal}`
                    : `transition-colors duration-150 ${hasEntry || isEditingThisRow ? (isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200') : tableRowNormal}`;

                return (
                  <tr key={day} className={rowClass}>

                    <td className={isCard ? `flex justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 font-medium ${isDark ? 'border-slate-700/50 text-slate-300' : 'border-slate-200 text-slate-700'}` : `p-4 md:px-6 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {isCard && <span className={`md:hidden text-xs uppercase tracking-wider font-bold ${textMuted}`}>{t("Date", "तारीख")}</span>}
                      <span className="whitespace-nowrap font-bold">{String(day).padStart(2, '0')} {monthNames[currentMonth]}</span>
                    </td>

                    <td className={isCard ? `${!hasEntry && !isEditingThisRow && !isEditingRemarkThisRow ? 'hidden' : 'flex'} justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}` : "p-4 md:px-6 font-medium"}>
                      {isCard && <span className={`md:hidden text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>{t("Paye / Status", "पाये / हाज़री")}</span>}
                      
                      {isLeave ? (
                        <span className={`flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-md w-fit text-xs tracking-wider border ${isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-600 bg-rose-100 border-rose-300'}`}>
                          <UserMinus size={14} /> {t("LEAVE", "छुट्टी")}
                        </span>
                      ) : isEditingThisRow ? (
                        <div className="flex items-center gap-2 w-fit">
                          <input type="number" autoFocus value={editPaye} onChange={(e)=>setEditPaye(e.target.value)} className={`${inputBaseStyle} w-20 font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`} placeholder="Qty"/>
                          <span className={`text-xs font-bold px-2 py-1.5 rounded-md border ${isDark ? 'text-slate-400 bg-slate-900/50 border-slate-700' : 'text-slate-500 bg-slate-100 border-slate-300'}`}>@ ₹{activePayeRate}</span>
                        </div>
                      ) : (
                        <span className={`font-bold ${payeCount > 0 ? (isDark ? "text-emerald-400" : "text-emerald-600") : textMuted}`}>
                          {payeCount > 0 ? (
                            <>
                              {payeCount} 
                              {isAdmin && <span className={`text-xs ml-1 font-medium ${textMuted}`} title="Rate">(@ ₹{activePayeRate})</span>}
                            </>
                          ) : '-'}
                        </span>
                      )}
                    </td>

                    <td className={isCard ? `${!hasEntry && !isEditingThisRow && !isEditingRemarkThisRow ? 'hidden' : 'flex'} justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}` : "p-4 md:px-6 font-medium"}>
                      {isCard && <span className={`md:hidden text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>{t("Earned", "कमाई")}</span>}
                      {isLeave ? (
                        <span className={textMuted}>-</span>
                      ) : isEditingThisRow ? (
                        <span className={`font-bold px-2 py-1 rounded-md border ${isDark ? 'text-cyan-400 bg-cyan-900/20 border-cyan-500/20' : 'text-cyan-700 bg-cyan-50 border-cyan-200'}`}>₹{liveEarning.toFixed(0)}</span>
                      ) : (
                        <span className={`font-bold ${dailyEarning > 0 ? (isDark ? "text-cyan-400" : "text-cyan-600") : textMuted}`}>{dailyEarning > 0 ? `₹${dailyEarning.toFixed(0)}` : '-'}</span>
                      )}
                    </td>

                    <td className={isCard ? `${!hasEntry && !isEditingThisRow && !isEditingRemarkThisRow ? 'hidden' : 'flex'} justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}` : "p-4 md:px-6 font-medium"}>
                      {isCard && <span className={`md:hidden text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>{t("Expenses", "खर्चा")}</span>}
                      {isEditingThisRow ? (
                        <div className="flex items-center gap-2 w-fit relative">
                          <span className={`absolute left-2.5 text-sm font-bold ${textMuted}`}>₹</span>
                          <input type="number" value={editKharcha} onChange={(e)=>setEditKharcha(e.target.value)} className={`${inputBaseStyle} w-24 pl-6 font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`} placeholder="0"/>
                        </div>
                      ) : (
                        <span className={`font-bold ${kharcha > 0 ? (isDark ? "text-orange-400" : "text-orange-600") : textMuted}`}>{kharcha > 0 ? `₹${kharcha}` : '-'}</span>
                      )}
                    </td>
                    
                    {isAdmin && (
                      <td className={`p-3 md:px-6 md:py-4 align-middle text-center ${isCard ? `flex justify-between items-center md:table-cell border-t mt-2 ${isDark ? 'border-slate-700/30' : 'border-slate-200'}` : ''}`}>
                        {isCard && <span className={`md:hidden text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-blue-400/70' : 'text-blue-500'}`}>{t("Actions", "बदलाव")}</span>}
                        <div className="flex items-center justify-end md:justify-center gap-1.5 relative">
                          
                          {isEditingThisRow ? (
                            <div className={`flex items-center gap-1.5 p-1.5 rounded-xl shadow-lg border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}>
                              <button onClick={()=>setEditingRowDate(null)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}><X size={16}/></button>
                              <button onClick={()=>handleSaveRowData(formattedDate)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"><Check size={14}/> Save</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => { setEditingRowDate(formattedDate); setEditPaye(payeCount ? payeCount.toString() : ""); setEditKharcha(kharcha ? kharcha.toString() : ""); }}
                              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all border ${hasEntry && !isLeave ? (isDark ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shadow-sm') : (isDark ? 'border-dashed border-slate-600/50 text-slate-500 hover:text-slate-300 hover:bg-slate-700/30' : 'border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:bg-slate-50')}`}
                            >
                              {hasEntry && !isLeave ? <Edit3 size={15}/> : <PlusCircle size={15} />}
                            </button>
                          )}

                          {isEditingRemarkThisRow ? (
                            <form onSubmit={(e) => { e.preventDefault(); handleSaveRemark(formattedDate); }} className={`flex items-center gap-1.5 absolute right-full mr-2 md:right-12 p-1.5 rounded-xl border shadow-xl z-20 w-[180px] ${isDark ? 'bg-slate-800 border-blue-500/40' : 'bg-white border-blue-200'}`}>
                              <input type="text" autoFocus value={editingRemark.text} onChange={(e) => setEditingRemark({ ...editingRemark, text: e.target.value })} className={`flex-1 rounded-md px-2 py-1.5 text-xs outline-none border ${isDark ? 'bg-slate-900 border-slate-700 focus:border-blue-500 text-blue-200' : 'bg-slate-50 border-slate-300 focus:border-blue-400 text-blue-800'}`} placeholder={t("Type note...", "नोट लिखें...")}/>
                              <button type="submit" className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"><Check size={14} /></button>
                            </form>
                          ) : (!isEditingThisRow && (
                            <>
                              <button onClick={() => setEditingRemark({ date: formattedDate, text: remark })} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all border ${remark ? (isDark ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-blue-300 bg-blue-50 text-blue-600') : (isDark ? 'border-transparent text-slate-500 hover:bg-slate-700/50 hover:text-slate-300' : 'border-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600')}`} title={t("Add/Edit Remark", "नोट लिखें")}>
                                {remark ? <MessageSquareText size={16} /> : <MessageSquare size={16} />}
                              </button>
                              
                              <button 
                                onClick={() => handleToggleLeave(formattedDate)} 
                                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all border ${isLeave ? (isDark ? 'border-rose-500/50 bg-rose-500/10 text-rose-400' : 'border-rose-300 bg-rose-50 text-rose-600') : (isDark ? 'border-transparent text-slate-500 hover:bg-slate-700/50 hover:text-rose-400' : 'border-transparent text-slate-400 hover:bg-slate-100 hover:text-rose-500')}`}
                                title={isLeave ? t("Remove Leave", "छुट्टी हटाएं") : t("Mark Leave", "छुट्टी दर्ज करें")}
                              >
                                <UserMinus size={16} />
                              </button>
                            </>
                          ))}
                        </div>
                      </td>
                    )}

                    {!isAdmin && (
                      <td className={isCard ? `flex justify-between items-center md:table-cell p-3 md:px-6 md:py-4 border-b md:border-b-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}` : "p-4 md:px-6 font-medium"}>
                        {isCard && <span className={`md:hidden text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>{t("Remark", "नोट")}</span>}
                        
                        {isEditingRemarkThisRow ? (
                          <form onSubmit={(e) => { e.preventDefault(); handleSaveRemark(formattedDate); }} className="flex items-center gap-1.5 w-full max-w-[220px]">
                            <input type="text" autoFocus value={editingRemark.text} onChange={(e) => setEditingRemark({ ...editingRemark, text: e.target.value })} className={`flex-1 rounded-md px-2 py-1.5 text-xs outline-none border ${isDark ? 'bg-slate-900 border-slate-700 focus:border-blue-500 text-blue-200' : 'bg-white border-slate-300 focus:border-blue-400 text-blue-800'}`} placeholder={t("Type note...", "अपना नोट लिखें...")}/>
                            <button type="submit" className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"><Check size={14} /></button>
                          </form>
                        ) : (
                          <div className={`flex items-center ${isCard ? 'justify-end' : ''} gap-3`}>
                            <span className={`text-sm font-medium whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{remark ? remark : <span className={`italic ${textMuted}`}>{t("No remark", "कोई नोट नहीं")}</span>}</span>
                            <button onClick={() => setEditingRemark({ date: formattedDate, text: remark })} className={`p-1.5 rounded-md transition border flex shrink-0 ${remark ? (isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100') : (isDark ? 'border-dashed border-slate-600/50 text-slate-500 hover:text-slate-300 hover:bg-slate-700/30' : 'border-dashed border-slate-300 text-slate-400 hover:text-slate-600 hover:bg-slate-50')}`} title={t("Add/Edit Remark", "नोट बदलें")}>
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

            <tfoot className={`${isCard ? "hidden md:table-footer-group" : ""} border-t-2 text-sm ${tfootBg}`}>
              <tr>
                <td className={`p-4 md:px-6 font-extrabold uppercase tracking-widest text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t("Monthly Total", "महीने का कुल")}</td>
                <td className={`p-4 md:px-6 font-extrabold text-lg ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{monthTotalPaye} <span className={`text-sm font-medium ml-1 ${textMuted}`}>{t("Paye", "पाये")}</span></td>
                <td className={`p-4 md:px-6 font-extrabold text-lg ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>₹{monthTotalEarnings.toFixed(0)}</td>
                <td className={`p-4 md:px-6 font-extrabold text-lg ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>₹{monthTotalExpenses.toLocaleString()}</td>
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