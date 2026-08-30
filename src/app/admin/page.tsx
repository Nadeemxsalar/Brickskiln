"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveLabourData, getLabourData, fetchFromFirebase } from "../../lib/storage";
import { Labour, DailyEntry, Bhatta } from "../../types";
import { Menu, X, FileText, LayoutDashboard, IndianRupee, Users, Building2, Layers, Wallet, Settings, Check, LogOut, CheckSquare, Search, AlertCircle, CheckCircle, TrendingDown, TrendingUp, ChevronRight, ChevronDown, History, BarChart3, Upload, FileSpreadsheet, Download, FileDown, Maximize2, Minimize2, UserMinus, ShieldAlert, Trash2, Plus, Sun, Moon, Bell, Key, LockKeyhole, Loader2, CloudDownload, RefreshCcw, DatabaseBackup, Globe, Trash, LayoutList, Table, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Accurate Calculation Helper Function
const getStats = (lab: any) => {
  let earned = 0, kharcha = 0, peshgi = 0;
  (lab.entries || []).forEach((e: any) => {
    earned += (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0));
    kharcha += (e.kharcha || 0);
    peshgi += (e.peshgi !== undefined ? e.peshgi : (e.advance || 0));
  });
  return { earned, kharcha, peshgi, netBalance: earned - kharcha - peshgi };
};

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true); 
  const [bhattas, setBhattas] = useState<Bhatta[]>([]);
  const [activeBhattaId, setActiveBhattaId] = useState<string | null>(null);
  const [labourers, setLabourers] = useState<any[]>([]); 
  const [newBhattaName, setNewBhattaName] = useState("");
  const [isAddingBhatta, setIsAddingBhatta] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "eent" | "kharcha" | "peshgi" | "manage" | "download" | "role" | "recycle">("dashboard");

  const [dashboardView, setDashboardView] = useState<"card" | "matrix">("card");
  const [isFullscreenMatrix, setIsFullscreenMatrix] = useState(false);

  // 🟢 Monthly Matrix State
  const [matrixMonth, setMatrixMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [toast, setToast] = useState<{msg: string, type: "success" | "error"} | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [hindiTranslations, setHindiTranslations] = useState<Record<string, string>>({});
  
  const [adminList, setAdminList] = useState<string[]>([]);
  const [newAdminId, setNewAdminId] = useState("");

  const [fullScreenList, setFullScreenList] = useState<"work" | "kharcha" | "peshgi" | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paya, setPaya] = useState(""); 
  const [ratePaya, setRatePaya] = useState("");
  const [loginId, setLoginId] = useState(""); 

  const [searchDashboard, setSearchDashboard] = useState("");
  const [searchManage, setSearchManage] = useState("");
  const [searchBulk, setSearchBulk] = useState("");
  const [searchBulkKharcha, setSearchBulkKharcha] = useState("");
  const [searchPeshgi, setSearchPeshgi] = useState("");
  const [searchDownload, setSearchDownload] = useState(""); 

  const [selectedLabourIds, setSelectedLabourIds] = useState<string[]>([]);
  const [payeAmount, setPayeAmount] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);

  const [kharchaLabourId, setKharchaLabourId] = useState("");
  const [kharchaSearchQuery, setKharchaSearchQuery] = useState("");
  const [kharchaAmount, setKharchaAmount] = useState("");

  const [selectedKharchaIds, setSelectedKharchaIds] = useState<string[]>([]);
  const [bulkKharchaAmount, setBulkKharchaAmount] = useState("");
  const [bulkKharchaDate, setBulkKharchaDate] = useState(new Date().toISOString().split("T")[0]);

  const [peshgiLabourId, setPeshgiLabourId] = useState("");
  const [peshgiAmount, setPeshgiAmount] = useState("");
  const [peshgiDate, setPeshgiDate] = useState(new Date().toISOString().split("T")[0]);
  const [peshgiType, setPeshgiType] = useState<"add" | "deduct">("add");
  const [expandedPeshgiLabourId, setExpandedPeshgiLabourId] = useState<string | null>(null); 

  const [editingLabourId, setEditingLabourId] = useState<string | null>(null);
  const [editLabourData, setEditLabourData] = useState<{name: string, loginId: string, phone: string, paya: string, payeRate: number} | null>(null);

  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenNotifId, setLastSeenNotifId] = useState<string | null>(null);

  const [adminPin, setAdminPin] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState<{action: "delete" | "reset" | "restore" | "hard_delete", targetId: string} | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [newPinSetup, setNewPinSetup] = useState("");

  const t = (en: string, hi: string) => lang === "hi" ? hi : en;
  const tn = (text: string) => lang === "hi" ? (hindiTranslations[text] || text) : text;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const initApp = async () => {
      const session = localStorage.getItem("bhatta_session");
      if (session !== "admin") {
        router.push("/");
        return;
      }

      const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
      if (savedTheme) setTheme(savedTheme);

      const savedLang = localStorage.getItem("app_lang") as "en" | "hi";
      if (savedLang) setLang(savedLang);

      const savedPin = localStorage.getItem("bhatta_admin_pin");
      if (savedPin) setAdminPin(atob(savedPin)); 

      const savedNotifId = localStorage.getItem("bhatta_last_notif_id");
      if (savedNotifId) setLastSeenNotifId(savedNotifId);

      try {
        const cloudAdmins = await fetchFromFirebase("bhatta_admins");
        if (cloudAdmins && cloudAdmins.length > 0) {
          localStorage.setItem("bhatta_admins", JSON.stringify(cloudAdmins));
          setAdminList(cloudAdmins);
        } else {
          const defaultAdmins = ["admin", "nadeemxsalar@gmail.com"];
          setAdminList(defaultAdmins);
        }

        const cloudLab = await fetchFromFirebase("bhatta_labourers");
        if (cloudLab) localStorage.setItem("bhatta_labourers", JSON.stringify(cloudLab));
        
        const cloudBhattas = await fetchFromFirebase("bhattas_list");
        if (cloudBhattas) localStorage.setItem("bhattas_list", JSON.stringify(cloudBhattas));
      } catch (error) {
        console.error("Firebase sync error:", error);
      }

      let savedBhattas = getLabourData("bhattas_list") || [];
      if (savedBhattas.length === 0) {
        const defaultBhatta = { id: "bhatta_default", name: "Main Bhatta" };
        savedBhattas = [defaultBhatta];
        saveLabourData("bhattas_list", savedBhattas);
      }
      setBhattas(savedBhattas);

      const lastActiveBhatta = localStorage.getItem("active_bhatta_id");
      if (lastActiveBhatta && savedBhattas.some((b: any) => b.id === lastActiveBhatta)) {
        setActiveBhattaId(lastActiveBhatta);
      } else {
        setActiveBhattaId(savedBhattas[0].id);
      }

      let data: any[] = getLabourData("bhatta_labourers") || [];
      const migratedData = data.map((lab: any) => {
        let newLab = { ...lab };
        if (!newLab.bhattaId) newLab.bhattaId = "bhatta_default";
        if (!newLab.loginId) newLab.loginId = newLab.phone || Math.floor(1000 + Math.random() * 9000).toString(); 
        if (newLab.isDeleted === undefined) newLab.isDeleted = false;
        
        const safeEntries = Array.isArray(newLab.entries) ? newLab.entries : [];
        newLab.entries = safeEntries.map((e: any) => ({
          ...e, kharcha: e.kharcha || 0, peshgi: e.peshgi !== undefined ? e.peshgi : (e.advance || 0), payeCount: e.payeCount || 0, isLeave: e.isLeave || false
        }));
        return newLab;
      });
      
      saveLabourData("bhatta_labourers", migratedData);
      setLabourers(migratedData);
      setIsLoading(false);
    };

    initApp();
  }, [router]);

  // 🟢 Error-Free Silent Translation
  useEffect(() => {
    if (lang === "hi" && labourers.length > 0) {
      const translateNames = async () => {
        const newTranslations: Record<string, string> = { ...hindiTranslations };
        let hasNew = false;
        
        for (const lab of labourers) {
          if (!newTranslations[lab.name]) {
            try {
              const res = await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(lab.name)}&itc=hi-t-i0-und&num=1`);
              const data = await res.json();
              if (data && data[0] === 'SUCCESS') {
                newTranslations[lab.name] = data[1][0][1][0];
                hasNew = true;
              }
            } catch (e) {
              // Fail silently: will fallback to English automatically
            }
          }
        }
        if (hasNew) setHindiTranslations(newTranslations);
      };
      translateNames();
    }
  }, [lang, labourers]);

  useEffect(() => {
    let maxId = 1000;
    labourers.forEach(l => {
      const num = parseInt(l.loginId, 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });
    setLoginId((maxId + 1).toString());
  }, [labourers]);

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

  const handleBhattaChange = (bId: string) => {
    setActiveBhattaId(bId);
    localStorage.setItem("active_bhatta_id", bId);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("bhatta_session");
    router.push("/");
  };

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if(newPinSetup.length !== 4) return showToast("PIN 4 digit ka hona chahiye!", "error");
    setAdminPin(newPinSetup);
    localStorage.setItem("bhatta_admin_pin", btoa(newPinSetup));
    setNewPinSetup("");
    showToast("Security PIN set ho gaya!", "success");
  };

  const executeSecureAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin && pinInput !== adminPin) {
      return showToast(t("Incorrect Security PIN!", "सुरक्षा पिन गलत है!"), "error");
    }

    if(showPinModal?.action === "delete") {
      const updated = labourers.map(l => l.id === showPinModal.targetId ? { ...l, isDeleted: true } : l);
      setLabourers(updated); saveLabourData("bhatta_labourers", updated);
      showToast(t("Moved to Recycle Bin!", "रीसायकल बिन में भेज दिया गया!"), "success");
    } 
    else if(showPinModal?.action === "restore") {
      const updated = labourers.map(l => l.id === showPinModal.targetId ? { ...l, isDeleted: false } : l);
      setLabourers(updated); saveLabourData("bhatta_labourers", updated);
      showToast(t("Account Restored!", "अकाउंट वापस चालू हो गया!"), "success");
    }
    else if(showPinModal?.action === "hard_delete") {
      const updated = labourers.filter(l => l.id !== showPinModal.targetId);
      setLabourers(updated); saveLabourData("bhatta_labourers", updated);
      showToast(t("Permanently Deleted!", "हमेशा के लिए डिलीट हो गया!"), "success");
    }
    
    setShowPinModal(null);
    setPinInput("");
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordId || !newPasswordInput) return showToast("Password cannot be empty!", "error");
    const updated = labourers.map(l => {
      if (l.id === resetPasswordId) return { ...l, password: newPasswordInput };
      return l;
    });
    setLabourers(updated); saveLabourData("bhatta_labourers", updated);
    setResetPasswordId(null); setNewPasswordInput("");
    showToast(t("Password changed!", "पासवर्ड बदल दिया गया!"), "success");
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newAdminId) return;
    const finalId = newAdminId.toLowerCase().trim();
    if(adminList.includes(finalId)) return showToast("Ye Admin pehle se add hai!", "error");
    
    const updated = [...adminList, finalId];
    setAdminList(updated);
    localStorage.setItem("bhatta_admins", JSON.stringify(updated));
    saveLabourData("bhatta_admins", updated); 
    setNewAdminId(""); 
    showToast("Naya Admin successfully add ho gaya!", "success");
  };

  const handleRemoveAdmin = (idToRemove: string) => {
    if(idToRemove === "admin" || idToRemove === "nadeemxsalar@gmail.com") return showToast("Master Admin ko delete nahi kiya ja sakta!", "error");
    const updated = adminList.filter(a => a !== idToRemove);
    setAdminList(updated);
    localStorage.setItem("bhatta_admins", JSON.stringify(updated));
    saveLabourData("bhatta_admins", updated); 
    showToast("Admin ki power hata di gayi hai!", "success");
  };

  const currentLabourers = labourers.filter(lab => lab.bhattaId === activeBhattaId && !lab.isDeleted);
  const deletedLabourers = labourers.filter(lab => lab.bhattaId === activeBhattaId && lab.isDeleted);
  const activeBhattaName = bhattas.find(b => b.id === activeBhattaId)?.name || "Bhatta";

  // Advanced Monthly Ledger Logic
  const [matrixYear, matrixMonthNum] = matrixMonth.split("-").map(Number);
  const daysInMatrixMonth = new Date(matrixYear, matrixMonthNum, 0).getDate();
  const allMatrixDates = Array.from({ length: daysInMatrixMonth }, (_, i) => {
    return `${matrixMonth}-${String(daysInMatrixMonth - i).padStart(2, '0')}`;
  });

  const notifications = currentLabourers.flatMap(lab => 
    (lab.entries || [])
      .filter((e: any) => e.remark && e.remark.trim() !== "")
      .map((e: any) => ({
        id: `${lab.id}_${e.date}`, labName: lab.name, labId: lab.id, date: e.date, remark: e.remark
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

  const hasUnreadNotifications = notifications.length > 0 && notifications[0].id !== lastSeenNotifId;

  const toggleNotifications = () => {
    const newState = !showNotifications;
    setShowNotifications(newState);
    if (newState && notifications.length > 0) {
      setLastSeenNotifId(notifications[0].id);
      localStorage.setItem("bhatta_last_notif_id", notifications[0].id);
    }
  };

  const overallStats = currentLabourers.reduce((acc, lab) => {
    const stats = getStats(lab);
    acc.totalEarned += stats.earned; 
    acc.totalExpenses += stats.kharcha; 
    acc.totalAdvance += stats.peshgi;
    return acc;
  }, { totalEarned: 0, totalExpenses: 0, totalAdvance: 0 });

  const chartData = currentLabourers.map(lab => {
    const stats = getStats(lab);
    return { name: tn(lab.name), Earned: stats.earned, Expenses: stats.kharcha, Advance: stats.peshgi };
  }).sort((a, b) => b.Earned - a.Earned).slice(0, 10); 

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeBhattaId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n');
      
      let currentMaxId = 1000;
      labourers.forEach(l => {
        const num = parseInt(l.loginId, 10);
        if (!isNaN(num) && num > currentMaxId) currentMaxId = num;
      });

      const tempLabourersMap = new Map();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split(',');
        const colName = cols[0]?.trim();
        if (!colName) continue;

        const colPhone = cols[1]?.trim() || "";
        const colLocation = cols[2]?.trim() || "-";
        const colRate = Number(cols[3]?.trim()) || 0;
        
        const colDate = cols[4]?.trim() || "";
        const colPaye = Number(cols[5]?.trim()) || 0;
        const colKharcha = Number(cols[6]?.trim()) || 0;
        const colAdvance = Number(cols[7]?.trim()) || 0;
        const colRemark = cols[8]?.trim() || "";

        const mapKey = `${colName}_${colPhone}`; 

        if (!tempLabourersMap.has(mapKey)) {
          currentMaxId++;
          tempLabourersMap.set(mapKey, {
            id: Date.now().toString() + Math.random().toString(), bhattaId: activeBhattaId, name: colName, loginId: currentMaxId.toString(), phone: colPhone, paya: colLocation, ratePerPaya: colRate, isDeleted: false, totalPaye: 0, totalKharcha: 0, totalPeshgi: 0, entries: []
          });
        }

        const currentLab = tempLabourersMap.get(mapKey);

        if (colDate) {
          currentLab.entries.push({ id: Date.now().toString() + Math.random().toString(), date: colDate, payeCount: colPaye, customRatePerPaya: colRate, kharcha: colKharcha, peshgi: colAdvance, remark: colRemark, isLeave: false });
        }
      }

      const newLabourers = Array.from(tempLabourersMap.values());

      if (newLabourers.length > 0) {
        const updatedList = [...labourers, ...newLabourers];
        setLabourers(updatedList); saveLabourData("bhatta_labourers", updatedList);
        showToast(`${newLabourers.length} Labourers Smart Import Success!`, "success");
        setShowImportModal(false); 
      } else { showToast("File khali hai ya galat format hai!", "error"); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleExportBackup = () => {
    const dataStr = JSON.stringify(labourers, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bhatta_Database_Backup_${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    showToast(t("Database Exported Successfully!", "डेटाबेस बैकअप हो गया!"), "success");
  };

  const downloadAllSummaryPDF = () => {
    if(currentLabourers.length === 0) return showToast("Koi data nahi hai!", "error");
    const doc = new jsPDF();
    
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(60);
    doc.text("BHATTA PRO", 40, 150, { angle: 45 });

    doc.setFontSize(22); 
    doc.setTextColor(30, 64, 175); 
    doc.setFont("helvetica", "bold");
    doc.text(`${activeBhattaName} - Master Summary`, 14, 20);
    
    doc.setFontSize(10); 
    doc.setTextColor(100, 100, 100); 
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);

    doc.setFontSize(11); 
    doc.setTextColor(0, 0, 0); 
    doc.text(`Total Earned: Rs ${overallStats.totalEarned.toLocaleString()}`, 14, 35); 
    doc.text(`Total Kharcha: Rs ${overallStats.totalExpenses.toLocaleString()}`, 80, 35); 
    doc.text(`Total Advance: Rs ${overallStats.totalAdvance.toLocaleString()}`, 150, 35);

    const tableData = currentLabourers.map(lab => {
      const stats = getStats(lab);
      const netText = stats.netBalance < 0 ? `-${Math.abs(stats.netBalance)} (Len)` : `${stats.netBalance} (Den)`;
      return [tn(lab.name), lab.loginId, stats.earned.toLocaleString(), stats.kharcha.toLocaleString(), stats.peshgi.toLocaleString(), netText];
    });

    autoTable(doc, { 
      startY: 45, 
      head: [['Name', 'ID', 'Earned (Rs)', 'Kharcha (Rs)', 'Peshgi (Rs)', 'Net Balance']], 
      body: tableData, 
      theme: 'grid', 
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 250] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Authorized Signature", 150, finalY);
    doc.setLineWidth(0.5);
    doc.line(140, finalY - 5, 190, finalY - 5);

    doc.save(`${activeBhattaName}_Professional_Summary.pdf`); 
    showToast(t("Summary PDF Downloaded!", "समरी पीडीएफ डाउनलोड हो गई!"), "success");
  };

  const handleAddBhatta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBhattaName) return;
    const newBhatta: Bhatta = { id: `bhatta_${Date.now()}`, name: newBhattaName };
    const updated = [...bhattas, newBhatta];
    setBhattas(updated); saveLabourData("bhattas_list", updated);
    handleBhattaChange(newBhatta.id); setNewBhattaName(""); setIsAddingBhatta(false);
  };

  const handleAddLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !activeBhattaId) return showToast("Name is required!", "error");
    
    let finalLoginId = loginId.trim();
    if (!finalLoginId) {
      let maxId = 1000;
      labourers.forEach(l => { const num = parseInt(l.loginId, 10); if (!isNaN(num) && num > maxId) maxId = num; });
      finalLoginId = (maxId + 1).toString();
    } else if (labourers.some(l => l.loginId === finalLoginId)) {
      return showToast("Ye Labour ID pehle se kisi aur ki hai!", "error");
    }

    const newLabour: any = { id: Date.now().toString(), bhattaId: activeBhattaId, name, loginId: finalLoginId, phone, ratePerThousand: 0, ratePerPaya: Number(ratePaya) || 0, paya: paya || "-", isDeleted: false, totalBricks: 0, totalPaye: 0, totalKharcha: 0, totalPeshgi: 0, entries: [] };
    const updatedList = [...labourers, newLabour];
    setLabourers(updatedList); saveLabourData("bhatta_labourers", updatedList);
    setName(""); setPhone(""); setRatePaya(""); setPaya(""); showToast(t("Labour Added!", "मजदूर जोड़ दिया गया!"), "success");
  };

  const handleAddWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLabourIds.length === 0) return showToast(t("Select at least one labour!", "कम से कम एक मजदूर चुनें!"), "error");
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
        if (e.date === entryDate) { entryExists = true; return { ...e, payeCount: (e.payeCount || 0) + paye, customRatePerPaya: activePayeRate, isLeave: false }; }
        return e;
      });
      if (!entryExists) { updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: entryDate, bricks: 0, payeCount: paye, customRatePerPaya: activePayeRate, kharcha: 0, peshgi: 0, isLeave: false }); }
      updatedLabourers[labourIndex] = { ...selectedLabour, entries: updatedEntries };
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setPayeAmount(""); setSelectedLabourIds([]); showToast(t("Work entry added!", "काम सफलतापूर्वक दर्ज हुआ!"), "success");
  };

  const handleAddBulkLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLabourIds.length === 0) return showToast("Kripya kam se kam ek labour select karein!", "error");

    let updatedLabourers = [...labourers];
    selectedLabourIds.forEach(id => {
      const labourIndex = updatedLabourers.findIndex(l => l.id === id);
      if (labourIndex === -1) return;
      const selectedLabour = updatedLabourers[labourIndex];
      let entryExists = false;
      const updatedEntries = (Array.isArray(selectedLabour.entries) ? selectedLabour.entries : []).map((e: any) => {
        if (e.date === entryDate) { entryExists = true; return { ...e, isLeave: true }; }
        return e;
      });
      if (!entryExists) { updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: entryDate, bricks: 0, payeCount: 0, customRatePerPaya: selectedLabour.ratePerPaya || 0, kharcha: 0, peshgi: 0, isLeave: true }); }
      updatedLabourers[labourIndex] = { ...selectedLabour, entries: updatedEntries };
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setSelectedLabourIds([]); showToast("Leave (Absent) successfully mark ho gaya!", "success");
  };

  const handleAddKharcha = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kharchaLabourId || !kharchaAmount) return showToast("Select labour and enter amount!", "error");
    const amount = Number(kharchaAmount);
    if (amount <= 0) return showToast("Amount galat hai!", "error");
    
    const updatedLabourers = labourers.map(lab => {
      if (lab.id === kharchaLabourId) {
        const newEntry: DailyEntry = { id: Date.now().toString(), date: new Date().toISOString().split("T")[0], bricks: 0, payeCount: 0, kharcha: amount, peshgi: 0 };
        return { ...lab, entries: [...lab.entries, newEntry] };
      }
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setKharchaAmount(""); setKharchaLabourId(""); setKharchaSearchQuery(""); showToast(t("Expense added!", "खर्चा दर्ज हो गया!"), "success");
  };

  const handleAddBulkKharcha = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedKharchaIds.length === 0) return showToast("Kripya kam se kam ek labour select karein!", "error");
    const amount = Number(bulkKharchaAmount);
    if (amount <= 0) return showToast("Amount galat hai!", "error");

    let updatedLabourers = [...labourers];
    selectedKharchaIds.forEach(id => {
      const labourIndex = updatedLabourers.findIndex(l => l.id === id);
      if (labourIndex === -1) return;
      const selectedLabour = updatedLabourers[labourIndex];
      let entryExists = false;
      const updatedEntries = (Array.isArray(selectedLabour.entries) ? selectedLabour.entries : []).map((e: any) => {
        if (e.date === bulkKharchaDate) { entryExists = true; return { ...e, kharcha: (e.kharcha || 0) + amount }; }
        return e;
      });
      if (!entryExists) { updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: bulkKharchaDate, bricks: 0, payeCount: 0, customRatePerPaya: selectedLabour.ratePerPaya || 0, kharcha: amount, peshgi: 0 }); }
      updatedLabourers[labourIndex] = { ...selectedLabour, entries: updatedEntries };
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setBulkKharchaAmount(""); setSelectedKharchaIds([]); showToast("Bulk Khuraak successfully add ho gayi!", "success");
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
          if (e.date === peshgiDate) { entryExists = true; return { ...e, peshgi: (e.peshgi || 0) + finalAmount }; }
          return e;
        });
        if (!entryExists) { updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: peshgiDate, bricks: 0, payeCount: 0, customRatePerPaya: lab.ratePerPaya || 0, kharcha: 0, peshgi: finalAmount }); }
        return { ...lab, entries: updatedEntries };
      }
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setPeshgiAmount(""); setPeshgiLabourId(""); showToast(t(`Advance ${peshgiType === 'add' ? 'Added' : 'Returned'}!`, `पेशगी सफलतापूर्वक ${peshgiType === 'add' ? 'जोड़ी' : 'जमा'} हो गई!`), "success");
  };

  const handleSaveLabourEdit = (id: string) => {
    if(!editLabourData) return;
    if (labourers.some(l => l.loginId === editLabourData.loginId && l.id !== id)) return showToast("Ye Labour ID kisi aur ki hai!", "error");
    const updatedLabourers = labourers.map(lab => {
      if(lab.id === id) return { ...lab, name: editLabourData.name, loginId: editLabourData.loginId, phone: editLabourData.phone, paya: editLabourData.paya, ratePerPaya: editLabourData.payeRate };
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setEditingLabourId(null); setEditLabourData(null); showToast(t("Details Updated!", "विवरण अपडेट हो गया!"), "success");
  };

  const changeTab = (tab: "dashboard" | "eent" | "kharcha" | "peshgi" | "manage" | "download" | "role" | "recycle") => { setActiveTab(tab); setIsSidebarOpen(false); };

  const filteredDashboard = currentLabourers.filter(l => l.name.toLowerCase().includes(searchDashboard.toLowerCase()) || (l.loginId && l.loginId.includes(searchDashboard)));
  const filteredManage = currentLabourers.filter(l => l.name.toLowerCase().includes(searchManage.toLowerCase()) || (l.loginId && l.loginId.includes(searchManage)));
  const filteredBulk = currentLabourers.filter(l => l.name.toLowerCase().includes(searchBulk.toLowerCase()));
  const filteredBulkKharcha = currentLabourers.filter(l => l.name.toLowerCase().includes(searchBulkKharcha.toLowerCase()));
  const filteredPeshgi = currentLabourers.filter(l => l.name.toLowerCase().includes(searchPeshgi.toLowerCase()));
  const filteredDownload = currentLabourers.filter(l => l.name.toLowerCase().includes(searchDownload.toLowerCase()) || (l.loginId && l.loginId.includes(searchDownload)));

  // CSS Theme Classes for Absolute Override
  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#0f172a] text-white" : "bg-slate-50 text-slate-900";
  const navBg = isDark ? "bg-[#0f172a]/90 border-slate-700/50" : "bg-white/90 border-slate-200 shadow-sm";
  const sideBg = isDark ? "bg-[#1e293b] border-slate-700/50" : "bg-white border-slate-200 shadow-xl";
  const cardBg = isDark ? "bg-slate-800/40 border-slate-700/50" : "bg-white border-slate-200 shadow-md";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const textMain = isDark ? "text-white" : "text-slate-900";
  
  const inputBg = isDark ? "!bg-slate-900/50 !border-slate-600 focus:border-blue-500 !text-white placeholder-slate-500" : "!bg-white !border-slate-300 focus:border-blue-500 !text-slate-900 placeholder-slate-400 shadow-sm";
  
  const tableHeader = isDark ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-300";
  const tableBody = isDark ? "divide-slate-700/50 text-slate-200" : "divide-slate-200 text-slate-700";
  const tableRowHover = isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50";
  const modalInner = isDark ? "bg-slate-950 border-slate-700" : "bg-slate-50 border-slate-200";

  // 🟢 NAYA: RESPONSIVE MONTHLY MATRIX TABLE 
  const renderMatrixTable = () => {
    // Grand Total Calculation for current month
    const grandMonthTotal = filteredDashboard.reduce((acc, lab) => {
      return acc + (lab.entries || []).reduce((sum: number, e: any) => {
        if(e.date.startsWith(matrixMonth)) return sum + (e.payeCount || 0);
        return sum;
      }, 0);
    }, 0);

    return (
      <div className={`flex flex-col h-full ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
        <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-4 md:px-5 py-3 md:py-4 border-b z-40 shadow-sm ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
          <div>
            <h3 className={`font-extrabold text-sm md:text-base flex items-center gap-2 ${textMain}`}><Table size={18} className="text-emerald-500"/> Monthly Paye Ledger</h3>
            <p className={`text-xs font-semibold mt-1 ${textMuted}`}>Selected Month: {matrixMonth}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm w-full sm:w-auto ${isDark ? 'bg-slate-800 border-slate-700' : '!bg-white !border-slate-300'}`}>
              <CalendarDays size={16} className={textMuted}/>
              <input 
                type="month" 
                value={matrixMonth} 
                onChange={(e) => setMatrixMonth(e.target.value)} 
                style={{ colorScheme: isDark ? 'dark' : 'light' }}
                className={`outline-none text-xs md:text-sm font-bold border-none p-0 m-0 !bg-transparent w-full ${isDark ? '!text-white' : '!text-slate-900'}`} 
                required 
              />
            </div>
            <button onClick={() => setIsFullscreenMatrix(!isFullscreenMatrix)} className={`p-2 md:p-2.5 rounded-lg border shadow-sm transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'}`}>
              {isFullscreenMatrix ? <Minimize2 size={16} className="md:w-[18px] md:h-[18px]"/> : <Maximize2 size={16} className="md:w-[18px] md:h-[18px]"/>}
            </button>
          </div>
        </div>

        <div className={`overflow-auto custom-scrollbar flex-1 relative ${isFullscreenMatrix ? 'h-[calc(100vh-80px)]' : 'min-h-[400px] max-h-[550px]'}`}>
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr>
                {/* 🟢 MOBILE OPTIMIZED LEFT HEADER */}
                <th className={`sticky top-0 left-0 z-[50] p-2 md:p-4 text-[9px] md:text-xs uppercase tracking-widest font-black border-b-2 border-r-2 whitespace-nowrap ${isDark ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 shadow-[2px_2px_5px_rgba(0,0,0,0.02)]'}`}>
                  <span className="hidden sm:inline">Date ↓ \ Name →</span>
                  <span className="sm:hidden">Date</span>
                </th>
                
                {filteredDashboard.map(lab => (
                  <th key={lab.id} className={`sticky top-0 z-[40] p-2 md:p-4 text-xs md:text-sm font-extrabold whitespace-nowrap text-center border-b-2 ${isDark ? 'bg-slate-800 text-white border-slate-700 shadow-md' : 'bg-white text-slate-800 border-slate-200 shadow-sm'}`}>
                    {tn(lab.name)}
                  </th>
                ))}
                
                {/* 🟢 MOBILE OPTIMIZED RIGHT HEADER */}
                <th className={`sticky top-0 right-0 z-[50] p-2 md:p-4 text-[9px] md:text-xs uppercase tracking-widest font-black text-center text-emerald-600 border-b-2 border-l-2 whitespace-nowrap ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-emerald-50 border-emerald-200 shadow-[-2px_2px_5px_rgba(0,0,0,0.02)]'}`}>
                  <span className="hidden sm:inline">Daily Total</span>
                  <span className="sm:hidden">Total</span>
                </th>
              </tr>
            </thead>
            
            <tbody className={tableBody}>
              {allMatrixDates.length === 0 && (
                <tr><td colSpan={filteredDashboard.length + 2} className={`p-10 text-center italic font-medium ${textMuted}`}>No dates available.</td></tr>
              )}
              {allMatrixDates.map((date) => {
                let dayTotalPaye = 0;
                // Ex: "2026-08-30" -> split returns ["2026", "08", "30"]
                const dParts = date.split('-'); 
                const shortDate = `${dParts[2]}/${dParts[1]}`; 

                return (
                  <tr key={date} className={`transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/20`}>
                    {/* 🟢 MOBILE OPTIMIZED DATE CELL */}
                    <td className={`sticky left-0 z-[30] p-2 md:p-4 border-b border-r-2 font-bold whitespace-nowrap text-[10px] md:text-sm ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 shadow-[2px_0_5px_rgba(0,0,0,0.2)]' : 'bg-slate-50 border-slate-100 text-slate-600 shadow-[2px_0_5px_rgba(0,0,0,0.02)]'}`}>
                      <span className="hidden sm:inline">{date}</span>
                      <span className="sm:hidden">{shortDate}</span>
                    </td>
                    
                    {filteredDashboard.map(lab => {
                      const entry = (lab.entries || []).find((e: any) => e.date === date);
                      const paye = entry?.payeCount || 0;
                      dayTotalPaye += paye;
                      return (
                        <td key={lab.id} className={`p-2 md:p-4 border-b text-center font-bold text-sm md:text-base transition-colors ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          {entry?.isLeave ? (
                            <span className="text-rose-500 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 md:py-1 rounded-md border border-rose-500/20 bg-rose-500/10">L</span>
                          ) : (
                            paye > 0 ? (
                              <span className="text-blue-700 dark:text-blue-200 font-extrabold">{paye}</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 font-normal">-</span>
                            )
                          )}
                        </td>
                      )
                    })}
                    
                    {/* 🟢 MOBILE OPTIMIZED TOTAL CELL */}
                    <td className={`sticky right-0 z-[30] p-2 md:p-4 border-b border-l-2 text-center font-black text-sm md:text-lg text-emerald-600 ${isDark ? 'bg-slate-900 border-slate-800 shadow-[-2px_0_5px_rgba(0,0,0,0.2)]' : 'bg-emerald-50/30 border-slate-100 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]'}`}>
                      {dayTotalPaye > 0 ? dayTotalPaye : <span className="opacity-30 font-normal">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className={`sticky bottom-0 left-0 z-[50] p-2 md:p-4 text-[9px] md:text-xs uppercase tracking-widest font-black border-t-2 border-r-2 whitespace-nowrap ${isDark ? 'bg-slate-900 text-slate-400 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'}`}>
                   <span className="hidden sm:inline">Month Total ↓</span>
                   <span className="sm:hidden">Total</span>
                </td>
                {filteredDashboard.map(lab => {
                  const totalLabPaye = (lab.entries || []).reduce((sum: number, e: any) => {
                    if(e.date.startsWith(matrixMonth)) return sum + (e.payeCount || 0);
                    return sum;
                  }, 0);
                  return (
                    <td key={lab.id} className={`sticky bottom-0 z-[40] p-2 md:p-4 text-sm md:text-base font-extrabold text-center border-t-2 ${isDark ? 'bg-slate-800 text-blue-300 border-slate-700 shadow-[0_-2px_5px_rgba(0,0,0,0.1)]' : 'bg-slate-100 text-blue-700 border-slate-300 shadow-[0_-2px_5px_rgba(0,0,0,0.02)]'}`}>
                      {totalLabPaye > 0 ? totalLabPaye : '-'}
                    </td>
                  )
                })}
                <td className={`sticky bottom-0 right-0 z-[50] p-2 md:p-4 text-base md:text-lg font-black text-center text-emerald-600 border-t-2 border-l-2 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-emerald-100 border-emerald-300'}`}>
                  {grandMonthTotal > 0 ? grandMonthTotal : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 ${bgMain}`}>
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full w-24 h-24 animate-pulse"></div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin z-10"></div>
          <CloudDownload size={24} className="absolute text-blue-500 z-10" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent animate-pulse">Syncing Bhatta Cloud Data...</h2>
      </div>
    );
  }

  if (isFullscreenMatrix && dashboardView === "matrix" && activeTab === "dashboard") {
    return (
      <div className="fixed inset-0 z-[999999] w-screen h-[100dvh] m-0 p-0 overflow-hidden flex flex-col bg-white dark:bg-[#0f172a]">
        {renderMatrixTable()}
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 relative transition-colors duration-300 ${bgMain}`}>
      
      {toast && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={22} /> : <CheckCircle size={22} />}
          <span className="font-semibold text-sm">{toast.msg}</span>
        </div>
      )}

      {/* SECURITY PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl relative border text-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => {setShowPinModal(null); setPinInput("");}} className={`absolute top-4 right-4 p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100'}`}><X size={18} /></button>
            <div className="w-14 h-14 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4"><LockKeyhole size={28}/></div>
            <h2 className={`text-xl font-bold mb-2 ${textMain}`}>{t("Security PIN Required", "सुरक्षा पिन दर्ज करें")}</h2>
            <form onSubmit={executeSecureAction}>
              {adminPin ? (
                <>
                  <input type="password" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="****" required autoFocus className={`w-full text-center tracking-[1em] text-2xl rounded-xl px-4 py-3 outline-none font-bold transition-all border mb-4 ${inputBg}`} />
                  <button type="submit" className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"><Check size={18}/> Confirm Action</button>
                </>
              ) : (
                <div className="text-sm text-rose-500 font-medium mb-4">Aapne abhi tak Security PIN set nahi kiya hai. Pehle 'Manage' tab se PIN set karein.</div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetPasswordId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm p-6 rounded-2xl shadow-2xl relative border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setResetPasswordId(null)} className={`absolute top-4 right-4 p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100'}`}><X size={18} /></button>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mb-3"><Key size={24}/></div>
              <h2 className={`text-xl font-bold ${textMain}`}>{t("Create New Password", "नया पासवर्ड बनाएं")}</h2>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <input type="password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} placeholder="Type new password" required autoFocus className={`w-full rounded-xl px-4 py-3 outline-none font-bold transition-all border ${inputBg}`} />
              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"><Check size={18}/> Update Password</button>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg p-6 shadow-2xl relative rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setShowImportModal(false)} className={`absolute top-4 right-4 transition-colors p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100'}`}><X size={20} /></button>
            <h2 className="text-xl font-bold text-emerald-500 mb-2 flex items-center gap-2"><FileSpreadsheet size={24} /> Smart Import Labour Data</h2>
            <div className={`rounded-xl p-4 border mb-6 overflow-x-auto shadow-inner ${modalInner}`}>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Format Columns</p>
              <table className="w-full text-left text-[10px] md:text-xs whitespace-nowrap">
                <thead><tr className={`border-b ${isDark ? 'text-slate-300 border-slate-800' : 'text-slate-700 border-slate-300'}`}><th className="pb-2 pr-3 font-semibold text-blue-500">Name*</th><th className="pb-2 pr-3 font-semibold">Mobile</th><th className="pb-2 pr-3 font-semibold text-emerald-500">Rate</th><th className="pb-2 pr-3 font-semibold text-rose-500">Date</th><th className="pb-2 pr-3 font-semibold">Paye</th></tr></thead>
                <tbody className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}><tr><td className="pt-2 pr-3">Ramu</td><td className="pt-2 pr-3">987...</td><td className="pt-2 pr-3">35</td><td className="pt-2 pr-3">2026-08-25</td><td className="pt-2 pr-3 text-emerald-500">500</td></tr></tbody>
              </table>
            </div>
            <div className="relative mt-2">
              <input type="file" accept=".csv" id="csv-modal-upload" className="hidden" onChange={handleFileUpload} />
              <label htmlFor="csv-modal-upload" className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-95"><Upload size={18} /> Select & Upload CSV File</label>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className={`fixed top-0 w-full h-16 backdrop-blur-md border-b z-[100] flex items-center justify-between px-4 transition-colors duration-300 ${navBg}`}>
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-800'}`}><Menu size={28} /></button>
          <div className="ml-4 flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent leading-none">Bhatta Pro</h1>
            <span className="text-xs text-emerald-500 font-medium">{activeBhattaName}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button onClick={toggleLanguage} className={`p-2 rounded-full transition-colors font-bold text-xs flex items-center gap-1 ${isDark ? 'bg-slate-800 text-cyan-400 hover:bg-slate-700' : 'bg-slate-100 text-cyan-600 shadow-sm hover:bg-slate-200'}`}><Globe size={16} /> {lang === "en" ? "HI" : "EN"}</button>
          <div className="relative">
            <button onClick={toggleNotifications} className={`p-2 rounded-full transition-colors relative ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
              <Bell size={20} />
              {hasUnreadNotifications && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#0f172a] animate-pulse"></span>}
            </button>
            {showNotifications && (
              <div className={`absolute right-[-60px] sm:right-0 mt-4 w-[300px] sm:w-80 max-h-[400px] overflow-y-auto custom-scrollbar rounded-xl border shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 z-[200] ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="px-3 py-2 border-b mb-2 flex justify-between items-center sticky top-0 bg-inherit z-10"><h3 className={`font-bold text-sm ${textMain}`}>Recent Labour Notes</h3><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{notifications.length} Total</span></div>
                {notifications.length === 0 ? (<p className={`p-4 text-center text-xs ${textMuted}`}>No notifications yet.</p>) : (
                  <div className="space-y-1">
                    {notifications.map(notif => (
                      <div key={notif.id} onClick={() => { router.push(`/labour/${notif.labId}`); setShowNotifications(false); }} className={`p-3 rounded-lg flex flex-col gap-1 transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                        <div className="flex justify-between items-start"><span className={`text-xs font-bold ${textMain} hover:text-blue-500 transition-colors`}>{tn(notif.labName)}</span><span className={`text-[10px] ${textMuted}`}>{notif.date}</span></div>
                        <p className={`text-xs italic bg-opacity-50 p-1.5 rounded border ${isDark ? 'text-blue-300 bg-blue-900/20 border-blue-500/20' : 'text-blue-700 bg-blue-50 border-blue-200'}`}>"{notif.remark}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 shadow-sm hover:bg-slate-200'}`}>{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition text-sm font-bold border border-red-500/20"><LogOut size={16}/> <span className="hidden sm:inline">Logout</span></button>
        </div>
      </nav>

      {/* SIDEBAR */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[105]" onClick={() => setIsSidebarOpen(false)}></div>}
      <div className={`fixed top-0 left-0 h-full w-72 border-r z-[110] transform transition-transform duration-300 ease-in-out flex flex-col ${sideBg} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h2 className={`text-xl font-bold ${textMain}`}>{t("Admin Menu", "व्यवस्थापक मेनू")}</h2>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><X size={24} /></button>
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => changeTab("dashboard")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><LayoutDashboard size={20} /> {t("Dashboard", "डैशबोर्ड")}</button>
          <button onClick={() => changeTab("manage")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "manage" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><Settings size={20} /> {t("Manage & Control", "नियंत्रण")}</button>
          <button onClick={() => changeTab("eent")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "eent" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><Layers size={20} /> {t("Work Entry", "काम दर्ज करें")}</button>
          <button onClick={() => changeTab("kharcha")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "kharcha" ? "bg-orange-600 text-white shadow-lg shadow-orange-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><Wallet size={20} /> {t("Expenses", "खर्चा")}</button>
          <button onClick={() => changeTab("peshgi")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "peshgi" ? "bg-rose-600 text-white shadow-lg shadow-rose-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><IndianRupee size={20} /> {t("Advance (Peshgi)", "पेशगी")}</button>
          <button onClick={() => changeTab("download")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition mt-4 border font-medium ${activeTab === "download" ? "bg-cyan-600 text-white border-transparent shadow-lg shadow-cyan-500/30" : (isDark ? "border-cyan-500/20 hover:bg-slate-800 text-cyan-400" : "border-cyan-200 hover:bg-cyan-50 text-cyan-600")}`}><FileDown size={20} /> {t("Download Receipt", "रसीद डाउनलोड")}</button>
          <div className={`h-px w-full my-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`}></div>
          <button onClick={() => changeTab("role")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "role" ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30" : (isDark ? "hover:bg-slate-800 text-violet-400" : "hover:bg-violet-50 text-violet-600")}`}><ShieldAlert size={20} /> Give Power (Admins)</button>
          <button onClick={() => changeTab("recycle")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "recycle" ? "bg-slate-600 text-white shadow-lg" : (isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500")}`}><Trash size={20} /> {t("Recycle Bin", "रीसायकल बिन")}</button>
        </div>
        <div className={`p-4 border-t ${isDark ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${textMuted}`}><Building2 size={14}/> {t("Work Sites", "साइट्स")}</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3 pr-2 custom-scrollbar">
            {bhattas.map(b => (
              <button key={b.id} onClick={() => handleBhattaChange(b.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition border ${activeBhattaId === b.id ? (isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold') : (isDark ? 'border-transparent hover:bg-slate-700 text-slate-300' : 'border-transparent hover:bg-slate-100 text-slate-600')}`}>{b.name}</button>
            ))}
          </div>
          {isAddingBhatta ? (
            <form onSubmit={handleAddBhatta} className="flex gap-2">
              <input type="text" value={newBhattaName} onChange={(e) => setNewBhattaName(e.target.value)} placeholder="New work site" className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-all ${inputBg}`} autoFocus />
              <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"><Check size={16} /></button>
              <button type="button" onClick={() => { setNewBhattaName(""); setIsAddingBhatta(false); }} className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}><X size={16} /></button>
            </form>
          ) : (
            <button type="button" onClick={() => setIsAddingBhatta(true)} className={`w-full rounded-lg border border-dashed px-3 py-2 text-sm transition font-medium ${isDark ? 'border-slate-600 text-slate-300 hover:border-emerald-500 hover:text-emerald-400' : 'border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}>+ Add Work Site</button>
          )}
        </div>
      </div>

      <main className="pt-24 px-4 md:px-8 max-w-6xl mx-auto pb-12">
        
        {/* ===================== DASHBOARD ===================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-5 rounded-2xl transition-all ${isDark ? 'bg-gradient-to-br from-cyan-900/40 to-slate-900 border border-cyan-500/30 shadow-lg' : 'bg-cyan-50 border border-cyan-200 shadow-sm'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>{t("Total Bhatta Earnings", "कुल भट्ठा कमाई")}</p>
                <h3 className={`text-3xl font-extrabold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>₹{overallStats.totalEarned.toLocaleString()}</h3>
              </div>
              <div className={`p-5 rounded-2xl transition-all ${isDark ? 'bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 shadow-lg' : 'bg-orange-50 border border-orange-200 shadow-sm'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{t("Total Kharcha Given", "कुल दिया गया खर्चा")}</p>
                <h3 className={`text-3xl font-extrabold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>₹{overallStats.totalExpenses.toLocaleString()}</h3>
              </div>
              <div className={`p-5 rounded-2xl transition-all ${isDark ? 'bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/30 shadow-lg' : 'bg-rose-50 border border-rose-200 shadow-sm'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>{t("Total Market Advance", "कुल पेशगी")}</p>
                <h3 className={`text-3xl font-extrabold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>₹{overallStats.totalAdvance.toLocaleString()}</h3>
              </div>
            </div>

            {chartData.length > 0 && (
              <div className={`backdrop-blur-xl border rounded-2xl p-6 transition-all ${cardBg}`}>
                <h2 className={`text-lg font-bold mb-6 flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}><BarChart3 size={20}/> Top 10 Labourers Chart</h2>
                <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} /><XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickMargin={10} /><YAxis stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickFormatter={(value) => `₹${value}`} /><Tooltip cursor={{fill: isDark ? '#1e293b' : '#f1f5f9'}} contentStyle={{backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '8px', color: isDark ? '#fff' : '#000'}} /><Legend wrapperStyle={{paddingTop: '20px'}}/><Bar dataKey="Earned" fill="#22d3ee" radius={[4, 4, 0, 0]} /><Bar dataKey="Expenses" fill="#fb923c" radius={[4, 4, 0, 0]} /><Bar dataKey="Advance" fill="#fb7185" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
              </div>
            )}

            <div className={`backdrop-blur-xl border rounded-2xl p-6 transition-all ${cardBg}`}>
              <div className={`flex justify-between items-center mb-4 border-b pb-4 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <h2 className={`text-lg font-bold flex items-center gap-2 ${textMain}`}><Users size={20} className="text-blue-500"/> {t("Add New Labour", "नया मजदूर जोड़ें")} ({activeBhattaName})</h2>
                <button onClick={() => setShowImportModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"><Upload size={16} /> Import CSV</button>
              </div>

              <form onSubmit={handleAddLabour} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>{t("Name", "नाम")}</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none transition-all border ${inputBg}`} placeholder="Name" required/></div>
                <div><label className="block text-xs font-extrabold text-blue-500 mb-1">Labour ID (Auto)</label><input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none font-bold transition-all border ${isDark ? 'bg-slate-900/50 border-blue-500/50 focus:border-blue-400 text-blue-300' : 'bg-blue-50 border-blue-200 focus:border-blue-400 text-blue-700'}`} placeholder="e.g. 1001" /></div>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>{t("Mobile", "मोबाइल")}</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none transition-all border ${inputBg}`} placeholder="Number" /></div>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>{t("Location", "जगह")}</label><input type="text" value={paya} onChange={(e) => setPaya(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none transition-all border ${inputBg}`} placeholder="e.g. Line 1" /></div>
                <div><label className="block text-xs font-extrabold text-emerald-500 mb-1">{t("Rate (/Paye)", "रेट")}</label><input type="number" value={ratePaya} onChange={(e) => setRatePaya(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none font-bold transition-all border ${isDark ? 'bg-slate-900/50 border-emerald-500/50 focus:border-emerald-400 text-emerald-300' : 'bg-emerald-50 border-emerald-200 focus:border-emerald-400 text-emerald-700'}`} placeholder="e.g. 35" required/></div>
                <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition shadow-md md:col-span-1 sm:col-span-2 text-sm active:scale-95">{t("Add", "जोड़ें")}</button>
              </form>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
              <h2 className={`text-lg font-bold flex items-center gap-3 ${textMain}`}>{t("Overview", "सारांश")} ({activeBhattaName}) - {filteredDashboard.length} Labourers</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search..." value={searchDashboard} onChange={(e) => setSearchDashboard(e.target.value)} className={`pl-9 pr-4 py-2 rounded-lg text-sm outline-none w-full md:w-48 transition-all border ${inputBg}`} />
                </div>
                <div className={`p-1 rounded-xl flex items-center gap-1 border shadow-inner ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                  <button onClick={() => setDashboardView("card")} className={`p-2 rounded-lg text-xs font-bold transition-all ${dashboardView === "card" ? (isDark ? "bg-slate-600 text-white shadow-md" : "bg-white text-slate-800 shadow-sm") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800")}`}><LayoutList size={16}/></button>
                  <button onClick={() => setDashboardView("matrix")} className={`p-2 rounded-lg text-xs font-bold transition-all ${dashboardView === "matrix" ? (isDark ? "bg-slate-600 text-white shadow-md" : "bg-white text-slate-800 shadow-sm") : (isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800")}`}><Table size={16}/></button>
                </div>
              </div>
            </div>

            {/* CARD VIEW */}
            {dashboardView === "card" && (
              <div className="space-y-4">
                {filteredDashboard.length === 0 && <p className={`text-center py-4 font-medium ${textMuted}`}>No results found.</p>}
                {filteredDashboard.map((lab) => {
                  const stats = getStats(lab);
                  return (
                    <div key={lab.id} className={`p-4 rounded-xl border flex flex-col lg:flex-row justify-between items-center gap-4 transition-all ${isDark ? 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                      <div className="flex-1 w-full text-left"><h3 className={`font-extrabold text-xl ${textMain}`}>{tn(lab.name)}</h3><p className={`text-sm mt-1 ${textMuted}`}>ID: <span className="text-blue-500 font-bold">{lab.loginId}</span> | {lab.phone}</p></div>
                      <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 justify-start lg:justify-center">
                        <div className={`text-left px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}><p className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider">Earned</p><p className={`text-lg font-extrabold ${textMain}`}>₹{stats.earned.toLocaleString()}</p></div>
                        <div className={`text-left px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}><p className="text-orange-500 text-[10px] font-bold uppercase tracking-wider">Expenses</p><p className={`text-lg font-extrabold ${textMain}`}>₹{stats.kharcha.toLocaleString()}</p></div>
                        <div className={`text-left px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}><p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider">Advance</p><p className={`text-lg font-extrabold ${textMain}`}>₹{stats.peshgi.toLocaleString()}</p></div>
                      </div>
                      <div className="w-full lg:w-auto flex justify-end gap-2">
                        <Link href={`/labour/${lab.id}`} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold whitespace-nowrap shadow-md active:scale-95"><FileText size={18} /> View Register</Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 🟢 MATRIX VIEW INLINE */}
            {dashboardView === "matrix" && !isFullscreenMatrix && (
              <div className={`relative w-full border rounded-xl overflow-hidden shadow-inner flex flex-col min-h-[400px] mt-4 ${isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-white'}`}>
                {renderMatrixTable()}
              </div>
            )}
          </div>
        )}

        {/* ===================== MANAGE LABOUR TAB ===================== */}
        {activeTab === "manage" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
               <h2 className={`text-xl font-extrabold mb-4 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}><DatabaseBackup size={24} /> {t("Database Backup", "डेटाबेस बैकअप")}</h2>
               <div className="flex flex-col md:flex-row items-center gap-4">
                 <p className={`text-sm flex-1 ${textMuted}`}>Apne poore database ka offline backup apne computer mein download karke zarur rakhein.</p>
                 <button onClick={handleExportBackup} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-md active:scale-95">
                   <Download size={18}/> Export Database (.json)
                 </button>
               </div>
            </div>

            <div className={`border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
               <h2 className={`text-xl font-extrabold mb-4 flex items-center gap-2 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}><LockKeyhole size={24} /> {t("Security PIN", "सुरक्षा पिन")}</h2>
               <form onSubmit={handleSetPin} className="flex flex-col md:flex-row items-center gap-4">
                 <div className="flex-1 w-full">
                    <p className={`text-sm mb-2 ${textMuted}`}>Ye PIN dalne ke baad hi koi account delete ya password reset kar payega.</p>
                    <input type="text" maxLength={4} value={newPinSetup} onChange={(e) => setNewPinSetup(e.target.value)} className={`w-full rounded-xl px-4 py-2.5 outline-none font-bold transition-all border ${inputBg}`} placeholder="Enter 4-Digit PIN" />
                 </div>
                 <button type="submit" className="w-full md:w-auto px-6 py-2.5 mt-auto bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-md active:scale-95">
                   <Check size={18}/> {adminPin ? "Update PIN" : "Set PIN"}
                 </button>
               </form>
            </div>

            <div className={`border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className={`text-xl font-extrabold flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}><Settings size={24} /> Labour Details & Control</h2>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search ID or Name..." value={searchManage} onChange={(e) => setSearchManage(e.target.value)} className={`pl-9 pr-4 py-2 rounded-lg text-sm outline-none w-full md:w-64 transition-all border ${inputBg}`} />
                </div>
              </div>
              
              <div className={`overflow-x-auto border rounded-xl ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className={`text-xs uppercase tracking-wider border-b ${tableHeader}`}>
                      <th className="p-4 font-bold">Name</th>
                      <th className="p-4 font-bold text-blue-500">Labour ID</th>
                      <th className="p-4 font-bold">Mobile</th>
                      <th className="p-4 font-bold">Location</th>
                      <th className="p-4 font-bold text-emerald-500">Rate Per Paye (₹)</th>
                      <th className="p-4 font-bold text-center">Actions / Controls</th>
                    </tr>
                  </thead>
                  <tbody className={`text-sm ${tableBody}`}>
                    {filteredManage.length === 0 && <tr><td colSpan={6} className={`p-4 text-center font-medium ${textMuted}`}>No results found.</td></tr>}
                    {filteredManage.map(lab => {
                      const isEditing = editingLabourId === lab.id;
                      return (
                        <tr key={lab.id} className={`transition-colors ${tableRowHover}`}>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.name} onChange={(e)=>setEditLabourData({...editLabourData!, name: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-medium ${inputBg}`}/> : <span className="font-semibold">{tn(lab.name)}</span>}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.loginId} onChange={(e)=>setEditLabourData({...editLabourData!, loginId: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-bold ${isDark ? 'bg-slate-900 border-blue-500/50 text-blue-300' : '!bg-white border-blue-300 text-blue-700'}`}/> : <span className="font-extrabold text-blue-500">{lab.loginId}</span>}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.phone} onChange={(e)=>setEditLabourData({...editLabourData!, phone: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-medium ${inputBg}`}/> : lab.phone}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.paya} onChange={(e)=>setEditLabourData({...editLabourData!, paya: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-medium ${inputBg}`}/> : (tn(lab.paya) || "-")}</td>
                          <td className="p-3">{isEditing ? <input type="number" value={editLabourData?.payeRate} onChange={(e)=>setEditLabourData({...editLabourData!, payeRate: Number(e.target.value)})} className={`w-full rounded px-2 py-1.5 outline-none border font-bold ${isDark ? 'bg-slate-900 border-emerald-500/50 text-emerald-400' : '!bg-white border-emerald-300 text-emerald-700'}`}/> : <span className={`font-bold px-3 py-1 rounded-md ${isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-100 border border-emerald-200'}`}>₹{lab.ratePerPaya || 0}</span>}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              {isEditing ? (
                                <button onClick={() => handleSaveLabourEdit(lab.id)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 mx-auto"><Check size={14}/> Save</button>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingLabourId(lab.id); setEditLabourData({name: lab.name, loginId: lab.loginId, phone: lab.phone, paya: lab.paya || "", payeRate: lab.ratePerPaya || 0}); }} className={`px-4 py-1.5 rounded-lg font-bold transition-all active:scale-95 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-300 shadow-sm hover:bg-slate-50 text-slate-700'}`}>Edit</button>
                                  <button onClick={() => setResetPasswordId(lab.id)} className={`p-1.5 rounded-lg transition-colors border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-blue-500/20 hover:text-blue-400 text-slate-400' : 'bg-white border-slate-300 hover:bg-blue-50 hover:text-blue-600 text-slate-500 shadow-sm'}`} title="Create/Reset Password">
                                    <Key size={16} />
                                  </button>
                                  <button onClick={() => setShowPinModal({action: "delete", targetId: lab.id})} className={`p-1.5 rounded-lg transition-colors border ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400' : 'bg-white border-slate-300 hover:bg-rose-50 hover:text-rose-600 text-slate-500 shadow-sm'}`} title="Move to Recycle Bin">
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
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
            <div className={`border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 transition-all ${cardBg}`}>
              
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h2 className="text-xl font-extrabold mb-2 text-emerald-500 flex items-center gap-2"><CheckSquare size={22} /> Bulk Attendance/Work</h2>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Date</label><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} style={{ colorScheme: isDark ? 'dark' : 'light' }} className={`w-full rounded-lg px-3 py-2.5 outline-none font-medium transition-all border ${inputBg}`} required /></div>
                <div><label className="block text-xs font-extrabold text-emerald-500 mb-1">Paye Count</label><input type="number" value={payeAmount} onChange={(e) => setPayeAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-extrabold text-lg transition-all border ${isDark ? 'bg-slate-900/80 border-emerald-500/50 focus:border-emerald-400 text-emerald-100' : '!bg-white border-emerald-300 focus:border-emerald-500 text-emerald-800'}`} placeholder="e.g. 5" /></div>
                
                <div className="mt-auto flex flex-col gap-3">
                  <button onClick={handleAddWork} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <CheckCircle size={18}/> Submit Work
                  </button>
                  <button onClick={handleAddBulkLeave} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <UserMinus size={18}/> Mark Leave (Absent)
                  </button>
                </div>
              </div>

              <div className={fullScreenList === "work" ? `fixed inset-0 z-[120] p-4 md:p-8 flex flex-col animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}` : `w-full md:w-2/3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                  <label className={`text-xs md:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${textMain}`}>
                    Select Labourers <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>{selectedLabourIds.length} Selected</span>
                  </label>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search name..." value={searchBulk} onChange={(e) => setSearchBulk(e.target.value)} className={`pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none w-full sm:w-56 transition-all border ${inputBg}`} />
                    </div>
                    <button onClick={() => setFullScreenList(fullScreenList === "work" ? null : "work")} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600 shadow-sm'}`} title={fullScreenList === "work" ? "Minimize" : "Full Screen"}>
                      {fullScreenList === "work" ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                    </button>
                  </div>
                </div>

                <div className={`border rounded-xl overflow-y-auto custom-scrollbar shadow-inner flex-1 ${fullScreenList === "work" ? "" : "max-h-75"} ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                  <label className={`flex items-center gap-3 p-4 cursor-pointer border-b sticky top-0 backdrop-blur z-10 ${isDark ? 'hover:bg-slate-800/80 border-slate-700/50 bg-slate-900/95' : 'hover:bg-slate-50 border-slate-200 bg-white/95'}`}>
                    <input type="checkbox" className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" checked={selectedLabourIds.length === filteredBulk.length && filteredBulk.length > 0} onChange={(e) => { e.target.checked ? setSelectedLabourIds(filteredBulk.map(l => l.id)) : setSelectedLabourIds([]); }} />
                    <span className={`text-sm font-extrabold ${textMain}`}>Select All ({filteredBulk.length})</span>
                  </label>
                  {filteredBulk.length === 0 && <p className={`text-sm p-4 text-center font-medium ${textMuted}`}>No labourers found.</p>}
                  {filteredBulk.map(lab => (
                    <label key={lab.id} className={`flex items-center justify-between p-4 cursor-pointer border-b last:border-0 transition-colors ${isDark ? (selectedLabourIds.includes(lab.id) ? 'bg-emerald-900/20 border-slate-700/30' : 'hover:bg-slate-800/50 border-slate-700/30') : (selectedLabourIds.includes(lab.id) ? 'bg-emerald-50 border-slate-200' : 'hover:bg-slate-50 border-slate-200')}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" checked={selectedLabourIds.includes(lab.id)} onChange={(e) => { e.target.checked ? setSelectedLabourIds([...selectedLabourIds, lab.id]) : setSelectedLabourIds(selectedLabourIds.filter(id => id !== lab.id)); }} />
                        <div><span className={`text-sm md:text-base font-bold block ${selectedLabourIds.includes(lab.id) ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : textMain}`}>{tn(lab.name)} <span className={`text-[10px] ml-1 font-medium ${textMuted}`}>ID:{lab.loginId}</span></span></div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200 shadow-sm'}`}>Rate: ₹{lab.ratePerPaya}</span>
                    </label>
                  ))}
                </div>

                {fullScreenList === "work" && (
                  <button onClick={() => setFullScreenList(null)} className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg shadow-lg active:scale-95 transition-transform">
                    Done Selecting
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== KHARCHA TAB ===================== */}
        {activeTab === "kharcha" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 mt-6 transition-all ${cardBg}`}>
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h2 className="text-xl font-extrabold mb-2 text-orange-500 flex items-center gap-2"><CheckSquare size={22} /> Bulk Khuraak (Weekly)</h2>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Date</label><input type="date" value={bulkKharchaDate} onChange={(e) => setBulkKharchaDate(e.target.value)} style={{ colorScheme: isDark ? 'dark' : 'light' }} className={`w-full rounded-lg px-3 py-2.5 outline-none font-medium transition-all border ${inputBg}`} required /></div>
                <div><label className="block text-xs font-extrabold text-orange-500 mb-1">Amount (For All Selected)</label><input type="number" value={bulkKharchaAmount} onChange={(e) => setBulkKharchaAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-extrabold text-lg transition-all border ${isDark ? 'bg-slate-900/80 border-orange-500/50 focus:border-orange-400 text-orange-100' : '!bg-white border-orange-300 focus:border-orange-500 text-orange-800'}`} placeholder="e.g. 1000" /></div>
                <button onClick={handleAddBulkKharcha} className="w-full mt-auto py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">Submit Bulk Khuraak</button>
              </div>

              <div className={fullScreenList === "kharcha" ? `fixed inset-0 z-[120] p-4 md:p-8 flex flex-col animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}` : `w-full md:w-2/3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                  <label className={`text-xs md:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${textMain}`}>
                    Select Labourers <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>{selectedKharchaIds.length} Selected</span>
                  </label>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search name..." value={searchBulkKharcha} onChange={(e) => setSearchBulkKharcha(e.target.value)} className={`pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none w-full sm:w-56 transition-all border ${inputBg}`} />
                    </div>
                    <button onClick={() => setFullScreenList(fullScreenList === "kharcha" ? null : "kharcha")} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600 shadow-sm'}`} title={fullScreenList === "kharcha" ? "Minimize" : "Full Screen"}>
                      {fullScreenList === "kharcha" ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                    </button>
                  </div>
                </div>

                <div className={`border rounded-xl overflow-y-auto custom-scrollbar shadow-inner flex-1 ${fullScreenList === "kharcha" ? "" : "max-h-75"} ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                  <label className={`flex items-center gap-3 p-4 cursor-pointer border-b sticky top-0 backdrop-blur z-10 ${isDark ? 'hover:bg-slate-800/80 border-slate-700/50 bg-slate-900/95' : 'hover:bg-slate-50 border-slate-200 bg-white/95'}`}>
                    <input type="checkbox" className="w-5 h-5 accent-orange-500 rounded cursor-pointer" checked={selectedKharchaIds.length === filteredBulkKharcha.length && filteredBulkKharcha.length > 0} onChange={(e) => { e.target.checked ? setSelectedKharchaIds(filteredBulkKharcha.map(l => l.id)) : setSelectedKharchaIds([]); }} />
                    <span className={`text-sm font-extrabold ${textMain}`}>Select All ({filteredBulkKharcha.length})</span>
                  </label>
                  {filteredBulkKharcha.map(lab => (
                    <label key={lab.id} className={`flex items-center justify-between p-4 cursor-pointer border-b last:border-0 transition-colors ${isDark ? (selectedKharchaIds.includes(lab.id) ? 'bg-orange-900/20 border-slate-700/30' : 'hover:bg-slate-800/50 border-slate-700/30') : (selectedKharchaIds.includes(lab.id) ? 'bg-orange-50 border-slate-200' : 'hover:bg-slate-50 border-slate-200')}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5 accent-orange-500 rounded cursor-pointer" checked={selectedKharchaIds.includes(lab.id)} onChange={(e) => { e.target.checked ? setSelectedKharchaIds([...selectedKharchaIds, lab.id]) : setSelectedKharchaIds(selectedKharchaIds.filter(id => id !== lab.id)); }} />
                        <div><span className={`text-sm md:text-base font-bold block ${selectedKharchaIds.includes(lab.id) ? (isDark ? 'text-orange-300' : 'text-orange-700') : textMain}`}>{tn(lab.name)}</span></div>
                      </div>
                    </label>
                  ))}
                </div>
                {fullScreenList === "kharcha" && (<button onClick={() => setFullScreenList(null)} className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg shadow-lg active:scale-95 transition-transform">Done Selecting</button>)}
              </div>
            </div>
            
            <div className={`border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
              <h2 className="text-xl font-extrabold mb-4 text-orange-500 flex items-center gap-2"><Wallet size={24} /> Single Expense (Kisi ek ko paise dena)</h2>
              <form onSubmit={handleAddKharcha} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                
                <div className="relative">
                  <label className={`block text-xs font-bold mb-1 ${textMuted}`}>Search & Select Labour</label>
                  <input type="text" placeholder="Search name..." className={`w-full rounded-lg px-3 py-2 outline-none font-medium transition-all border ${inputBg}`} value={kharchaSearchQuery} onChange={(e) => { setKharchaSearchQuery(e.target.value); setKharchaLabourId(""); }} required />
                  {kharchaSearchQuery && !kharchaLabourId && (
                    <ul className={`absolute z-50 w-full max-h-48 overflow-y-auto mt-1 rounded-md border shadow-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      {currentLabourers.filter(l => l.name.toLowerCase().includes(kharchaSearchQuery.toLowerCase())).map(l => (
                        <li key={l.id} className={`p-3 text-sm font-bold cursor-pointer border-b last:border-0 ${isDark ? 'hover:bg-slate-700 border-slate-700/50 text-white' : 'hover:bg-slate-50 border-slate-100 text-slate-800'}`} onClick={() => { setKharchaLabourId(l.id); setKharchaSearchQuery(tn(l.name)); }}>
                          {tn(l.name)} <span className={`text-[10px] ml-1 ${textMuted}`}>{l.loginId}</span>
                        </li>
                      ))}
                      {currentLabourers.filter(l => l.name.toLowerCase().includes(kharchaSearchQuery.toLowerCase())).length === 0 && (
                        <li className={`p-3 text-xs italic ${textMuted}`}>No labour found</li>
                      )}
                    </ul>
                  )}
                </div>

                <div><label className="block text-xs font-extrabold text-orange-500 mb-1">Amount (₹)</label><input type="number" value={kharchaAmount} onChange={(e) => setKharchaAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none font-bold transition-all border ${isDark ? 'bg-slate-900/50 border-orange-500/50 focus:border-orange-400 text-orange-100' : '!bg-white border-orange-300 focus:border-orange-500 text-orange-800'}`} placeholder="e.g. 500" required /></div>
                <button type="submit" className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold transition shadow-md active:scale-95">Add Single Expense</button>
              </form>
            </div>
          </div>
        )}

        {/* ===================== ADVANCE (PESHGI) TAB ===================== */}
        {activeTab === "peshgi" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 transition-all ${cardBg}`}>
              
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h2 className="text-xl font-extrabold mb-2 text-rose-500 flex items-center gap-2"><IndianRupee size={22} /> Manage Peshgi</h2>
                <form onSubmit={handleAddPeshgi} className="flex flex-col gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${textMuted}`}>Date</label>
                    <input type="date" value={peshgiDate} onChange={(e) => setPeshgiDate(e.target.value)} style={{ colorScheme: isDark ? 'dark' : 'light' }} className={`w-full rounded-lg px-3 py-2.5 outline-none font-medium transition-all border ${inputBg}`} required />
                  </div>
                  
                  <div className={`p-3 rounded-lg border ${peshgiLabourId ? (isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200') : (isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200')}`}>
                    <label className={`block text-xs font-bold mb-1 ${textMuted}`}>Selected Labourer</label>
                    <p className={`font-extrabold ${peshgiLabourId ? (isDark ? 'text-indigo-400' : 'text-indigo-700') : textMuted}`}>
                      {peshgiLabourId ? tn(currentLabourers.find(l => l.id === peshgiLabourId)?.name || "") : "Please select from the list ➔"}
                    </p>
                  </div>

                  <div className={`flex p-1 rounded-lg border shadow-inner mt-2 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                    <button type="button" onClick={() => setPeshgiType("add")} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${peshgiType === "add" ? "bg-rose-600 text-white shadow-md" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}>
                      <TrendingUp size={14}/> Add Advance
                    </button>
                    <button type="button" onClick={() => setPeshgiType("deduct")} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${peshgiType === "deduct" ? "bg-emerald-600 text-white shadow-md" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}>
                      <TrendingDown size={14}/> Jama/Return
                    </button>
                  </div>

                  <div>
                    <label className={`block text-xs font-extrabold mb-1 ${peshgiType === 'add' ? 'text-rose-500' : 'text-emerald-500'}`}>Amount (₹)</label>
                    <input type="number" value={peshgiAmount} onChange={(e) => setPeshgiAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none text-lg font-bold transition-all border ${peshgiType === 'add' ? (isDark ? 'bg-slate-900/80 border-rose-500/50 focus:border-rose-400 text-rose-100' : '!bg-white border-rose-300 focus:border-rose-500 text-rose-800') : (isDark ? 'bg-slate-900/80 border-emerald-500/50 focus:border-emerald-400 text-emerald-100' : '!bg-white border-emerald-300 focus:border-emerald-500 text-emerald-800')}`} placeholder="e.g. 5000" required />
                  </div>

                  <button type="submit" className={`w-full py-3.5 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 mt-2 ${peshgiType === 'add' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'}`}>
                    Submit Transaction
                  </button>
                </form>
              </div>

              <div className={fullScreenList === "peshgi" ? `fixed inset-0 z-[120] p-4 md:p-8 flex flex-col animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}` : `w-full md:w-2/3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                  <label className={`text-xs md:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${textMain}`}>
                    Select Target Labourer
                  </label>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search name..." value={searchPeshgi} onChange={(e) => setSearchPeshgi(e.target.value)} className={`pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none w-full sm:w-56 transition-all border ${inputBg}`} />
                    </div>
                    <button onClick={() => setFullScreenList(fullScreenList === "peshgi" ? null : "peshgi")} className={`p-2.5 rounded-xl border transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600 shadow-sm'}`} title={fullScreenList === "peshgi" ? "Minimize" : "Full Screen"}>
                      {fullScreenList === "peshgi" ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                    </button>
                  </div>
                </div>

                <div className={`border rounded-xl overflow-y-auto custom-scrollbar shadow-inner flex-1 ${fullScreenList === "peshgi" ? "" : "max-h-75"} ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                  {filteredPeshgi.length === 0 && <p className={`text-sm p-4 text-center font-medium ${textMuted}`}>No labourers found.</p>}
                  {filteredPeshgi.map(lab => (
                    <label key={lab.id} className={`flex items-center justify-between p-4 cursor-pointer border-b last:border-0 transition-colors ${peshgiLabourId === lab.id ? (isDark ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-slate-200') : (isDark ? 'hover:bg-slate-800/50 border-slate-700/30' : 'hover:bg-slate-50 border-slate-200')}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="peshgiSelector" className="w-5 h-5 accent-indigo-500 rounded-full cursor-pointer" checked={peshgiLabourId === lab.id} onChange={() => setPeshgiLabourId(lab.id)} />
                        <div><span className={`text-sm md:text-base font-bold block ${peshgiLabourId === lab.id ? (isDark ? 'text-indigo-400' : 'text-indigo-700') : textMain}`}>{tn(lab.name)} <span className={`text-[10px] ml-1 font-medium ${textMuted}`}>ID:{lab.loginId}</span></span></div>
                      </div>
                    </label>
                  ))}
                </div>
                {fullScreenList === "peshgi" && (<button onClick={() => setFullScreenList(null)} className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg shadow-lg active:scale-95 transition-transform">Done Selecting</button>)}
              </div>
            </div>

            <div className={`border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
                <label className={`text-sm font-extrabold uppercase tracking-wider ${textMain}`}>Transaction History</label>
              </div>

              <div className={`border rounded-xl max-h-100 overflow-y-auto custom-scrollbar shadow-inner ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left border-collapse">
                  <thead className={`text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b ${tableHeader}`}>
                    <tr><th className="p-3 font-bold">Labour Name</th><th className="p-3 font-bold">Location</th><th className="p-3 font-bold text-right text-rose-500">Total Advance</th></tr>
                  </thead>
                  <tbody className={`text-sm ${tableBody}`}>
                    {filteredPeshgi.length === 0 && <tr><td colSpan={3} className={`p-4 text-center font-medium ${textMuted}`}>No records found.</td></tr>}
                    {filteredPeshgi.map(lab => {
                      const totalPeshgi = getStats(lab).peshgi;
                      const isExpanded = expandedPeshgiLabourId === lab.id;
                      const peshgiHistory = (lab.entries || []).filter((e:any) => e.peshgi && e.peshgi !== 0).sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                      return (
                        <React.Fragment key={lab.id}>
                          <tr onClick={() => setExpandedPeshgiLabourId(isExpanded ? null : lab.id)} className={`transition-colors cursor-pointer ${tableRowHover} ${isExpanded ? (isDark ? 'bg-slate-800/40' : 'bg-slate-50') : ''}`}>
                            <td className="p-3 font-bold flex items-center gap-2"><span className={textMuted}>{isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span> {tn(lab.name)}</td>
                            <td className={`p-3 text-xs font-medium ${textMuted}`}>{tn(lab.paya) || "-"}</td>
                            <td className={`p-3 text-right font-extrabold ${totalPeshgi > 0 ? (isDark ? 'text-rose-400' : 'text-rose-600') : textMuted}`}>₹{totalPeshgi.toLocaleString()}</td>
                          </tr>
                          
                          {isExpanded && (
                            <tr className={isDark ? "bg-slate-950/80" : "bg-slate-50"}>
                              <td colSpan={3} className="p-4 border-l-4 border-rose-500">
                                <h4 className={`text-xs font-extrabold uppercase mb-3 flex items-center gap-2 ${textMuted}`}><History size={14}/> Transaction History</h4>
                                {peshgiHistory.length === 0 ? (<p className={`text-xs italic font-medium ${textMuted}`}>Koi advance history nahi hai.</p>) : (
                                  <div className="space-y-2">
                                    {peshgiHistory.map((entry:any) => (
                                      <div key={entry.id} className={`flex justify-between items-center px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                                        <span className={`text-xs font-bold ${textMain}`}>{entry.date}</span>
                                        {entry.peshgi! > 0 ? (
                                          <span className={`text-xs font-bold px-2 py-1 rounded border ${isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-100 border-rose-200'}`}>Diya (Given): ₹{entry.peshgi}</span>
                                        ) : (
                                          <span className={`text-xs font-bold px-2 py-1 rounded border ${isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-100 border-emerald-200'}`}>Jama (Returned): ₹{Math.abs(entry.peshgi!)}</span>
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
        )}

        {/* ===================== DOWNLOAD RECEIPT TAB ===================== */}
        {activeTab === "download" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`border rounded-2xl p-8 shadow-xl text-center transition-all ${isDark ? 'bg-gradient-to-br from-cyan-900/30 to-slate-800/80 border-cyan-500/30' : 'bg-gradient-to-br from-cyan-50 to-white border-cyan-200'}`}>
              <h2 className={`text-2xl font-extrabold mb-3 flex justify-center items-center gap-2 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                <FileSpreadsheet size={28} /> Download Master Summary
              </h2>
              <p className={`text-sm mb-6 max-w-lg mx-auto font-medium ${textMuted}`}>
                Is button se aapke poore bhatte ({activeBhattaName}) ke sabhi labourers ka Total Hisaab ek hi PDF list mein aa jayega. Master checking ke liye best hai.
              </p>
              <button onClick={downloadAllSummaryPDF} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3.5 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95">
                <Download size={20}/> Download Summary PDF
              </button>
            </div>
          </div>
        )}

        {/* ===================== RECYCLE BIN TAB ===================== */}
        {activeTab === "recycle" && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className={`border rounded-2xl p-6 md:p-8 shadow-xl transition-all ${cardBg}`}>
              <div className="mb-6 border-b pb-4 border-slate-700/50">
                <h2 className="text-2xl font-extrabold mb-2 flex items-center gap-3 text-slate-500">
                  <Trash size={28} /> {t("Recycle Bin (Deleted Accounts)", "रीसायकल बिन (हटाए गए अकाउंट)")}
                </h2>
                <p className={`text-sm font-medium ${textMuted}`}>Yahan wo accounts hain jinhe delete kiya gaya tha. Aap inhe wapas Restore kar sakte hain ya hamesha ke liye Delete kar sakte hain.</p>
              </div>
              {deletedLabourers.length === 0 ? (
                 <div className={`p-10 text-center rounded-xl border border-dashed ${isDark ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-300 bg-slate-50'}`}>
                    <RefreshCcw size={40} className={`mx-auto mb-4 ${textMuted} opacity-50`} />
                    <h3 className={`text-lg font-bold ${textMuted}`}>Recycle Bin Khali Hai</h3>
                 </div>
              ) : (
                <div className={`rounded-xl border overflow-hidden shadow-inner ${isDark ? 'border-slate-700/60 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                  <table className="w-full text-left">
                    <thead className={tableHeader}><tr><th className="p-4 font-bold">Deleted Labour</th><th className="p-4 font-bold text-center">Action</th></tr></thead>
                    <tbody className={`text-sm ${tableBody}`}>
                      {deletedLabourers.map(lab => (
                        <tr key={lab.id} className={`transition-colors ${tableRowHover}`}>
                          <td className="p-4"><span className={`font-bold text-base block ${textMain}`}>{tn(lab.name)}</span><span className={`text-xs ${textMuted}`}>ID: {lab.loginId}</span></td>
                          <td className="p-4 flex items-center justify-center gap-2">
                             <button onClick={() => setShowPinModal({action: "restore", targetId: lab.id})} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1"><RefreshCcw size={16}/> Restore</button>
                             <button onClick={() => setShowPinModal({action: "hard_delete", targetId: lab.id})} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1"><Trash2 size={16}/> Forever</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== ROLE MANAGEMENT TAB ===================== */}
        {activeTab === "role" && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className={`border rounded-2xl p-6 md:p-8 shadow-xl transition-all ${cardBg}`}>
              <div className="mb-8 border-b pb-6 border-slate-700/50">
                <h2 className="text-2xl font-extrabold mb-2 flex items-center gap-3 text-violet-500"><ShieldAlert size={28} /> Give Admin Power</h2>
                <p className={`text-sm font-medium ${textMuted}`}>Neeche diye gaye Mobile Numbers ya Email IDs se koi bhi login karega toh direct Admin Dashboard open hoga. Sirf unhi logon ko add karein jinpar aapko bharosa ho.</p>
              </div>
              <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-4 items-end mb-10">
                <div className="flex-1 w-full"><label className={`block text-xs font-bold mb-1.5 ${textMain}`}>Phone Number or Email ID</label><input type="text" value={newAdminId} onChange={(e) => setNewAdminId(e.target.value)} className={`w-full rounded-xl px-4 py-3.5 outline-none font-bold transition-all border ${inputBg}`} placeholder="e.g. 9876543210 or admin@bhatta.com" required /></div>
                <button type="submit" className="w-full md:w-auto py-3.5 px-8 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/30 flex justify-center items-center gap-2 active:scale-95 transition-all"><Plus size={18}/> Make Admin</button>
              </form>
              <div className="mb-3 flex items-center justify-between"><h3 className={`text-sm font-extrabold uppercase tracking-wider ${textMuted}`}>Current Master Admins</h3><span className={`text-xs font-bold px-2.5 py-1 rounded-md ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{adminList.length} Active</span></div>
              <div className={`rounded-xl border overflow-hidden shadow-inner ${isDark ? 'border-slate-700/60 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                <table className="w-full text-left">
                  <thead className={tableHeader}><tr><th className="p-4 font-bold">Admin Identifier (Phone/Email)</th><th className="p-4 font-bold text-center w-32">Action</th></tr></thead>
                  <tbody className={`text-sm ${tableBody}`}>
                    {adminList.map((admin, index) => {
                      const isMaster = admin === "admin" || admin === "nadeemxsalar@gmail.com";
                      return (
                        <tr key={index} className={`transition-colors ${tableRowHover}`}>
                          <td className="p-4 flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMaster ? 'bg-violet-500/20 text-violet-500' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}><Users size={14} /></div><div><span className={`font-bold text-base block ${textMain}`}>{admin}</span>{isMaster && <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Master Owner</span>}</div></td>
                          <td className="p-4 text-center">{isMaster ? (<span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>Fixed</span>) : (<button onClick={() => handleRemoveAdmin(admin)} className={`p-2.5 rounded-lg transition-all border active:scale-95 ${isDark ? 'bg-slate-800 hover:bg-rose-500/20 border-slate-700 hover:border-rose-500/50 text-rose-400' : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-300 text-rose-500 shadow-sm'}`} title="Remove Power"><Trash2 size={18}/></button>)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}