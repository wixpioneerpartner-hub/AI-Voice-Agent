import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, PhoneOff, Activity, Loader2 } from 'lucide-react';
import { decode, createBlob, decodeAudioData } from '../services/audioUtils';
import { SYSTEM_INSTRUCTION } from '../constants';
import { ConnectionState, MessageLog } from '../types';
import Waveform from './Waveform';

const LiveAgent: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Transcription refs to batch updates
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const stopAudio = useCallback(() => {
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  const disconnect = useCallback(() => {
    // Cleanup MediaStream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close AudioContexts
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    // Attempt to close session if possible (API doesn't expose explicit close on promise, 
    // but we can simulate by not sending more data and resetting state)
    sessionPromiseRef.current = null;
    
    setConnectionState(ConnectionState.DISCONNECTED);
    setIsSpeaking(false);
  }, []);

  const connect = async () => {
    setConnectionState(ConnectionState.CONNECTING);
    setLogs([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Live API Session
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }, 
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            // Start processing microphone input
            if (!inputAudioContextRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            // Using ScriptProcessor as per guide (AudioWorklet is better in modern apps but guide uses this)
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return; // Simple mute implementation
              
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              // Ensure we use the resolved session
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Transcriptions
             if (message.serverContent?.outputTranscription) {
                currentOutputTranscription.current += message.serverContent.outputTranscription.text;
             }
             if (message.serverContent?.inputTranscription) {
                currentInputTranscription.current += message.serverContent.inputTranscription.text;
             }

             if (message.serverContent?.turnComplete) {
                const userText = currentInputTranscription.current;
                const modelText = currentOutputTranscription.current;
                
                if (userText || modelText) {
                    setLogs(prev => [
                        ...prev, 
                        ...(userText ? [{ role: 'user' as const, text: userText, timestamp: new Date() }] : []),
                        ...(modelText ? [{ role: 'model' as const, text: modelText, timestamp: new Date() }] : [])
                    ]);
                }
                
                currentInputTranscription.current = '';
                currentOutputTranscription.current = '';
                setIsSpeaking(false);
             }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
                setIsSpeaking(true);
                const ctx = audioContextRef.current;
                
                // Ensure time monotonicity
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000
                );
                
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        // Small delay to allow visualizer to settle naturally
                        setTimeout(() => setIsSpeaking(false), 200); 
                    }
                });
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                stopAudio();
                setLogs(prev => [...prev, { role: 'model', text: '[Interrupted]', timestamp: new Date() }]);
                currentOutputTranscription.current = ''; // Clear partial transcription
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            setIsSpeaking(false);
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setConnectionState(ConnectionState.ERROR);
            setIsSpeaking(false);
          }
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionState(ConnectionState.ERROR);
    }
  };

  // Auto-scroll logs
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      
      {/* Top Bar */}
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            connectionState === ConnectionState.CONNECTED ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
            connectionState === ConnectionState.CONNECTING ? 'bg-gold-500 animate-pulse' :
            connectionState === ConnectionState.ERROR ? 'bg-red-500' :
            'bg-slate-600'
          }`} />
          <span className="text-sm font-medium text-slate-300">
            {connectionState === ConnectionState.CONNECTED ? 'Pelumi AI Active' : 
             connectionState === ConnectionState.CONNECTING ? 'Establishing Secure Line...' : 
             connectionState === ConnectionState.ERROR ? 'Connection Failed' : 'Agent Offline'}
          </span>
        </div>
        
        {connectionState === ConnectionState.CONNECTED && (
             <div className="flex gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2 rounded-full transition-colors ${isMuted ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                    {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button 
                  onClick={disconnect}
                  className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                    <PhoneOff size={18} />
                </button>
             </div>
        )}
      </div>

      {/* Main Conversation Area */}
      <div className="flex-1 p-6 relative flex flex-col items-center justify-center">
        
        {/* Background Ambient Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-900/0 to-slate-900/0 pointer-events-none" />

        {connectionState === ConnectionState.DISCONNECTED ? (
            <div className="text-center z-10 max-w-md space-y-6">
                <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-700">
                    <Activity className="w-10 h-10 text-slate-500" />
                </div>
                <div>
                    <h3 className="text-xl font-serif text-slate-200 mb-2">Speak with Pelumi</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Start a voice session to discuss your property needs, explore our premium packages, or schedule a viewing with our AI concierge.
                    </p>
                </div>
                <button 
                    onClick={connect}
                    className="group relative inline-flex items-center justify-center px-8 py-3 font-medium text-slate-950 transition-all duration-200 bg-gold-500 rounded-full hover:bg-gold-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-gold-500"
                >
                    <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                    <span className="relative flex items-center gap-2">
                        <Mic className="w-4 h-4" /> Start Conversation
                    </span>
                </button>
            </div>
        ) : connectionState === ConnectionState.CONNECTING ? (
            <div className="flex flex-col items-center justify-center z-10">
                <Loader2 className="w-12 h-12 text-gold-500 animate-spin mb-4" />
                <p className="text-slate-400 animate-pulse">Connecting to satellite secure line...</p>
            </div>
        ) : (
            <div className="w-full max-w-2xl h-full flex flex-col z-10">
                
                {/* Visualizer */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] mb-8 transition-all duration-500">
                     <div className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-700 ${
                         isSpeaking ? 'bg-gold-500/5 shadow-[0_0_60px_rgba(245,158,11,0.15)] scale-110' : 'bg-slate-800/30 scale-100'
                     }`}>
                         <div className={`absolute inset-0 rounded-full border border-gold-500/20 ${isSpeaking ? 'animate-[ping_3s_linear_infinite]' : ''}`} />
                         <div className={`absolute inset-4 rounded-full border border-gold-500/10 ${isSpeaking ? 'animate-[ping_3s_linear_infinite_0.5s]' : ''}`} />
                         
                         <Waveform active={isSpeaking} />
                     </div>
                     <p className="mt-8 text-sm text-gold-500/80 font-medium tracking-widest uppercase text-center">
                         {isSpeaking ? 'Pelumi is speaking' : 'Listening...'}
                     </p>
                </div>

                {/* Live Transcript / Log */}
                <div ref={scrollRef} className="h-48 overflow-y-auto space-y-4 pr-2 mask-linear-fade">
                    {logs.length === 0 && (
                        <p className="text-center text-slate-600 text-sm italic py-4">Transcript will appear here...</p>
                    )}
                    {logs.map((log, idx) => (
                        <div key={idx} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                log.role === 'user' 
                                ? 'bg-slate-800 text-slate-200 rounded-tr-sm' 
                                : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-tl-sm'
                            }`}>
                                <p>{log.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default LiveAgent;