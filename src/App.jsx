import React, { useState, useEffect, useRef } from 'react';
import InstallButton from "./components/InstallButton";
import {
  HeartPulse,
  Languages,
  Bell,
  Glasses,
  ShieldCheck,
  User,
  Moon,
  Shield,
  FileText,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Clock,
  BarChart2,
  Users,
  Info,
  Mail,
  Smartphone,
  Mic,
  Plus,
  AlertTriangle,
  Trash2,
  MoreVertical,
  Check,
  AlertCircle,
  CheckCircle,
  XCircle,
  ShieldAlert,
  X,
  MessageCircle,
  Bot,
  Send,
  Phone
} from 'lucide-react';
import { translations } from './i18n';

const defaultState = {
  user: null,
  medicines: [],
  history: [],
  contacts: [],
  settings: {
    language: 'en',
    elderlyMode: false,
    caregiverMode: false,
    theme: 'light',
    isListening: false
  }
};

function App() {
  // --- Global State ---
  const [state, setState] = useState(() => {
    return JSON.parse(localStorage.getItem('dawasetu_state')) || defaultState;
  });

  const [currentView, setCurrentView] = useState(() => {
    return state.user ? 'dashboard' : 'auth';
  });

  // --- UI Interactivity States ---
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [activeMedMenu, setActiveMedMenu] = useState(null); // stores medId
  const [showContactModal, setShowContactModal] = useState(false);
  
  // --- Chat widget states ---
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your DawaSetu health assistant. You can type or use voice to ask me about your medicines.'
    }
  ]);
  const [isListeningChat, setIsListeningChat] = useState(false);

  // --- Voice Assistant states ---
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('Waiting for your voice command...');
  const recognitionRef = useRef(null);

  // --- Navigation & Filters ---
  const [historyFilter, setHistoryFilter] = useState('all');

  // --- Sync State to LocalStorage ---
  const saveState = (updatedState) => {
    localStorage.setItem('dawasetu_state', JSON.stringify(updatedState));
  };

  // --- Apply Settings (Theme & Elderly Mode) ---
  useEffect(() => {
    if (state.settings.theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    saveState(state);
  }, [state.settings.theme]);

  useEffect(() => {
    if (state.settings.elderlyMode) {
      document.body.classList.add('elderly-mode');
    } else {
      document.body.classList.remove('elderly-mode');
    }
    saveState(state);
  }, [state.settings.elderlyMode]);

  useEffect(() => {
    saveState(state);
  }, [state.user, state.medicines, state.history, state.contacts, state.settings.caregiverMode, state.settings.language]);

  // --- Document-wide click listeners for menus ---
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowProfileMenu(false);
      setShowLangMenu(false);
      setActiveMedMenu(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // --- Translations Helper ---
  const t = (key, medName) => {
    const lang = state.settings.language;
    const dict = translations[lang] || translations['en'];
    let text = dict[key] || translations['en'][key] || key;
    if (medName) {
      text = text.replace('{med}', medName);
    }
    return text;
  };

  // --- Translation Sync (Google Translate Dropdown) ---
  const handleLanguageChange = (lang) => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        language: lang
      }
    }));
    
    // Trigger Google Translate dropdown
    const googleSelect = document.querySelector('.goog-te-combo');
    if (googleSelect) {
      googleSelect.value = lang;
      googleSelect.dispatchEvent(new Event('change'));
    }
    setShowLangMenu(false);
  };

  // --- Settings Toggles ---
  const toggleTheme = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        theme: prev.settings.theme === 'dark' ? 'light' : 'dark'
      }
    }));
  };

  const toggleElderlyMode = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        elderlyMode: !prev.settings.elderlyMode
      }
    }));
  };

  const toggleCaregiverMode = () => {
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        caregiverMode: !prev.settings.caregiverMode
      }
    }));
  };

  // --- Auth Handlers ---
  const handleLoginAsGuest = () => {
    const guestId = Math.floor(1000 + Math.random() * 9000);
    const currentLanguage = state.settings ? state.settings.language : 'en';
    const currentTheme = state.settings ? state.settings.theme : 'light';
    
    const newState = {
      user: `Guest_${guestId}`,
      medicines: [],
      history: [],
      contacts: [],
      settings: {
        language: currentLanguage,
        elderlyMode: false,
        caregiverMode: false,
        isListening: false,
        theme: currentTheme
      }
    };
    
    setState(newState);
    saveState(newState);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setState(prev => {
      const newState = { ...prev, user: null };
      saveState(newState);
      return newState;
    });
    setCurrentView('auth');
  };

  // --- Greeting Selector ---
  const getGreetingText = () => {
    const hour = new Date().getHours();
    let key = 'good_morning';
    if (hour >= 12 && hour < 17) key = 'good_afternoon';
    else if (hour >= 17) key = 'good_evening';
    return t(key);
  };

  // --- Smart Miss Detection & Emotional Message ---
  const getConsecutiveMisses = () => {
    let consecutiveMisses = 0;
    const sortedHistory = [...state.history].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    for (const record of sortedHistory) {
      if (record.status === 'missed') {
        consecutiveMisses++;
      } else if (record.status === 'taken') {
        break;
      }
    }
    return consecutiveMisses;
  };

  const renderEmotionalMsg = () => {
    const misses = getConsecutiveMisses();
    if (misses === 0) {
      return <p className="supportive-text success-text">{t('emotional_perfect')}</p>;
    } else if (misses === 1) {
      return <p className="supportive-text warning-text">{t('emotional_track')}</p>;
    } else {
      return <p className="supportive-text danger-text">{t('emotional_attention')}</p>;
    }
  };

  // --- Adherence score ---
  const getAdherenceScore = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayHistory = state.history.filter(h => h.date === todayStr);
    const totalScheduledToday = state.medicines.length; // MVP scheduled today is just all medicines
    
    if (totalScheduledToday === 0 || todayHistory.length === 0) {
      return 0;
    }
    
    const takenToday = todayHistory.filter(h => h.status === 'taken').length;
    const percentage = Math.round((takenToday / totalScheduledToday) * 100);
    return Math.min(percentage, 100);
  };

  // --- Heatmap mini renderer ---
  const renderHeatmapDots = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentDayNum = now.getDay();
    const diffToMonday = now.getDate() - currentDayNum + (currentDayNum === 0 ? -6 : 1);
    const mondayDate = new Date(new Date(now).setDate(diffToMonday));
    
    const reorderedDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    return reorderedDays.map((dayLabel, i) => {
      const d = new Date(mondayDate);
      d.setDate(mondayDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      
      const dayHistory = state.history.filter(h => h.date === dateStr);
      let status = 'pending';
      if (dayHistory.length > 0) {
        const hasMissed = dayHistory.some(h => h.status === 'missed');
        status = hasMissed ? 'missed' : 'taken';
      }
      
      return (
        <div key={i} className={`heatmap-day-wrapper ${isToday ? 'today-highlight' : ''}`} style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
          <div 
            className={`heatmap-dot ${status}`} 
            title={dateStr}
            style={isToday ? { border: '2px solid var(--primary)', transform: 'scale(1.2)' } : {}}
          />
          <span style={{fontSize: '10px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--primary)' : '#94A3B8'}}>
            {dayLabel}
          </span>
        </div>
      );
    });
  };

  // --- Medicine Handlers ---
  const getTimeWindowStatus = (timing) => {
    const hour = new Date().getHours();
    let expectedHour = 8;
    if (timing === 'Afternoon') expectedHour = 13;
    if (timing === 'Evening') expectedHour = 20;

    const diff = hour - expectedHour;
    if (diff < -1) return 'status-pending';
    if (diff >= -1 && diff <= 1) return 'status-on-time';
    if (diff > 1 && diff <= 3) return 'status-near-miss';
    return 'status-missed';
  };

  const handleAddMedicineSubmit = (e) => {
    e.preventDefault();
    const name = e.target['med-name'].value;
    const dosageVal = e.target['med-dosage'].value;
    const dosageType = e.target['med-dosage-type'].value;
    const timing = e.target['med-timing'].value;
    const frequency = e.target['med-frequency'].value;
    const startDate = e.target['med-start-date'].value;
    const endDate = e.target['med-end-date'].value;
    const critical = e.target['med-critical'].checked;
    
    const formattedDosage = `${dosageVal} ${dosageType}`;
    
    const newMed = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      dosage: formattedDosage,
      timing,
      frequency,
      startDate,
      endDate,
      critical,
      createdAt: new Date().toISOString()
    };
    
    setState(prev => ({
      ...prev,
      medicines: [...prev.medicines, newMed]
    }));
    
    e.target.reset();
    setCurrentView('dashboard');
  };

  const removeMedicine = (medId) => {
    if (window.confirm('Are you sure you want to remove this medicine? This will also remove its history so it doesn\'t affect your score.')) {
      setState(prev => ({
        ...prev,
        medicines: prev.medicines.filter(m => m.id !== medId),
        history: prev.history.filter(h => h.medId !== medId)
      }));
    }
  };

  const logDose = (medId, status) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setState(prev => {
      const cleanHistory = prev.history.filter(h => !(h.medId === medId && h.date === todayStr));
      const newRecord = {
        id: Math.random().toString(36).substr(2, 9),
        medId,
        status,
        date: todayStr,
        timestamp: new Date().toISOString()
      };
      return {
        ...prev,
        history: [...cleanHistory, newRecord]
      };
    });
  };

  // --- Voice Assistant Core ---
  const getSpeechLang = () => {
    const map = { 'en': 'en-US', 'hi': 'hi-IN', 'es': 'es-ES', 'fr': 'fr-FR', 'ar': 'ar-SA' };
    return map[state.settings.language] || 'en-US';
  };

  const speakVoice = (key, medName) => {
    let textToSpeak = t(key, medName);
    setVoiceResponse(textToSpeak);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const msg = new SpeechSynthesisUtterance();
      msg.text = textToSpeak;
      msg.lang = getSpeechLang();
      window.speechSynthesis.speak(msg);
    }
  };

  const parseMedicineVoice = (text) => {
    const addPattern = /(?:add|log|new|jo|jodo|anadir|ajouter|idaafa)\s+([a-zA-Z\d\s]+?)(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?$/i;
    const match = text.match(addPattern);

    let medName = "";
    let rawTime = "08:00 AM";

    if (match) {
      medName = match[1].trim();
      if (match[2]) rawTime = match[2];
    } else if (text.length > 2) {
      const words = text.split(" ");
      medName = words.length > 1 ? words[1] : words[0]; 
    } else {
      speakVoice('voice_fail');
      return;
    }

    const newMed = {
      id: Math.random().toString(36).substr(2, 9),
      name: medName.charAt(0).toUpperCase() + medName.slice(1),
      dosage: "1 Tablet",
      timing: rawTime.toLowerCase().includes('pm') ? 'Evening' : 'Morning',
      frequency: "Daily",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
      critical: false,
      createdAt: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      medicines: [...prev.medicines, newMed]
    }));

    speakVoice('voice_success', newMed.name);
    
    setTimeout(() => {
      setVoiceTranscript('');
      setVoiceResponse(t('voice_idle'));
    }, 5000);
  };

  const toggleMainVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        setVoiceTranscript(`🗣️ "${transcript}"`);
        parseMedicineVoice(transcript);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };
      
      recognitionRef.current = recognition;
    }

    recognitionRef.current.lang = getSpeechLang();

    if (isVoiceListening) {
      recognitionRef.current.stop();
      setIsVoiceListening(false);
    } else {
      setVoiceTranscript('');
      speakVoice('voice_listening');
      setIsVoiceListening(true);
      recognitionRef.current.start();
    }
  };

  // --- Chat Widget Logic ---
  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatInput('');

    // Scroll chat to bottom (simulated via rendering)
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev, 
        { 
          sender: 'ai', 
          text: "I'm a frontend demo assistant! I'll be fully connected to the backend soon to assist with: " + userText 
        }
      ]);
    }, 1000);
  };

  const toggleVoiceChat = () => {
    if (isListeningChat) {
      setIsListeningChat(false);
      setChatInput("Did I take my medicine today?");
    } else {
      setIsListeningChat(true);
      setTimeout(() => {
        setIsListeningChat(false);
        setChatInput("Did I take my medicine today?");
      }, 3000);
    }
  };

  // --- Contacts Modal & Submit ---
  const handleAddContactSubmit = (e) => {
    e.preventDefault();
    const name = e.target['contact-name'].value;
    const phone = e.target['contact-phone'].value;
    
    setState(prev => ({
      ...prev,
      contacts: [...prev.contacts, { id: Math.random().toString(36).substr(2, 9), name, phone }]
    }));
    
    e.target.reset();
    setShowContactModal(false);
  };

  // --- Insights View Computations ---
  const getInsightsAdherence = () => {
    const total = state.history.length;
    if (total === 0) return '--%';
    const taken = state.history.filter(h => h.status === 'taken').length;
    return `${Math.round((taken / total) * 100)}%`;
  };

  const getInsightsZone = () => {
    const total = state.history.length;
    const taken = state.history.filter(h => h.status === 'taken').length;
    const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

    const missedCritical = state.history.some(h => {
      if (h.status === 'missed') {
        const m = state.medicines.find(med => med.id === h.medId);
        return m && m.critical;
      }
      return false;
    });

    if (missedCritical) {
      return {
        zone: 'Danger Zone',
        className: 'zone-danger',
        desc: 'Critical medication missed! Please take it immediately.'
      };
    } else if (percentage >= 70 || total === 0) {
      return {
        zone: 'Safe Zone',
        className: 'zone-safe',
        desc: total === 0 ? 'No history yet. Safe zone by default.' : 'Great job! You are maintaining good adherence.'
      };
    } else if (percentage >= 40) {
      return {
        zone: 'Medium Zone',
        className: 'zone-warning',
        desc: 'You are in the medium zone. Try to not miss your doses.'
      };
    } else {
      return {
        zone: 'Danger Zone',
        className: 'zone-danger',
        desc: 'Poor adherence! Please consult your doctor or caregiver.'
      };
    }
  };

  const getInsightsMissedTime = () => {
    const missed = state.history.filter(h => h.status === 'missed');
    return missed.length > 0 ? 'Evening' : 'None';
  };

  const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartHeights = { Mon: 80, Tue: 95, Wed: 45, Thu: 70, Fri: 85, Sat: 90, Sun: 100 };

  // --- Filtering Active Medicines list for Dashboard ---
  const todayStr = new Date().toISOString().split('T')[0];
  const unloggedTodayMedicines = state.medicines.filter(med => {
    const loggedToday = state.history.find(h => h.medId === med.id && h.date === todayStr);
    return !loggedToday;
  });

  return (
    <>
      {/* Background Blobs */}
      <div className="background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
        <div className="blob blob-4"></div>
      </div>

      <div className="app-container">
        {/* Header - Hidden in Auth View */}
        {currentView !== 'auth' && (
          <header className="app-header">
            <div className="header-left">
              <div className="nav-brand" onClick={() => setCurrentView('dashboard')} style={{cursor:'pointer'}}>
                <HeartPulse className="brand-icon" style={{width: 24, height: 24}} />
                <h1>DawaSetu</h1>
              </div>
              <span className="header-divider">/</span>
              <h2 id="header-title">{t('nav_' + (currentView === 'add-medicine' ? 'add' : currentView === 'legal' ? 'dashboard' : currentView))}</h2>
            </div>
            
            <div className="header-right">
              {/* Language Selector */}
              <div className="bhasha-selector" style={{position: 'relative'}}>
                <button 
                  id="ai-translate-btn" 
                  className="btn-icon" 
                  aria-label="Translate" 
                  title="Select Language"
                  onClick={(e) => { e.stopPropagation(); setShowLangMenu(!showLangMenu); }}
                >
                  <Languages style={{width: 20, height: 20}} />
                </button>
                {showLangMenu && (
                  <div id="lang-dropdown" className="card glass" style={{display: 'block', position: 'absolute', top: '100%', right: 0, zIndex: 100, minWidth: '120px', padding: '8px', marginTop: '8px'}}>
                    <button onClick={() => handleLanguageChange('en')} className="dropdown-btn">English</button>
                    <button onClick={() => handleLanguageChange('hi')} className="dropdown-btn">हिंदी</button>
                    <button onClick={() => handleLanguageChange('es')} className="dropdown-btn">Español</button>
                    <button onClick={() => handleLanguageChange('fr')} className="dropdown-btn">Français</button>
                    <button onClick={() => handleLanguageChange('ar')} className="dropdown-btn">العربية</button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <button id="notification-btn" className="btn-icon" aria-label="Notifications" title="Notifications">
                <Bell style={{width: 20, height: 20}} />
              </button>
              <button 
                id="elder-toggle" 
                className={`btn-icon ${state.settings.elderlyMode ? 'active' : ''}`} 
                aria-label="Toggle Elder Mode" 
                title="Elderly frd mode (Zoom in text & Simple UI)"
                onClick={toggleElderlyMode}
              >
                <Glasses style={{width: 20, height: 20}} />
              </button>
              <button 
                id="caregiver-toggle" 
                className={`btn-icon ${state.settings.caregiverMode ? 'active' : ''}`} 
                aria-label="Toggle Caregiver View" 
                title="Caregiver Mode"
                onClick={toggleCaregiverMode}
              >
                <ShieldCheck style={{width: 20, height: 20}} />
              </button>

              {/* Profile drop menu */}
              <div className="profile-section" style={{position:'relative'}}>
                <div 
                  style={{display:'flex', alignItems:'center', gap:'12px', cursor:'pointer'}}
                  onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}
                >
                  {state.user && <span id="user-display-name" style={{fontWeight:600}}>{state.user}</span>}
                  <div className="profile-icon">
                    <User style={{width: 20, height: 20}} />
                  </div>
                </div>
                {showProfileMenu && (
                  <div id="profile-dropdown" className="card glass" style={{display: 'block', position: 'absolute', top: '100%', right: 0, zIndex: 100, minWidth: '220px', padding: '8px', marginTop: '8px'}}>
                    <div style={{padding: '12px', borderBottom: '1px solid var(--glass-border)', marginBottom: '8px'}}>
                      <strong id="dropdown-username" style={{color: 'var(--text-dark)'}}>{state.user || 'Guest'}</strong>
                    </div>
                    <button onClick={toggleTheme} className="dropdown-btn flex-btn">
                      <Moon style={{width:16}} /> Theme (Light/Dark)
                    </button>
                    <button id="menu-elder-toggle" onClick={toggleElderlyMode} className={`dropdown-btn flex-btn ${state.settings.elderlyMode ? 'active' : ''}`}>
                      <Glasses style={{width:16}} /> Elder Mode
                    </button>
                    <button id="menu-caregiver-toggle" onClick={toggleCaregiverMode} className={`dropdown-btn flex-btn ${state.settings.caregiverMode ? 'active' : ''}`}>
                      <ShieldCheck style={{width:16}} /> Caregiver Mode
                    </button>
                    <button onClick={() => setCurrentView('legal')} className="dropdown-btn flex-btn">
                      <Shield style={{width:16}} /> Privacy Policy
                    </button>
                    <button onClick={() => setCurrentView('legal')} className="dropdown-btn flex-btn">
                      <FileText style={{width:16}} /> Terms & Conditions
                    </button>
                    <button onClick={handleLogout} className="dropdown-btn flex-btn logout-btn">
                      <LogOut style={{width:16}} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Sidebar Navigation - Hidden in Auth View */}
        {currentView !== 'auth' && (
          <nav className="navigation">
            <ul className="nav-links">
              <li>
                <a href="#" className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('dashboard'); }}>
                  <LayoutDashboard style={{width: 24, height: 24}} />
                  <span>{t('nav_dashboard')}</span>
                </a>
              </li>
              <li>
                <a href="#" className={`nav-item ${currentView === 'add-medicine' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('add-medicine'); }}>
                  <PlusCircle style={{width: 24, height: 24}} />
                  <span>{t('nav_add')}</span>
                </a>
              </li>
              <li>
                <a href="#" className={`nav-item ${currentView === 'history' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('history'); }}>
                  <Clock style={{width: 24, height: 24}} />
                  <span>{t('nav_history')}</span>
                </a>
              </li>
              <li>
                <a href="#" className={`nav-item ${currentView === 'insights' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('insights'); }}>
                  <BarChart2 style={{width: 24, height: 24}} />
                  <span>{t('nav_insights')}</span>
                </a>
              </li>
              <li>
                <a href="#" className={`nav-item ${currentView === 'contacts' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('contacts'); }}>
                  <Users style={{width: 24, height: 24}} />
                  <span>{t('nav_contacts')}</span>
                </a>
              </li>
              <li>
                <a href="#" className={`nav-item ${currentView === 'about' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('about'); }}>
                  <Info style={{width: 24, height: 24}} />
                  <span>{t('nav_about')}</span>
                </a>
              </li>
            </ul>
          </nav>
        )}

        {/* Main Content */}
        <main className="main-content" style={currentView === 'auth' ? {gridColumn: '1 / span 2'} : {}}>
          <div className="views-container">
            
            {/* Auth View */}
            <section id="auth" className={`view ${currentView === 'auth' ? 'active' : ''}`}>
              <div className="auth-container" style={{display:'flex', justifyContent:'center', alignItems:'center', minHeight:'80vh'}}>
                <div className="card glass auth-card text-center" style={{maxWidth: '400px', width:'100%', padding: '40px 32px'}}>
                  <HeartPulse style={{width:'48px', height:'48px', color:'var(--accent)', marginBottom:'16px', display:'inline-block'}} />
                  <h2 style={{marginBottom: '8px'}}>Welcome to DawaSetu</h2>
                  <p className="supportive-text" style={{marginBottom: '32px'}}>Your smart health companion</p>

                  <div className="auth-buttons" style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                    <button className="btn btn-outline full-width" onClick={() => alert('Google login coming soon!')}>
                      <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{marginRight:'8px'}}>
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                          <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                          <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                          <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                          <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                        </g>
                      </svg>
                      Continue with Google
                    </button>
                    <button className="btn btn-outline full-width" onClick={() => alert('Email login coming soon!')}>
                      <Mail style={{marginRight:'8px', width:'20px'}} /> Continue with Email
                    </button>
                    <button className="btn btn-outline full-width" onClick={() => alert('Mobile login coming soon!')}>
                      <Smartphone style={{marginRight:'8px', width:'20px'}} /> Continue with Mobile
                    </button>

                    <div className="divider" style={{display:'flex', alignItems:'center', margin:'16px 0', color:'var(--text-light)', fontSize:'12px', fontWeight:'600'}}>
                      <div style={{flex:1, height:'1px', background:'#E2E8F0'}}></div>
                      <span style={{padding:'0 12px'}}>OR</span>
                      <div style={{flex:1, height:'1px', background:'#E2E8F0'}}></div>
                    </div>

                    <button className="btn btn-primary full-width" style={{justifyContent:'center'}} onClick={handleLoginAsGuest}>
                      <User style={{marginRight:'8px', width:'20px'}} /> Continue as Guest
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Dashboard View */}
            <section id="dashboard" className={`view ${currentView === 'dashboard' ? 'active' : ''}`}>
              <div className="greeting-section">
                <h1>{getGreetingText()}</h1>
                {renderEmotionalMsg()}
              </div>

              {/* Main Voice Assistant Card */}
              <div className="card glass voice-assistant-card mt-4">
                <div className="voice-assistant-header">
                  <button 
                    className={`btn-icon voice-main-btn ${isVoiceListening ? 'listening' : ''}`} 
                    onClick={toggleMainVoice} 
                    id="main-voice-btn"
                    style={isVoiceListening ? {boxShadow: '0 0 0 8px rgba(255,255,255,0.4)'} : {}}
                  >
                    <Mic style={{width: 24, height: 24}} />
                  </button>
                  <div className="voice-assistant-info">
                    <h3>DawaSetu Voice</h3>
                    <p>Tap the mic to speak your command.</p>
                  </div>
                </div>

                {/* Voice Interaction Box */}
                <div style={{background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '16px', padding: '16px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                  {voiceTranscript && (
                    <div id="voice-transcript-box" style={{color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontStyle: 'italic', marginBottom: '8px'}}>
                      {voiceTranscript}
                    </div>
                  )}
                  <div id="voice-response-box" style={{color: 'white', fontSize: '16px', fontWeight: '500'}}>
                    {voiceResponse}
                  </div>
                </div>
              </div>

              <div className="dashboard-grid mt-4">
                {/* Adherence Score */}
                <div className="card adherence-card glass">
                  <h3>{t('adherence_score')}</h3>
                  <div className="circular-progress">
                    <svg width="120" height="120">
                      <circle className="bg-circle" cx="60" cy="60" r="50"></circle>
                      <circle 
                        className="progress-circle" 
                        cx="60" 
                        cy="60" 
                        r="50"
                        style={{
                          strokeDashoffset: 314.159 - (getAdherenceScore() / 100) * 314.159,
                          stroke: getAdherenceScore() === 100 ? 'var(--success)' : getAdherenceScore() > 0 ? 'var(--warning)' : 'var(--danger)',
                          filter: getAdherenceScore() === 100 ? 'drop-shadow(0 0 5px var(--success))' : getAdherenceScore() > 0 ? 'drop-shadow(0 0 5px var(--warning))' : 'drop-shadow(0 0 5px var(--danger))'
                        }}
                      ></circle>
                    </svg>
                    <div className="progress-value">{getAdherenceScore()}%</div>
                  </div>
                  <div className="heatmap-mini" id="mini-heatmap">
                    {renderHeatmapDots()}
                  </div>
                </div>

                {/* Today's Medicines */}
                <div className="card today-medicines-card glass">
                  <div className="card-header">
                    <h3>{t('todays_medicines')}</h3>
                    <button className="btn-icon primary-text" onClick={() => setCurrentView('add-medicine')}>
                      <Plus style={{width: 20, height: 20}} />
                    </button>
                  </div>
                  
                  <div id="medicines-list" className="medicines-list">
                    {unloggedTodayMedicines.length === 0 ? (
                      <p className="supportive-text text-center py-4 success-text">
                        <CheckCircle style={{marginBottom: '8px', display: 'inline-block'}} />
                        <br />
                        All caught up for today!
                      </p>
                    ) : (
                      unloggedTodayMedicines.map(med => {
                        const statusClass = getTimeWindowStatus(med.timing);
                        let timeStr = '08:00 AM';
                        if (med.timing === 'Afternoon') timeStr = '01:00 PM';
                        if (med.timing === 'Evening') timeStr = '08:00 PM';

                        return (
                          <div key={med.id} className={`medicine-item ${med.critical ? 'critical' : ''}`}>
                            <div className="med-info">
                              <h4>
                                {med.name}
                                {med.critical && <AlertCircle style={{width: '16px', color: 'var(--danger)', display: 'inline-block'}} />}
                              </h4>
                              <p>{med.dosage}</p>
                              <div className="med-time mt-3">
                                <span className={`med-status ${statusClass}`}></span> {timeStr}
                              </div>
                            </div>
                            <div className="med-actions">
                              <div className="med-menu-container" style={{position: 'relative'}}>
                                <button className="btn-icon" onClick={(e) => toggleMedMenu(e, med.id)} style={{color: 'var(--text-light)'}}>
                                  <MoreVertical style={{width: 20, height: 20}} />
                                </button>
                                {activeMedMenu === med.id && (
                                  <div id={`menu-${med.id}`} className="med-dropdown" style={{display: 'block'}}>
                                    <button onClick={() => removeMedicine(med.id)}>
                                      <Trash2 style={{width: 16, marginRight: 4}} /> Remove
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button className="btn-action take" onClick={() => logDose(med.id, 'taken')} title="Take">
                                <Check style={{width: 20, height: 20}} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Caregiver Escalation Badge */}
                {getConsecutiveMisses() >= 2 && (
                  <div className="card caregiver-status-card glass" id="escalation-panel" style={{display: 'block', gridColumn: '1 / -1'}}>
                    <div className={`alert-content ${getConsecutiveMisses() >= 3 ? 'danger' : 'warning'}`} style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                      <AlertTriangle className={getConsecutiveMisses() >= 3 ? 'danger-text' : 'warning-text'} style={{width: 24, height: 24}} />
                      <div>
                        <h4 className={getConsecutiveMisses() >= 3 ? 'danger-text' : 'warning-text'}>{t('missed_alert')}</h4>
                        {getConsecutiveMisses() >= 3 ? (
                          <p id="escalation-message">You have missed {getConsecutiveMisses()} consecutive doses. <br /><strong>Caregivers have been notified.</strong></p>
                        ) : (
                          <p id="escalation-message">You have missed {getConsecutiveMisses()} consecutive doses.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Add Medicine View */}
            <section id="add-medicine" className={`view ${currentView === 'add-medicine' ? 'active' : ''}`}>
              <div className="card glass mt-4">
                <h3 style={{marginBottom: '24px'}}>{t('add_new_medicine')}</h3>
                <form id="add-medicine-form" className="medicine-form" onSubmit={handleAddMedicineSubmit}>
                  <div className="form-group">
                    <label>{t('med_name')}</label>
                    <input type="text" id="med-name" required placeholder="e.g. Paracetamol" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('dosage')}</label>
                      <input type="text" id="med-dosage" required placeholder="e.g. 500 or 1" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="med-dosage-type">Dosage Type</label>
                      <select id="med-dosage-type" className="custom-dropdown">
                        <option value="Pill(s)">Pill(s)</option>
                        <option value="mg">mg</option>
                        <option value="ml">ml</option>
                        <option value="drops">Drops</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('timing')}</label>
                      <select id="med-timing">
                        <option value="Morning">{t('time_morning')}</option>
                        <option value="Afternoon">{t('time_afternoon')}</option>
                        <option value="Evening">{t('time_evening')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('frequency')}</label>
                      <select id="med-frequency">
                        <option value="Daily">{t('freq_daily')}</option>
                        <option value="Alternate">{t('freq_alternate')}</option>
                        <option value="Weekly">{t('freq_weekly')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('start_date')}</label>
                      <input type="date" id="med-start-date" required defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="form-group">
                      <label>{t('end_date')}</label>
                      <input type="date" id="med-end-date" />
                    </div>
                  </div>
                  <div className="form-group toggle-group mt-3" style={{display:'flex', flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                    <label>{t('critical_med')}</label>
                    <label className="switch">
                      <input type="checkbox" id="med-critical" />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <button type="submit" className="btn btn-primary mt-4">
                    {t('save_medicine')}
                  </button>
                </form>
              </div>
            </section>

            {/* History View */}
            <section id="history" className={`view ${currentView === 'history' ? 'active' : ''}`}>
              <div className="card glass mt-4">
                <div className="card-header">
                  <h3>{t('history_log')}</h3>
                  <div className="history-filters" style={{display: 'flex', gap: '8px'}}>
                    <button className={`btn filter-btn ${historyFilter === 'all' ? 'active' : ''}`} onClick={() => setHistoryFilter('all')}>{t('nav_dashboard')}</button>
                    <button className={`btn filter-btn ${historyFilter === 'taken' ? 'active' : ''}`} onClick={() => setHistoryFilter('taken')}>{t('status_taken')}</button>
                    <button className={`btn filter-btn ${historyFilter === 'missed' ? 'active' : ''}`} onClick={() => setHistoryFilter('missed')}>{t('status_missed')}</button>
                  </div>
                </div>

                <div id="history-list" className="history-list">
                  {state.history.length === 0 ? (
                    <p className="supportive-text text-center py-4">No history records found.</p>
                  ) : (
                    [...state.history]
                      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .filter(h => historyFilter === 'all' || h.status === historyFilter)
                      .map(record => {
                        const med = state.medicines.find(m => m.id === record.medId);
                        const medName = med ? med.name : 'Unknown Medicine';
                        const statusText = record.status === 'taken' ? t('status_taken') : t('status_missed');
                        const isTaken = record.status === 'taken';

                        return (
                          <div key={record.id} className="medicine-item">
                            <div className="med-info">
                              <h4>{medName}</h4>
                              <p>{new Date(record.timestamp).toLocaleString()}</p>
                            </div>
                            <div className={isTaken ? 'success-text' : 'danger-text'} style={{display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600}}>
                              {isTaken ? <CheckCircle style={{width: 20, height: 20}} /> : <XCircle style={{width: 20, height: 20}} />}
                              {statusText}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </section>

            {/* Insights View */}
            <section id="insights" className={`view ${currentView === 'insights' ? 'active' : ''}`}>
              <div className="insights-grid mt-4">
                <div className="card glass text-center">
                  <h4 className="supportive-text">{t('weekly_adherence')}</h4>
                  <h2 id="insight-adherence" style={{fontSize: '36px', marginTop: '12px'}}>{getInsightsAdherence()}</h2>
                </div>
                <div className="card glass text-center">
                  <h4 className="supportive-text">{t('most_missed')}</h4>
                  <h2 id="insight-missed-time" style={{fontSize: '36px', marginTop: '12px'}}>{getInsightsMissedTime()}</h2>
                </div>
                <div className="card glass text-center">
                  <h4 className="supportive-text">{t('best_day')}</h4>
                  <h2 id="insight-best-day" style={{fontSize: '36px', marginTop: '12px'}}>Today</h2>
                </div>
              </div>

              <div className="card glass mt-4">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                  <h3>{t('zone_status')}</h3>
                  <span id="insight-zone" className={`status-stamp ${getInsightsZone().className}`}>
                    {getInsightsZone().zone}
                  </span>
                </div>
                <p id="insight-zone-desc" className="supportive-text" style={{fontSize: '16px'}}>
                  {getInsightsZone().desc}
                </p>
              </div>

              {/* Bar Chart Trend */}
              <div className="card glass mt-4">
                <h3 style={{marginBottom: '24px'}}>{t('adherence_chart')}</h3>
                <div className="bar-chart" id="bar-chart" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '200px', padding: '0 20px'}}>
                  {chartDays.map(day => {
                    const height = chartHeights[day] || 75;
                    return (
                      <div key={day} className="bar-wrapper" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1}}>
                        <div className="bar" style={{height: `${height}%`, width: '24px', backgroundColor: 'var(--primary)', borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease'}}></div>
                        <div className="bar-label" style={{marginTop: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--text-light)'}}>{day}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Contacts View */}
            <section id="contacts" className={`view ${currentView === 'contacts' ? 'active' : ''}`}>
              <div className="card glass mt-4">
                <div className="card-header">
                  <h3>{t('emergency_contacts')}</h3>
                  <button className="btn-icon primary-text" onClick={() => setShowContactModal(true)}>
                    <Plus style={{width: 20, height: 20}} />
                  </button>
                </div>
                
                <div id="contacts-list" className="contacts-list mt-3">
                  {state.contacts.length === 0 ? (
                    <p className="supportive-text text-center py-4">No emergency contacts added yet.</p>
                  ) : (
                    state.contacts.map(contact => (
                      <div key={contact.id} className="medicine-item">
                        <div className="med-info" style={{display:'flex', alignItems:'center', gap:'16px'}}>
                          <div className="contact-avatar">
                            <User style={{width: 18, height: 18}} />
                          </div>
                          <div>
                            <h4>{contact.name}</h4>
                            <p>{contact.phone}</p>
                          </div>
                        </div>
                        <a href={`tel:${contact.phone}`} className="btn-icon call-btn" style={{textDecoration:'none'}}>
                          <Phone style={{width: 18, height: 18}} />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Caregiver view panel */}
              {state.settings.caregiverMode && (
                <div id="caregiver-view-panel" className="card glass mt-4" style={{display: 'block', borderLeft: '4px solid var(--warning)'}}>
                  <h3 style={{display:'flex', alignItems:'center', gap:'8px'}}>
                    <ShieldAlert className="warning-text" style={{width: 24, height: 24}} /> 
                    Caregiver Overview
                  </h3>
                  <div className="caregiver-stats mt-4" style={{display:'flex', gap:'24px'}}>
                    <div className="stat">
                      <span className="supportive-text">Total Missed (7 days):</span>
                      <strong id="cg-total-missed" style={{fontSize:'24px', display:'block', marginTop:'4px'}}>
                        {state.history.filter(h => h.status === 'missed').length}
                      </strong>
                    </div>
                    <div className="stat">
                      <span className="supportive-text">Risk Level:</span>
                      <strong 
                        id="cg-risk-level" 
                        style={{fontSize:'24px', display:'block', marginTop:'4px'}}
                        className={state.history.filter(h => h.status === 'missed').length >= 3 ? 'danger-text' : state.history.filter(h => h.status === 'missed').length > 0 ? 'warning-text' : 'success-text'}
                      >
                        {state.history.filter(h => h.status === 'missed').length >= 3 ? 'High' : state.history.filter(h => h.status === 'missed').length > 0 ? 'Moderate' : 'Low'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* About Us View */}
            <section id="about" className={`view ${currentView === 'about' ? 'active' : ''}`}>
              <div className="card glass mt-4">
                <h3 style={{marginBottom: '16px'}}>{t('about_us_title')}</h3>
                <p className="supportive-text" style={{fontSize: '16px', lineHeight: '1.8'}}>
                  DawaSetu is your comprehensive smart medication and family health companion. We aim to
                  bridge the gap between patients, their caregivers, and their daily health routines. With
                  features like intelligent adherence tracking, native language support, and a dedicated
                  <strong>Elderly frd mode</strong> (providing zoomed-in text and a simple UI), DawaSetu
                  ensures that managing health is as simple and stress-free as possible.
                  <br /><br />
                  Whether you need reminders for your daily doses or a simple way for family members to
                  monitor your well-being, DawaSetu is here to help you stay in the safe zone and maintain a
                  healthy lifestyle.
                </p>
              </div>
              <div className="dashboard-footer mt-4 text-center" style={{padding: '24px 0', color: 'var(--text-light)', fontSize: '14px'}}>
                &copy; DawaSetu. All Rights Reserved<br />
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('legal'); }} style={{color: 'var(--text-light)', textDecoration: 'none'}}>Privacy Policy</a> | {' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('legal'); }} style={{color: 'var(--text-light)', textDecoration: 'none'}}>Terms and Conditions</a>
              </div>
            </section>

            {/* Legal View */}
            <section id="legal" className={`view ${currentView === 'legal' ? 'active' : ''}`}>
              <div className="card glass mt-4">
                <h2 style={{marginBottom: '24px'}}>Privacy Policy</h2>
                <p className="supportive-text" style={{fontSize: '15px', lineHeight: '1.6', marginBottom: '16px'}}>
                  <strong>1. Information Collection:</strong> We collect information necessary to provide
                  medication reminders and family health monitoring. This includes your name, medication
                  details, and basic contact info.
                </p>
                <p className="supportive-text" style={{fontSize: '15px', lineHeight: '1.6', marginBottom: '16px'}}>
                  <strong>2. Data Usage:</strong> Your data is used exclusively to operate DawaSetu, deliver
                  notifications, and sync information with authorized caregivers. We do not sell your personal
                  data to third parties.
                </p>
                <p className="supportive-text" style={{fontSize: '15px', lineHeight: '1.6', marginBottom: '32px'}}>
                  <strong>3. Security:</strong> We implement robust security measures to protect your health
                  data and ensure privacy across all interactions within our platform.
                </p>

                <h2 style={{marginBottom: '24px'}}>Terms and Conditions</h2>
                <p className="supportive-text" style={{fontSize: '15px', lineHeight: '1.6', marginBottom: '16px'}}>
                  <strong>1. Acceptance of Terms:</strong> By using DawaSetu, you agree to these Terms and
                  Conditions. DawaSetu is a tool to assist with medication management and should not replace
                  professional medical advice.
                </p>
                <p className="supportive-text" style={{fontSize: '15px', lineHeight: '1.6', marginBottom: '16px'}}>
                  <strong>2. User Responsibilities:</strong> You are responsible for ensuring the accuracy of
                  the medication dosages, timings, and other data entered into the app. Always verify with
                  your actual prescription.
                </p>
                <p className="supportive-text" style={{fontSize: '15px', lineHeight: '1.6'}}>
                  <strong>3. Limitation of Liability:</strong> DawaSetu and its creators shall not be held
                  liable for any missed doses, incorrect entries, or health complications arising from the use
                  or misuse of the app.
                </p>
              </div>
            </section>
          </div>

          {/* Quick Add Floating Button - Hidden in Auth View */}
          {currentView !== 'auth' && (
            <button className="fab" onClick={() => setCurrentView('add-medicine')} aria-label="Add Medicine">
              <Plus style={{width: 24, height: 24}} />
            </button>
          )}
        </main>
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div id="contact-modal" className="modal active">
          <div className="modal-content card glass">
            <div className="modal-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
              <h3>{t('add_contact')}</h3>
              <button className="btn-icon close-modal" onClick={() => setShowContactModal(false)}>
                <X style={{width: 18, height: 18}} />
              </button>
            </div>
            <div className="modal-body">
              <form id="add-contact-form" className="medicine-form" onSubmit={handleAddContactSubmit}>
                <div className="form-group">
                  <label>{t('contact_name')}</label>
                  <input type="text" id="contact-name" required />
                </div>
                <div className="form-group">
                  <label>{t('contact_phone')}</label>
                  <input type="tel" id="contact-phone" required />
                </div>
                <button type="submit" className="btn btn-primary full-width mt-4">
                  {t('save_contact')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Chatbot Widget - Hidden in Auth View */}
      {currentView !== 'auth' && (
        <div id="chat-widget" className="chat-widget" style={{display: 'block'}}>
          <button className="chat-toggle-btn" onClick={() => setShowChat(!showChat)}>
            <MessageCircle style={{width: 24, height: 24}} />
          </button>

          {showChat && (
            <div className="chat-window card glass" id="chat-window" style={{display: 'flex'}}>
              <div className="chat-header">
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <div className="profile-icon" style={{width:'32px', height:'32px', background:'var(--accent)', boxShadow:'none'}}>
                    <Bot style={{width:16, height:16}} />
                  </div>
                  <div>
                    <h4 style={{margin:0, fontSize:'14px'}}>DawaSetu AI</h4>
                    <span style={{fontSize:'11px', color:'var(--accent)', fontWeight:600}}>Online</span>
                  </div>
                </div>
                <button 
                  className="btn-icon close-chat" 
                  onClick={() => setShowChat(false)}
                  style={{width:'28px', height:'28px', border:'none', boxShadow:'none', background:'transparent'}}
                >
                  <X style={{width:16, height:16}} />
                </button>
              </div>
              <div className="chat-messages" id="chat-messages" style={{overflowY: 'auto'}}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.sender === 'ai' ? 'ai-message' : 'user-message'}`}>
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="chat-input-area">
                <button 
                  className={`btn-icon voice-btn ${isListeningChat ? 'listening' : ''}`} 
                  onClick={toggleVoiceChat} 
                  id="voice-btn" 
                  title="Voice Assistant"
                  style={{background:'var(--bg-color)', border:'none', width:'36px', height:'36px'}}
                >
                  <Mic style={{color:'var(--text-dark)', width: 16, height:16}} />
                </button>
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="chat-input" 
                  id="chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => { if(e.key === 'Enter') handleSendChatMessage(); }}
                />
                <button 
                  className="btn-icon send-btn" 
                  onClick={handleSendChatMessage}
                  style={{background:'var(--primary)', border:'none', color:'white', width:'36px', height:'36px'}}
                >
                  <Send style={{width:16, height:16}} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <InstallButton />
    </>
  );


}

export default App;
