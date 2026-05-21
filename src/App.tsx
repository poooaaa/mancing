/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence, useMotionValue, useAnimationFrame, useMotionValueEvent, animate } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Package, X, Trash2, Flame, Backpack, LogIn, Target, ScrollText, CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signInWithRedirect, User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const FISH_BASIC = [
  "https://www.cloudsky.biz.id/api/file/ikan1.png",
  "https://www.cloudsky.biz.id/api/file/ikan2.png",
  "https://www.cloudsky.biz.id/api/file/ikan3.png",
  "https://www.cloudsky.biz.id/api/file/ikan4.png"
];

const FISH_RARE = [
  "https://www.cloudsky.biz.id/api/file/ikan5.png",
  "https://www.cloudsky.biz.id/api/file/ikan6.png",
  "https://www.cloudsky.biz.id/api/file/ikan7.png"
];

const FISH_EPIC = [
  "https://www.cloudsky.biz.id/api/file/ikan8.png",
  "https://www.cloudsky.biz.id/api/file/ikan9.png",
  "https://www.cloudsky.biz.id/api/file/ikan10.png"
];

const FISH_LEGENDARY = [
  "https://www.cloudsky.biz.id/api/file/ikan11.png",
  "https://www.cloudsky.biz.id/api/file/ikan12.png",
  "https://www.cloudsky.biz.id/api/file/ikan13.png"
];

const FISH_MYTHIC = [
  "https://www.cloudsky.biz.id/api/file/ikan15.png",
  "https://www.cloudsky.biz.id/api/file/ikan14.png"
];

const FISH_SOURCES = [...FISH_BASIC, ...FISH_RARE, ...FISH_EPIC, ...FISH_LEGENDARY, ...FISH_MYTHIC];

const getRandomFishSrc = () => {
    const chance = Math.random() * 100; // 0..100
    
    if (chance < 5) {
        // 5% chance for Mythic (0 - 5)
        return FISH_MYTHIC[Math.floor(Math.random() * FISH_MYTHIC.length)];
    } else if (chance < 15) {
        // 10% chance for Legendary (5 - 15)
        return FISH_LEGENDARY[Math.floor(Math.random() * FISH_LEGENDARY.length)];
    } else if (chance < 30) {
        // 15% chance for Epic (15 - 30)
        return FISH_EPIC[Math.floor(Math.random() * FISH_EPIC.length)];
    } else if (chance < 55) {
        // 25% chance for Rare (30 - 55)
        return FISH_RARE[Math.floor(Math.random() * FISH_RARE.length)];
    } else {
        // 45% chance for Basic (55 - 100)
        return FISH_BASIC[Math.floor(Math.random() * FISH_BASIC.length)];
    }
};

const Bubbles = () => {
  const [windowHeight, setWindowHeight] = useState(1000);
  useEffect(() => {
    if (typeof window !== 'undefined') setWindowHeight(window.innerHeight);
  }, []);

  return (
    <div className="absolute inset-0 z-[19] overflow-hidden pointer-events-none">
      {Array.from({ length: 15 }).map((_, i) => {
        const left = `${Math.random() * 100}%`;
        const size = Math.random() * 8 + 4;
        const delay = Math.random() * 5;
        const duration = Math.random() * 6 + 10;
        return (
          <motion.div
            key={i}
            className="absolute bottom-[-20px] rounded-full border border-white/40 bg-zinc-100/10"
            style={{ left, width: size, height: size }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ 
                y: -windowHeight - 100, 
                opacity: [0, 0.8, 0.8, 0],
                x: [0, Math.random() * 60 - 30, Math.random() * -60 + 30, 0] 
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
              ease: 'linear'
            }}
          />
        );
      })}
    </div>
  );
};

function getFishRarity(src: string): 'basic' | 'rare' | 'epic' | 'legendary' | 'mythic' {
    if (FISH_MYTHIC.includes(src)) return 'mythic';
    if (FISH_LEGENDARY.includes(src)) return 'legendary';
    if (FISH_EPIC.includes(src)) return 'epic';
    if (FISH_RARE.includes(src)) return 'rare';
    return 'basic';
}

function generatePowerForRarity(rarity: string): number {
    switch(rarity) {
        case 'mythic': return Math.floor(Math.random() * (9999 - 5000 + 1)) + 5000;
        case 'legendary': return Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
        case 'epic': return Math.floor(Math.random() * (3000 - 1500 + 1)) + 1500;
        case 'rare': return Math.floor(Math.random() * (1500 - 500 + 1)) + 500;
        case 'basic':
        default:
            return Math.floor(Math.random() * (999 - 100 + 1)) + 100;
    }
}

function isFacingRightDefault(src: string): boolean {
    return FISH_RARE.includes(src) || src.includes('ikan8.png') || src.includes('ikan14.png') || FISH_LEGENDARY.includes(src);
}

function createRandomFish(id: number, initialDelay: number = 0): ActiveFishType {
    const src = getRandomFishSrc();
    const rarity = getFishRarity(src);
    let size = Math.random() * 40 + 40;
    let duration = Math.random() * 20 + 20;
    let topPosition = Math.random() * 50 + 20; // 20% to 70%

    if (rarity === 'mythic') {
        size = (Math.random() * 50 + 104) * 0.9; // 10% smaller than legendary
        duration = duration * 0.85 * 0.85 * 0.85; // 15% faster than legendary
        topPosition = Math.random() * 12 + 75; // 75% to 87% (selalu di laut bawah)
    } else if (rarity === 'legendary') {
        size = Math.random() * 50 + 104; // 30% larger min than epic (80 * 1.3)
        duration = duration * 0.85 * 0.85; // 15% faster than epic
    } else if (rarity === 'epic') {
        size = Math.random() * 50 + 80;
        duration = duration * 0.85;
    }

    const power = generatePowerForRarity(rarity);

    return {
        id, src, rtl: Math.random() > 0.5,
        initialDelay,
        top: topPosition, size,
        duration, bobHeight: Math.random() * 20 + 10,
        power
    };
}

// Types
type ActiveFishType = {
  id: number;
  src: string;
  initialDelay: number;
  rtl: boolean;
  top: number;
  size: number;
  duration: number;
  bobHeight: number;
  power: number;
};

type InventoryItemType = {
  src: string;
  power: number;
};

const generateInitialFishes = (): ActiveFishType[] => {
  let idCounter = 0;
  const fishes: ActiveFishType[] = [];
  for (let i = 0; i < 8; i++) {
        fishes.push(createRandomFish(idCounter++, Math.random() * 5));
  }
  return fishes;
};

function Fish({ data, hookState, onCatch }: { data: ActiveFishType, hookState: React.MutableRefObject<any>, onCatch: (id: number, src: string, caughtWidth: number, rtl: boolean, power: number) => void }) {
  const ref = useRef<HTMLImageElement>(null);
  
  useAnimationFrame(() => {
    if (hookState.current.state === 'waiting' || hookState.current.state === 'dropping') {
      const hx = hookState.current.x;
      const hy = hookState.current.y + 20;
      
      const rect = ref.current?.getBoundingClientRect();
      if (rect) {
         if (hx > rect.left && hx < rect.right && hy > rect.top && hy < rect.bottom) {
             onCatch(data.id, data.src, data.size, data.rtl, data.power);
         }
      }
    }
  });

  return (
    <motion.img
      ref={ref}
      src={data.src}
      className="absolute object-contain drop-shadow-lg z-[5]"
      style={{ 
        top: `${data.top}%`, 
        width: `${data.size}px`,
        scaleX: isFacingRightDefault(data.src) ? (data.rtl ? -1 : 1) : (data.rtl ? 1 : -1) 
      }}
      initial={{ left: data.rtl ? '110%' : '-10%', y: 0 }}
      animate={{ left: data.rtl ? '-10%' : '110%', y: [0, -data.bobHeight, 0, data.bobHeight, 0] }}
      transition={{
        left: { duration: data.duration, repeat: Infinity, ease: "linear", delay: data.initialDelay },
        y: { duration: data.duration / 4, repeat: Infinity, ease: "easeInOut", delay: data.initialDelay }
      }}
    />
  );
}

function ClickEffect({ x, y }: { x: number; y: number }) {
  return (
    <>
      <motion.div
        className="fixed rounded-full border-2 border-teal-200/60 shadow-[0_0_15px_rgba(0,255,255,0.4)] z-[25]"
        style={{ left: x, top: y, translateX: "-50%", translateY: "-50%" }}
        initial={{ width: 0, height: 0, opacity: 1 }}
        animate={{ width: 140, height: 140, opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      <motion.div
        className="fixed rounded-full border border-teal-100/30 z-[25]"
        style={{ left: x, top: y, translateX: "-50%", translateY: "-50%" }}
        initial={{ width: 0, height: 0, opacity: 1 }}
        animate={{ width: 220, height: 220, opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
      />
      <motion.div
        className="fixed rounded-full border border-white/60 bg-white/20 backdrop-blur-sm z-[25]"
        style={{ left: x, top: y, translateX: "-50%", translateY: "-50%" }}
        initial={{ width: 14, height: 14, opacity: 1, y: 0 }}
        animate={{ y: -250, opacity: 0, scale: 1.5 }}
        transition={{ duration: 2, ease: "easeIn" }}
      />
      <motion.div
        className="fixed rounded-full border border-white/40 bg-white/10 backdrop-blur-sm z-[25]"
        style={{ left: x + 16, top: y + 12, translateX: "-50%", translateY: "-50%" }}
        initial={{ width: 8, height: 8, opacity: 0.8, y: 0 }}
        animate={{ y: -180, opacity: 0, scale: 1.2 }}
        transition={{ duration: 1.8, ease: "easeIn", delay: 0.2 }}
      />
    </>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [clicks, setClicks] = useState<{id: number, x: number, y: number}[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [deleteCandidate, setDeleteCandidate] = useState<number | null>(null);
  const lastTapRef = useRef<{ [key: number]: number }>({});

  const [activeFishes, setActiveFishes] = useState<ActiveFishType[]>([]);
  const [isInvLoading, setIsInvLoading] = useState(false);
  const [inventory, setInventory] = useState<(InventoryItemType | null)[]>(Array(16).fill(null));

  const [questStage, setQuestStage] = useState(1);
  const [epicFishesCaught, setEpicFishesCaught] = useState(0);
  const [mythicFishesReleased, setMythicFishesReleased] = useState(0);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [isQuestsLoading, setIsQuestsLoading] = useState(false);
  
  const hookX = useMotionValue(0);
  const hookY = useMotionValue(0);
  const hookState = useRef<{ state: 'idle'|'dropping'|'waiting'|'reeling', x: number, y: number }>({
    state: 'idle', x: 0, y: 0
  });

  useMotionValueEvent(hookX, "change", (l) => hookState.current.x = l);
  useMotionValueEvent(hookY, "change", (l) => hookState.current.y = l);

  const [fishingStatus, setFishingStatus] = useState<'idle'|'dropping'|'waiting'|'reeling'>('idle');
  const [caughtFish, setCaughtFish] = useState<{ src: string, width: number, rtl: boolean, power: number } | null>(null);

  const totalPower = inventory.reduce((total, item) => total + (item ? item.power : 0), 0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, "users", u.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
             const data = docSnap.data();
             if (data.inventory && Array.isArray(data.inventory)) {
                 const newInv = Array(16).fill(null);
                 data.inventory.forEach((item, i) => {
                     if (item && i < 16) {
                         newInv[i] = item;
                     }
                 });
                 setInventory(newInv);
             }
             if (data.questStage) setQuestStage(data.questStage);
             if (data.epicFishesCaught) setEpicFishesCaught(data.epicFishesCaught);
             if (data.mythicFishesReleased) setMythicFishesReleased(data.mythicFishesReleased);
          }
        } catch(e) {
          console.error(e);
        }
      } else {
        setInventory(Array(16).fill(null));
        setQuestStage(1);
        setEpicFishesCaught(0);
        setMythicFishesReleased(0);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
       const userDoc = doc(db, "users", user.uid);
       setDoc(userDoc, {
         inventory,
         totalPower,
         questStage,
         epicFishesCaught,
         mythicFishesReleased,
         updatedAt: new Date()
       }, { merge: true }).catch(console.error);
    }
  }, [inventory, user, authLoading, totalPower, questStage, epicFishesCaught, mythicFishesReleased]);

  useEffect(() => {
    setMounted(true);
    setActiveFishes(generateInitialFishes());
  }, []);

  const handleFishClick = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!inventory[index]) return;
    const now = Date.now();
    const lastTap = lastTapRef.current[index] || 0;
    if (now - lastTap < 400) {
      setDeleteCandidate(index);
      lastTapRef.current[index] = 0;
    } else {
      lastTapRef.current[index] = now;
    }
  };

  const reelIn = useCallback((fishToInventory?: InventoryItemType) => {
    setFishingStatus('reeling');
    hookState.current.state = 'reeling';
    
    animate(hookY, 0, { duration: 1.5, ease: "easeIn" }).then(() => {
        setFishingStatus('idle');
        hookState.current.state = 'idle';
        if (fishToInventory) {
            setInventory(prev => {
                const next = [...prev];
                const emptyIdx = next.findIndex(item => item === null);
                if (emptyIdx !== -1) next[emptyIdx] = fishToInventory;
                return next;
            });
        }
        setCaughtFish(null);
    });
  }, [hookY]);

  const handleCatch = useCallback((id: number, src: string, width: number, rtl: boolean, power: number) => {
    if (hookState.current.state !== 'dropping' && hookState.current.state !== 'waiting') return;
    
    setFishingStatus('reeling');
    hookState.current.state = 'reeling';
    
    setActiveFishes(prev => prev.filter(f => f.id !== id));
    setCaughtFish({ src, width, rtl, power });
    reelIn({ src, power });
    
    const rarity = getFishRarity(src);
    if (rarity === 'epic') {
        setEpicFishesCaught(prev => prev + 1);
    }
    
    setTimeout(() => {
        setActiveFishes(prev => {
           if (prev.length >= 10) return prev; // stabilize count
           return [...prev, createRandomFish(Date.now(), 0)];
        });
    }, 5000 + Math.random() * 5000);
  }, [reelIn]);

  const handleScreenClick = (e: React.MouseEvent) => {
    if (inventoryOpen) {
      setInventoryOpen(false);
      return;
    }

    if (fishingStatus !== 'idle') return;

    const newClick = { id: Date.now(), x: e.clientX, y: e.clientY };
    setClicks(prev => [...prev, newClick]);
    setTimeout(() => {
      setClicks(prev => prev.filter(c => c.id !== newClick.id));
    }, 2000);

    setFishingStatus('dropping');
    hookState.current.state = 'dropping';
    hookX.set(e.clientX);
    hookY.set(0);

    animate(hookY, e.clientY, { duration: 1.5, ease: "easeOut" }).then(() => {
       if (hookState.current.state === 'dropping') {
           setFishingStatus('waiting');
           hookState.current.state = 'waiting';
           setTimeout(() => {
               if (hookState.current.state === 'waiting') {
                   reelIn();
               }
           }, 3000);
       }
    });
  };

  return (
    <div 
      className="relative min-h-screen w-full bg-[#0a0a0a] overflow-hidden cursor-crosshair select-none"
      onClick={handleScreenClick}
    >
      <div className="absolute inset-0 z-0">
        <img
          src="https://i.pinimg.com/736x/e2/07/73/e2077353ffd261e77ee1abe1e1bbc96e.jpg"
          alt="Main background"
          className="w-full h-full object-cover"
        />
      </div>

      {mounted && (
        <>
          {activeFishes.map(data => (
            <Fish key={data.id} data={data} hookState={hookState} onCatch={handleCatch} />
          ))}
        </>
      )}

      <div className="absolute top-0 left-0 w-full z-[30] pointer-events-none overflow-hidden rounded-b-3xl shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl z-0" />
        <img 
          src="https://i1-e.pinimg.com/736x/26/76/91/267691b60c257fafe4de115e928acb78.jpg" 
          className="absolute top-1/2 left-1/2 min-w-[200%] min-h-[400px] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover opacity-80 mix-blend-overlay pointer-events-none z-0" 
          alt="" 
        />
        <div className="absolute inset-0 bg-black/20 z-0" />
        <div className="relative z-10 flex items-center justify-between p-4 px-5">
          <div className="flex flex-1 items-center gap-4">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" fill="currentColor" strokeWidth={2.5} />
              <span className="text-white font-bold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,1)] text-lg">{totalPower.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                className="relative p-2.5 rounded-xl border-white/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center pointer-events-auto cursor-pointer shadow-sm group overflow-hidden w-[42px] h-[42px]"
                style={{
                  background: 'linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)'
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isQuestsLoading) return;
                  setIsQuestsLoading(true);
                  const srcs = [
                    "https://i1-e.pinimg.com/736x/26/76/91/267691b60c257fafe4de115e928acb78.jpg",
                    "https://www.cloudsky.biz.id/api/file/ikan14.png",
                    "https://www.cloudsky.biz.id/api/file/ikan15.png",
                    "https://www.cloudsky.biz.id/api/file/ikan16.png"
                  ];
                  
                  await Promise.all([
                      ...srcs.map(src => new Promise(res => {
                         const img = new Image();
                         img.onload = res;
                         img.onerror = res;
                         img.src = src;
                      })),
                      new Promise(res => setTimeout(res, 500))
                  ]);
                  setIsQuestsLoading(false);
                  setQuestsOpen(true);
                }}
              >
                {isQuestsLoading ? (
                  <div className="w-5 h-5 border-[3px] border-white/20 border-t-yellow-400 rounded-full animate-spin shadow-[0_0_8px_rgba(250,204,21,0.5)]" />
                ) : (
                  <Target className="w-5 h-5 text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform" />
                )}
              </button>

              <button
                className="relative p-2.5 rounded-xl border-white/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center pointer-events-auto cursor-pointer shadow-sm group overflow-hidden w-[42px] h-[42px]"
                style={{
                  background: 'linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)'
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isInvLoading) return;
                  setIsInvLoading(true);
                  const srcs = inventory.map(item => item?.src).filter(Boolean) as string[];
                  srcs.push("https://i1-e.pinimg.com/736x/26/76/91/267691b60c257fafe4de115e928acb78.jpg");
                  
                  await Promise.all([
                      ...srcs.map(src => new Promise(res => {
                         const img = new Image();
                         img.onload = res;
                         img.onerror = res;
                         img.src = src;
                      })),
                      new Promise(res => setTimeout(res, 500)) // 0.5 detik min
                  ]);
                  setIsInvLoading(false);
                  setInventoryOpen(true);
                }}
              >
                {isInvLoading ? (
                  <div className="w-5 h-5 border-[3px] border-white/20 border-t-blue-400 rounded-full animate-spin shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                ) : (
                  <Backpack className="w-5 h-5 text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>
          </div>

          {user?.photoURL && (
            <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.5)] bg-black/50 ml-auto pointer-events-auto">
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {!user && !authLoading && (
          <motion.div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xl pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 text-center max-w-sm mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-white/10 to-white/30 flex items-center justify-center border border-white/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.4)]">
                <Flame className="w-10 h-10 text-red-500 drop-shadow-md" fill="currentColor" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
                <p className="text-white/70 text-sm leading-relaxed">Catch rare fishes, build your collection, and compete for the highest power.</p>
              </div>
              <button 
                onClick={async () => {
                  try {
                    await signInWithPopup(auth, googleProvider);
                  } catch (err: any) {
                    console.error("Popup failed, trying redirect:", err);
                    await signInWithRedirect(auth, googleProvider);
                  }
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-white text-black font-semibold tracking-wide hover:bg-gray-100 transition-colors shadow-[0_4px_16px_rgba(255,255,255,0.3)] hover:shadow-[0_4px_24px_rgba(255,255,255,0.4)] flex items-center justify-center gap-3"
              >
                <LogIn className="w-5 h-5" />
                <span>Continue with Google</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {fishingStatus !== 'idle' && (
        <motion.div
          className="fixed w-[2px] bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-[25] origin-top rounded-full pointer-events-none"
          style={{ left: hookX, top: 0, height: hookY }}
        >
          <div className="absolute bottom-0 text-zinc-300 pointer-events-none" style={{ left: '-9px', top: 'calc(100% - 3px)' }}>
            <svg width="20" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
              <path d="M12 2v14a4 4 0 0 1-8 0v-4" />
              <path d="M4 12l-2 2" />
              <circle cx="12" cy="2" r="2" />
            </svg>
            
            {caughtFish && (
                <motion.img 
                   src={caughtFish.src}
                   className="absolute object-contain drop-shadow-lg z-[26] pointer-events-none max-w-none"
                   style={{
                      left: '10px',
                      top: '10px',
                      width: `${caughtFish.width}px`,
                      height: 'auto',
                      transformOrigin: 'center'
                   }}
                   animate={{
                      x: '-50%',
                      y: '-50%',
                      scaleX: isFacingRightDefault(caughtFish.src) ? (caughtFish.rtl ? -1 : 1) : (caughtFish.rtl ? 1 : -1),
                      rotate: 90
                   }}
                />
            )}
          </div>
        </motion.div>
      )}

      <div className="absolute bottom-0 left-0 w-full pointer-events-none flex justify-center items-end z-10">
        <img
          src="https://i.pinimg.com/736x/b2/cd/2f/b2cd2fd4b3d715ca89162b7f8c847d15.jpg"
          alt="Bottom aesthetic background"
          className="w-full md:max-w-2xl h-auto object-contain object-bottom opacity-90"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 100%)',
          }}
        />
      </div>

      <Bubbles />
      <div className="absolute inset-0 z-[20] pointer-events-none bg-cyan-800/20 mix-blend-overlay" />
      <div className="absolute inset-0 z-[20] pointer-events-none bg-gradient-to-t from-blue-950/90 via-sky-800/30 to-teal-800/10" />
      <div className="absolute inset-0 z-[20] pointer-events-none backdrop-blur-[3px] opacity-70" />
      <div className="absolute inset-0 z-[21] pointer-events-none bg-gradient-to-b from-white/10 to-transparent mix-blend-overlay" style={{ maskImage: 'repeating-linear-gradient(to right, transparent, transparent 10%, black 15%, transparent 20%)', opacity: 0.3 }} />
      <div className="absolute inset-0 z-[21] pointer-events-none border-[16px] border-black/20 rounded-[2rem] opacity-50 mix-blend-overlay" />




      <AnimatePresence>
        {inventoryOpen && (
          <motion.div
            className="fixed inset-0 z-[40] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={(e) => { e.stopPropagation(); setInventoryOpen(false); }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl border border-white/20 shadow-[0_16px_64px_rgba(0,0,0,0.5)] overflow-hidden relative"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ ease: "easeOut", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl z-0" />
              <img 
                src="https://i1-e.pinimg.com/736x/26/76/91/267691b60c257fafe4de115e928acb78.jpg" 
                className="absolute top-1/2 left-1/2 w-[150%] h-[150%] min-h-[800px] min-w-[800px] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover opacity-80 mix-blend-overlay pointer-events-none z-0" 
                alt="" 
              />
              
              <div className="relative z-10 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-medium text-white tracking-wide">Inventory</h2>
                  <button 
                    className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
                    onClick={() => setInventoryOpen(false)}
                  >
                    <X className="w-5 h-5 text-white/70 hover:text-white" />
                  </button>
                </div>
                
                <div className="grid grid-cols-4 gap-3 relative">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const item = inventory[i];
                    const itemSrc = item ? item.src : null;
                    const itemPower = item ? item.power : 0;
                    const isRare = itemSrc ? getFishRarity(itemSrc) === 'rare' : false;
                    const isEpic = itemSrc ? getFishRarity(itemSrc) === 'epic' : false;
                    const isLegendary = itemSrc ? getFishRarity(itemSrc) === 'legendary' : false;
                    const isMythic = itemSrc ? getFishRarity(itemSrc) === 'mythic' : false;
                    
                    return (
                    <div 
                      key={i} 
                      className={`aspect-square rounded-2xl flex items-center justify-center relative group ${
                        !itemSrc ? 'bg-black/30 border border-white/10 shadow-inner' :
                        isMythic ? 'bg-gradient-to-br from-red-600 to-rose-900 border-2 border-red-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_0_20px_rgba(225,29,72,0.6)]' :
                        isLegendary ? 'bg-gradient-to-br from-yellow-400 to-amber-600 border-2 border-yellow-200 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_0_20px_rgba(250,204,21,0.6)]' :
                        isEpic ? 'bg-gradient-to-br from-purple-600 to-purple-900 border-2 border-purple-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_0_15px_rgba(168,85,247,0.5)]' :
                        isRare ? 'bg-gradient-to-br from-blue-600 to-indigo-900 border-2 border-blue-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_0_15px_rgba(59,130,246,0.5)]' :
                        'bg-gradient-to-br from-zinc-600 to-zinc-800 border-2 border-zinc-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]'
                      }`}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none opacity-50 z-0" />
                      
                      {itemSrc && (
                          <>
                             <motion.img
                                src={itemSrc}
                                className="w-4/5 h-4/5 object-contain cursor-pointer z-[50] drop-shadow-md select-none touch-none pb-2"
                                onContextMenu={(e) => { e.preventDefault(); return false; }}
                                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                                draggable={false}
                                onClick={(e) => handleFishClick(i, e)}
                                whileHover={{ scale: 1.1 }}
                             />
                             <div className="absolute bottom-1 right-1 left-1 flex justify-center items-center gap-0.5 z-[60] bg-black/40 backdrop-blur-md rounded-full px-1 py-0.5 border border-white/10 pointer-events-none">
                               <Flame className="w-2.5 h-2.5 text-red-500 flex-shrink-0" fill="currentColor" strokeWidth={3} />
                               <span className="text-[9px] leading-none text-white font-bold truncate">{itemPower.toLocaleString()}</span>
                             </div>
                          </>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteCandidate !== null && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); setDeleteCandidate(null); }}
          >
            <motion.div
              className="bg-[#111] border border-white/10 p-6 rounded-3xl shadow-[0_16px_64px_rgba(0,0,0,0.5)] flex flex-col items-center max-w-sm w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white text-lg font-medium mb-2 tracking-wide">Hapus Ikan?</h3>
              <p className="text-zinc-400 text-sm mb-6 text-center">Apakah kamu yakin ingin melepaskan ikan ini kembali ke laut?</p>
              <div className="flex gap-3 w-full">
                <button 
                  className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors"
                  onClick={() => setDeleteCandidate(null)}
                >
                  Batal
                </button>
                <button 
                  className="flex-1 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                  onClick={() => {
                    const deletedItem = inventory[deleteCandidate!];
                    if (deletedItem && getFishRarity(deletedItem.src) === 'mythic') {
                        setMythicFishesReleased(prev => prev + 1);
                    }
                    setInventory(prev => {
                       const items = prev.filter((item, i) => item !== null && i !== deleteCandidate);
                       return [...items, ...Array(16 - items.length).fill(null)];
                    });
                    setDeleteCandidate(null);
                  }}
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {questsOpen && (
          <motion.div
            className="fixed inset-0 z-[50] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={(e) => { e.stopPropagation(); setQuestsOpen(false); }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl border border-white/20 shadow-[0_16px_64px_rgba(0,0,0,0.5)] overflow-hidden relative"
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ ease: "easeOut", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl z-0" />
              <img 
                src="https://i1-e.pinimg.com/736x/26/76/91/267691b60c257fafe4de115e928acb78.jpg" 
                className="absolute top-1/2 left-1/2 w-[150%] h-[150%] min-h-[800px] min-w-[800px] max-w-none -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover opacity-60 mix-blend-overlay pointer-events-none z-0" 
                alt="" 
              />
              
              <div className="relative z-10 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-6 h-6 text-yellow-400 drop-shadow-md" />
                    <h2 className="text-xl font-medium text-white tracking-wide">Missions</h2>
                  </div>
                  <button 
                    className="p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
                    onClick={() => setQuestsOpen(false)}
                  >
                    <X className="w-5 h-5 text-white/70 hover:text-white" />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Quest 1 */}
                  <div className={`p-4 rounded-2xl border ${questStage === 1 ? 'border-yellow-400/50 bg-white/5' : questStage > 1 ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-black/20 opacity-50'} relative overflow-hidden transition-all delay-100`}>
                    {questStage > 1 && <div className="absolute top-3 right-3"><CheckCircle2 className="w-5 h-5 text-green-400 shadow-xl" /></div>}
                    <div className="flex justify-between items-start mb-2">
                      <div className="pr-8">
                        <h3 className="text-white font-semibold mb-1">Epic Master</h3>
                        <p className="text-white/70 text-sm">Tangkap 100 ikan Epic.</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1 shrink-0 bg-gradient-to-br from-red-600 to-rose-900 border-2 border-red-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_0_20px_rgba(225,29,72,0.6)]">
                        <img src="https://www.cloudsky.biz.id/api/file/ikan14.png" className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" alt="Reward" />
                      </div>
                    </div>
                    {questStage === 1 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-white/60 mb-1 font-mono">
                          <span>{epicFishesCaught} / 100</span>
                          <span>{Math.min(100, Math.floor((epicFishesCaught/100) * 100))}%</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (epicFishesCaught / 100) * 100)}%` }}
                          />
                        </div>
                        {epicFishesCaught >= 100 && (
                          <button 
                            className="w-full mt-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(234,179,8,0.5)]"
                            onClick={() => {
                              setQuestStage(2);
                              const power = Math.floor(Math.random() * (9999 - 5000 + 1)) + 5000;
                              setInventory(prev => {
                                 const next = [...prev];
                                 const emptyIdx = next.findIndex(item => item === null);
                                 if (emptyIdx !== -1) next[emptyIdx] = { src: "https://www.cloudsky.biz.id/api/file/ikan14.png", power };
                                 return next;
                              });
                            }}
                          >
                            Claim Reward
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quest 2 */}
                  <div className={`p-4 rounded-2xl border ${questStage === 2 ? 'border-yellow-400/50 bg-white/5' : questStage > 2 ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-black/20 opacity-50'} relative overflow-hidden transition-all delay-200`}>
                    {questStage < 2 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px] z-10"><Lock className="w-6 h-6 text-white/50" /></div>}
                    {questStage > 2 && <div className="absolute top-3 right-3"><CheckCircle2 className="w-5 h-5 text-green-400 shadow-xl" /></div>}
                    <div className="flex justify-between items-start mb-2">
                      <div className="pr-8">
                        <h3 className="text-white font-semibold mb-1">Power Overwhelming</h3>
                        <p className="text-white/70 text-sm">Mencapai 70.000 Power Total.</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1 shrink-0 bg-gradient-to-br from-red-600 to-rose-900 border-2 border-red-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_0_20px_rgba(225,29,72,0.6)]">
                        <img src="https://www.cloudsky.biz.id/api/file/ikan15.png" className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" alt="Reward" />
                      </div>
                    </div>
                    {questStage === 2 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-white/60 mb-1 font-mono">
                          <span>{totalPower.toLocaleString()} / 70.000</span>
                          <span>{Math.min(100, Math.floor((totalPower/70000) * 100))}%</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (totalPower / 70000) * 100)}%` }}
                          />
                        </div>
                        {totalPower >= 70000 && (
                          <button 
                            className="w-full mt-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(234,179,8,0.5)]"
                            onClick={() => {
                              setQuestStage(3);
                              const power = Math.floor(Math.random() * (9999 - 5000 + 1)) + 5000;
                              setInventory(prev => {
                                 const next = [...prev];
                                 const emptyIdx = next.findIndex(item => item === null);
                                 if (emptyIdx !== -1) next[emptyIdx] = { src: "https://www.cloudsky.biz.id/api/file/ikan15.png", power };
                                 return next;
                              });
                            }}
                          >
                            Claim Reward
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quest 3 */}
                  <div className={`p-4 rounded-2xl border ${questStage === 3 ? 'border-yellow-400/50 bg-white/5' : questStage > 3 ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-black/20 opacity-50'} relative overflow-hidden transition-all delay-300`}>
                    {questStage < 3 && <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px] z-10"><Lock className="w-6 h-6 text-white/50" /></div>}
                    {questStage > 3 && <div className="absolute top-3 right-3"><CheckCircle2 className="w-5 h-5 text-green-400 shadow-xl" /></div>}
                    <div className="flex justify-between items-start mb-2">
                       <div className="pr-8">
                        <h3 className="text-white font-semibold mb-1">Mythic Sacrifice</h3>
                        <p className="text-white/70 text-sm">Lepaskan/Hapus 5 Ikan Mythic.</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center p-1 shrink-0 bg-gradient-to-br from-red-600 to-rose-900 border-2 border-red-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_0_20px_rgba(225,29,72,0.6)]">
                        <img src="https://www.cloudsky.biz.id/api/file/ikan16.png" className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]" alt="Reward" />
                      </div>
                    </div>
                    {questStage === 3 && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-white/60 mb-1 font-mono">
                          <span>{mythicFishesReleased} / 5</span>
                          <span>{Math.min(100, Math.floor((mythicFishesReleased/5) * 100))}%</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (mythicFishesReleased / 5) * 100)}%` }}
                          />
                        </div>
                        {mythicFishesReleased >= 5 && (
                          <button 
                            className="w-full mt-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(234,179,8,0.5)]"
                            onClick={() => {
                              setQuestStage(4);
                              const power = Math.floor(Math.random() * (15000 - 9999 + 1)) + 9999;
                              setInventory(prev => {
                                 const next = [...prev];
                                 const emptyIdx = next.findIndex(item => item === null);
                                 if (emptyIdx !== -1) next[emptyIdx] = { src: "https://www.cloudsky.biz.id/api/file/ikan16.png", power };
                                 return next;
                              });
                            }}
                          >
                            Claim Reward
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {clicks.map(click => (
        <ClickEffect key={click.id} x={click.x} y={click.y} />
      ))}
    </div>
  );
}
