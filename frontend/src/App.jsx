import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Upload, 
  Sparkles, 
  Clock, 
  Award, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Info, 
  ChevronRight, 
  Layers, 
  Flame, 
  BarChart2, 
  FileText, 
  ArrowLeft,
  ChevronLeft,
  Check,
  AlertTriangle,
  History
} from 'lucide-react';

// Setup endpoints (default local port, fallback to same host for production deployment)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Academic notes for direct injection/triggering via CTA
const PHOTOSYNTHESIS_NOTES = `PHOTOSYNTHESIS IN HIGHER PLANTS (NCERT Class 11 Revision Notes)
Photosynthesis is an anabolic process by which green plants synthesize organic compounds (glucose) from inorganic raw materials (CO2 and H2O) using solar light energy absorbed by chlorophyll pigments.

KEY CONCEPTS:
1. LIGHT REACTIONS (Photochemical Phase):
- Occurs inside the Grana Thylakoids.
- Splitting of water (Photolysis) at PS II (P680) releases Oxygen: 2H2O -> 4H+ + O2 + 4e-.
- Electron Transport Chain (Z-scheme) excited electrons flow from PS II to PS I, synthesizing ATP and NADPH.
- Cyclic Photophosphorylation occurs in Stroma Lamellae (lacks PS II and NADP reductase), producing ONLY ATP.

2. DARK REACTIONS (Calvin Cycle / C3 Cycle):
- Occurs inside the Chloroplast Stroma.
- Three steps:
  * Carboxylation: CO2 is accepted by RuBP (5-carbon) using the enzyme RuBisCO (most abundant enzyme) to form 3-PGA.
  * Reduction: Uses 2 ATP and 2 NADPH per CO2 fixed to form G3P (sugar).
  * Regeneration: Recreates RuBP using 1 ATP.
- Net cost for 1 Glucose (6 turns): 18 ATP and 12 NADPH.
- Wasteful process: Photorespiration (C2 Cycle) occurs when RuBisCO binds O2 instead of CO2, wasting ATP. C4 plants use Kranz Anatomy and PEP carboxylase in mesophyll cells to prevent this.`;

const FUNDAMENTAL_RIGHTS_NOTES = `THE PREAMBLE & FUNDAMENTAL RIGHTS (UPSC Indian Polity Revision Notes)
The Preamble is the introductory key to the Indian Constitution, expressing its democratic, secular, federal ideals. Fundamental Rights are codified in Part III (Articles 12-35), acting as the Magna Carta of India.

KEY CONCEPTS:
1. PREAMBLE & BASIC STRUCTURE:
- Landmark Kesavananda Bharati case (1973) declared Preamble is a part of the Constitution and can be amended under Article 368, but its Basic Structure (secularism, federalism, judicial review) cannot be altered.

2. FUNDAMENTAL RIGHTS (PART III, ARTICLES 12-35):
- Article 12: Defines the term 'State'.
- Article 13: Declares laws violating Fundamental Rights void, establishing the foundation of Judicial Review.
- Six Categories of Rights:
  * Right to Equality (Art 14-18): Article 14 guarantees equality before law; Article 17 abolishes untouchability.
  * Right to Freedom (Art 19-22): Article 21 guarantees life and liberty; Article 21A guarantees Right to Education. Articles 20 and 21 CANNOT be suspended during national emergencies.
  * Right against Exploitation (Art 23-24): Prohibits child labor and human trafficking.
  * Freedom of Religion (Art 25-28)
  * Cultural & Educational Rights (Art 29-30): Minority rights.
  * Right to Constitutional Remedies (Art 32): Dr. Ambedkar called it the 'Heart and Soul' of the Constitution. Grants power to issue writs (Habeas Corpus, Mandamus, Certiorari, Prohibition, Quo-Warranto) to enforce rights.`;

export default function App() {
  // Navigation & Screen States
  const [activeScreen, setActiveScreen] = useState('dashboard'); // 'dashboard', 'quiz', 'flashcards', 'history', 'guides'
  const [selectedGuide, setSelectedGuide] = useState(null); // null, 'neet-photosynthesis', 'upsc-fundamental-rights'
  
  // App Data States
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [apiMode, setApiMode] = useState('Live Mode');
  
  // Generated Content States
  const [quizData, setQuizData] = useState([]);
  const [flashcardsData, setFlashcardsData] = useState([]);
  
  // Active Quiz State
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionIndex: chosenOption }
  const [quizTimer, setQuizTimer] = useState(0);
  const [quizIntervalId, setQuizIntervalId] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Active Flashcards State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardStats, setCardStats] = useState({}); // { cardIndex: 'easy' | 'medium' | 'hard' }

  // Local Storage Data (History & Analytics)
  const [studyHistory, setStudyHistory] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    quizzesTaken: 0,
    averageScore: 0,
    cardsReviewed: 0,
    streak: 0
  });

  // Drag and Drop Ref
  const fileInputRef = useRef(null);

  // Premium / Pro Subscription States
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem('prepcraft_premium') === 'true';
  });
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Dynamic script injection for Razorpay Checkout
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Ambient Soundscape state
  const [activeSound, setActiveSound] = useState(null); // null, 'rain', 'binaural', 'forest'
  const audioCtxRef = useRef(null);
  const soundNodesRef = useRef({});

  // Razorpay payment order creation and trigger
  const handlePayment = async (tier) => {
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    
    try {
      // 1. Create secure payment order in backend
      const response = await fetch(`${API_BASE}/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      });
      
      if (!response.ok) {
        throw new Error('Failed to initiate secure order creation.');
      }
      
      const order = await response.json();
      
      // 2. Configure Razorpay options
      const options = {
        key: 'rzp_test_Ss1ZbHUd4QHJz6', // Public test key ID
        amount: order.amount,
        currency: order.currency,
        name: 'PrepCraft AI',
        description: tier === 'yearly' ? 'Yearly Ace Premium' : 'Monthly Focus Premium',
        image: 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png',
        order_id: order.id,
        handler: async function (paymentResponse) {
          try {
            setIsProcessingPayment(true);
            
            // Verify payment signature securely
            const verifyRes = await fetch(`${API_BASE}/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature
              })
            });
            
            const verifyData = await verifyRes.json();
            
            if (verifyData.status === 'success') {
              setIsPremium(true);
              localStorage.setItem('prepcraft_premium', 'true');
              setShowPaywallModal(false);
              alert("🎉 Congratulations! Payment Verified successfully. Premium features are now UNLOCKED! 🚀");
            } else {
              alert("⚠️ Signature verification failed. Payment could not be validated.");
            }
          } catch (err) {
            console.error("Signature verification endpoint error:", err);
            alert("An error occurred during payment verification. Please try again.");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: 'Aspirant Student',
          email: 'aspirant@example.com',
          contact: '9999999999'
        },
        notes: {
          tier: tier
        },
        theme: {
          color: '#10b981'
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (err) {
      console.error("Razorpay initiation error:", err);
      alert("Failed to connect to backend server. Ensure backend is running at Port 5000.");
      setIsProcessingPayment(false);
    }
  };

  const startAmbientSound = (type) => {
    stopAmbientSound();

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const nodes = {};

      if (type === 'binaural') {
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const merger = ctx.createChannelMerger(2);
        
        const gain = ctx.createGain();
        gain.gain.value = 0.08;

        oscL.frequency.value = 200;
        oscR.frequency.value = 210;

        const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        if (pannerL && pannerR) {
          pannerL.pan.value = -1;
          pannerR.pan.value = 1;
          oscL.connect(pannerL).connect(gain);
          oscR.connect(pannerR).connect(gain);
        } else {
          oscL.connect(merger, 0, 0);
          oscR.connect(merger, 0, 1);
          merger.connect(gain);
        }
        
        gain.connect(ctx.destination);

        oscL.start();
        oscR.start();

        nodes.oscL = oscL;
        nodes.oscR = oscR;
        nodes.gain = gain;
      } 
      else if (type === 'rain') {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = ctx.createGain();
        gain.gain.value = 0.25;

        whiteNoise.connect(filter).connect(gain).connect(ctx.destination);
        whiteNoise.start();

        nodes.source = whiteNoise;
        nodes.filter = filter;
        nodes.gain = gain;
      } 
      else if (type === 'forest') {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2.0;

        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08;
        
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 300;

        lfo.connect(lfoGain).connect(filter.frequency);
        filter.frequency.value = 500;

        const gain = ctx.createGain();
        gain.gain.value = 0.15;

        whiteNoise.connect(filter).connect(gain).connect(ctx.destination);
        
        lfo.start();
        whiteNoise.start();

        nodes.source = whiteNoise;
        nodes.filter = filter;
        nodes.lfo = lfo;
        nodes.gain = gain;
      }

      soundNodesRef.current = nodes;
      setActiveSound(type);
    } catch (err) {
      console.error("Failed to play soundscape:", err);
    }
  };

  const stopAmbientSound = () => {
    try {
      const nodes = soundNodesRef.current;
      if (nodes) {
        if (nodes.oscL) nodes.oscL.stop();
        if (nodes.oscR) nodes.oscR.stop();
        if (nodes.source) nodes.source.stop();
        if (nodes.lfo) nodes.lfo.stop();
      }
      soundNodesRef.current = {};
      setActiveSound(null);
    } catch (err) {
      console.error("Failed to stop soundscape:", err);
    }
  };

  // Helper for 7-day visual streak heat map
  const getWeeklyStreakData = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateString = d.toLocaleDateString('en-IN');
      const studied = studyHistory.some(log => log.date.includes(dateString.split(',')[0]));
      
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ dayName, dateString: dateString.split(',')[0], studied });
    }
    return days;
  };

  // Dynamic SEO Metadata and Title Manager
  useEffect(() => {
    let title = "PrepCraft AI — Grounded AI Study Companion";
    let metaDesc = "Prepare for NEET, JEE, UPSC, and AP exams with PrepCraft AI's interactive active-recall quizzes and flippable spaced-repetition flashcards.";
    
    if (activeScreen === 'dashboard') {
      title = "Dashboard | PrepCraft AI Study Companion";
    } else if (activeScreen === 'quiz') {
      title = "Quiz Arena | Timed Practice Exam | PrepCraft AI";
    } else if (activeScreen === 'flashcards') {
      title = "Flashcard Deck | Spaced Repetition Review | PrepCraft AI";
    } else if (activeScreen === 'history') {
      title = "Study Logs & Accuracy History | PrepCraft AI";
    } else if (activeScreen === 'guides') {
      if (selectedGuide === 'neet-photosynthesis') {
        title = "Photosynthesis in Higher Plants Revision Notes (Class 11 NCERT) | NEET Prep";
        metaDesc = "Master the Z-scheme, photolysis of water, cyclic photophosphorylation, and the Calvin cycle C3 pathway for NEET Biology. High-yield summary with active-recall quiz.";
      } else if (selectedGuide === 'upsc-fundamental-rights') {
        title = "Fundamental Rights & Preamble Revision Guide (Part III Articles 12-35) | UPSC Polity";
        metaDesc = "UPSC IAS Exam notes on Preamble constitutional status, Articles 12-35, the six categories of rights, Article 32 Writs, and the Basic Structure Doctrine.";
      } else {
        title = "Free Exam-Specific Revision Guides & Study Notes | PrepCraft AI";
        metaDesc = "Read high-yield, SEO-optimized revision notes for NEET Biology and UPSC Indian Polity. Test yourself immediately with built-in timed MCQ practice.";
      }
    }
    
    document.title = title;
    
    // Update meta description
    let metaDescriptionEl = document.querySelector('meta[name="description"]');
    if (!metaDescriptionEl) {
      metaDescriptionEl = document.createElement('meta');
      metaDescriptionEl.setAttribute('name', 'description');
      document.head.appendChild(metaDescriptionEl);
    }
    metaDescriptionEl.setAttribute('content', metaDesc);
  }, [activeScreen, selectedGuide]);

  // 1. Initial Load: Check API Health & Fetch LocalStorage
  useEffect(() => {
    // Check backend health
    fetch(`${API_BASE}/health`)
      .then(res => res.json())
      .then(data => {
        setApiMode(data.apiMode);
      })
      .catch(() => {
        setApiMode('Offline Demo Mode');
      });

    // Load LocalStorage
    const storedHistory = localStorage.getItem('prepcraft_history');
    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);
      setStudyHistory(parsedHistory);
      calculateStats(parsedHistory);
    }
  }, []);

  // Calculate Statistics based on history
  const calculateStats = (history) => {
    const quizLogs = history.filter(item => item.type === 'quiz');
    const flashcardLogs = history.filter(item => item.type === 'flashcard');
    
    const quizzesTaken = quizLogs.length;
    const averageScore = quizzesTaken > 0 
      ? Math.round(quizLogs.reduce((acc, curr) => acc + curr.score, 0) / quizzesTaken * 10) 
      : 0;
      
    // Calculate study streak based on unique days
    const uniqueDays = new Set(history.map(item => item.date.substring(0, 10)));
    const streak = uniqueDays.size;

    setDashboardStats({
      quizzesTaken,
      averageScore,
      cardsReviewed: flashcardLogs.reduce((acc, curr) => acc + curr.cardsCount, 0),
      streak
    });
  };

  // 2. File Upload & Generation Trigger
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const handleGenerate = async (mode) => {
    if (!selectedFile && !inputText.trim()) {
      alert("Please upload a PDF or enter some text notes first.");
      return;
    }

    // Free Tier Usage Limits Check (max 3 uploads/day)
    if (!isPremium) {
      const today = new Date().toDateString();
      const rawUsage = localStorage.getItem('prepcraft_daily_usage') || '{}';
      const usage = JSON.parse(rawUsage);
      
      if (usage[today] >= 3) {
        setShowPaywallModal(true);
        return;
      }
    }

    setIsLoading(true);
    setLoadingStep("Reading your study materials...");
    
    // Simulate steps for smooth visual feedback
    const steps = [
      "Extracting textbook chapters...",
      "Analyzing key formulas & concepts...",
      "Structuring tricky practice assessments...",
      "PrepCraft AI is finalizing your study deck..."
    ];
    
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setLoadingStep(steps[stepIndex]);
        stepIndex++;
      }
    }, 1500);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    } else {
      formData.append('text', inputText);
    }

    try {
      const endpoint = mode === 'quiz' ? 'generate-quiz' : 'generate-flashcards';
      const response = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const result = await response.json();

      // Increment daily usage count for free users
      if (!isPremium) {
        const today = new Date().toDateString();
        const rawUsage = localStorage.getItem('prepcraft_daily_usage') || '{}';
        const usage = JSON.parse(rawUsage);
        usage[today] = (usage[today] || 0) + 1;
        localStorage.setItem('prepcraft_daily_usage', JSON.stringify(usage));
      }

      if (mode === 'quiz') {
        setQuizData(result);
        startQuiz(result);
      } else {
        setFlashcardsData(result);
        startFlashcards(result);
      }

    } catch (error) {
      clearInterval(stepInterval);
      console.error(error);
      alert("Failed to connect to the backend. Please ensure the backend server is running, or check your API configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Quiz Game Loop Functions
  const startQuiz = (quiz) => {
    setQuizData(quiz);
    setSelectedAnswers({});
    setCurrentQuizIndex(0);
    setQuizTimer(0);
    setShowExplanation(false);
    setActiveScreen('quiz');
    
    // Start Timer
    if (quizIntervalId) clearInterval(quizIntervalId);
    const interval = setInterval(() => {
      setQuizTimer(prev => prev + 1);
    }, 1000);
    setQuizIntervalId(interval);
  };

  const handleAnswerSelect = (option) => {
    if (selectedAnswers[currentQuizIndex] !== undefined) return; // Answer already locked
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuizIndex]: option
    });
    setShowExplanation(true);
  };

  const handleNextQuiz = () => {
    setShowExplanation(false);
    if (currentQuizIndex < quizData.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      // Quiz Complete!
      clearInterval(quizIntervalId);
      saveQuizResult();
    }
  };

  const saveQuizResult = () => {
    // Calculate final score
    let correctCount = 0;
    quizData.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answer) correctCount++;
    });

    const scorePercentage = Math.round((correctCount / quizData.length) * 100);
    
    const newLog = {
      id: 'log_' + Date.now(),
      type: 'quiz',
      title: selectedFile ? selectedFile.name.replace('.pdf', '') : 'Raw Text Notes Review',
      score: correctCount,
      total: quizData.length,
      percentage: scorePercentage,
      timeSpent: quizTimer,
      date: new Date().toLocaleString('en-IN')
    };

    const updatedHistory = [newLog, ...studyHistory];
    setStudyHistory(updatedHistory);
    localStorage.setItem('prepcraft_history', JSON.stringify(updatedHistory));
    calculateStats(updatedHistory);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 4. Flashcard Functions
  const startFlashcards = (cards) => {
    setFlashcardsData(cards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCardStats({});
    setActiveScreen('flashcards');
  };

  const handleCardFeedback = (status) => {
    setCardStats({
      ...cardStats,
      [currentCardIndex]: status
    });
    
    if (currentCardIndex < flashcardsData.length - 1) {
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentCardIndex(currentCardIndex + 1);
      }, 300);
    } else {
      // Completed flashcards review
      saveFlashcardResult();
    }
  };

  const saveFlashcardResult = () => {
    const newLog = {
      id: 'log_' + Date.now(),
      type: 'flashcard',
      title: selectedFile ? selectedFile.name.replace('.pdf', '') : 'Raw Text Notes Review',
      cardsCount: flashcardsData.length,
      date: new Date().toLocaleString('en-IN')
    };

    const updatedHistory = [newLog, ...studyHistory];
    setStudyHistory(updatedHistory);
    localStorage.setItem('prepcraft_history', JSON.stringify(updatedHistory));
    calculateStats(updatedHistory);
    alert("🎉 Excellent! You have reviewed all " + flashcardsData.length + " flashcards successfully.");
    setActiveScreen('dashboard');
  };

  return (
    <div className="relative min-h-screen pb-20 overflow-hidden font-sans bg-[#040806] text-[#ecfdf5]">
      {/* Background styling layers */}
      <div className="glow-bg"></div>
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-secondary"></div>
      <div className="glow-orb glow-orb-accent"></div>

      {/* Modern Floating Glassmorphic Navbar */}
      <nav className="sticky top-0 left-0 right-0 z-40 border-b border-[#10b981]/15 bg-white/5 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveScreen('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/5 border border-brand-primary/30 flex items-center justify-center text-brand-primary shadow-lg shadow-brand-primary/25 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-display font-black text-xl tracking-tight text-white">
              PrepCraft <span className="text-brand-primary text-accent-gradient">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveScreen('dashboard')} 
              className={`text-sm font-medium transition-all duration-300 relative py-1 px-2 rounded-lg ${activeScreen === 'dashboard' ? 'text-brand-accent bg-brand-primary/5 font-semibold' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => {
                setActiveScreen('guides');
                setSelectedGuide(null);
              }} 
              className={`text-sm font-medium transition-all duration-300 relative py-1 px-2 rounded-lg ${activeScreen === 'guides' ? 'text-brand-accent bg-brand-primary/5 font-semibold' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}
            >
              Revision Guides
            </button>
            <button 
              onClick={() => setActiveScreen('history')} 
              className={`text-sm font-medium transition-all duration-300 relative py-1 px-2 rounded-lg ${activeScreen === 'history' ? 'text-brand-accent bg-brand-primary/5 font-semibold' : 'text-zinc-300 hover:text-white hover:bg-white/10'}`}
            >
              Study History
            </button>

            {/* Premium / Pro Action Button */}
            {isPremium ? (
              <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-brand-accent/30 bg-brand-accent/10 text-brand-accent text-xs font-semibold font-display shadow-lg shadow-brand-accent/5">
                <Sparkles className="w-3.5 h-3.5" />
                Pro Activated
              </div>
            ) : (
              <button
                onClick={() => setShowPaywallModal(true)}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-full border border-brand-primary/30 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold font-display transition-all duration-300 hover:shadow-lg hover:shadow-brand-primary/20 hover:scale-[1.03] cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Core Dashboard Screen */}
      {activeScreen === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-6 mt-12">
          {/* Welcome Banner */}
          <div className="text-left mb-10 relative">
            <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-primary to-transparent rounded-full"></div>
            <h1 className="text-4xl md:text-5xl font-display font-black mb-3 text-white tracking-tight leading-tight">
              Smarter Prep, <span className="text-brand-primary text-brand-gradient">Guaranteed Score.</span>
            </h1>
            <p className="text-zinc-300 text-base md:text-lg max-w-3xl leading-relaxed font-sans font-light">
              Upload textbook chapters or drop raw lecture notes. Our AI constructs targeted active-recall quizzes and flippable flashcard revisions.
            </p>
          </div>

          {/* Premium Left-Right Split Dashboard Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Stats, Streaks & Study Logs (Metrics & Momentum Hub) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Daily Momentum / Streaks panel */}
              <div className="glass-panel p-6 rounded-[2rem] text-left relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-primary/5 rounded-full filter blur-xl"></div>
                <h4 className="font-display font-black text-xs text-zinc-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-brand-rose animate-pulse" /> Revision Momentum
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-brand-rose/20 transition-all duration-300">
                    <span className="text-[10px] font-mono text-zinc-300 uppercase block tracking-wider">Active Streak</span>
                    <p className="text-2xl font-display font-black text-white mt-1 flex items-baseline gap-1">
                      {dashboardStats.streak} <span className="text-xs text-brand-rose font-bold animate-pulse">Days</span>
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-brand-accent/20 transition-all duration-300">
                    <span className="text-[10px] font-mono text-zinc-300 uppercase block tracking-wider">Sessions</span>
                    <p className="text-2xl font-display font-black text-white mt-1 flex items-baseline gap-1">
                      {dashboardStats.quizzesTaken + (dashboardStats.cardsReviewed > 0 ? 1 : 0)} <span className="text-xs text-brand-accent font-bold">Total</span>
                    </p>
                  </div>
                </div>

                {/* 7-Day Visual Active Streak Grid */}
                <div className="mt-4 border-t border-white/5 pt-4">
                  <span className="text-[10px] font-mono text-zinc-300 uppercase block tracking-wider mb-2.5">Weekly Active Check</span>
                  <div className="flex items-center justify-between gap-1.5 bg-white/5 p-2.5 rounded-2xl border border-white/5">
                    {getWeeklyStreakData().map((day, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1.5 flex-1">
                        <span className="text-[9px] font-mono text-zinc-300 uppercase">{day.dayName}</span>
                        <div 
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-500 ${day.studied ? 'bg-brand-accent/25 border border-brand-accent text-brand-accent shadow-[0_0_10px_rgba(52,211,153,0.3)]' : 'bg-white/5 border border-white/5 text-zinc-300'}`}
                          title={day.dateString}
                        >
                          {day.studied ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-5 rounded-2xl text-left flex items-center justify-between min-h-[110px] hover:border-brand-primary/30 transition-all duration-300 relative group overflow-hidden">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider block">Practice Tests</span>
                    <h3 className="text-3xl font-display font-black text-white mt-2">{dashboardStats.quizzesTaken}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand-primary/5 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0 transition-transform duration-500 group-hover:rotate-6">
                    <Award className="w-5 h-5" />
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl text-left flex items-center justify-between min-h-[110px] hover:border-brand-accent/30 transition-all duration-300 relative group overflow-hidden">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider block">Avg Accuracy</span>
                    <h3 className="text-3xl font-display font-black text-white mt-2">
                      {dashboardStats.quizzesTaken > 0 ? `${dashboardStats.averageScore}` : '0'}<span className="text-xs text-brand-accent font-bold">%</span>
                    </h3>
                  </div>
                  <div className="relative flex items-center justify-center shrink-0">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle cx="24" cy="24" r="19" stroke="rgba(255,255,255,0.03)" strokeWidth="2.5" fill="transparent" />
                      <circle cx="24" cy="24" r="19" stroke="#34d399" strokeWidth="2.5" fill="transparent"
                              strokeDasharray={2 * Math.PI * 19}
                              strokeDashoffset={2 * Math.PI * 19 * (1 - (dashboardStats.quizzesTaken > 0 ? dashboardStats.averageScore : 0) / 100)}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out" />
                    </svg>
                    <Sparkles className="w-3.5 h-3.5 text-brand-accent absolute" />
                  </div>
                </div>
              </div>

              {/* Ambient Soundscape Panel ("Zen Audio Sanctuary") */}
              <div className="glass-panel p-6 rounded-[2rem] text-left relative overflow-hidden animate-float">
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-brand-accent/5 rounded-full filter blur-lg"></div>
                <h4 className="font-display font-bold text-sm text-white mb-3.5 flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-accent animate-pulse" /> Focus Soundscape
                  </span>
                  {activeSound && (
                    <span className="flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[9px] font-mono uppercase font-bold">
                      <span className="playing-bar"></span>
                      <span className="playing-bar"></span>
                      <span className="playing-bar"></span>
                      <span className="playing-bar"></span>
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-zinc-300 font-sans font-light leading-relaxed mb-4">
                  Tune into relaxing soundscapes directly synthesized offline in your browser using pure Web Audio API.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => activeSound === 'binaural' ? stopAmbientSound() : startAmbientSound('binaural')}
                    className={`py-2.5 px-2 rounded-xl text-center border text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer ${activeSound === 'binaural' ? 'bg-brand-accent/15 border-brand-accent text-brand-accent shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]' : 'bg-white/5 border-white/5 text-zinc-300 hover:text-white hover:border-white/10'}`}
                  >
                    🎧 Binaural
                  </button>
                  <button 
                    onClick={() => activeSound === 'rain' ? stopAmbientSound() : startAmbientSound('rain')}
                    className={`py-2.5 px-2 rounded-xl text-center border text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer ${activeSound === 'rain' ? 'bg-brand-accent/15 border-brand-accent text-brand-accent shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]' : 'bg-white/5 border-white/5 text-zinc-300 hover:text-white hover:border-white/10'}`}
                  >
                    🌧️ Rain
                  </button>
                  <button 
                    onClick={() => activeSound === 'forest' ? stopAmbientSound() : startAmbientSound('forest')}
                    className={`py-2.5 px-2 rounded-xl text-center border text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer ${activeSound === 'forest' ? 'bg-brand-accent/15 border-brand-accent text-brand-accent shadow-[0_0_15px_-3px_rgba(52,211,153,0.3)]' : 'bg-white/5 border-white/5 text-zinc-300 hover:text-white hover:border-white/10'}`}
                  >
                    🍃 Wind
                  </button>
                </div>
              </div>

              {/* Detailed Recent Study Logs Database Table */}
              <div className="glass-panel p-6 rounded-[2rem] text-left flex-grow flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-white mb-4 flex items-center justify-between">
                    <span>Recent Activity Log</span>
                    <button onClick={() => setActiveScreen('history')} className="text-xs font-semibold text-brand-primary hover:text-brand-accent hover:underline transition-colors">View All</button>
                  </h4>
                  
                  {studyHistory.length > 0 ? (
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {studyHistory.slice(0, 4).map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-brand-primary/25 rounded-2xl text-xs transition-colors duration-300">
                          <div className="truncate max-w-[170px] pr-2">
                            <p className="font-bold text-white truncate text-xs">{log.title}</p>
                            <p className="text-zinc-300 text-[10px] mt-0.5 font-mono">{log.date.split(',')[0]}</p>
                          </div>
                          {log.type === 'quiz' ? (
                            <span className={`font-bold font-mono px-2 py-1 rounded text-[10px] shrink-0 ${log.percentage >= 70 ? 'bg-brand-accent/10 text-brand-accent' : 'bg-brand-rose/10 text-brand-rose'}`}>
                              {log.score}/{log.total} ({log.percentage}%)
                            </span>
                          ) : (
                            <span className="bg-brand-amber/10 text-brand-amber font-mono font-bold px-2 py-1 rounded text-[10px] shrink-0">
                              {log.cardsCount} Cards
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                      <History className="w-8 h-8 opacity-20 mb-2" />
                      <p className="text-xs font-light">No study records yet. Upload a PDF below!</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: AI Generation Hub (Upload Zone + Text input) */}
            <div className="lg:col-span-7 glass-panel p-8 rounded-[2.5rem] text-left flex flex-col justify-between min-h-[580px] relative overflow-hidden">
              
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/5 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Upload className="w-4 h-4" />
                  </div>
                  <h3 className="font-display font-black text-xl text-white tracking-tight">AI Study Material Core</h3>
                </div>

                {/* Upload drag-and-drop zone */}
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all duration-500 group shadow-inner"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="application/pdf" 
                    className="hidden" 
                  />
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 group-hover:scale-110 group-hover:text-zinc-300 group-hover:border-brand-primary/30 group-hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.2)] transition-all duration-500 mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  
                  {selectedFile ? (
                    <div className="text-center px-4">
                      <p className="font-bold text-white text-sm break-all">{selectedFile.name}</p>
                      <p className="text-xs text-brand-accent mt-1 bg-brand-accent/5 px-3 py-1 rounded-full border border-brand-accent/15 inline-block font-mono">
                        {(selectedFile.size / (1024*1024)).toFixed(2)} MB • Ready
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-bold text-white text-sm">Drag and drop your chapter PDF file here</p>
                      <p className="text-xs text-zinc-300 mt-1.5 font-sans font-light">Supports handouts, textbooks, or notes up to 10MB</p>
                    </div>
                  )}
                </div>

                {/* Text Notes Alternative */}
                <div className="mt-6">
                  <span className="text-xs font-mono text-zinc-300 uppercase tracking-widest block mb-2 font-bold">Or paste your custom notes below</span>
                  <textarea 
                    placeholder="Paste textbook definitions, lecture key notes, or syllabus chapters here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full h-40 bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-brand-primary/40 focus:ring-1 focus:ring-brand-primary/20 transition-all duration-300 font-sans"
                  ></textarea>
                </div>

                {/* Curated Quick-Start Revision Hub launcher */}
                <div className="mt-8 border-t border-white/5 pt-6">
                  <span className="text-xs font-mono text-zinc-300 uppercase tracking-widest block mb-3 font-bold">Quick Start with Curated Prep Notes</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveScreen('guides');
                        setSelectedGuide('neet-photosynthesis');
                      }}
                      className="p-4 bg-white/5 border border-white/5 hover:border-brand-primary/35 rounded-2xl cursor-pointer hover:bg-brand-primary/5 transition-all duration-300 group flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/5 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white group-hover:text-zinc-300 transition-colors">NEET Biology: Photosynthesis</h5>
                        <p className="text-[10px] text-zinc-300 mt-1 font-light font-sans">Z-scheme, photolysis, Calvin cycle.</p>
                      </div>
                    </div>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveScreen('guides');
                        setSelectedGuide('upsc-fundamental-rights');
                      }}
                      className="p-4 bg-white/5 border border-white/5 hover:border-brand-accent/35 rounded-2xl cursor-pointer hover:bg-brand-accent/5 transition-all duration-300 group flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white group-hover:text-brand-accent transition-colors">UPSC Indian Polity: Fundamental Rights</h5>
                        <p className="text-[10px] text-zinc-300 mt-1 font-light font-sans">Articles 12-35, basic structure, writs.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Triggers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                <button 
                  onClick={() => handleGenerate('quiz')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold py-4.5 px-6 rounded-full hover:shadow-[0_0_25px_-3px_rgba(16,185,129,0.4)] hover:scale-[1.01] active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 font-sans text-sm tracking-wide"
                >
                  <Sparkles className="w-4 h-4" /> Generate Practice Exam
                </button>
                <button 
                  onClick={() => handleGenerate('flashcards')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-zinc-800 text-white font-bold py-4.5 px-6 rounded-full hover:bg-white/10 hover:scale-[1.01] active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50 font-sans text-sm tracking-wide"
                >
                  <Layers className="w-4 h-4" /> Generate Flashcards
                </button>
              </div>
            </div>

          </div>

          {/* Seamless AI Loading overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-[#040806]/95 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 animate-fade-in">
              <div className="w-24 h-24 relative flex items-center justify-center mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-brand-primary animate-spin"></div>
                <BookOpen className="w-9 h-9 text-brand-primary animate-pulse" />
              </div>
              <h2 className="text-3xl font-display font-black text-white mb-2 tracking-tight">PrepCraft AI is on the Job...</h2>
              <p className="text-brand-accent font-mono text-xs bg-brand-primary/5 border border-brand-primary/20 px-4 py-1.5 rounded-full uppercase tracking-wider">{loadingStep}</p>
            </div>
          )}
        </main>
      )}

      {/* Screen 2: Quiz Arena Screen */}
      {activeScreen === 'quiz' && quizData.length > 0 && (
        <main className="max-w-4xl mx-auto px-6 mt-12 text-left">
          {/* Header Panel */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to exit the current exam? Your progress will be lost.")) {
                  clearInterval(quizIntervalId);
                  setActiveScreen('dashboard');
                }
              }}
              className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Exit Practice
            </button>

            <div className="flex items-center gap-4">
              <span className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-xs font-mono text-zinc-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-primary" /> {formatTime(quizTimer)}
              </span>
              <span className="bg-brand-primary/5 border border-brand-primary/20 text-brand-primary px-4 py-1.5 rounded-full text-xs font-bold font-mono">
                Q: {currentQuizIndex + 1} / {quizData.length}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-10">
            <div 
              className="h-full bg-brand-primary transition-all duration-300"
              style={{ width: `${((currentQuizIndex) / quizData.length) * 100}%` }}
            ></div>
          </div>

          {/* Active Question Box */}
          <div className="glass-panel p-8 rounded-[2rem] border border-white/5 mb-6 relative">
            <span className="text-xs font-mono text-brand-primary uppercase tracking-widest block mb-3 font-bold">MULTIPLE CHOICE QUESTION</span>
            <h2 className="text-xl md:text-2xl font-medium text-white leading-relaxed font-sans mb-8">
              {quizData[currentQuizIndex].question}
            </h2>

            {/* Options grid */}
            <div className="flex flex-col gap-4">
              {quizData[currentQuizIndex].options.map((option, idx) => {
                const chosen = selectedAnswers[currentQuizIndex];
                const isSelected = chosen === option;
                const isCorrect = option === quizData[currentQuizIndex].answer;
                
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                
                let btnStyle = "bg-white/5 border-white/5 hover:border-brand-primary/40 hover:bg-brand-primary/2.5 text-zinc-300 hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]";
                let badgeStyle = "bg-white/5 text-zinc-300 border-white/5";
                
                if (chosen !== undefined) {
                  if (isSelected) {
                    if (isCorrect) {
                      btnStyle = "bg-brand-accent/10 border-brand-accent text-brand-accent font-bold shadow-[0_0_20px_-3px_rgba(52,211,153,0.25)]";
                      badgeStyle = "bg-brand-accent/20 text-brand-accent border-brand-accent/30 animate-pulse";
                    } else {
                      btnStyle = "bg-brand-rose/10 border-brand-rose text-brand-rose font-bold shadow-[0_0_20px_-3px_rgba(239,68,68,0.25)]";
                      badgeStyle = "bg-brand-rose/20 text-brand-rose border-brand-rose/30";
                    }
                  } else {
                    if (isCorrect) {
                      btnStyle = "bg-brand-accent/5 border-brand-accent/40 text-brand-accent/90 shadow-[0_0_15px_-5px_rgba(52,211,153,0.15)]";
                      badgeStyle = "bg-brand-accent/10 text-brand-accent border-brand-accent/20";
                    } else {
                      btnStyle = "opacity-30 border-white/5 bg-transparent text-zinc-300 scale-[0.98]";
                      badgeStyle = "bg-transparent text-zinc-300 border-white/5";
                    }
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={chosen !== undefined}
                    className={`w-full text-left p-5 rounded-2xl border text-sm flex items-center justify-between transition-all duration-300 active:scale-[0.99] cursor-pointer disabled:cursor-default ${btnStyle}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono font-black shrink-0 ${badgeStyle}`}>
                        {letter}
                      </span>
                      <span>{option}</span>
                    </div>
                    {chosen !== undefined && (
                      <span className="shrink-0 ml-4 animate-scale-in">
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-brand-accent" />}
                        {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-brand-rose" />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Explanation Drawer */}
          {showExplanation && (
            <div className="glass-panel p-6 rounded-3xl border border-brand-primary/20 bg-brand-primary/5 mb-8 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
              <h4 className="font-bold text-white flex items-center gap-2 mb-2 text-sm tracking-wide uppercase font-display">
                <Info className="w-4 h-4 text-brand-primary animate-pulse" /> Step-by-Step Concept Logic
              </h4>
              <p className="text-zinc-300 text-sm leading-relaxed font-sans font-light pl-1">
                {quizData[currentQuizIndex].explanation}
              </p>
            </div>
          )}

          {/* Next Steps Button */}
          {selectedAnswers[currentQuizIndex] !== undefined && (
            <button
              onClick={handleNextQuiz}
              className="w-full py-4.5 bg-white text-black font-bold uppercase tracking-wider text-xs rounded-full hover:bg-brand-accent hover:text-white transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.08)] flex items-center justify-center gap-2 cursor-pointer active:scale-95 hover:scale-[1.005]"
            >
              {currentQuizIndex < quizData.length - 1 ? (
                <>Next Question <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Finish & View Scoreboard <Check className="w-4 h-4" /></>
              )}
            </button>
          )}
        </main>
      )}

      {/* Screen 3: Spaced Repetition Flashcards Screen */}
      {activeScreen === 'flashcards' && flashcardsData.length > 0 && (
        <main className="max-w-4xl mx-auto px-6 mt-12 text-left">
          {/* Header Panel */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to end your flashcards review? Progress will not be saved.")) {
                  setActiveScreen('dashboard');
                }
              }}
              className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors font-medium text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Exit Cards
            </button>

            <span className="bg-brand-amber/10 border border-brand-amber/20 text-brand-amber px-4 py-1.5 rounded-full text-xs font-bold font-mono">
              Card: {currentCardIndex + 1} / {flashcardsData.length}
            </span>
          </div>

          {/* 3D Flippable Flashcard UI Container */}
          <div className="flex items-center justify-center py-8">
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full max-w-xl aspect-[4/3] relative cursor-pointer select-none group"
              style={{ perspective: '1200px' }}
            >
              {/* Card Face container rotating inside 3D space */}
              <div 
                className="w-full h-full relative transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
                style={{ 
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* FRONT FACE (Grounded Emerald Deep Velvet) */}
                <div 
                  className="absolute inset-0 w-full h-full rounded-[2.5rem] border border-[#10b981]/25 bg-gradient-to-br from-[#0c1a14] to-[#040806] shadow-2xl flex flex-col justify-between p-8 overflow-hidden"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 20px 50px rgba(0,0,0,0.5)'
                  }}
                >
                  <div className="absolute -right-12 -top-12 w-32 h-32 bg-[#10b981]/5 rounded-full filter blur-xl"></div>
                  
                  <div className="flex items-center justify-between text-zinc-300 font-mono text-[10px] uppercase tracking-widest relative z-10">
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-brand-primary" /> Active Recall Deck</span>
                    <span className="bg-[#10b981]/10 px-2.5 py-0.5 rounded-full text-brand-primary border border-[#10b981]/20">Concept</span>
                  </div>
                  
                  <div className="flex items-center justify-center flex-grow py-6 text-center relative z-10 px-4">
                    <h3 className="text-xl md:text-2xl font-display font-black text-white leading-relaxed">
                      {flashcardsData[currentCardIndex].front}
                    </h3>
                  </div>

                  <div className="text-center text-xs text-brand-primary/80 animate-pulse font-mono tracking-wider relative z-10">
                    [ Tap card to reveal explanation ]
                  </div>
                </div>

                {/* BACK FACE (Sage Emerald Bright Focus) */}
                <div 
                  className="absolute inset-0 w-full h-full rounded-[2.5rem] border border-[#34d399]/35 bg-gradient-to-br from-[#052b1a] to-[#040806] shadow-2xl flex flex-col justify-between p-8 overflow-hidden"
                  style={{ 
                    backfaceVisibility: 'hidden', 
                    transform: 'rotateY(180deg)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 20px 50px rgba(0,0,0,0.5)'
                  }}
                >
                  <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-[#34d399]/5 rounded-full filter blur-xl"></div>

                  <div className="flex items-center justify-between text-zinc-300 font-mono text-[10px] uppercase tracking-widest relative z-10">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-brand-accent animate-pulse" /> Concept Mastery</span>
                    <span className="bg-[#34d399]/10 px-2.5 py-0.5 rounded-full text-brand-accent border border-[#34d399]/20">Explanation</span>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center flex-grow py-6 text-center relative z-10">
                    <p className="text-sm md:text-base text-zinc-200 font-sans font-light px-4 leading-relaxed max-h-[170px] overflow-y-auto pr-2 custom-scrollbar">
                      {flashcardsData[currentCardIndex].back}
                    </p>
                  </div>

                  <div className="text-center text-xs text-zinc-300 font-mono tracking-wider relative z-10">
                    Rate recall accuracy below
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Card Spaced Repetition Feedback Controller / Reveal Action */}
          {!isFlipped ? (
            <div className="flex flex-col items-center justify-center mt-6 max-w-xl mx-auto animate-fade-in w-full">
              <button 
                onClick={() => setIsFlipped(true)}
                className="w-full py-4 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold uppercase tracking-wider text-xs rounded-full hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.3)] active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4 rotate-180" /> Reveal Answer
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 max-w-xl mx-auto animate-fade-in">
              <button 
                onClick={() => handleCardFeedback('hard')}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-rose/10 border border-brand-rose/30 hover:bg-brand-rose/20 text-brand-rose font-bold text-xs rounded-full active:scale-95 transition-all duration-300 cursor-pointer flex-grow text-center uppercase tracking-wider"
              >
                Hard (Again)
              </button>
              <button 
                onClick={() => handleCardFeedback('medium')}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-amber/10 border border-brand-amber/30 hover:bg-brand-amber/20 text-brand-amber font-bold text-xs rounded-full active:scale-95 transition-all duration-300 cursor-pointer flex-grow text-center uppercase tracking-wider"
              >
                Good (Review)
              </button>
              <button 
                onClick={() => handleCardFeedback('easy')}
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-accent/15 border border-brand-accent/30 hover:bg-brand-accent/25 text-brand-accent font-bold text-xs rounded-full active:scale-95 transition-all duration-300 cursor-pointer flex-grow text-center uppercase tracking-wider shadow-[0_0_15px_-3px_rgba(52,211,153,0.15)]"
              >
                Easy (Got it!)
              </button>
            </div>
          )}

          {/* Explicit Linear Deck Navigation Controls */}
          <div className="flex items-center justify-between mt-8 max-w-xl mx-auto w-full border-t border-white/5 pt-6">
            <button
              onClick={() => {
                if (currentCardIndex > 0) {
                  setIsFlipped(false);
                  setTimeout(() => {
                    setCurrentCardIndex(currentCardIndex - 1);
                  }, 200);
                }
              }}
              disabled={currentCardIndex === 0}
              className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {isFlipped && (
              <button 
                onClick={() => setIsFlipped(false)}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-zinc-300 transition-colors text-xs font-mono"
              >
                [ Hide Answer ]
              </button>
            )}

            <button
              onClick={() => {
                if (currentCardIndex < flashcardsData.length - 1) {
                  setIsFlipped(false);
                  setTimeout(() => {
                    setCurrentCardIndex(currentCardIndex + 1);
                  }, 200);
                } else {
                  saveFlashcardResult();
                }
              }}
              className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider cursor-pointer"
            >
              {currentCardIndex < flashcardsData.length - 1 ? (
                <>Skip <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Finish <Check className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </main>
      )}

      {/* Screen 4: Full Study History Log */}
      {activeScreen === 'history' && (
        <main className="max-w-4xl mx-auto px-6 mt-12 text-left">
          <div className="flex items-center gap-3 mb-8">
            <button 
              onClick={() => setActiveScreen('dashboard')} 
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-display font-black text-white">Full Study Logs</h1>
              <p className="text-zinc-300 text-xs mt-0.5 font-sans">Track your historical performance and test scores</p>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-white/5 min-h-[400px]">
            {studyHistory.length > 0 ? (
              <div className="space-y-4">
                {studyHistory.map((log) => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-zinc-900/50 border border-white/5 rounded-2xl hover:border-white/10 transition-colors gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${log.type === 'quiz' ? 'bg-brand-primary/5 text-brand-primary border border-brand-primary/20' : 'bg-brand-amber/10 text-brand-amber border border-brand-amber/20'}`}>
                        {log.type === 'quiz' ? <Award className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-base truncate max-w-[280px] sm:max-w-[400px]">{log.title}</h4>
                        <div className="flex items-center gap-4 text-zinc-300 text-xs mt-1.5 font-mono">
                          <span>{log.date}</span>
                          <span>•</span>
                          <span className="uppercase font-bold text-zinc-300">{log.type} session</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      {log.type === 'quiz' ? (
                        <div className="text-right">
                          <span className={`text-lg font-black font-display ${log.percentage >= 70 ? 'text-brand-accent' : 'text-brand-rose'}`}>
                            {log.score} / {log.total}
                          </span>
                          <p className="text-zinc-300 text-[10px] font-mono mt-0.5">{log.percentage}% Accuracy</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-brand-amber text-lg font-black font-display">
                            {log.cardsCount}
                          </span>
                          <p className="text-zinc-300 text-[10px] font-mono mt-0.5">Cards studied</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Reset button */}
                <div className="pt-8 text-center">
                  <button 
                    onClick={() => {
                      if(window.confirm("This will permanently clear all your locally saved study records. Are you sure?")) {
                        localStorage.removeItem('prepcraft_history');
                        setStudyHistory([]);
                        calculateStats([]);
                      }
                    }}
                    className="px-6 py-2 bg-brand-rose/10 hover:bg-brand-rose/20 border border-brand-rose/20 text-brand-rose text-xs font-bold rounded-full transition-colors cursor-pointer"
                  >
                    Clear History Database
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-300">
                <History className="w-16 h-16 opacity-10 mb-4" />
                <p className="text-base font-medium">Your study log is completely empty</p>
                <p className="text-zinc-300 text-sm mt-1 max-w-xs text-center">Generate quizzes or flashcard sets in the dashboard to populate your scoreboard.</p>
                <button 
                  onClick={() => setActiveScreen('dashboard')} 
                  className="mt-6 px-6 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-full cursor-pointer hover:shadow-lg hover:shadow-brand-primary/20 transition-all"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Screen 5: Revision Guides SEO Hub */}
      {activeScreen === 'guides' && (
        <main className="max-w-6xl mx-auto px-6 mt-12 text-left">
          {selectedGuide === null ? (
            /* Index List of Revision Guides */
            <div>
              <div className="text-left mb-12">
                <span className="text-xs font-mono text-brand-primary uppercase tracking-widest block mb-2 font-bold font-sans">Academic Revision Hub</span>
                <h1 className="text-3xl md:text-4xl font-display font-black mb-3 text-white">
                  High-Yield Study Guides
                </h1>
                <p className="text-zinc-300 text-base max-w-3xl leading-relaxed">
                  Deep dive into exam-specific chapters curated for competitive examinations. Read the core summaries and instantly convert them into active-recall flashcards or timed practice tests to guarantee retention.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Guide 1: NEET Biology */}
                <div className="glass-panel p-8 rounded-[2rem] flex flex-col justify-between hover:border-brand-primary/20 transition-all duration-300 group">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-brand-primary/5 border border-brand-primary/20 text-brand-primary rounded-full text-xs font-bold font-mono">
                        NEET Biology (NCERT Class 11)
                      </span>
                      <span className="text-zinc-300 text-xs font-mono">6 min read</span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-white group-hover:text-zinc-300 transition-colors mb-3">
                      Photosynthesis in Higher Plants: Light Reactions & Calvin Cycle
                    </h3>
                    <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-sans">
                      Master key high-yield exam concepts: Photolysis of water, PS I/PS II, cyclic vs non-cyclic photophosphorylation, Z-scheme, and the RuBisCO carbon fixation cycle.
                    </p>
                  </div>
                  
                  <div className="border-t border-white/5 pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-300">
                      <span>5 Timed MCQs</span>
                      <span>•</span>
                      <span>12 Active Recall Cards</span>
                    </div>
                    <button 
                      onClick={() => setSelectedGuide('neet-photosynthesis')}
                      className="px-5 py-2 bg-white/5 hover:bg-brand-primary hover:text-white border border-white/10 text-white text-xs font-bold rounded-full transition-all flex items-center gap-1 group-hover:scale-[1.02] cursor-pointer"
                    >
                      Read Study Notes <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Guide 2: UPSC Polity */}
                <div className="glass-panel p-8 rounded-[2rem] flex flex-col justify-between hover:border-brand-accent/20 transition-all duration-300 group">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-full text-xs font-bold font-mono">
                        UPSC Indian Polity (Part III)
                      </span>
                      <span className="text-zinc-300 text-xs font-mono">8 min read</span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-white group-hover:text-brand-accent transition-colors mb-3">
                      The Preamble & Fundamental Rights (Articles 12 to 35)
                    </h3>
                    <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-sans">
                      Master core constitutional mechanics: Basic Structure Doctrine, Article 13 Judicial Review, six groupings of liberties, Article 32 Writs, and key amendments.
                    </p>
                  </div>
                  
                  <div className="border-t border-white/5 pt-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs font-mono text-zinc-300">
                      <span>5 Timed MCQs</span>
                      <span>•</span>
                      <span>12 Active Recall Cards</span>
                    </div>
                    <button 
                      onClick={() => setSelectedGuide('upsc-fundamental-rights')}
                      className="px-5 py-2 bg-white/5 hover:bg-brand-accent hover:text-white border border-white/10 text-white text-xs font-bold rounded-full transition-all flex items-center gap-1 group-hover:scale-[1.02] cursor-pointer"
                    >
                      Read Study Notes <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Individual Guide Detail View */
            <div>
              {/* Breadcrumbs & Back Nav */}
              <div className="flex items-center gap-2 mb-6">
                <button 
                  onClick={() => setSelectedGuide(null)}
                  className="flex items-center gap-1 text-zinc-300 hover:text-white text-xs font-medium font-sans transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Revision Hub
                </button>
                <span className="text-zinc-300 text-xs font-mono">/</span>
                <span className="text-zinc-300 text-xs font-mono truncate max-w-[200px]">
                  {selectedGuide === 'neet-photosynthesis' ? 'Photosynthesis NEET Prep' : 'Constitutional Core UPSC'}
                </span>
              </div>

              {selectedGuide === 'neet-photosynthesis' ? (
                /* NEET BIOLOGY STUDY NOTES */
                <article className="glass-panel p-8 md:p-12 rounded-[2.5rem] border border-brand-primary/10 relative overflow-hidden">
                  <header className="border-b border-brand-primary/10 pb-8 mb-8 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-brand-primary/5 border border-brand-primary/20 text-brand-primary rounded-full text-xs font-bold font-mono">NEET Biology Class 11</span>
                      <span className="text-zinc-300 text-xs font-mono">NCERT Syllabus Chapter 13</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-4 leading-tight">
                      Photosynthesis in Higher Plants: Essential Light Reactions & Calvin Cycle
                    </h1>
                    <p className="text-zinc-300 text-base leading-relaxed font-sans font-light">
                      High-yield revision notes covering the photochemical and biosynthetic phases of carbon fixation, structured to target key competitive assessment patterns.
                    </p>
                  </header>

                  {/* Main Text Content */}
                  <div className="prose prose-invert max-w-none text-zinc-300 max-w-none text-zinc-300 space-y-6 font-sans text-sm md:text-base leading-relaxed font-light">
                    <h2 className="text-xl font-display font-bold text-white mt-8 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-brand-primary rounded-full"></span>
                      1. The Photochemical Phase (Light Reactions)
                    </h2>
                    <p>
                      The light reactions take place directly within the membranous <strong>thylakoids</strong> of the chloroplasts, where light energy is absorbed by pigment systems organized into Light Harvesting Complexes (LHC) within <strong>Photosystem I (PS I)</strong> and <strong>Photosystem II (PS II)</strong>.
                    </p>
                    
                    <div className="bg-brand-primary/5 border border-brand-primary/15 rounded-2xl p-6 my-4 text-left relative overflow-hidden backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
                      <h4 className="font-display font-bold text-white text-sm mb-2 flex items-center gap-1.5"><Info className="w-4 h-4 text-brand-accent animate-pulse" /> Key Mechanism: Photolysis of Water</h4>
                      <p className="text-zinc-300 text-sm leading-relaxed font-sans font-light">
                        Photolysis (water splitting) is associated physically with PS II on the inner side of the thylakoid membrane. Splitting water provides critical replacement electrons for the excited P680 reaction center:
                      </p>
                      <code className="block bg-black/40 border border-brand-primary/15 text-brand-accent p-3.5 rounded-xl font-mono text-center text-xs mt-3.5 shadow-inner">
                        2H₂O &rarr; 4H⁺ + O₂ + 4e⁻
                      </code>
                    </div>

                    <p>
                      Electrons excited in PS II traverse a series of cytochrome acceptors (the Electron Transport Chain or the Z-Scheme) down to PS I, driving protons across the membrane to construct a gradient. This proton gradient activates the ATP Synthase enzyme, building ATP while NADP⁺ is reduced to NADPH by the stroma-exposed NADP Reductase.
                    </p>

                    <h3 className="text-base font-display font-bold text-white mt-6 mb-2">Cyclic vs Non-Cyclic Photophosphorylation</h3>
                    <div className="overflow-x-auto my-4 border border-brand-primary/10 rounded-2xl bg-black/15 shadow-inner">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-brand-primary/15 text-brand-accent/80 font-mono text-[10px] uppercase tracking-wider font-black bg-brand-primary/5">
                            <th className="py-4 px-5">Feature</th>
                            <th className="py-4 px-5">Non-Cyclic (Z-Scheme)</th>
                            <th className="py-4 px-5">Cyclic Path</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-primary/10 text-zinc-300">
                          <tr className="hover:bg-brand-primary/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Photosystems Active</td>
                            <td className="py-3.5 px-5">Both PS I (P700) and PS II (P680)</td>
                            <td className="py-3.5 px-5">PS I only</td>
                          </tr>
                          <tr className="hover:bg-brand-primary/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Synthesis Products</td>
                            <td className="py-3.5 px-5 text-brand-accent font-semibold">Both ATP and NADPH</td>
                            <td className="py-3.5 px-5 text-brand-amber font-semibold">ATP only (No NADPH)</td>
                          </tr>
                          <tr className="hover:bg-brand-primary/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Photolysis (Water Splitting)</td>
                            <td className="py-3.5 px-5 text-brand-accent font-semibold">Yes (Oxygen is released)</td>
                            <td className="py-3.5 px-5 text-zinc-300 font-light">No (No Oxygen released)</td>
                          </tr>
                          <tr className="hover:bg-brand-primary/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Location</td>
                            <td className="py-3.5 px-5">Appressed Grana Thylakoids</td>
                            <td className="py-3.5 px-5">Stroma Lamellae (lacks PS II & Reductase)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h2 className="text-xl font-display font-bold text-white mt-8 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-brand-primary rounded-full"></span>
                      2. The Biosynthetic Phase (Calvin C3 Cycle)
                    </h2>
                    <p>
                      The dark reactions occur inside the liquid chloroplast <strong>stroma</strong> and do not require direct light, but depend entirely on the light reaction products (ATP and NADPH) to assimilate CO₂ into hexose glucose sugars.
                    </p>
                    
                    <p>
                      The Calvin Cycle proceeds in three continuous enzymatic phases:
                    </p>
                    <ul className="space-y-4 text-zinc-300 font-sans font-light">
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Carboxylation:</strong> The most crucial stage. One carbon dioxide molecule is attached to a 5-carbon acceptor sugar, <strong className="text-white font-semibold">Ribulose-1,5-bisphosphate (RuBP)</strong>, to generate two molecules of <strong className="text-white font-semibold">3-Phosphoglyceric acid (3-PGA)</strong>. This carboxylation is catalyzed by the enzyme <strong className="text-white font-semibold">RuBisCO</strong> (Ribulose bisphosphate carboxylase-oxygenase).</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Reduction:</strong> Energy-intensive step. Two molecules of ATP are phosphorylated and two NADPH are oxidized per CO₂ fixed to reduce 3-PGA into triose phosphate (sugar precursors).</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-primary shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Regeneration:</strong> Reconstitution of the initial CO₂ acceptor RuBP so the cycle can proceed. Requires exactly 1 ATP per turn.</span>
                      </li>
                    </ul>

                    <div className="bg-brand-rose/5 border border-brand-rose/15 rounded-2xl p-6 my-4 text-left relative overflow-hidden backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-rose"></div>
                      <h4 className="font-display font-bold text-brand-rose text-sm mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 animate-pulse" /> Crucial High-Yield Numerical Cost</h4>
                      <p className="text-zinc-300 text-sm leading-relaxed font-sans font-light">
                        To synthesize exactly <strong className="text-white font-semibold">one single molecule of Glucose</strong>, the plant must fix 6 CO₂ molecules, requiring 6 turns of the Calvin cycle.
                      </p>
                      <p className="text-white font-black text-sm mt-3.5 font-sans bg-brand-rose/10 border border-brand-rose/25 py-2 px-4 rounded-xl inline-block">
                        Total net chemical expenditure = 18 ATP + 12 NADPH.
                      </p>
                    </div>

                    <p>
                      <strong>The Photorespiration Bottleneck:</strong> RuBisCO can bind O₂ when carbon dioxide is scarce, entering the wasteful <i>Photorespiration (C2 Cycle)</i>, which generates no sugar and drains ATP. Advanced C4 plants (like maize and sorghum) avoid this via <strong>Kranz Anatomy</strong>, confining RuBisCO inside bundle-sheath cells and initially fixing carbon in mesophyll cells via PEP Carboxylase.
                    </p>
                  </div>
                </article>
              ) : (
                /* UPSC POLITY STUDY NOTES */
                <article className="glass-panel p-8 md:p-12 rounded-[2.5rem] border border-brand-accent/10 relative overflow-hidden">
                  <header className="border-b border-brand-accent/10 pb-8 mb-8 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 text-brand-accent rounded-full text-xs font-bold font-mono">UPSC Indian Polity</span>
                      <span className="text-zinc-300 text-xs font-mono font-bold">M. Laxmikanth Reference</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-4 leading-tight">
                      The Preamble & Fundamental Rights (Part III Articles 12-35)
                    </h1>
                    <p className="text-zinc-300 text-base leading-relaxed font-sans font-light">
                      High-yield revision notes detailing Part III of the Indian Constitution, judicial reviews, writtable remedies, and crucial Supreme Court judgements.
                    </p>
                  </header>

                  {/* Main Text Content */}
                  <div className="prose prose-invert max-w-none text-zinc-300 max-w-none text-zinc-300 space-y-6 font-sans text-sm md:text-base leading-relaxed font-light">
                    <h2 className="text-xl font-display font-bold text-white mt-8 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-brand-accent rounded-full"></span>
                      1. The Preamble: Constitutional Status
                    </h2>
                    <p>
                      The <strong>Preamble</strong> acts as the preface or introduction to the Constitution of India. It outlines the core philosophy: establishing India as a <strong>Sovereign, Socialist, Secular, Democratic Republic</strong>, and securing Justice, Liberty, Equality, and Fraternity for all citizens.
                    </p>
                    
                    <div className="bg-brand-accent/5 border border-brand-accent/15 rounded-2xl p-6 my-4 text-left relative overflow-hidden backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent"></div>
                      <h4 className="font-display font-bold text-white text-sm mb-2 flex items-center gap-1.5"><Info className="w-4 h-4 text-brand-accent animate-pulse" /> Key Precedent: Basic Structure Doctrine</h4>
                      <p className="text-zinc-300 text-sm leading-relaxed font-sans font-light">
                        In the historic <strong className="text-white font-semibold">Kesavananda Bharati case (1973)</strong>, the Supreme Court ruled that:
                      </p>
                      <ul className="space-y-2 mt-3.5 text-xs text-zinc-300 font-sans font-light">
                        <li className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0 mt-1.5"></span>
                          <span>The Preamble is an integral, constituent part of the Indian Constitution.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-accent shrink-0 mt-1.5"></span>
                          <span>It can be amended under Article 368, but the Parliament cannot destroy its <strong className="text-white font-semibold">Basic Structure</strong> (secularism, federalism, judicial review).</span>
                        </li>
                      </ul>
                    </div>

                    <h2 className="text-xl font-display font-bold text-white mt-8 flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-brand-accent rounded-full"></span>
                      2. Fundamental Rights (Articles 12 to 35)
                    </h2>
                    <p>
                      Codified in <strong>Part III</strong> of the Constitution, Fundamental Rights represent the Magna Carta of Indian democracy. They protect civil liberties against arbitrary legislative or executive state encroachment.
                    </p>

                    <h3 className="text-base font-display font-bold text-white mt-6 mb-2">The Six Categories of Guaranteed Rights</h3>
                    <div className="overflow-x-auto my-4 border border-brand-accent/10 rounded-2xl bg-black/15 shadow-inner">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b border-brand-accent/15 text-brand-accent/80 font-mono text-[10px] uppercase tracking-wider font-black bg-brand-accent/5">
                            <th className="py-4 px-5">Right Group</th>
                            <th className="py-4 px-5">Articles</th>
                            <th className="py-4 px-5">Key Core Concepts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-accent/10 text-zinc-300">
                          <tr className="hover:bg-brand-accent/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Right to Equality</td>
                            <td className="py-3.5 px-5 text-brand-accent font-semibold">14 - 18</td>
                            <td className="py-3.5 px-5">Equality before law (Art 14), Abolition of Untouchability (Art 17).</td>
                          </tr>
                          <tr className="hover:bg-brand-accent/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Right to Freedom</td>
                            <td className="py-3.5 px-5 text-brand-accent font-semibold">19 - 22</td>
                            <td className="py-3.5 px-5">Life & Liberty (Art 21), Right to Education (Art 21A for ages 6-14).</td>
                          </tr>
                          <tr className="hover:bg-brand-accent/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Against Exploitation</td>
                            <td className="py-3.5 px-5 text-brand-accent font-semibold">23 - 24</td>
                            <td className="py-3.5 px-5">Prohibiting human trafficking (Art 23) and factory child labor (Art 24).</td>
                          </tr>
                          <tr className="hover:bg-brand-accent/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Freedom of Religion</td>
                            <td className="py-3.5 px-5 text-brand-accent font-semibold">25 - 28</td>
                            <td className="py-3.5 px-5">Freedom of conscience, profession, and management of religious affairs.</td>
                          </tr>
                          <tr className="hover:bg-brand-accent/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Minority Education</td>
                            <td className="py-3.5 px-5 text-brand-accent font-semibold">29 - 30</td>
                            <td className="py-3.5 px-5">Protection of minority language, script, and right to run schools.</td>
                          </tr>
                          <tr className="hover:bg-brand-accent/2 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-white font-sans">Constitutional Remedies</td>
                            <td className="py-3.5 px-5 text-brand-accent font-black">32</td>
                            <td className="py-3.5 px-5 font-medium">Writ remedies in the Supreme Court. Dr. Ambedkar called it the 'Soul' of Part III.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h4 className="font-display font-bold text-white text-base mt-6">Judicial Review & Article 13</h4>
                    <p>
                      <strong>Article 13</strong> states that any law (statute, custom, or decree) inconsistent with the Fundamental Rights shall be declared null and void. It serves as the constitutional anchor of Judicial Review, empowering the High Courts (Article 226) and Supreme Court (Article 32) to strike down unconstitutional laws.
                    </p>

                    <div className="bg-brand-rose/5 border border-brand-rose/15 rounded-2xl p-6 my-4 text-left relative overflow-hidden backdrop-blur-sm">
                      <div className="absolute top-0 left-0 w-1 h-full bg-brand-rose"></div>
                      <h4 className="font-display font-bold text-brand-rose text-sm mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 animate-pulse" /> Highly Significant UPSC Prelims Fact</h4>
                      <p className="text-zinc-300 text-sm leading-relaxed font-sans font-light">
                        Under the <strong className="text-white font-semibold">44th Constitutional Amendment of 1978</strong>, the Fundamental Rights guaranteed under <strong className="text-white font-semibold">Articles 20 and 21 cannot be suspended</strong> even during a National Emergency declared under Article 352.
                      </p>
                    </div>

                    <h4 className="font-display font-bold text-white text-base mt-6">Constitutional Remedies via Article 32 Writs</h4>
                    <p>
                      Article 32 provides an immediate right to petition the Supreme Court. The court can issue 5 specific writs:
                    </p>
                    <ul className="space-y-4 text-zinc-300 font-sans font-light">
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Habeas Corpus:</strong> 'To have the body of'. Issued against illegal detention. Can be targeted at both public officials and private individuals.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Mandamus:</strong> 'We Command'. Orders a public official to perform their neglected statutory duty.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Prohibition:</strong> Issued by a higher court to prevent a lower court or tribunal from exceeding its jurisdiction.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Certiorari:</strong> 'To be certified'. Issued to quash an erroneous order already passed by a lower court.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-brand-accent shrink-0 mt-2"></span>
                        <span><strong className="text-white font-semibold">Quo-Warranto:</strong> 'By what authority?'. Challenges a person's legal claim to a public office.</span>
                      </li>
                    </ul>
                  </div>
                </article>
              )}

              {/* HIGH-CONVERTING ACTIVE RECALL CTA BLOCK */}
              <section className="mt-12 bg-gradient-to-r from-brand-primary/10 to-brand-accent/15 border border-brand-primary/30 p-8 md:p-12 rounded-[2.5rem] text-center animate-fade-in shadow-xl shadow-brand-primary/5">
                <div className="w-16 h-16 rounded-3xl bg-brand-primary/5 border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto mb-6">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-display font-black text-white mb-3">
                  Test Your Active Recall Instantly!
                </h3>
                <p className="text-zinc-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-8 font-sans">
                  Passive reading gives you the <strong className="text-white font-semibold">"illusion of competence"</strong>—you feel like you know it, but your brain fails to retrieve it under exam pressure. Force active retrieval right now using our timed MCQ Quiz Arena and flashcards.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
                  <button 
                    onClick={async () => {
                      const notes = selectedGuide === 'neet-photosynthesis' ? PHOTOSYNTHESIS_NOTES : FUNDAMENTAL_RIGHTS_NOTES;
                      const title = selectedGuide === 'neet-photosynthesis' 
                        ? 'Photosynthesis (NCERT Class 11)' 
                        : 'Preamble & Fundamental Rights (UPSC)';
                      
                      setInputText(notes);
                      setSelectedFile({ name: `${title}.pdf` }); // Mock PDF details for scoring logs
                      
                      setIsLoading(true);
                      setLoadingStep("Reading article notes...");
                      
                      // Simulate short delay for aesthetic loading feel
                      setTimeout(async () => {
                        try {
                          const response = await fetch(`${API_BASE}/generate-quiz`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: notes })
                          });
                          
                          if (!response.ok) throw new Error("API failed");
                          
                          const result = await response.json();
                          setQuizData(result);
                          startQuiz(result);
                        } catch (err) {
                          console.error(err);
                          alert("Failed to connect to the backend. Please check server.");
                        } finally {
                          setIsLoading(false);
                        }
                      }, 1000);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand-primary text-white font-bold py-4 px-8 rounded-full hover:shadow-lg hover:shadow-brand-primary/30 hover:scale-[1.01] transition-all cursor-pointer font-sans"
                  >
                    <Sparkles className="w-4 h-4" /> Start Timed MCQ Quiz
                  </button>

                  <button 
                    onClick={async () => {
                      const notes = selectedGuide === 'neet-photosynthesis' ? PHOTOSYNTHESIS_NOTES : FUNDAMENTAL_RIGHTS_NOTES;
                      const title = selectedGuide === 'neet-photosynthesis' 
                        ? 'Photosynthesis (NCERT Class 11)' 
                        : 'Preamble & Fundamental Rights (UPSC)';
                      
                      setInputText(notes);
                      setSelectedFile({ name: `${title}.pdf` });
                      
                      setIsLoading(true);
                      setLoadingStep("Formulating active recall cards...");
                      
                      setTimeout(async () => {
                        try {
                          const response = await fetch(`${API_BASE}/generate-flashcards`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: notes })
                          });
                          
                          if (!response.ok) throw new Error("API failed");
                          
                          const result = await response.json();
                          setFlashcardsData(result);
                          startFlashcards(result);
                        } catch (err) {
                          console.error(err);
                          alert("Failed to connect to the backend. Please check server.");
                        } finally {
                          setIsLoading(false);
                        }
                      }, 1000);
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-zinc-800 text-white font-bold py-4 px-8 rounded-full hover:bg-white/10 transition-all cursor-pointer font-sans"
                  >
                    <Layers className="w-4 h-4" /> Study Spaced Flashcards
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      )}

      {/* Sleek Glassmorphic Premium Upgrade Modal */}
      {showPaywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-300 animate-fade-in">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-brand-primary/30 bg-[#08120c]/95 p-8 md:p-10 shadow-2xl shadow-brand-primary/10 font-sans">
            
            {/* Glowing background highlights */}
            <div className="absolute -right-24 -top-24 w-48 h-48 rounded-full bg-brand-primary/10 blur-[80px]"></div>
            <div className="absolute -left-24 -bottom-24 w-48 h-48 rounded-full bg-brand-accent/10 blur-[80px]"></div>

            {/* Close button */}
            <button 
              onClick={() => setShowPaywallModal(false)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              disabled={isProcessingPayment}
            >
              <span className="text-xl font-light">&times;</span>
            </button>

            {/* Modal Header */}
            <div className="text-center mb-8 relative">
              <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto mb-4 animate-bounce">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-display font-black text-white tracking-tight leading-tight mb-2">
                Unlock Premium <span className="text-brand-primary text-accent-gradient">Active Recall</span>
              </h2>
              <p className="text-zinc-400 text-sm md:text-base max-w-md mx-auto">
                Break the forgetting curve. Get unlimited custom exams, active-recall revision flashcards, and fully detailed answers.
              </p>
            </div>

            {/* Premium Benefits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Unlimited PDF Uploads</h4>
                  <p className="text-zinc-400 text-xs mt-0.5">Parse massive textbooks and lecture notes with no daily limits.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Timed Practice Arena</h4>
                  <p className="text-zinc-400 text-xs mt-0.5">Simulate competitive mock tests with exact time-limits & scoring.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Detailed Score History</h4>
                  <p className="text-zinc-400 text-xs mt-0.5">Track your accuracy improvements across NEET/UPSC exam parameters.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 transition-all">
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary shrink-0">
                  <Flame className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm">Expert Spaced-Repetition</h4>
                  <p className="text-zinc-400 text-xs mt-0.5">Advanced memory scoring filters (Hard/Good/Easy) to build perfect retention.</p>
                </div>
              </div>
            </div>

            {/* Pricing Tiers & Checkout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              
              {/* Monthly Card */}
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/2 p-6 flex flex-col justify-between hover:border-brand-primary/20 transition-all">
                <div>
                  <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Standard Focus</span>
                  <h3 className="text-2xl font-bold text-white mt-1">Monthly</h3>
                  <p className="text-zinc-400 text-xs mt-1">Ideal for short-term exam cycles</p>
                  <div className="mt-4 flex items-baseline text-white">
                    <span className="text-4xl font-extrabold tracking-tight">₹99</span>
                    <span className="ml-1 text-zinc-400 text-sm font-semibold">/month</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePayment('monthly')}
                  disabled={isProcessingPayment}
                  className="w-full mt-6 py-3 px-4 rounded-full bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-center"
                >
                  {isProcessingPayment ? "Processing..." : "Subscribe Monthly"}
                </button>
              </div>

              {/* Yearly Card (Best Value) */}
              <div className="relative overflow-hidden rounded-[2rem] border-2 border-brand-primary bg-brand-primary/5 p-6 flex flex-col justify-between hover:shadow-lg hover:shadow-brand-primary/5 transition-all">
                <div className="absolute top-0 right-0 bg-brand-primary text-black font-extrabold text-[10px] tracking-wider uppercase py-1 px-3 rounded-bl-2xl">
                  Best Value
                </div>
                <div>
                  <span className="text-brand-primary text-xs uppercase tracking-wider font-bold">UPSC / NEET Elite</span>
                  <h3 className="text-2xl font-bold text-white mt-1">Yearly Ace</h3>
                  <p className="text-zinc-300 text-xs mt-1">Perfect for persistent aspirants</p>
                  <div className="mt-4 flex items-baseline text-white">
                    <span className="text-4xl font-extrabold tracking-tight">₹799</span>
                    <span className="ml-1 text-zinc-400 text-sm font-semibold">/year</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePayment('yearly')}
                  disabled={isProcessingPayment}
                  className="w-full mt-6 py-3 px-4 rounded-full bg-brand-primary text-black font-extrabold text-sm hover:shadow-lg hover:shadow-brand-primary/20 hover:scale-[1.01] transition-all cursor-pointer text-center"
                >
                  {isProcessingPayment ? "Processing..." : "Subscribe Yearly"}
                </button>
              </div>
            </div>

            {/* Secure Footer */}
            <div className="text-center mt-6 text-[10px] text-zinc-500 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
              Secure UPI & Card checkout processed via Razorpay Test Mode
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
