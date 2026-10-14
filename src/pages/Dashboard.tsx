
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Search, UserPlus, Users, AlertTriangle, CheckCircle, RefreshCcw, CameraOff, Upload, ArrowUpRight, ArrowDownRight, CreditCard } from 'lucide-react';
import { Customer, UserSession } from '../types';

interface DashboardProps {
  session: UserSession;
  customers: Customer[];
  onCustomerSelected: (customer: Customer) => void;
  onCustomersSelected: (customers: Customer[]) => void;
  onRefreshData: () => void;
}

interface FaceVerificationFace {
  faceIndex: number;
  matchedCustomerId: string | null;
  matchFound: boolean;
  confidenceScore: number;
  boundingBox: [number, number, number, number];
}

interface MatchedCustomerResult {
  customerId: string;
  confidenceScore: number;
  boundingBox: [number, number, number, number];
}

interface FaceScanResult extends FaceVerificationFace {
  customer: Customer | null;
}

export default function Dashboard({ session, customers, onCustomerSelected, onCustomersSelected, onRefreshData }: DashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Customer Form states
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('25000');
  const [newCustImg, setNewCustImg] = useState(''); // Base64 data
  const [customerSaveError, setCustomerSaveError] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Add Customer Camera States
  const [regCameraActive, setRegCameraActive] = useState(false);
  const [regCameraStream, setRegCameraStream] = useState<MediaStream | null>(null);
  const regVideoRef = useRef<HTMLVideoElement | null>(null);

  // Camera Workspace States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'matched' | 'no-match' | 'error'>('idle');
  const [scannerMsg, setScannerMsg] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [faceResults, setFaceResults] = useState<FaceScanResult[]>([]);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [verificationBlocked, setVerificationBlocked] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stats
  const owesCount = customers.filter(c => c.balance > 0).length;
  const totalCreditSum = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const activeTemplateCount = customers.filter(c => c.image && c.image.length > 50).length;

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      if (regCameraStream) {
        regCameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream, regCameraStream]);

  // Bind streams to video elements when they mount
  useEffect(() => {
    if (cameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.error('Main camera play error:', e));
    }
  }, [cameraActive, cameraStream]);

  useEffect(() => {
    if (regCameraActive && regCameraStream && regVideoRef.current) {
      regVideoRef.current.srcObject = regCameraStream;
      regVideoRef.current.play().catch(e => console.error('Reg camera play error:', e));
    }
  }, [regCameraActive, regCameraStream]);

  // AI Scanner Background Auto-Scan Loop
  useEffect(() => {
    let scanInterval: ReturnType<typeof setInterval>;

    if (cameraActive && !verificationBlocked && scannerStatus !== 'matched' && scannerStatus !== 'error') {
      captureAndVerify(true);
      scanInterval = setInterval(() => {
        if (scannerStatus !== 'scanning') {
          captureAndVerify(true);
        }
      }, 3000);
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [cameraActive, scannerStatus, verificationBlocked]);

  // Add Customer Camera Functions
  const startRegCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      setRegCameraStream(stream);
      if (regVideoRef.current) {
        regVideoRef.current.srcObject = stream;
        regVideoRef.current.play();
      }
      setRegCameraActive(true);
    } catch (err) {
      console.error('Camera access permissions requested but blocked:', err);
    }
  };

  const stopRegCamera = () => {
    if (regCameraStream) {
      regCameraStream.getTracks().forEach(track => track.stop());
      setRegCameraStream(null);
    }
    setRegCameraActive(false);
  };

  const captureRegPhoto = () => {
    if (!regVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = regVideoRef.current.videoWidth || 300;
    canvas.height = regVideoRef.current.videoHeight || 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(regVideoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Img = canvas.toDataURL('image/jpeg');
      setNewCustImg(base64Img);
      stopRegCamera();
    }
  };

  // Turn on webcam
  const startCamera = async () => {
    setMatchedCustomer(null);
    setFaceResults([]);
    setVerificationBlocked(false);
    setScannerStatus('scanning');
    setScannerMsg('Launching live camera scan...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 300 } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access permissions requested but blocked:', err);
      setScannerStatus('error');
      setScannerMsg('Webcam permissions blocked or hardware absent. Please upload a face image to continue.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setMatchedCustomer(null);
    setFaceResults([]);
    setAwaitingConfirmation(false);
    setVerificationBlocked(false);
    setScannerStatus('idle');
    setScannerMsg('');
  };

  // Capture frame & verify
  const captureAndVerify = async (isAutoScan = false) => {
    if (!videoRef.current) return;

    if (!isAutoScan) {
      setScannerStatus('scanning');
      setScannerMsg('Extracting facial dimensions & checking ledger locks...');
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 400;
      canvas.height = videoRef.current.videoHeight || 300;
      if (canvas.width === 0 || canvas.height === 0) return;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64Img = canvas.toDataURL('image/jpeg');
        await sendVerificationRequest(base64Img, isAutoScan);
      }
    } catch (err) {
      if (!isAutoScan) {
        setScannerStatus('error');
        setScannerMsg('Screen frame capture failed.');
      }
    }
  };

  // Upload or Choose Test Photo File
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setScannerStatus('scanning');
      setScannerMsg('Processing uploaded image with local Python face recognition...');
      await sendVerificationRequest(base64);
    };
    reader.readAsDataURL(file);
  };

  // Trigger registration form image capture / upload
  const handleRegPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewCustImg(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const sendVerificationRequest = async (base64Data: string, isAutoScan = false) => {
    if (isAutoScan) {
      setScannerStatus('scanning');
      setScannerMsg('Auto-scanning environment for recognized faces...');
    }

    const controller = new AbortController();
    const timeoutMs = 8000; // abort if server doesn't respond in time
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch('/api/face/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const response = await res.json();
      if (response?.quotaExceeded || response?.analysis?.toLowerCase().includes('quota')) {
        setVerificationBlocked(true);
        setScannerStatus('error');
        setScannerMsg(response.analysis || 'Face recognition service is unavailable. Please start the Python face-recognition service.');
        return;
      }

      if (!res.ok) {
        throw new Error(response?.error || response?.analysis || 'Server matching crashed');
      }

      const matchedCustomers: MatchedCustomerResult[] = Array.isArray(response.matchedCustomers)
        ? response.matchedCustomers
        : [];
      const detectedFaces: FaceVerificationFace[] = Array.isArray(response.faces) && response.faces.length > 0
        ? response.faces
        : matchedCustomers.map((match, faceIndex) => ({
          faceIndex,
          matchedCustomerId: match.customerId,
          matchFound: true,
          confidenceScore: match.confidenceScore,
          boundingBox: match.boundingBox
        }));
      const results = detectedFaces.map(face => ({
        ...face,
        customer: face.matchedCustomerId
          ? customers.find(customer => customer.id === face.matchedCustomerId) || null
          : null
      }));
      setFaceResults(results);

      const matchedFaces = results.filter(
        (face): face is FaceScanResult & { customer: Customer } => face.matchFound && face.customer !== null
      );
      const uniqueMatchedCustomers = Array.from(new Map(
        matchedFaces.map(face => [face.customer!.id, face.customer!])
      ).values());
      if (uniqueMatchedCustomers.length > 1) {
        stopCamera();
        onCustomersSelected(uniqueMatchedCustomers);
        return;
      }

      if (matchedFaces.length > 0) {
        const bestFace = matchedFaces.find(face => face.matchedCustomerId === response.matchedCustomerId) || matchedFaces[0];
        setMatchedCustomer(bestFace.customer!);
        setConfidence(bestFace.confidenceScore);
        setScannerStatus('matched');
        setScannerMsg(`${matchedFaces.length} customer face${matchedFaces.length === 1 ? '' : 's'} matched. Select a customer below to review their ledger.`);
        setAwaitingConfirmation(true);
      } else if (response.matchFound && response.matchedCustomerId) {
        const found = customers.find(customer => customer.id === response.matchedCustomerId);
        if (found) {
          setMatchedCustomer(found);
          setConfidence(response.confidenceScore);
          setScannerStatus('matched');
          setScannerMsg(response.analysis || `Identity Confirmed: ${found.name}! Please confirm to open ledger.`);
          setAwaitingConfirmation(true);
        } else {
          setScannerStatus('no-match');
          setScannerMsg('Matched customer ID was not found in the local database.');
        }
      } else {
        setScannerStatus('no-match');
        setScannerMsg(response.analysis || 'Match rejected. Keep face in frame to retry auto-scan.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const message = isAbort
        ? 'Face recognition service is not responding. Start the Python service and click Retry.'
        : (err.message || 'Face comparison adapter connection error.');
      if (/quota|rate limit|exceeded|429/i.test(message)) {
        setVerificationBlocked(true);
      }
      // Always stop the auto-scan loop on any error — user must click Retry
      setScannerStatus('error');
      setScannerMsg(message);
    }
  };

  // Handle confirming the matched customer
  const handleConfirmMatch = () => {
    if (matchedCustomer) {
      setAwaitingConfirmation(false);
      stopCamera();
      onCustomerSelected(matchedCustomer);
    }
  };

  // Handle rejecting the matched customer and continue scanning
  const handleRejectMatch = () => {
    setMatchedCustomer(null);
    setAwaitingConfirmation(false);
    setScannerStatus('idle');
    setScannerMsg('');
    setConfidence(0);
  };

  // Handle register customer submission
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCustName.trim();
    const phone = newCustPhone.trim();
     if (!/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(name)) {
      setCustomerSaveError('Enter a name using letters only.');
      return;
    }
    if (!/^\d{11}$/.test(phone)) {
      setCustomerSaveError('Enter an 11-digit phone number using digits only.');
      return;
    }

    setCustomerSaveError('');
    setIsSavingCustomer(true);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address: newCustAddress,
          creditLimit: Number(newCustLimit),
          image: newCustImg // registered face template
        })
      });

      const response = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(response.error || `Customer registration failed (HTTP ${res.status}).`);
      }

      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      setNewCustImg('');
      setShowAddForm(false);
      stopRegCamera();
      onRefreshData();
    } catch (error) {
      setCustomerSaveError(error instanceof Error ? error.message : 'Could not save customer. Please try again.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6" id="dashboard-cockpit">
      {/* Overview Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-6 flex justify-between items-center relative overflow-hidden">
          <div className="space-y-1">
            <span className="stat-label text-slate-400">Active Customers</span>
            <h3 className="text-3xl font-extrabold font-sans text-white">{customers.length} Accounts</h3>
            <p className="text-[10px] text-slate-400/80 font-medium">Of which ({owesCount}) carry outstanding tabs</p>
          </div>
          <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl">
            <Users className="w-6.5 h-6.5" />
          </div>
        </div>

        <div className="glass-card p-6 flex justify-between items-center relative overflow-hidden">
          <div className="space-y-1">
            <span className="stat-label text-rose-400">Total Ledger Credits</span>
            <h3 className="text-3xl font-extrabold font-sans text-rose-400">Rs. {totalCreditSum.toLocaleString('en-PK')}</h3>
            <p className="text-[10px] text-slate-400/80 font-medium">Accumulated client liabilities</p>
          </div>
          <div className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl">
            <ArrowDownRight className="w-6.5 h-6.5" />
          </div>
        </div>

        <div className="glass-card p-6 flex justify-between items-center relative overflow-hidden">
          <div className="space-y-1">
            <span className="stat-label text-emerald-400">Face Templates</span>
            <h3 className="text-3xl font-extrabold font-sans text-emerald-400">{activeTemplateCount} Enrolled</h3>
            <p className="text-[10px] text-slate-400/80 font-medium">{((activeTemplateCount / (customers.length || 1)) * 100).toFixed(0)}% Face Registration Rate</p>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-2xl">
            <Camera className="w-6.5 h-6.5" />
          </div>
        </div>
      </div>

      {/* Main interactive grid: Left Camera Scanner, Right Register search list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Face Recognition module workspace (Left: 5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 md:p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold font-sans tracking-tight text-white flex items-center gap-2">
              <Camera className="w-5.5 h-5.5 text-blue-400" />
              AI Face Recognition Terminal
            </h3>
            <p className="text-xs text-slate-400">Identify store customers instantly and review their digital khata.</p>
          </div>

          {/* Video Feed Monitor viewport */}
          <div className="w-full aspect-[4/3] bg-slate-950/90 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {faceResults.map(face => {
                  const [x, y, width, height] = face.boundingBox;
                  const frameWidth = videoRef.current?.videoWidth || 400;
                  const frameHeight = videoRef.current?.videoHeight || 300;
                  const isMatched = face.matchFound && face.customer;

                  return (
                    <div
                      key={face.faceIndex}
                      className={`absolute border-2 ${isMatched ? 'border-emerald-400' : 'border-rose-400'}`}
                      style={{
                        left: `${((frameWidth - x - width) / frameWidth) * 100}%`,
                        top: `${(y / frameHeight) * 100}%`,
                        width: `${(width / frameWidth) * 100}%`,
                        height: `${(height / frameHeight) * 100}%`
                      }}
                    >
                      <span className={`absolute -top-5 left-0 max-w-full truncate px-1 text-[9px] font-bold text-white ${isMatched ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                        {isMatched ? `${face.customer?.name} (${face.confidenceScore}%)` : 'Unknown'}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex flex-col items-center p-4 text-center space-y-2">
                <CameraOff className="w-10 h-10 text-slate-600 animate-pulse" />
                <p className="text-xs text-slate-500 max-w-xs font-mono uppercase tracking-wider">Face lock camera currently offline</p>
              </div>
            )}

            {/* Glowing Scan Target Frame overlay */}
            {cameraActive && (
              <div className="absolute inset-x-12 inset-y-8 border-2 border-dashed border-blue-500/30 rounded-3xl flex items-center justify-center pointer-events-none overflow-hidden glow-blue">
                {/* Immersive AI Scanner Line */}
                <div className="ai-scanner-line" />

                <div className="w-6 h-6 border-t-2 border-l-2 border-blue-400 absolute top-0 left-0" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-blue-400 absolute top-0 right-0" />
                <div className="w-6 h-6 border-b-2 border-l-2 border-blue-400 absolute bottom-0 left-0" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-blue-400 absolute bottom-0 right-0" />

                {/* Subtle digital coordinates watermarks */}
                <span className="absolute bottom-2 left-2 text-[8px] font-mono text-blue-400 opacity-60">CAM_01 // ACTIVE</span>
                <span className="absolute top-2 right-2 text-[8px] font-mono text-emerald-400 opacity-60">99.98%</span>
              </div>
            )}
          </div>

          {/* Dynamic scanner status notifications & match details */}
          {scannerStatus !== 'idle' && (
            <div className={`p-4 rounded-2xl border ${scannerStatus === 'scanning' ? 'bg-blue-950/20 border-blue-500/20 text-blue-400' : scannerStatus === 'matched' ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'} text-xs space-y-2`}>
              <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
                {scannerStatus === 'scanning' && <RefreshCcw className="w-4 h-4 animate-spin text-blue-400" />}
                {scannerStatus === 'matched' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {scannerStatus === 'no-match' && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                <span>{scannerStatus}</span>
              </div>
              <p className="font-sans leading-relaxed">{scannerMsg}</p>

              {matchedCustomer && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white tracking-wide">{matchedCustomer.name}</p>
                    <p className="text-[10px] text-slate-400 whitespace-nowrap">Current Tab: <span className="text-rose-400 font-bold">Rs. {matchedCustomer.balance.toLocaleString()}</span></p>
                  </div>

                  {awaitingConfirmation ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleConfirmMatch}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest cursor-pointer transition-all shadow-md shadow-emerald-500/20"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={handleRejectMatch}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest cursor-pointer transition-all shadow-md shadow-rose-500/20"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        stopCamera();
                        onCustomerSelected(matchedCustomer);
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest cursor-pointer transition-all shadow-md shadow-blue-500/20"
                    >
                      Open Profile
                    </button>
                  )}
                </div>
              )}

              {faceResults.some(face => face.matchFound && face.customer) && (
                <div className="grid grid-cols-1 gap-2 pt-2">
                  {faceResults.filter(face => face.matchFound && face.customer).map(face => (
                    <button
                      key={face.faceIndex}
                      type="button"
                      onClick={() => {
                        setMatchedCustomer(face.customer!);
                        setConfidence(face.confidenceScore);
                        setAwaitingConfirmation(true);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${matchedCustomer?.id === face.customer?.id ? 'border-emerald-400/60 bg-emerald-950/30' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-white">{face.customer?.name}</span>
                        <span className="shrink-0 text-emerald-300">{face.confidenceScore}%</span>
                      </span>
                      <span className="block text-slate-400">Phone: {face.customer?.phone}</span>
                      <span className="block text-slate-400">Credit limit: Rs. {face.customer?.creditLimit.toLocaleString('en-PK')}</span>
                      <span className="block text-rose-300">Balance: Rs. {face.customer?.balance.toLocaleString('en-PK')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action buttons controls panel */}
          <div className="space-y-3">
            <div className="flex gap-2">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-[0.98] transition-all text-center cursor-pointer"
                >
                  Enable Digital Camera
                </button>
              ) : (
                <>
                  <div className="flex-1 py-3 bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-2xl text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2">
                    <RefreshCcw className="w-4 h-4 animate-spin" /> Auto-Scanning Active
                  </div>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold uppercase cursor-pointer transition-all"
                  >
                    Close
                  </button>
                </>
              )}
            </div>

            {/* File upload fallback for manual verification */}
            <div className="pt-4 border-t border-white/5 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                <span>Upload Face Image</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload File
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Search, Register Admin Form & Customer List (Right: 7 cols) */}
        <div className="lg:col-span-7 glass-card p-5 md:p-6 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div>
              <h3 className="text-lg font-bold font-sans tracking-tight text-white">Digital Ledger Directory</h3>
              <p className="text-xs text-slate-400">Search customer tabs, create statements, and record credentials.</p>
            </div>

            <button
              onClick={() => {
                if (showAddForm) {
                  stopRegCamera();
                }
                setShowAddForm(!showAddForm);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4" />
              Enroll Customer
            </button>
          </div>

          {/* Add Customer form dropdown drawer */}
          {showAddForm && (
            <form onSubmit={handleAddCustomer} className="p-4.5 bg-slate-900/40 border border-blue-500/20 rounded-2xl space-y-4 animate-fadeIn">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" /> Enrolling New Customer Profile
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Customer Full Name*</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karan Dev"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value.replace(/[^\p{L}\p{M} .'-]/gu, ''))}
                    className="w-full bg-[#111936] border border-white/5 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">WhatsApp Hotline*</label>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    minLength={11}
                    maxLength={11}
                    placeholder="e.g. 03001234567"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full bg-[#111936] border border-white/5 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Physical Delivery Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Block 4, Gulshan-e-Iqbal, Karachi"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    className="w-full bg-[#111936] border border-white/5 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Initial Credit Limit Capacity (Rs.)</label>
                  <input
                    type="number"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(e.target.value)}
                    className="w-full bg-[#111936] border border-white/5 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Photo Registration Zone */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Enlist Customer Face Match image</label>

                {regCameraActive ? (
                  <div className="space-y-2 border border-blue-500/20 p-2 rounded-xl bg-blue-950/20">
                    <div className="w-full aspect-[4/3] bg-slate-950 rounded-lg overflow-hidden relative">
                      <video
                        ref={regVideoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute inset-0 border-2 border-blue-400/30 rounded-lg pointer-events-none"></div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={captureRegPhoto}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Capture Face
                      </button>
                      <button
                        type="button"
                        onClick={stopRegCamera}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={startRegCamera}
                        className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors border border-indigo-500/30 shadow-md cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" /> Use Webcam
                      </button>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">OR</span>
                      <input
                        type="file"
                        onChange={handleRegPhotoUpload}
                        accept="image/*"
                        className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:transition-colors file:cursor-pointer cursor-pointer"
                      />
                    </div>
                    {newCustImg ? (
                      <div className="relative w-max mt-1">
                        <img
                          src={newCustImg}
                          alt="Preview"
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-400 shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => setNewCustImg('')}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-0.5 hover:bg-rose-400 shadow-md transition-colors cursor-pointer"
                          title="Remove Photo"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-amber-400/90 font-medium">⚠️ No face photo added — camera scanning will not match this customer until a face photo is provided.</p>
                    )}
                  </div>
                )}
              </div>

              {customerSaveError && (
                <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
                  {customerSaveError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    stopRegCamera();
                  }}
                  className="px-4.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:cursor-wait disabled:opacity-60"
                >
                  {isSavingCustomer ? 'Saving...' : 'Secure Registry'}
                </button>
              </div>
            </form>
          )}

          {/* Quick Filter Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search customers by name prefix or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1527] border border-white/5 focus:border-blue-500 rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none transition-colors"
            />
          </div>

          {/* Customers Directory list view */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredCustomers.map(c => (
              <div
                key={c.id}
                onClick={() => onCustomerSelected(c)}
                className="p-4 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  {c.image && c.image.length > 50 ? (
                    <img
                      src={c.image}
                      alt={c.name}
                      referrerPolicy="no-referrer"
                      className="w-10.5 h-10.5 rounded-xl object-cover border border-white/10 shrink-0"
                    />
                  ) : (
                    <div className="w-10.5 h-10.5 rounded-xl bg-slate-800 text-blue-400 text-sm font-bold flex items-center justify-center border border-white/5 shrink-0 uppercase">
                      {c.name.charAt(0)}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{c.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">{c.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right space-y-0.5">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Ledger Tab</span>
                    <p className={`text-sm font-extrabold ${c.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      Rs. {c.balance.toLocaleString('en-PK')}
                    </p>
                  </div>

                  <div className="p-1.5 bg-white/5 text-slate-500 hover:text-white rounded-lg transition-colors">
                    <ArrowUpRight className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <p className="text-center py-12 text-xs text-slate-500 font-mono uppercase tracking-wider">No matching customers found in your ledger records.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
