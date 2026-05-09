import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ShieldAlert, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setLoginSession } from "@/hooks/useAuth";
import { useLang } from "@/hooks/useLang";

const MASTER_KEY = import.meta.env.VITE_MASTER_KEY;

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const particles: { x: number; y: number; vx: number; vy: number }[] = [];
    const COUNT = 80, CONN = 120;
    let anim: number;
    function resize() { canvas!.width = canvas!.offsetWidth; canvas!.height = canvas!.offsetHeight; }
    function init() { particles.length = 0; for (let i = 0; i < COUNT; i++) particles.push({ x: Math.random() * canvas!.width, y: Math.random() * canvas!.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2 }); }
    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201,169,110,0.6)"; ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < CONN) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(201,169,110,${(1 - d / CONN) * 0.12})`; ctx.lineWidth = 1; ctx.stroke(); }
      }
      anim = requestAnimationFrame(draw);
    }
    resize(); init(); draw();
    window.addEventListener("resize", () => { resize(); init(); });
    return () => cancelAnimationFrame(anim);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function genCaptcha() {
  const ops = ["+", "-", "*"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * 20) + 1;
  let b = Math.floor(Math.random() * 20) + 1;
  if (op === "-") { if (a < b) [a, b] = [b, a]; }
  if (op === "*") { a = Math.floor(Math.random() * 9) + 1; b = Math.floor(Math.random() * 9) + 1; }
  let answer: number;
  switch (op) { case "+": answer = a + b; break; case "-": answer = a - b; break; case "*": answer = a * b; break; default: answer = 0; }
  return { question: `${a} ${op} ${b} = ?`, answer: String(answer) };
}

export default function Login() {
  const { t } = useLang();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [masterKey, setMasterKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState(genCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 300);
    setTimeout(() => setError(""), 4000);
  };

  const verifyMasterKey = () => {
    if (masterKey.trim() !== MASTER_KEY) { showError(t("login.invalidMasterKey")); return; }
    setError("");
    setCaptcha(genCaptcha());
    setStep(2);
  };

  const verifyCaptcha = () => {
    if (captchaInput.trim() !== captcha.answer) { showError(t("login.invalidCaptcha")); setCaptcha(genCaptcha()); setCaptchaInput(""); return; }
    setError("");
    setStep(3);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    const { data, error: sbError } = await supabase.auth.signInWithPassword({ email, password });
    if (sbError || !data.session) {
      showError(sbError?.message || "Login failed");
      setLoading(false);
      return;
    }
    setLoginSession(data.session.access_token);
    // Log activity directly via Supabase
    try {
      await supabase.from("activity_logs").insert({ actor_type: "admin", action: "login", target_type: "system" });
    } catch { /* ignore */ }
    window.location.href = "/";
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505]">
      {/* Left: Brand */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center">
        <ParticleCanvas />
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <img src="/logo.png" alt="Corolas" className="w-[120px] h-[120px] object-contain mb-6" />
          <h1 className="text-2xl font-light mt-4 tracking-wide text-[rgba(245,245,240,0.6)]">格物致知，异想天开</h1>
          <p className="text-xs tracking-[0.2em] uppercase mt-3 text-[rgba(245,245,240,0.35)]">Corolar Admin Console</p>
        </div>
        <p className="absolute bottom-8 text-xs text-[rgba(245,245,240,0.35)] z-10">&copy; 2026 Corolas. All rights reserved.</p>
      </div>

      {/* Right: Login Steps */}
      <div className="flex-1 flex items-center justify-center px-6 bg-[#0a0a0a]">
        <div className={`w-full max-w-sm ${shake ? "animate-shake" : ""}`}>
          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${step >= s ? "bg-[rgba(201,169,110,0.15)] text-[#c9a96e]" : "bg-[#111] text-[rgba(245,245,240,0.35)]"}`}>
                  {step > s ? <Check size={14} /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-px transition-all ${step > s ? "bg-[#c9a96e]" : "bg-[rgba(255,255,255,0.06)]"}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Master Key */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-semibold text-[#f5f5f0]">{t("login.step1")}</h2>
                <p className="text-xs mt-1 text-[rgba(245,245,240,0.35)]">{t("login.masterKeyDesc")}</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("login.masterKey")}</label>
                <input type="password" value={masterKey} onChange={e => setMasterKey(e.target.value)}
                  placeholder={t("login.masterKeyPlaceholder")}
                  className="w-full h-12 px-4 text-sm rounded-md outline-none bg-[#111] border text-[#f5f5f0] font-mono focus:border-[rgba(201,169,110,0.3)] focus:ring-2 focus:ring-[rgba(201,169,110,0.1)] transition-all"
                  style={{ borderColor: error ? "#f87171" : "rgba(255,255,255,0.06)" }}
                  onKeyDown={e => { if (e.key === "Enter") verifyMasterKey(); }} />
              </div>
              {error && <div className="flex items-center gap-2 text-sm text-[#f87171]"><ShieldAlert size={16} /><span>{error}</span></div>}
              <button onClick={verifyMasterKey}
                className="w-full h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-[#f5f5f0] text-[#050505] hover:bg-[#e5e5e0] disabled:opacity-50 transition-all"
                disabled={!masterKey.trim()}>
                {t("login.verify")} <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: CAPTCHA */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-semibold text-[#f5f5f0]">{t("login.step2")}</h2>
                <p className="text-xs mt-1 text-[rgba(245,245,240,0.35)]">{t("login.captchaDesc")}</p>
              </div>
              <div className="p-6 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.06)] text-center">
                <p className="text-3xl font-mono text-[#c9a96e] tracking-wider">{captcha.question}</p>
              </div>
              <input type="text" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)}
                placeholder={t("login.captchaPlaceholder")}
                className="w-full h-12 px-4 text-sm rounded-md outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0] font-mono focus:border-[rgba(201,169,110,0.3)] focus:ring-2 focus:ring-[rgba(201,169,110,0.1)] transition-all"
                onKeyDown={e => { if (e.key === "Enter") verifyCaptcha(); }} />
              {error && <div className="flex items-center gap-2 text-sm text-[#f87171]"><ShieldAlert size={16} /><span>{error}</span></div>}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex items-center justify-center gap-1 h-12 px-4 rounded-lg text-sm text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.05)] transition-all"><ArrowLeft size={16} /> {t("notes.cancel")}</button>
                <button onClick={verifyCaptcha}
                  className="flex-1 h-12 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 bg-[#f5f5f0] text-[#050505] hover:bg-[#e5e5e0] disabled:opacity-50 transition-all"
                  disabled={!captchaInput.trim()}>
                  {t("login.verify")} <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Supabase Auth */}
          {step === 3 && (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in-up">
              <div>
                <h2 className="text-xl font-semibold text-[#f5f5f0]">{t("login.step3")}</h2>
                <p className="text-xs mt-1 text-[rgba(245,245,240,0.35)]">{t("login.authDesc")}</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("login.email")}</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  className="w-full h-12 px-4 text-sm rounded-md outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0] focus:border-[rgba(201,169,110,0.3)] focus:ring-2 focus:ring-[rgba(201,169,110,0.1)] transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-[rgba(245,245,240,0.6)]">{t("login.password")}</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    className="w-full h-12 px-4 pr-12 text-sm rounded-md outline-none bg-[#111] border border-[rgba(255,255,255,0.06)] text-[#f5f5f0] font-mono focus:border-[rgba(201,169,110,0.3)] focus:ring-2 focus:ring-[rgba(201,169,110,0.1)] transition-all" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(245,245,240,0.35)] hover:text-[rgba(245,245,240,0.6)]">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && <div className="flex items-center gap-2 text-sm text-[#f87171]"><ShieldAlert size={16} /><span>{error}</span></div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex items-center justify-center gap-1 h-12 px-4 rounded-lg text-sm text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.05)] transition-all"><ArrowLeft size={16} /> {t("notes.cancel")}</button>
                <button type="submit" disabled={loading || !email.trim() || !password.trim()}
                  className="flex-1 h-12 rounded-lg font-semibold text-sm bg-[#f5f5f0] text-[#050505] hover:bg-[#e5e5e0] disabled:opacity-50 transition-all">
                  {loading ? <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : t("login.signIn")}
                </button>
              </div>
              <p className="text-center text-[11px] text-[rgba(245,245,240,0.35)]">{t("login.securityNotice")}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
