<div align="center">

# 🧱 Bhatta Pro
**The Complete Brick Kiln Management System**

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](#)
[![React](https://img.shields.io/badge/React-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](#)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](#)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-10B981?style=for-the-badge&logo=pwa&logoColor=white)](#)

*A secure, offline-capable, and bilingual Web App designed to digitize and simplify Eent Bhatta (Brick Kiln) operations, from daily labour tracking to monthly ledger generation.*

</div>

---

## 🌟 Introduction

**Bhatta Pro** ek modern Progressive Web Application (PWA) hai jo Eent Bhatta malikon (Brick Kiln Owners) ki sabhi zarooraton ko dhyan mein rakh kar banaya gaya hai. Is app ke zariye aap hazaron mazdooron ka hisaab, kharcha (expenses), aur peshgi (advances) bina kisi paper register ke, seedhe apne phone ya laptop par manage kar sakte hain.

This application eliminates the hassle of manual registers by providing a fast, secure, and smart dashboard with advanced graphical insights and master PDF reporting.

---

## 🚀 Key Features (मुख्य खूबियां)

* 📊 **Advanced Monthly Matrix Ledger:** Ek screen par poore mahine ki daily attendance aur 'Paye' (bricks) count ka hisaab. True Fullscreen mode for large datasets.
* 🌐 **Smart Bilingual Support (Hindi/English):** Seamlessly switch between English and pure Hindi. Features built-in smart transliteration for labourer names without relying on unstable external APIs.
* 📱 **PWA (Install as Native App):** Works like a standalone app on Android/iOS and Desktop. No URL bar, no browser distractions.
* 🔐 **High-Security Admin Controls:** Multi-tier security with Master Admin allocation, secure login, and a Master PIN system for sensitive actions (like account deletion).
* 🗄️ **Smart Recycle Bin:** Galti se delete huye accounts ko wapas **Restore** karein ya hamesha ke liye permanently delete karein.
* 📄 **Master PDF & JSON Backups:** One-click master summary PDF download. Apne poore database ka offline JSON backup apne system mein secure rakhein.
* 📈 **Visual Analytics:** Real-time top labourers chart with interactive UI using Recharts.

---

## 💻 Tech Stack (टेक्नोलॉजी)

| Category | Technology |
| :--- | :--- |
| **Framework** | Next.js 14+ (App Router), React 18 |
| **Styling** | Tailwind CSS, CSS Modules |
| **Icons** | Lucide React |
| **Charts & Graphs** | Recharts |
| **PDF Generation** | jsPDF, jspdf-autotable |
| **Database/Storage** | LocalStorage API + Firebase Sync |
| **Deployment** | Vercel |

---

## 📸 Screenshots

*(Yahan aap apne project ki real screenshots ke link daal sakte hain)*

<div align="center">
  <img src="https://via.placeholder.com/800x400.png?text=Dashboard+Overview+Screenshot" alt="Dashboard Overview" width="48%">
  <img src="https://via.placeholder.com/800x400.png?text=Matrix+Ledger+Screenshot" alt="Monthly Matrix Ledger" width="48%">
</div>

---

## 🛠️ Installation & Setup (इंस्टॉलेशन)

Apne local system (laptop/PC) par is project ko run karne ke liye in steps ko follow karein:

**1. Repository ko Clone karein:**
```bash
git clone [https://github.com/Nadeemxsalar/bhatta-pro.git](https://github.com/Nadeemxsalar/bhatta-pro.git)
cd bhatta-pro