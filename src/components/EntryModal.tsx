"use client";
import { useState } from "react";
import { X } from "lucide-react";
import styles from "./EntryModal.module.css";
import { DailyEntry } from "../types";

interface EntryModalProps {
  labourName: string;
  onClose: () => void;
  onSave: (entry: DailyEntry) => void;
}

export default function EntryModal({ labourName, onClose, onSave }: EntryModalProps) {
  const today = new Date().toISOString().split("T")[0];
  
  const [date, setDate] = useState(today);
  const [bricks, setBricks] = useState("");
  const [kharcha, setKharcha] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Nayi entry ka object banate hain (Updated fields ke sath)
    const newEntry: DailyEntry = {
      id: Date.now().toString(),
      date,
      bricks: Number(bricks) || 0,
      kharcha: Number(kharcha) || 0,
      peshgi: 0,
    };

    onSave(newEntry);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Daily Entry: {labourName}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Raw Bricks</label>
            <input
              type="number"
              value={bricks}
              onChange={(e) => setBricks(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Bricks count"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Expenses (₹)</label>
            <input
              type="number"
              value={kharcha}
              onChange={(e) => setKharcha(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Amount"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:opacity-90 transition"
            >
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}