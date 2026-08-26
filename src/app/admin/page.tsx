"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveLabourData, getLabourData } from "../../lib/storage";
import { Labour, DailyEntry, Bhatta } from "../../types";
import { Menu, X, FileText, LayoutDashboard, IndianRupee, Users, Building2, Layers, Wallet, Settings, Check, LogOut, CheckSquare, Search, AlertCircle, CheckCircle, TrendingDown, TrendingUp, ChevronRight, ChevronDown, History, BarChart3, Upload, FileSpreadsheet, Download, FileDown, Maximize2, Minimize2, UserMinus, ShieldAlert, Trash2, Plus, Sun, Moon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminDashboard() {
  const router = useRouter();
  const [bhattas, setBhattas] = useState<Bhatta[]>([]);
  const [activeBhattaId, setActiveBhattaId] = useState<string | null>(null);
  const [labourers, setLabourers] = useState<any[]>([]); 
  const [newBhattaName, setNewBhattaName] = useState("");
  const [isAddingBhatta, setIsAddingBhatta] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "eent" | "kharcha" | "peshgi" | "manage" | "download" | "role">("dashboard");

  const [toast, setToast] = useState<{msg: string, type: "success" | "error"} | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // NAYA: Theme and Admin Roles State
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [adminList, setAdminList] = useState<string[]>([]);
  const [newAdminId, setNewAdminId] = useState("");

  const [fullScreenList, setFullScreenList] = useState<"work" | "kharcha" | null>(null);

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

    // Load Theme
    const savedTheme = localStorage.getItem("app_theme") as "dark" | "light";
    if (savedTheme) setTheme(savedTheme);

    // Load Admins
    const savedAdmins = JSON.parse(localStorage.getItem("bhatta_admins") || "[]");
    if (savedAdmins.length === 0) {
      const defaultAdmins = ["admin", "nadeemxsalar@gmail.com", "realheronadeem", "9368218331"];
      localStorage.setItem("bhatta_admins", JSON.stringify(defaultAdmins));
      setAdminList(defaultAdmins);
    } else {
      setAdminList(savedAdmins);
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
    
    const migratedData = data.map((lab: any) => {
      let newLab = { ...lab };
      if (!newLab.bhattaId) { newLab.bhattaId = "bhatta_default"; dataModified = true; }
      if (newLab.totalKharcha === undefined) { newLab.totalKharcha = 0; dataModified = true; }
      if (newLab.totalPeshgi === undefined) { newLab.totalPeshgi = newLab.totalAdvance || 0; dataModified = true; }
      if (newLab.ratePerPaya === undefined) { newLab.ratePerPaya = 0; dataModified = true; }
      
      if (!newLab.loginId) { 
        newLab.loginId = newLab.phone || Math.floor(1000 + Math.random() * 9000).toString(); 
        dataModified = true; 
      }
      
      const safeEntries = Array.isArray(newLab.entries) ? newLab.entries : [];
      newLab.entries = safeEntries.map((e: any) => ({
        ...e, kharcha: e.kharcha || 0, peshgi: e.peshgi !== undefined ? e.peshgi : (e.advance || 0), payeCount: e.payeCount || 0, isLeave: e.isLeave || false
      }));
      return newLab;
    });
    
    if (dataModified) saveLabourData("bhatta_labourers", migratedData);
    setLabourers(migratedData);
  }, [router]);

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

  const handleLogout = () => {
    localStorage.removeItem("bhatta_session");
    router.push("/");
  };

  // NAYA: Admin Role Management Handlers
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newAdminId) return;
    const finalId = newAdminId.toLowerCase().trim();
    if(adminList.includes(finalId)) {
      return showToast("Ye Admin pehle se add hai!", "error");
    }
    const updated = [...adminList, finalId];
    setAdminList(updated);
    localStorage.setItem("bhatta_admins", JSON.stringify(updated));
    setNewAdminId("");
    showToast("Naya Admin successfully add ho gaya!", "success");
  };

  const handleRemoveAdmin = (idToRemove: string) => {
    if(idToRemove === "admin" || idToRemove === "nadeemxsalar@gmail.com") {
      return showToast("Master Admin (Nadeem) ko delete nahi kiya ja sakta!", "error");
    }
    const updated = adminList.filter(a => a !== idToRemove);
    setAdminList(updated);
    localStorage.setItem("bhatta_admins", JSON.stringify(updated));
    showToast("Admin ki power hata di gayi hai!", "success");
  };

  const currentLabourers = labourers.filter(lab => lab.bhattaId === activeBhattaId);
  const activeBhattaName = bhattas.find(b => b.id === activeBhattaId)?.name || "Bhatta";

  const overallStats = currentLabourers.reduce((acc, lab) => {
    let earned = 0;
    (lab.entries || []).forEach((e: any) => { earned += (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0)); });
    acc.totalEarned += earned; acc.totalExpenses += (lab.totalKharcha || 0); acc.totalAdvance += (lab.totalPeshgi !== undefined ? lab.totalPeshgi : (lab.totalAdvance || 0));
    return acc;
  }, { totalEarned: 0, totalExpenses: 0, totalAdvance: 0 });

  const chartData = currentLabourers.map(lab => {
    let earned = 0;
    (lab.entries || []).forEach((e: any) => { earned += (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0)); });
    return { name: lab.name, Earned: earned, Expenses: lab.totalKharcha || 0, Advance: lab.totalPeshgi || 0 };
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
            id: Date.now().toString() + Math.random().toString(), bhattaId: activeBhattaId, name: colName, loginId: currentMaxId.toString(), phone: colPhone, paya: colLocation, ratePerPaya: colRate, totalPaye: 0, totalKharcha: 0, totalPeshgi: 0, entries: []
          });
        }

        const currentLab = tempLabourersMap.get(mapKey);

        if (colDate) {
          currentLab.entries.push({ id: Date.now().toString() + Math.random().toString(), date: colDate, payeCount: colPaye, customRatePerPaya: colRate, kharcha: colKharcha, peshgi: colAdvance, remark: colRemark, isLeave: false });
          currentLab.totalPaye += colPaye; currentLab.totalKharcha += colKharcha; currentLab.totalPeshgi += colAdvance;
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

  const downloadIndividualPDF = (lab: any) => {
    const doc = new jsPDF();
    let earned = 0;
    (lab.entries || []).forEach((e: any) => { earned += (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0)); });
    const kharcha = lab.totalKharcha || 0; const peshgi = lab.totalPeshgi !== undefined ? lab.totalPeshgi : (lab.totalAdvance || 0); const netBalance = earned - kharcha - peshgi;

    doc.setFontSize(22); doc.setTextColor(30, 64, 175); doc.text(`${activeBhattaName} - Hisaab Parchi`, 14, 20);
    doc.setFontSize(12); doc.setTextColor(0, 0, 0); doc.text(`Labour Name: ${lab.name}`, 14, 32); doc.text(`Login ID: ${lab.loginId}`, 14, 40); doc.text(`Mobile: ${lab.phone || "-"}`, 14, 48); doc.text(`Location: ${lab.paya || "-"}`, 14, 56);
    
    doc.text(`Total Kamai: Rs ${earned.toLocaleString()}`, 120, 32); doc.text(`Total Kharcha: Rs ${kharcha.toLocaleString()}`, 120, 40); doc.text(`Total Peshgi: Rs ${peshgi.toLocaleString()}`, 120, 48);
    
    doc.setFont("helvetica", "bold");
    if(netBalance < 0) { doc.setTextColor(220, 38, 38); doc.text(`Final Balance: Rs ${Math.abs(netBalance).toLocaleString()} (Aap par hai)`, 120, 56); } 
    else { doc.setTextColor(16, 185, 129); doc.text(`Final Balance: Rs ${netBalance.toLocaleString()} (Aapko lene hain)`, 120, 56); }

    const tableData = (lab.entries || []).filter((e:any) => e.payeCount > 0 || e.kharcha > 0 || e.peshgi !== 0 || e.remark || e.isLeave).map((e:any) => [
        e.date, e.isLeave ? "LEAVE" : (e.payeCount || 0), e.isLeave ? "-" : ((e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0))), e.kharcha || 0, e.peshgi || 0, e.remark || "-"
      ]);

    autoTable(doc, { startY: 65, head: [['Date', 'Paye', 'Earned', 'Kharcha', 'Peshgi', 'Remark']], body: tableData, theme: 'grid', headStyles: { fillColor: [30, 64, 175] } });
    doc.save(`${lab.name}_Parchi.pdf`); showToast(`${lab.name} ki Parchi Download ho gayi!`, "success");
  };

  const downloadAllSummaryPDF = () => {
    if(currentLabourers.length === 0) return showToast("Koi data nahi hai!", "error");
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(30, 64, 175); doc.text(`${activeBhattaName} - All Labour Summary`, 14, 20);
    doc.setFontSize(11); doc.setTextColor(0, 0, 0); doc.text(`Total Kamai: Rs ${overallStats.totalEarned.toLocaleString()}`, 14, 30); doc.text(`Total Kharcha: Rs ${overallStats.totalExpenses.toLocaleString()}`, 80, 30); doc.text(`Total Advance: Rs ${overallStats.totalAdvance.toLocaleString()}`, 150, 30);

    const tableData = currentLabourers.map(lab => {
      let earned = 0;
      (lab.entries || []).forEach((e: any) => { earned += (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0)); });
      const kharcha = lab.totalKharcha || 0; const peshgi = lab.totalPeshgi !== undefined ? lab.totalPeshgi : (lab.totalAdvance || 0); const net = earned - kharcha - peshgi;
      const netText = net < 0 ? `-${Math.abs(net)} (Len)` : `${net} (Den)`;
      return [lab.name, lab.loginId, earned, kharcha, peshgi, netText];
    });

    autoTable(doc, { startY: 38, head: [['Name', 'ID', 'Earned', 'Kharcha', 'Peshgi', 'Net Balance']], body: tableData, theme: 'grid', headStyles: { fillColor: [15, 23, 42] } });
    doc.save(`${activeBhattaName}_Full_Summary.pdf`); showToast("Summary PDF Download ho gayi!", "success");
  };

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
    if (!name || !activeBhattaId) return showToast("Name is required!", "error");
    
    let finalLoginId = loginId.trim();
    if (!finalLoginId) {
      let maxId = 1000;
      labourers.forEach(l => { const num = parseInt(l.loginId, 10); if (!isNaN(num) && num > maxId) maxId = num; });
      finalLoginId = (maxId + 1).toString();
    } else if (labourers.some(l => l.loginId === finalLoginId)) {
      return showToast("Ye Labour ID pehle se kisi aur ki hai!", "error");
    }

    const newLabour: any = { id: Date.now().toString(), bhattaId: activeBhattaId, name, loginId: finalLoginId, phone, ratePerThousand: 0, ratePerPaya: Number(ratePaya) || 0, paya: paya || "-", totalBricks: 0, totalPaye: 0, totalKharcha: 0, totalPeshgi: 0, entries: [] };
    const updatedList = [...labourers, newLabour];
    setLabourers(updatedList); saveLabourData("bhatta_labourers", updatedList);
    setName(""); setPhone(""); setRatePaya(""); setPaya(""); showToast("Naya labour add ho gaya!", "success");
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
        if (e.date === entryDate) { entryExists = true; return { ...e, payeCount: (e.payeCount || 0) + paye, customRatePerPaya: activePayeRate, isLeave: false }; }
        return e;
      });
      if (!entryExists) { updatedEntries.push({ id: Date.now().toString() + Math.random().toString(), date: entryDate, bricks: 0, payeCount: paye, customRatePerPaya: activePayeRate, kharcha: 0, peshgi: 0, isLeave: false }); }
      updatedLabourers[labourIndex] = { ...selectedLabour, entries: updatedEntries, totalPaye: (selectedLabour.totalPaye || 0) + paye };
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setPayeAmount(""); setSelectedLabourIds([]); showToast("Work entry successfully chadh gayi!", "success");
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
    const newEntry: DailyEntry = { id: Date.now().toString(), date: new Date().toISOString().split("T")[0], bricks: 0, payeCount: 0, kharcha: amount, peshgi: 0 };
    const updatedLabourers = labourers.map(lab => {
      if (lab.id === kharchaLabourId) return { ...lab, entries: [...lab.entries, newEntry], totalKharcha: (lab.totalKharcha || 0) + amount };
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setKharchaAmount(""); setKharchaLabourId(""); showToast("Kharcha add ho gaya!", "success");
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
      updatedLabourers[labourIndex] = { ...selectedLabour, entries: updatedEntries, totalKharcha: (selectedLabour.totalKharcha || 0) + amount };
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
        const newTotalPeshgi = updatedEntries.reduce((sum: number, e: any) => sum + (e.peshgi || 0), 0);
        return { ...lab, entries: updatedEntries, totalPeshgi: newTotalPeshgi };
      }
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setPeshgiAmount(""); setPeshgiLabourId(""); showToast(`Peshgi successfully ${peshgiType === 'add' ? 'Add' : 'Jama'} ho gayi!`, "success");
  };

  const handleSaveLabourEdit = (id: string) => {
    if(!editLabourData) return;
    if (labourers.some(l => l.loginId === editLabourData.loginId && l.id !== id)) return showToast("Ye Labour ID kisi aur ki hai!", "error");
    const updatedLabourers = labourers.map(lab => {
      if(lab.id === id) return { ...lab, name: editLabourData.name, loginId: editLabourData.loginId, phone: editLabourData.phone, paya: editLabourData.paya, ratePerPaya: editLabourData.payeRate };
      return lab;
    });
    setLabourers(updatedLabourers); saveLabourData("bhatta_labourers", updatedLabourers);
    setEditingLabourId(null); setEditLabourData(null); showToast("Details update ho gayi!", "success");
  };

  const changeTab = (tab: "dashboard" | "eent" | "kharcha" | "peshgi" | "manage" | "download" | "role") => { setActiveTab(tab); setIsSidebarOpen(false); };

  const filteredDashboard = currentLabourers.filter(l => l.name.toLowerCase().includes(searchDashboard.toLowerCase()) || (l.loginId && l.loginId.includes(searchDashboard)));
  const filteredManage = currentLabourers.filter(l => l.name.toLowerCase().includes(searchManage.toLowerCase()) || (l.loginId && l.loginId.includes(searchManage)));
  const filteredBulk = currentLabourers.filter(l => l.name.toLowerCase().includes(searchBulk.toLowerCase()));
  const filteredBulkKharcha = currentLabourers.filter(l => l.name.toLowerCase().includes(searchBulkKharcha.toLowerCase()));
  const filteredPeshgi = currentLabourers.filter(l => l.name.toLowerCase().includes(searchPeshgi.toLowerCase()));
  const filteredDownload = currentLabourers.filter(l => l.name.toLowerCase().includes(searchDownload.toLowerCase()) || (l.loginId && l.loginId.includes(searchDownload)));

  // Theme Constants
  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#0f172a] text-white" : "bg-slate-50 text-slate-900";
  const navBg = isDark ? "bg-[#0f172a]/90 border-slate-700/50" : "bg-white/90 border-slate-200 shadow-sm";
  const sideBg = isDark ? "bg-[#1e293b] border-slate-700/50" : "bg-white border-slate-200 shadow-xl";
  const cardBg = isDark ? "bg-slate-800/40 border-slate-700/50" : "bg-white border-slate-200 shadow-md";
  const inputBg = isDark ? "bg-slate-900/50 border-slate-600 focus:border-blue-500 text-white placeholder-slate-500" : "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900 placeholder-slate-400 shadow-sm";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const textMain = isDark ? "text-white" : "text-slate-900";
  const tableHeader = isDark ? "bg-slate-900/60 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200";
  const tableBody = isDark ? "divide-slate-700/50 text-slate-200" : "divide-slate-200 text-slate-700";
  const tableRowHover = isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50";
  const modalInner = isDark ? "bg-slate-950 border-slate-700" : "bg-slate-50 border-slate-200";

  return (
    <div className={`min-h-screen font-sans selection:bg-blue-500/30 relative transition-colors duration-300 ${bgMain}`}>
      
      {toast && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-5 duration-300 ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle size={22} /> : <CheckCircle size={22} />}
          <span className="font-semibold text-sm">{toast.msg}</span>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg p-6 shadow-2xl relative rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setShowImportModal(false)} className={`absolute top-4 right-4 transition-colors p-1.5 rounded-lg ${isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100'}`}><X size={20} /></button>
            <h2 className="text-xl font-bold text-emerald-500 mb-2 flex items-center gap-2"><FileSpreadsheet size={24} /> Smart Import Labour Data</h2>
            <p className={`text-sm mb-5 ${textMuted}`}>Nayi CSV file mein aap poora hisaab ek sath daal sakte hain. <span className={`font-semibold ${textMain}`}>Khali field automatically zero ho jayegi.</span></p>
            <div className={`rounded-xl p-4 border mb-6 overflow-x-auto shadow-inner ${modalInner}`}>
              <p className="text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Format Columns (Must match exactly)</p>
              <table className="w-full text-left text-[10px] md:text-xs whitespace-nowrap">
                <thead><tr className={`border-b ${isDark ? 'text-slate-300 border-slate-800' : 'text-slate-700 border-slate-300'}`}>
                  <th className="pb-2 pr-3 font-semibold text-blue-500">Name*</th><th className="pb-2 pr-3 font-semibold">Mobile</th><th className="pb-2 pr-3 font-semibold">Location</th><th className="pb-2 pr-3 font-semibold text-emerald-500">Rate</th><th className="pb-2 pr-3 font-semibold text-rose-500">Date (YYYY-MM-DD)</th><th className="pb-2 pr-3 font-semibold">Paye</th><th className="pb-2 pr-3 font-semibold">Kharcha</th><th className="pb-2 pr-3 font-semibold">Peshgi</th><th className="pb-2 font-semibold">Remark</th>
                </tr></thead>
                <tbody className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <tr><td className={`pt-2 pr-3 ${textMain}`}>Ramu</td><td className="pt-2 pr-3">987...</td><td className="pt-2 pr-3">L1</td><td className={`pt-2 pr-3 ${textMain}`}>35</td><td className="pt-2 pr-3">2026-08-25</td><td className="pt-2 pr-3 text-emerald-500">500</td><td className="pt-2 pr-3">100</td><td className="pt-2 pr-3">0</td><td className="pt-2">Late</td></tr>
                  <tr><td className={`pt-1 pr-3 ${textMain}`}>Ramu</td><td className="pt-1 pr-3">987...</td><td className="pt-1 pr-3">L1</td><td className={`pt-1 pr-3 ${textMain}`}>35</td><td className="pt-1 pr-3">2026-08-26</td><td className="pt-1 pr-3 text-emerald-500">0</td><td className="pt-1 pr-3">0</td><td className="pt-1 pr-3 text-rose-500">2000</td><td className="pt-1">Advance</td></tr>
                </tbody>
              </table>
            </div>
            <div className="relative mt-2">
              <input type="file" accept=".csv" id="csv-modal-upload" className="hidden" onChange={handleFileUpload} />
              <label htmlFor="csv-modal-upload" className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95"><Upload size={18} /> Select & Upload CSV File</label>
            </div>
          </div>
        </div>
      )}

      <nav className={`fixed top-0 w-full h-16 backdrop-blur-md border-b z-40 flex items-center justify-between px-4 transition-colors duration-300 ${navBg}`}>
        <div className="flex items-center">
          <button onClick={() => setIsSidebarOpen(true)} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-800'}`}><Menu size={28} /></button>
          <div className="ml-4 flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent leading-none">Bhatta Pro</h1>
            <span className="text-xs text-emerald-500 font-medium">{activeBhattaName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 shadow-sm hover:bg-slate-200'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition text-sm font-bold border border-red-500/20"><LogOut size={16}/> <span className="hidden sm:inline">Logout</span></button>
        </div>
      </nav>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`fixed top-0 left-0 h-full w-72 border-r z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${sideBg} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h2 className={`text-xl font-bold ${textMain}`}>Admin Menu</h2>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}><X size={24} /></button>
        </div>
        
        <div className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          <button onClick={() => changeTab("dashboard")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "dashboard" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => changeTab("manage")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "manage" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><Settings size={20} /> Manage Labour</button>
          <button onClick={() => changeTab("eent")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "eent" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><Layers size={20} /> Work Entry</button>
          <button onClick={() => changeTab("kharcha")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "kharcha" ? "bg-orange-600 text-white shadow-lg shadow-orange-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><Wallet size={20} /> Expenses</button>
          <button onClick={() => changeTab("peshgi")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "peshgi" ? "bg-rose-600 text-white shadow-lg shadow-rose-500/30" : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-100 text-slate-600")}`}><IndianRupee size={20} /> Advance (Peshgi)</button>
          <button onClick={() => changeTab("download")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition mt-4 border font-medium ${activeTab === "download" ? "bg-cyan-600 text-white border-transparent shadow-lg shadow-cyan-500/30" : (isDark ? "border-cyan-500/20 hover:bg-slate-800 text-cyan-400" : "border-cyan-200 hover:bg-cyan-50 text-cyan-600")}`}><FileDown size={20} /> Download Receipt</button>
          
          <div className={`h-px w-full my-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-200'}`}></div>
          {/* NAYA: Give Power / Role Management Tab */}
          <button onClick={() => changeTab("role")} className={`w-full flex items-center gap-3 p-3 rounded-xl transition font-medium ${activeTab === "role" ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30" : (isDark ? "hover:bg-slate-800 text-violet-400" : "hover:bg-violet-50 text-violet-600")}`}><ShieldAlert size={20} /> Give Power (Admins)</button>

        </div>

        <div className={`p-4 border-t ${isDark ? 'border-slate-700/50 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${textMuted}`}><Building2 size={14}/> Work Sites</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto mb-3 pr-2 custom-scrollbar">
            {bhattas.map(b => (
              <button key={b.id} onClick={() => { setActiveBhattaId(b.id); setIsSidebarOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition border ${activeBhattaId === b.id ? (isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold') : (isDark ? 'border-transparent hover:bg-slate-700 text-slate-300' : 'border-transparent hover:bg-slate-100 text-slate-600')}`}>{b.name}</button>
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
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>Total Bhatta Earnings</p>
                <h3 className={`text-3xl font-extrabold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>₹{overallStats.totalEarned.toLocaleString()}</h3>
              </div>
              <div className={`p-5 rounded-2xl transition-all ${isDark ? 'bg-gradient-to-br from-orange-900/40 to-slate-900 border border-orange-500/30 shadow-lg' : 'bg-orange-50 border border-orange-200 shadow-sm'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>Total Kharcha Given</p>
                <h3 className={`text-3xl font-extrabold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>₹{overallStats.totalExpenses.toLocaleString()}</h3>
              </div>
              <div className={`p-5 rounded-2xl transition-all ${isDark ? 'bg-gradient-to-br from-rose-900/40 to-slate-900 border border-rose-500/30 shadow-lg' : 'bg-rose-50 border border-rose-200 shadow-sm'}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>Total Market Advance</p>
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
                <h2 className={`text-lg font-bold flex items-center gap-2 ${textMain}`}><Users size={20} className="text-blue-500"/> Add New Labour ({activeBhattaName})</h2>
                <button onClick={() => setShowImportModal(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"><Upload size={16} /> Import CSV</button>
              </div>

              <form onSubmit={handleAddLabour} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none transition-all border ${inputBg}`} placeholder="Name" required/></div>
                <div><label className="block text-xs font-extrabold text-blue-500 mb-1">Labour ID (Auto)</label><input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none font-bold transition-all border ${isDark ? 'bg-slate-900/50 border-blue-500/50 focus:border-blue-400 text-blue-300' : 'bg-blue-50 border-blue-200 focus:border-blue-400 text-blue-700'}`} placeholder="e.g. 1001" /></div>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Mobile</label><input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none transition-all border ${inputBg}`} placeholder="Number" /></div>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Location</label><input type="text" value={paya} onChange={(e) => setPaya(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none transition-all border ${inputBg}`} placeholder="e.g. Line 1" /></div>
                <div><label className="block text-xs font-extrabold text-emerald-500 mb-1">Rate (/Paye)</label><input type="number" value={ratePaya} onChange={(e) => setRatePaya(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none font-bold transition-all border ${isDark ? 'bg-slate-900/50 border-emerald-500/50 focus:border-emerald-400 text-emerald-300' : 'bg-emerald-50 border-emerald-200 focus:border-emerald-400 text-emerald-700'}`} placeholder="e.g. 35" required/></div>
                <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition shadow-md md:col-span-1 sm:col-span-2 text-sm active:scale-95">Add Labour</button>
              </form>
            </div>

            <div className={`backdrop-blur-xl border rounded-2xl p-6 transition-all ${cardBg}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className={`text-lg font-bold flex items-center gap-3 ${textMain}`}>Overview ({activeBhattaName}) - {filteredDashboard.length} Labourers</h2>
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search by Name or ID..." value={searchDashboard} onChange={(e) => setSearchDashboard(e.target.value)} className={`pl-9 pr-4 py-2 rounded-lg text-sm outline-none w-full md:w-64 transition-all border ${inputBg}`} /></div>
              </div>

              <div className="space-y-4">
                {filteredDashboard.length === 0 && <p className={`text-center py-4 font-medium ${textMuted}`}>No results found.</p>}
                {filteredDashboard.map((lab) => {
                  let payeKamai = 0; (lab.entries || []).forEach((e: any) => { payeKamai += (e.payeCount || 0) * (e.customRatePerPaya !== undefined ? e.customRatePerPaya : (lab.ratePerPaya || 0)); });
                  const safeTotalKharcha = lab.totalKharcha || 0; const safeTotalPeshgi = lab.totalPeshgi !== undefined ? lab.totalPeshgi : ((lab as any).totalAdvance || 0);

                  return (
                    <div key={lab.id} className={`p-4 rounded-xl border flex flex-col lg:flex-row justify-between items-center gap-4 transition-all ${isDark ? 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60' : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-md'}`}>
                      <div className="flex-1 w-full text-left"><h3 className={`font-extrabold text-xl ${textMain}`}>{lab.name}</h3><p className={`text-sm mt-1 ${textMuted}`}>ID: <span className="text-blue-500 font-bold">{lab.loginId}</span> | {lab.phone}</p></div>
                      <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 justify-start lg:justify-center">
                        <div className={`text-left px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}><p className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider">Earned</p><p className={`text-lg font-extrabold ${textMain}`}>₹{payeKamai.toLocaleString()}</p></div>
                        <div className={`text-left px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}><p className="text-orange-500 text-[10px] font-bold uppercase tracking-wider">Expenses</p><p className={`text-lg font-extrabold ${textMain}`}>₹{safeTotalKharcha.toLocaleString()}</p></div>
                        <div className={`text-left px-4 py-2 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}><p className="text-rose-500 text-[10px] font-bold uppercase tracking-wider">Advance</p><p className={`text-lg font-extrabold ${textMain}`}>₹{safeTotalPeshgi.toLocaleString()}</p></div>
                      </div>
                      <div className="w-full lg:w-auto flex justify-end gap-2">
                        <Link href={`/labour/${lab.id}`} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-bold whitespace-nowrap shadow-md active:scale-95"><FileText size={18} /> View Register</Link>
                      </div>
                    </div>
                  );
                })}
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

            <div className={`backdrop-blur-xl border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <h2 className={`text-xl font-extrabold flex items-center gap-2 ${textMain}`}>
                  <FileText size={24} className="text-emerald-500" /> Individual Labour Parchi
                </h2>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search Labour Name or ID..." value={searchDownload} onChange={(e) => setSearchDownload(e.target.value)} className={`pl-9 pr-4 py-2 rounded-lg text-sm outline-none w-full md:w-64 transition-all border ${inputBg}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDownload.length === 0 && <p className={`col-span-3 text-center py-4 font-medium ${textMuted}`}>No results found.</p>}
                {filteredDownload.map(lab => (
                  <div key={lab.id} className={`p-4 rounded-xl border flex items-center justify-between group transition-all ${isDark ? 'bg-slate-900/60 border-slate-700/60 hover:border-cyan-500/40' : 'bg-slate-50 border-slate-200 hover:border-cyan-400 hover:shadow-md hover:bg-white'}`}>
                    <div>
                      <h3 className={`font-bold transition-colors ${isDark ? 'text-slate-200 group-hover:text-cyan-300' : 'text-slate-800 group-hover:text-cyan-600'}`}>{lab.name}</h3>
                      <p className={`text-xs mt-0.5 font-medium ${textMuted}`}>ID: {lab.loginId}</p>
                    </div>
                    <button onClick={() => downloadIndividualPDF(lab)} className={`p-2.5 rounded-lg transition-all border shadow-sm active:scale-95 ${isDark ? 'bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white border-slate-700 hover:border-emerald-500' : 'bg-white hover:bg-emerald-50 text-emerald-600 border-slate-200 hover:border-emerald-300'}`} title="Download Parchi">
                      <FileDown size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== MANAGE LABOUR TAB ===================== */}
        {activeTab === "manage" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className={`text-xl font-extrabold flex items-center gap-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}><Settings size={24} /> Labour Details & Rates</h2>
                </div>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search ID or Name..." value={searchManage} onChange={(e) => setSearchManage(e.target.value)} className={`pl-9 pr-4 py-2 rounded-lg text-sm outline-none w-full md:w-64 transition-all border ${inputBg}`} />
                </div>
              </div>
              
              <div className={`overflow-x-auto border rounded-xl ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className={`text-xs uppercase tracking-wider border-b ${tableHeader}`}>
                      <th className="p-4 font-bold">Name</th>
                      <th className="p-4 font-bold text-blue-500">Labour ID</th>
                      <th className="p-4 font-bold">Mobile</th>
                      <th className="p-4 font-bold">Location</th>
                      <th className="p-4 font-bold text-emerald-500">Rate Per Paye (₹)</th>
                      <th className="p-4 font-bold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`text-sm ${tableBody}`}>
                    {filteredManage.length === 0 && <tr><td colSpan={6} className={`p-4 text-center font-medium ${textMuted}`}>No results found.</td></tr>}
                    {filteredManage.map(lab => {
                      const isEditing = editingLabourId === lab.id;
                      return (
                        <tr key={lab.id} className={`transition-colors ${tableRowHover}`}>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.name} onChange={(e)=>setEditLabourData({...editLabourData!, name: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-medium ${inputBg}`}/> : <span className="font-semibold">{lab.name}</span>}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.loginId} onChange={(e)=>setEditLabourData({...editLabourData!, loginId: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-bold ${isDark ? 'bg-slate-900 border-blue-500/50 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-700'}`}/> : <span className="font-extrabold text-blue-500">{lab.loginId}</span>}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.phone} onChange={(e)=>setEditLabourData({...editLabourData!, phone: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-medium ${inputBg}`}/> : lab.phone}</td>
                          <td className="p-3">{isEditing ? <input type="text" value={editLabourData?.paya} onChange={(e)=>setEditLabourData({...editLabourData!, paya: e.target.value})} className={`w-full rounded px-2 py-1.5 outline-none border font-medium ${inputBg}`}/> : (lab.paya || "-")}</td>
                          <td className="p-3">{isEditing ? <input type="number" value={editLabourData?.payeRate} onChange={(e)=>setEditLabourData({...editLabourData!, payeRate: Number(e.target.value)})} className={`w-full rounded px-2 py-1.5 outline-none border font-bold ${isDark ? 'bg-slate-900 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700'}`}/> : <span className={`font-bold px-3 py-1 rounded-md ${isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-100 border border-emerald-200'}`}>₹{lab.ratePerPaya || 0}</span>}</td>
                          <td className="p-3 text-center">{isEditing ? <button onClick={() => handleSaveLabourEdit(lab.id)} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-1 mx-auto"><Check size={14}/> Save</button> : <button onClick={() => { setEditingLabourId(lab.id); setEditLabourData({name: lab.name, loginId: lab.loginId, phone: lab.phone, paya: lab.paya || "", payeRate: lab.ratePerPaya || 0}); }} className={`px-5 py-1.5 rounded-lg font-bold transition-all active:scale-95 ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-300 shadow-sm hover:bg-slate-50 text-slate-700'}`}>Edit</button>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== WORK ENTRY TAB & FULLSCREEN SELECTION ===================== */}
        {activeTab === "eent" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className={`border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 transition-all ${cardBg}`}>
              
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h2 className="text-xl font-extrabold mb-2 text-emerald-500 flex items-center gap-2"><CheckSquare size={22} /> Bulk Attendance/Work</h2>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Date</label><input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-medium transition-all border ${inputBg}`} required /></div>
                <div><label className="block text-xs font-extrabold text-emerald-500 mb-1">Paye Count</label><input type="number" value={payeAmount} onChange={(e) => setPayeAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-extrabold text-lg transition-all border ${isDark ? 'bg-slate-900/80 border-emerald-500/50 focus:border-emerald-400 text-emerald-100' : 'bg-emerald-50 border-emerald-300 focus:border-emerald-500 text-emerald-800'}`} placeholder="e.g. 5" /></div>
                
                <div className="mt-auto flex flex-col gap-3">
                  <button onClick={handleAddWork} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <CheckCircle size={18}/> Submit Work
                  </button>
                  <button onClick={handleAddBulkLeave} className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                    <UserMinus size={18}/> Mark Leave (Absent)
                  </button>
                </div>
              </div>

              {/* Fullscreen Selection Toggle Container */}
              <div className={fullScreenList === "work" ? `fixed inset-0 z-[120] p-4 md:p-8 flex flex-col animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}` : `w-full md:w-2/3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                  <label className={`text-xs md:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${textMain}`}>
                    Select Labourers <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>{selectedLabourIds.length} Selected</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search..." value={searchBulk} onChange={(e) => setSearchBulk(e.target.value)} className={`pl-8 pr-3 py-2 rounded-lg text-sm outline-none w-full sm:w-48 transition-all border ${inputBg}`} />
                    </div>
                    <button onClick={() => setFullScreenList(fullScreenList === "work" ? null : "work")} className={`p-2 rounded-lg border transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600 shadow-sm'}`} title={fullScreenList === "work" ? "Minimize" : "Full Screen"}>
                      {fullScreenList === "work" ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
                    </button>
                  </div>
                </div>

                <div className={`border rounded-xl overflow-y-auto custom-scrollbar shadow-inner flex-1 ${fullScreenList === "work" ? "" : "max-h-75"} ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <label className={`flex items-center gap-3 p-4 cursor-pointer border-b sticky top-0 backdrop-blur z-10 ${isDark ? 'hover:bg-slate-800/80 border-slate-700/50 bg-slate-900/95' : 'hover:bg-slate-100 border-slate-200 bg-white/95'}`}>
                    <input type="checkbox" className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" checked={selectedLabourIds.length === filteredBulk.length && filteredBulk.length > 0} onChange={(e) => { e.target.checked ? setSelectedLabourIds(filteredBulk.map(l => l.id)) : setSelectedLabourIds([]); }} />
                    <span className={`text-sm font-extrabold ${textMain}`}>Select All ({filteredBulk.length})</span>
                  </label>
                  {filteredBulk.length === 0 && <p className={`text-sm p-4 text-center font-medium ${textMuted}`}>No labourers found.</p>}
                  {filteredBulk.map(lab => (
                    <label key={lab.id} className={`flex items-center justify-between p-4 cursor-pointer border-b last:border-0 transition-colors ${isDark ? (selectedLabourIds.includes(lab.id) ? 'bg-emerald-900/20 border-slate-700/30' : 'hover:bg-slate-800/50 border-slate-700/30') : (selectedLabourIds.includes(lab.id) ? 'bg-emerald-50 border-slate-200' : 'hover:bg-white border-slate-200')}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" checked={selectedLabourIds.includes(lab.id)} onChange={(e) => { e.target.checked ? setSelectedLabourIds([...selectedLabourIds, lab.id]) : setSelectedLabourIds(selectedLabourIds.filter(id => id !== lab.id)); }} />
                        <div><span className={`text-sm md:text-base font-bold block ${selectedLabourIds.includes(lab.id) ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : textMain}`}>{lab.name} <span className={`text-[10px] ml-1 font-medium ${textMuted}`}>ID:{lab.loginId}</span></span></div>
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

            <div className="mt-8 pt-6">
              <h3 className={`text-lg font-extrabold mb-4 flex items-center gap-2 ${textMain}`}>Records for <span className={`px-2 py-0.5 rounded border ${isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-700 bg-emerald-100 border-emerald-300'}`}>{entryDate}</span></h3>
              <div className={`border rounded-2xl overflow-hidden shadow-xl transition-all ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-125">
                    <thead>
                      <tr className={`text-xs uppercase tracking-wider border-b ${tableHeader}`}><th className="p-4 font-bold">Name</th><th className="p-4 font-bold">Location</th><th className="p-4 font-bold text-emerald-500">Total Paye / Status</th><th className="p-4 font-bold text-cyan-500">Earned</th></tr>
                    </thead>
                    <tbody className={`text-sm ${tableBody}`}>
                      {currentLabourers.filter(lab => lab.entries.some((e:any) => e.date === entryDate && (e.payeCount > 0 || e.isLeave))).length === 0 ? (
                        <tr><td colSpan={4} className={`p-6 text-center font-medium italic ${textMuted}`}>No work or leave entries found for this date.</td></tr>
                      ) : (
                        currentLabourers.map(lab => {
                          const entry = lab.entries.find((e:any) => e.date === entryDate && (e.payeCount > 0 || e.isLeave));
                          if (!entry) return null;
                          const rate = entry.customRatePerPaya !== undefined ? entry.customRatePerPaya : (lab.ratePerPaya || 0);
                          const earned = entry.payeCount * rate;
                          return (
                            <tr key={lab.id} className={`transition-colors ${tableRowHover}`}>
                              <td className={`p-4 font-bold ${textMain}`}>{lab.name}</td><td className={`p-4 font-medium ${textMuted}`}>{lab.paya || "-"}</td>
                              <td className="p-4 font-bold">
                                {entry.isLeave ? (
                                  <span className={`px-2 py-1 rounded border flex items-center gap-1.5 w-fit ${isDark ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-rose-700 bg-rose-100 border-rose-300'}`}><UserMinus size={14}/> LEAVE</span>
                                ) : (
                                  <span className={`px-2 py-1 rounded border ${isDark ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/20' : 'text-emerald-800 bg-emerald-100 border-emerald-300'}`}>{entry.payeCount} <span className={`text-xs font-medium ml-1 ${textMuted}`}>(@ ₹{rate})</span></span>
                                )}
                              </td>
                              <td className={`p-4 font-extrabold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{entry.isLeave ? "-" : `₹${earned.toLocaleString()}`}</td>
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
            <div className={`border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row gap-6 mt-6 transition-all ${cardBg}`}>
              
              <div className="w-full md:w-1/3 flex flex-col gap-4">
                <h2 className="text-xl font-extrabold mb-2 text-orange-500 flex items-center gap-2"><CheckSquare size={22} /> Bulk Khuraak (Weekly)</h2>
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Date</label><input type="date" value={bulkKharchaDate} onChange={(e) => setBulkKharchaDate(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-medium transition-all border ${inputBg}`} required /></div>
                <div><label className="block text-xs font-extrabold text-orange-500 mb-1">Amount (For All Selected)</label><input type="number" value={bulkKharchaAmount} onChange={(e) => setBulkKharchaAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-extrabold text-lg transition-all border ${isDark ? 'bg-slate-900/80 border-orange-500/50 focus:border-orange-400 text-orange-100' : 'bg-orange-50 border-orange-300 focus:border-orange-500 text-orange-800'}`} placeholder="e.g. 1000" /></div>
                <button onClick={handleAddBulkKharcha} className="w-full mt-auto py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95">Submit Bulk Khuraak</button>
              </div>

              {/* Kharcha Fullscreen Toggle */}
              <div className={fullScreenList === "kharcha" ? `fixed inset-0 z-[120] p-4 md:p-8 flex flex-col animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50'}` : `w-full md:w-2/3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-3">
                  <label className={`text-xs md:text-sm font-extrabold uppercase tracking-wider flex items-center gap-2 ${textMain}`}>
                    Select Labourers <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>{selectedKharchaIds.length} Selected</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Search..." value={searchBulkKharcha} onChange={(e) => setSearchBulkKharcha(e.target.value)} className={`pl-8 pr-3 py-2 rounded-lg text-sm outline-none w-full sm:w-48 transition-all border ${inputBg}`} />
                    </div>
                    <button onClick={() => setFullScreenList(fullScreenList === "kharcha" ? null : "kharcha")} className={`p-2 rounded-lg border transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-600 shadow-sm'}`}>
                      {fullScreenList === "kharcha" ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
                    </button>
                  </div>
                </div>

                <div className={`border rounded-xl overflow-y-auto custom-scrollbar shadow-inner flex-1 ${fullScreenList === "kharcha" ? "" : "max-h-75"} ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <label className={`flex items-center gap-3 p-4 cursor-pointer border-b sticky top-0 backdrop-blur z-10 ${isDark ? 'hover:bg-slate-800/80 border-slate-700/50 bg-slate-900/95' : 'hover:bg-slate-100 border-slate-200 bg-white/95'}`}>
                    <input type="checkbox" className="w-5 h-5 accent-orange-500 rounded cursor-pointer" checked={selectedKharchaIds.length === filteredBulkKharcha.length && filteredBulkKharcha.length > 0} onChange={(e) => { e.target.checked ? setSelectedKharchaIds(filteredBulkKharcha.map(l => l.id)) : setSelectedKharchaIds([]); }} />
                    <span className={`text-sm font-extrabold ${textMain}`}>Select All ({filteredBulkKharcha.length})</span>
                  </label>
                  {filteredBulkKharcha.length === 0 && <p className={`text-sm p-4 text-center font-medium ${textMuted}`}>No labourers found.</p>}
                  {filteredBulkKharcha.map(lab => (
                    <label key={lab.id} className={`flex items-center justify-between p-4 cursor-pointer border-b last:border-0 transition-colors ${isDark ? (selectedKharchaIds.includes(lab.id) ? 'bg-orange-900/20 border-slate-700/30' : 'hover:bg-slate-800/50 border-slate-700/30') : (selectedKharchaIds.includes(lab.id) ? 'bg-orange-50 border-slate-200' : 'hover:bg-white border-slate-200')}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" className="w-5 h-5 accent-orange-500 rounded cursor-pointer" checked={selectedKharchaIds.includes(lab.id)} onChange={(e) => { e.target.checked ? setSelectedKharchaIds([...selectedKharchaIds, lab.id]) : setSelectedKharchaIds(selectedKharchaIds.filter(id => id !== lab.id)); }} />
                        <div><span className={`text-sm md:text-base font-bold block ${selectedKharchaIds.includes(lab.id) ? (isDark ? 'text-orange-300' : 'text-orange-700') : textMain}`}>{lab.name}</span></div>
                      </div>
                    </label>
                  ))}
                </div>

                {fullScreenList === "kharcha" && (
                  <button onClick={() => setFullScreenList(null)} className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg shadow-lg active:scale-95 transition-transform">Done Selecting</button>
                )}
              </div>
            </div>
            
            <div className={`border rounded-2xl p-6 shadow-xl transition-all ${cardBg}`}>
              <h2 className="text-xl font-extrabold mb-4 text-orange-500 flex items-center gap-2"><Wallet size={24} /> Single Expense (Kisi ek ko paise dena)</h2>
              <form onSubmit={handleAddKharcha} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div><label className={`block text-xs font-bold mb-1 ${textMuted}`}>Select Labour</label>
                  <select value={kharchaLabourId} onChange={(e) => setKharchaLabourId(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none font-medium transition-all border ${inputBg}`} required>
                    <option value="">-- Select Labour --</option>
                    {currentLabourers.map(lab => (<option key={lab.id} value={lab.id} className={isDark ? "bg-slate-800" : "bg-white"}>{lab.name} ({lab.loginId})</option>))}
                  </select>
                </div>
                <div><label className="block text-xs font-extrabold text-orange-500 mb-1">Amount (₹)</label><input type="number" value={kharchaAmount} onChange={(e) => setKharchaAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2 outline-none font-bold transition-all border ${isDark ? 'bg-slate-900/50 border-orange-500/50 focus:border-orange-400 text-orange-100' : 'bg-orange-50 border-orange-300 focus:border-orange-500 text-orange-800'}`} placeholder="e.g. 500" required /></div>
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
                    <input type="date" value={peshgiDate} onChange={(e) => setPeshgiDate(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-medium transition-all border ${inputBg}`} required />
                  </div>
                  
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${textMuted}`}>Select Labour</label>
                    <select value={peshgiLabourId} onChange={(e) => setPeshgiLabourId(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none font-medium transition-all border ${inputBg}`} required>
                      <option value="">-- Select Labour --</option>
                      {currentLabourers.map(lab => (<option key={lab.id} value={lab.id} className={isDark ? "bg-slate-800" : "bg-white"}>{lab.name} ({lab.loginId})</option>))}
                    </select>
                  </div>

                  <div className={`flex p-1 rounded-lg border shadow-inner ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                    <button type="button" onClick={() => setPeshgiType("add")} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${peshgiType === "add" ? "bg-rose-600 text-white shadow-md" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}>
                      <TrendingUp size={14}/> Add Advance
                    </button>
                    <button type="button" onClick={() => setPeshgiType("deduct")} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-bold transition-all ${peshgiType === "deduct" ? "bg-emerald-600 text-white shadow-md" : (isDark ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900")}`}>
                      <TrendingDown size={14}/> Jama/Return
                    </button>
                  </div>

                  <div>
                    <label className={`block text-xs font-extrabold mb-1 ${peshgiType === 'add' ? 'text-rose-500' : 'text-emerald-500'}`}>Amount (₹)</label>
                    <input type="number" value={peshgiAmount} onChange={(e) => setPeshgiAmount(e.target.value)} className={`w-full rounded-lg px-3 py-2.5 outline-none text-lg font-bold transition-all border ${peshgiType === 'add' ? (isDark ? 'bg-slate-900/80 border-rose-500/50 focus:border-rose-400 text-rose-100' : 'bg-rose-50 border-rose-300 focus:border-rose-500 text-rose-800') : (isDark ? 'bg-slate-900/80 border-emerald-500/50 focus:border-emerald-400 text-emerald-100' : 'bg-emerald-50 border-emerald-300 focus:border-emerald-500 text-emerald-800')}`} placeholder="e.g. 5000" required />
                  </div>

                  <button type="submit" className={`w-full py-3.5 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95 ${peshgiType === 'add' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'}`}>
                    Submit Transaction
                  </button>
                </form>
              </div>

              <div className={`w-full md:w-2/3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                  <label className={`text-xs font-bold uppercase tracking-wider ${textMain}`}>Advance Details & History</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search..." value={searchPeshgi} onChange={(e) => setSearchPeshgi(e.target.value)} className={`pl-8 pr-3 py-1.5 rounded-md text-xs outline-none w-full sm:w-48 transition-all border ${inputBg}`} />
                  </div>
                </div>

                <div className={`border rounded-xl max-h-100 overflow-y-auto custom-scrollbar shadow-inner ${isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
                  <table className="w-full text-left border-collapse">
                    <thead className={`text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b ${tableHeader}`}>
                      <tr><th className="p-3 font-bold">Labour Name</th><th className="p-3 font-bold">Location</th><th className="p-3 font-bold text-right text-rose-500">Total Advance</th></tr>
                    </thead>
                    <tbody className={`text-sm ${tableBody}`}>
                      {filteredPeshgi.length === 0 && <tr><td colSpan={3} className={`p-4 text-center font-medium ${textMuted}`}>No records found.</td></tr>}
                      {filteredPeshgi.map(lab => {
                        const totalPeshgi = lab.totalPeshgi !== undefined ? lab.totalPeshgi : ((lab as any).totalAdvance || 0);
                        const isExpanded = expandedPeshgiLabourId === lab.id;
                        
                        const peshgiHistory = (lab.entries || [])
                          .filter((e:any) => e.peshgi && e.peshgi !== 0)
                          .sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return (
                          <React.Fragment key={lab.id}>
                            <tr 
                              onClick={() => setExpandedPeshgiLabourId(isExpanded ? null : lab.id)}
                              className={`transition-colors cursor-pointer ${tableRowHover} ${isExpanded ? (isDark ? 'bg-slate-800/40' : 'bg-slate-100') : ''}`}
                            >
                              <td className="p-3 font-bold flex items-center gap-2">
                                <span className={textMuted}>{isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</span>
                                {lab.name} <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded font-medium ${isDark ? 'text-blue-300 bg-blue-900/30' : 'text-blue-700 bg-blue-100 border border-blue-200'}`}>ID: {lab.loginId}</span>
                              </td>
                              <td className={`p-3 text-xs font-medium ${textMuted}`}>{lab.paya || "-"}</td>
                              <td className={`p-3 text-right font-extrabold ${totalPeshgi > 0 ? (isDark ? 'text-rose-400' : 'text-rose-600') : textMuted}`}>₹{totalPeshgi.toLocaleString()}</td>
                            </tr>
                            
                            {isExpanded && (
                              <tr className={isDark ? "bg-slate-950/80" : "bg-white"}>
                                <td colSpan={3} className="p-4 border-l-4 border-rose-500">
                                  <h4 className={`text-xs font-extrabold uppercase mb-3 flex items-center gap-2 ${textMuted}`}><History size={14}/> Transaction History</h4>
                                  {peshgiHistory.length === 0 ? (
                                    <p className={`text-xs italic font-medium ${textMuted}`}>Koi advance history nahi hai.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {peshgiHistory.map((entry:any) => (
                                        <div key={entry.id} className={`flex justify-between items-center px-3 py-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700/50' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
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
          </div>
        )}

        {/* ===================== NAYA: GIVE POWER (ROLE MANAGEMENT) TAB ===================== */}
        {activeTab === "role" && (
          <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className={`border rounded-2xl p-6 md:p-8 shadow-xl transition-all ${cardBg}`}>
              
              <div className="mb-8 border-b pb-6 border-slate-700/50">
                <h2 className="text-2xl font-extrabold mb-2 flex items-center gap-3 text-violet-500">
                  <ShieldAlert size={28} /> Give Admin Power
                </h2>
                <p className={`text-sm font-medium ${textMuted}`}>
                  Neeche diye gaye Mobile Numbers ya Email IDs se koi bhi login karega toh direct Admin Dashboard open hoga. Sirf unhi logon ko add karein jinpar aapko bharosa ho.
                </p>
              </div>

              <form onSubmit={handleAddAdmin} className="flex flex-col md:flex-row gap-4 items-end mb-10">
                <div className="flex-1 w-full">
                  <label className={`block text-xs font-bold mb-1.5 ${textMain}`}>Phone Number or Email ID</label>
                  <input 
                    type="text" 
                    value={newAdminId} 
                    onChange={(e) => setNewAdminId(e.target.value)} 
                    className={`w-full rounded-xl px-4 py-3.5 outline-none font-bold transition-all border ${inputBg}`} 
                    placeholder="e.g. 9876543210 or admin@bhatta.com" 
                    required 
                  />
                </div>
                <button type="submit" className="w-full md:w-auto py-3.5 px-8 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-lg shadow-violet-500/30 flex justify-center items-center gap-2 active:scale-95 transition-all">
                  <Plus size={18}/> Make Admin
                </button>
              </form>

              <div className="mb-3 flex items-center justify-between">
                <h3 className={`text-sm font-extrabold uppercase tracking-wider ${textMuted}`}>Current Master Admins</h3>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>{adminList.length} Active</span>
              </div>

              <div className={`rounded-xl border overflow-hidden shadow-inner ${isDark ? 'border-slate-700/60 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                <table className="w-full text-left">
                  <thead className={tableHeader}>
                    <tr>
                      <th className="p-4 font-bold">Admin Identifier (Phone/Email)</th>
                      <th className="p-4 font-bold text-center w-32">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`text-sm ${tableBody}`}>
                    {adminList.map((admin, index) => {
                      const isMaster = admin === "admin" || admin === "nadeemxsalar@gmail.com";
                      return (
                        <tr key={index} className={`transition-colors ${tableRowHover}`}>
                          <td className="p-4 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMaster ? 'bg-violet-500/20 text-violet-500' : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')}`}>
                              <Users size={14} />
                            </div>
                            <div>
                              <span className={`font-bold text-base block ${textMain}`}>{admin}</span>
                              {isMaster && <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">Master Owner</span>}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {isMaster ? (
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>Fixed</span>
                            ) : (
                              <button 
                                onClick={() => handleRemoveAdmin(admin)} 
                                className={`p-2.5 rounded-lg transition-all border active:scale-95 ${isDark ? 'bg-slate-800 hover:bg-rose-500/20 border-slate-700 hover:border-rose-500/50 text-rose-400' : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-300 text-rose-500 shadow-sm'}`}
                                title="Remove Power"
                              >
                                <Trash2 size={18}/>
                              </button>
                            )}
                          </td>
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