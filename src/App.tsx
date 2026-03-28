/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Send, 
  CheckCircle2, 
  Trophy, 
  RefreshCw, 
  MessageSquare,
  ChevronRight,
  ClipboardList,
  Loader2,
  Sparkles,
  BarChart,
  ShieldAlert,
  Zap,
  Mic,
  Square,
  Volume2,
  Pause,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { QUESTIONS_BY_ROUND_AND_DIFFICULTY } from './constants';
import { AppState, Answer, Difficulty, Round } from './types';
import { evaluateAnswerWithAI, transcribeAudio, generateSpeech, pcmToWav } from './services/geminiService';
import { auth, signOut, onAuthStateChanged, User } from './firebase';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';

export default function App() {
  const [appState, setAppState] = useState<AppState>('AUTH');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [round, setRound] = useState<Round>('QUIZ');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const questions = QUESTIONS_BY_ROUND_AND_DIFFICULTY[round][difficulty];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        if (appState === 'AUTH') setAppState('START');
      } else {
        setAppState('AUTH');
      }
    });

    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAppState('AUTH');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const openProfile = () => {
    setAppState('PROFILE');
  };

  const startInterview = () => {
    setAppState('ROUND_SELECT');
  };

  const selectRound = (selectedRound: Round) => {
    setRound(selectedRound);
    setAppState('DIFFICULTY_SELECT');
  };

  const selectDifficulty = (level: Difficulty) => {
    setDifficulty(level);
    setAppState('INTERVIEWING');
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setCurrentAnswer('');
    setIsEvaluating(false);
    resetAudio();
  };

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setAudioProgress(0);
    setAudioDuration(0);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const transcription = await transcribeAudio(base64Audio, 'audio/webm');
      if (transcription) {
        setCurrentAnswer(prev => prev ? `${prev} ${transcription}` : transcription);
      }
    } catch (error) {
      console.error("Transcription failed:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const speakQuestion = async () => {
    if (isSpeaking && !isPaused) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPaused(true);
      }
      return;
    }

    if (isPaused && audioRef.current) {
      audioRef.current.play();
      setIsPaused(false);
      return;
    }

    setIsSpeaking(true);
    try {
      const currentQuestion = questions[currentQuestionIndex].text;
      const base64Audio = await generateSpeech(currentQuestion);
      if (base64Audio) {
        const audioUrl = pcmToWav(base64Audio);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onloadedmetadata = () => {
          setAudioDuration(audio.duration);
        };

        audio.ontimeupdate = () => {
          setAudioProgress(audio.currentTime);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          setIsPaused(false);
          setAudioProgress(0);
        };

        audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("TTS failed:", error);
      setIsSpeaking(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioProgress(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleNext = async () => {
    resetAudio();
    
    if (isPracticeMode) {
      const newAnswer: Answer = {
        questionId: questions[currentQuestionIndex].id,
        text: currentAnswer,
        score: 0,
        feedback: "Practice mode: No evaluation provided."
      };
      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentAnswer('');
      } else {
        setAppState('FINISHED');
      }
      return;
    }

    setIsEvaluating(true);
    try {
      const currentQuestion = questions[currentQuestionIndex].text;
      const evaluation = await evaluateAnswerWithAI(currentQuestion, currentAnswer, difficulty);
      
      const newAnswer: Answer = {
        questionId: questions[currentQuestionIndex].id,
        text: currentAnswer,
        ...evaluation
      };

      const updatedAnswers = [...answers, newAnswer];
      setAnswers(updatedAnswers);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentAnswer('');
      } else {
        setAppState('FINISHED');
      }
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const totalScore = answers.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = answers.length > 0 ? Math.round(totalScore / answers.length) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-indigo-100">
      {/* Header with User Info */}
      <header className="max-w-3xl mx-auto px-6 pt-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ClipboardList size={18} />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">AI Interview</span>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <button
              onClick={openProfile}
              className="hidden md:flex flex-col items-end hover:text-indigo-600 transition-colors"
            >
              <span className="text-xs font-bold text-slate-900">{user.displayName || 'User'}</span>
              <span className="text-[10px] text-slate-500">{user.email}</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={openProfile}
                className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm overflow-hidden"
                title="View Profile"
              >
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User'} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserIcon size={20} />
                )}
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white border border-slate-100 text-slate-500 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {isAuthLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2 size={40} className="text-indigo-600 animate-spin" />
              <p className="text-slate-500 font-medium">Authenticating...</p>
            </motion.div>
          ) : appState === 'AUTH' ? (
            <Auth key="auth" onAuthSuccess={() => setAppState('START')} />
          ) : appState === 'PROFILE' && user ? (
            <Profile user={user} onBack={() => setAppState('START')} />
          ) : appState === 'START' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
              id="start-screen"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-4">
                <ClipboardList size={40} />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
                  AI Interview Practice
                </h1>
                <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
                  Sharpen your interview skills with our AI-powered simulator. 
                  Answer common questions and get instant feedback on your responses.
                </p>
              </div>
              
              <div className="pt-8">
                <button
                  onClick={startInterview}
                  className="group relative inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-2xl hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-200 active:scale-95"
                  id="start-button"
                >
                  <span>Get Started</span>
                  <Play size={20} className="fill-current" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16">
                {[
                  { icon: <Sparkles size={20} />, title: "Gemini AI", desc: "Sophisticated evaluation" },
                  { icon: <Mic size={20} />, title: "Voice Recording", desc: "Speak your answers" },
                  { icon: <Volume2 size={20} />, title: "AI Voice", desc: "Listen to questions" }
                ].map((item, i) => (
                  <div key={i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm text-left space-y-2">
                    <div className="text-indigo-600">{item.icon}</div>
                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {appState === 'ROUND_SELECT' && (
            <motion.div
              key="round"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-10 text-center"
              id="round-screen"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-slate-900">Select Interview Round</h2>
                <p className="text-slate-500">Choose the type of interview you want to practice.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { 
                    round: 'QUIZ' as Round, 
                    icon: <MessageSquare size={24} />, 
                    colorClass: 'text-indigo-600 bg-indigo-50 hover:border-indigo-500', 
                    desc: 'General knowledge and quick trivia' 
                  },
                  { 
                    round: 'TECHNICAL' as Round, 
                    icon: <Zap size={24} />, 
                    colorClass: 'text-amber-600 bg-amber-50 hover:border-amber-500', 
                    desc: 'Coding, logic, and system design' 
                  },
                  { 
                    round: 'HR' as Round, 
                    icon: <CheckCircle2 size={24} />, 
                    colorClass: 'text-emerald-600 bg-emerald-50 hover:border-emerald-500', 
                    desc: 'Behavioral and professional questions' 
                  }
                ].map((item) => (
                  <button
                    key={item.round}
                    onClick={() => selectRound(item.round)}
                    className={`p-8 bg-white rounded-3xl border-2 border-slate-100 ${item.colorClass.split(' ').find(c => c.startsWith('hover:'))} transition-all group text-left space-y-4 shadow-sm hover:shadow-md active:scale-95`}
                  >
                    <div className={`${item.colorClass.split(' ').filter(c => !c.startsWith('hover:')).join(' ')} w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">{item.round}</h3>
                      <p className="text-sm text-slate-500 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {appState === 'DIFFICULTY_SELECT' && (
            <motion.div
              key="difficulty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-10 text-center"
              id="difficulty-screen"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-slate-900">Choose Your Difficulty</h2>
                <p className="text-slate-500">Select a level that matches your experience.</p>
                
                <div className="flex justify-center pt-2">
                  <button 
                    onClick={() => setIsPracticeMode(!isPracticeMode)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all ${
                      isPracticeMode 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isPracticeMode ? 'bg-white border-white' : 'border-slate-300'
                    }`}>
                      {isPracticeMode && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                    </div>
                    <span className="font-bold">Practice Mode (No Scoring)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { 
                    level: 'EASY' as Difficulty, 
                    icon: <Zap size={24} />, 
                    colorClass: 'text-emerald-600 bg-emerald-50 hover:border-emerald-500', 
                    desc: 'Basic questions, lenient scoring' 
                  },
                  { 
                    level: 'MEDIUM' as Difficulty, 
                    icon: <BarChart size={24} />, 
                    colorClass: 'text-indigo-600 bg-indigo-50 hover:border-indigo-500', 
                    desc: 'Standard questions, balanced scoring' 
                  },
                  { 
                    level: 'HARD' as Difficulty, 
                    icon: <ShieldAlert size={24} />, 
                    colorClass: 'text-rose-600 bg-rose-50 hover:border-rose-500', 
                    desc: 'Advanced questions, strict scoring' 
                  }
                ].map((item) => (
                  <button
                    key={item.level}
                    onClick={() => selectDifficulty(item.level)}
                    className={`p-8 bg-white rounded-3xl border-2 border-slate-100 ${item.colorClass.split(' ').find(c => c.startsWith('hover:'))} transition-all group text-left space-y-4 shadow-sm hover:shadow-md active:scale-95`}
                  >
                    <div className={`${item.colorClass.split(' ').filter(c => !c.startsWith('hover:')).join(' ')} w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">{item.level}</h3>
                      <p className="text-sm text-slate-500 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {appState === 'INTERVIEWING' && (
            <motion.div
              key="interviewing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
              id="interview-screen"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                  <div className="h-1.5 w-48 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full border border-indigo-200`}>
                    {round}
                  </span>
                  <span className={`px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200`}>
                    {difficulty}
                  </span>
                  {isPracticeMode && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                      PRACTICE
                    </span>
                  )}
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                    {questions[currentQuestionIndex].category}
                  </span>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                      {questions[currentQuestionIndex].text}
                    </h2>
                    <button
                      onClick={speakQuestion}
                      className={`shrink-0 p-3 rounded-2xl transition-all ${isSpeaking && !isPaused ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                      title={isSpeaking && !isPaused ? "Pause" : "Listen to question"}
                    >
                      {isSpeaking && !isPaused ? <Pause size={24} /> : <Volume2 size={24} />}
                    </button>
                  </div>

                  {isSpeaking && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={speakQuestion}
                          className="text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          {isPaused ? <Play size={20} className="fill-current" /> : <Pause size={20} className="fill-current" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max={audioDuration || 0}
                          step="0.1"
                          value={audioProgress}
                          onChange={handleSeek}
                          className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-[10px] font-mono text-slate-500 w-20 text-right">
                          {formatTime(audioProgress)} / {formatTime(audioDuration)}
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="answer" className="block text-sm font-semibold text-slate-500">
                      Your Response
                    </label>
                    <div className="flex items-center gap-2">
                      {currentAnswer && !isRecording && !isEvaluating && !isTranscribing && (
                        <button
                          onClick={() => setCurrentAnswer('')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-500 text-xs font-bold rounded-full border border-slate-100 hover:bg-slate-100 transition-all"
                          title="Clear answer and start over"
                        >
                          <RefreshCw size={12} />
                          <span>Clear</span>
                        </button>
                      )}
                      {isRecording ? (
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-100 animate-pulse"
                        >
                          <Square size={12} className="fill-current" />
                          <span>Stop Recording</span>
                        </button>
                      ) : (
                        <button
                          onClick={startRecording}
                          disabled={isEvaluating || isTranscribing}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all disabled:opacity-50"
                        >
                          <Mic size={12} />
                          <span>{currentAnswer ? 'Add More' : 'Record Answer'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      id="answer"
                      rows={6}
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder={isRecording ? "Listening..." : "Type or record your answer here..."}
                      disabled={isEvaluating || isTranscribing}
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none text-lg disabled:opacity-50"
                    />
                    {isTranscribing && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold">
                          <Loader2 size={20} className="animate-spin" />
                          <span>Transcribing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                    <span>{currentAnswer.trim().split(/\s+/).filter(Boolean).length} words</span>
                    <span className="flex items-center gap-1 text-indigo-500">
                      <Sparkles size={12} />
                      {isPracticeMode ? 'Practice Mode Active' : 'AI Powered Evaluation'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleNext}
                    disabled={!currentAnswer.trim() || isEvaluating || isTranscribing || isRecording}
                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-indigo-100"
                    id="next-button"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        <span>AI Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <span>{currentQuestionIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}</span>
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {appState === 'FINISHED' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-10"
              id="results-screen"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                  <Trophy size={40} />
                </div>
                <h1 className="text-4xl font-bold text-slate-900">Interview Complete!</h1>
                <p className="text-slate-500">
                  Round: <span className="font-bold text-indigo-600">{round}</span> | 
                  Difficulty: <span className="font-bold text-indigo-600">{difficulty}</span>
                  {isPracticeMode && <span className="ml-2 font-bold text-amber-600">| PRACTICE MODE</span>}
                </p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                {!isPracticeMode ? (
                  <div className="bg-indigo-600 p-8 text-center text-white">
                    <p className="text-indigo-100 font-bold uppercase tracking-widest text-xs mb-2">Overall Performance</p>
                    <div className="text-6xl font-black">{averageScore}%</div>
                    <p className="mt-2 text-indigo-100 text-sm">
                      {averageScore >= 80 ? "Outstanding performance!" : averageScore >= 60 ? "Good effort, keep practicing!" : "Room for improvement."}
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-500 p-8 text-center text-white">
                    <p className="text-amber-100 font-bold uppercase tracking-widest text-xs mb-2">Practice Session Complete</p>
                    <div className="text-4xl font-black">No Scoring</div>
                    <p className="mt-2 text-amber-100 text-sm">
                      Great job refining your answers! Switch to normal mode when you're ready for evaluation.
                    </p>
                  </div>
                )}

                <div className="p-8 space-y-8">
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <ClipboardList size={20} className="text-indigo-600" />
                    Detailed Breakdown
                  </h3>
                  
                  <div className="space-y-6">
                    {answers.map((answer, idx) => (
                      <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-slate-800 leading-tight">
                            {questions[idx].text}
                          </h4>
                          {!isPracticeMode && (
                            <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                              answer.score >= 80 ? 'bg-emerald-100 text-emerald-700' : 
                              answer.score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {answer.score}/100
                            </span>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-slate-500 italic line-clamp-2">"{answer.text}"</p>
                          {!isPracticeMode && (
                            <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-700">
                              <Sparkles size={16} className="mt-0.5 text-indigo-500 shrink-0" />
                              <p>{answer.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 flex justify-center">
                    <button
                      onClick={startInterview}
                      className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                      id="restart-button"
                    >
                      <RefreshCw size={20} />
                      <span>Try Again</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
