import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Bot, ShieldAlert } from "lucide-react";
import { trpc } from "@/providers/trpc";

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

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    function init() {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        particles.push({ x: Math.random() * canvas!.width, y: Math.random() * canvas!.height, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2 });
      }
    }
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
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONN) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(201,169,110,${(1 - d / CONN) * 0.12})`; ctx.lineWidth = 1; ctx.stroke();
          }
        }
      }
      anim = requestAnimationFrame(draw);
    }
    resize(); init(); draw();
    window.addEventListener("resize", () => { resize(); init(); });
    return () => cancelAnimationFrame(anim);
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

export default function Login() {
  const [password, setPassword] = useState("");
  const [masterKey, setMasterKey] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const loginMut = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("corolar_token", data.token);
      localStorage.setItem("corolar_type", data.type);
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message || "Login failed");
      setShake(true);
      setTimeout(() => setShake(false), 300);
      setTimeout(() => setError(""), 4000);
      setLoading(false);
    },
    onSettled: () => setLoading(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !masterKey.trim()) return;
    setLoading(true);
    setError("");
    loginMut.mutate({ password, masterKey, isAgent });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-coro-bg">
      {/* Left: Brand */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center bg-coro-bg">
        <ParticleCanvas />
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          <svg viewBox="0 0 120 120" width="120" height="120" fill="none">
            <circle cx="60" cy="60" r="55" stroke="currentColor" strokeWidth="1.5" className="text-coro-text-primary" />
            <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="0.5" className="text-coro-text-primary" />
            <text x="60" y="68" textAnchor="middle" fill="currentColor" fontSize="16" fontFamily="serif" className="text-coro-text-primary">Corolas</text>
          </svg>
          <h1 className="text-2xl font-light mt-6 tracking-wide text-coro-text-secondary">格物致知，异想天开</h1>
          <p className="text-xs tracking-[0.2em] uppercase mt-3 text-coro-text-muted">Corolar Admin</p>
        </div>
        <p className="absolute bottom-8 text-xs text-coro-text-muted z-10">&copy; 2026 Corolas. All rights reserved.</p>
      </div>

      {/* Right: Login */}
      <div className="flex-1 flex items-center justify-center px-6 bg-coro-card">
        <div className={`w-full max-w-sm ${shake ? "animate-shake" : ""}`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-coro-text-primary">管理员登录</h2>
              <p className="text-xs mt-1 tracking-wider text-coro-text-muted">Admin Console Access</p>
            </div>

            {/* Master Key */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-coro-text-secondary">管理员密钥</label>
              <input
                type="password"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="Master key"
                className="w-full h-12 px-4 text-sm rounded-md outline-none transition-all bg-coro-elevated border focus:border-coro-gold-30 focus:ring-2 focus:ring-coro-gold-10 text-coro-text-primary font-mono"
                style={{ borderColor: error ? "var(--color-coro-error)" : "rgba(255,255,255,0.06)" }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5 text-coro-text-secondary">访问密码</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 text-sm rounded-md outline-none transition-all bg-coro-elevated border focus:border-coro-gold-30 focus:ring-2 focus:ring-coro-gold-10 text-coro-text-primary font-mono"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-coro-text-muted hover:text-coro-text-secondary">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* AI Agent toggle */}
            <button type="button" onClick={() => setIsAgent(!isAgent)} className="flex items-center gap-2 text-sm transition-colors" style={{ color: isAgent ? "#c9a96e" : "var(--tw-colors-coro-text-secondary)" }}>
              <Bot size={16} />
              <span>以 AI Agent 身份登录</span>
            </button>

            {error && (
              <div className="flex items-center gap-2 text-sm animate-fade-in-up text-coro-error">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password.trim() || !masterKey.trim()}
              className="w-full h-12 rounded-lg font-semibold text-sm transition-all bg-coro-text-primary text-coro-bg hover:bg-[#e5e5e0] disabled:opacity-50"
            >
              {loading ? <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "登录"}
            </button>

            <p className="text-center text-[11px] text-coro-text-muted">此区域仅限授权人员访问。所有操作将被记录。</p>
          </form>
        </div>
      </div>
    </div>
  );
}
