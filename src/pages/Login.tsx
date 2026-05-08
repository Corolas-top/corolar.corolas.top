import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Bot, ShieldAlert } from "lucide-react";
import { trpc } from "@/providers/trpc";

// Particle canvas background
function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number }[] = [];
    const PARTICLE_COUNT = 80;
    const CONNECTION_DIST = 120;

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }

    function initParticles() {
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.2,
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201, 169, 110, 0.6)";
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = 1 - dist / CONNECTION_DIST;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(201, 169, 110, ${alpha * 0.12})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();

    window.addEventListener("resize", () => {
      resize();
      initParticles();
    });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}

export default function Login() {
  const [password, setPassword] = useState("");
  const [agentPassword, setAgentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      const key = data.type === "admin" ? "admin_token" : "agent_token";
      localStorage.setItem(key, data.token);
      localStorage.setItem("auth_type", data.type);
      if (data.permissions) {
        localStorage.setItem("agent_permissions", JSON.stringify(data.permissions));
      }
      window.location.href = "/";
    },
    onError: (err) => {
      setError(err.message === "Invalid password" ? "密码错误，拒绝访问" : err.message);
      setShake(true);
      setTimeout(() => setShake(false), 300);
      setTimeout(() => setError(""), 3000);
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");

    if (isAgentMode && agentPassword) {
      loginMutation.mutate({ password: agentPassword, isAgent: true });
    } else {
      loginMutation.mutate({ password });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Left: Brand Panel */}
      <div
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <ParticleBackground />
        <div className="relative z-10 flex flex-col items-center text-center px-8">
          {/* Corolas Logo SVG */}
          <div className="w-[120px] h-[120px] mb-8">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="55" stroke="var(--text-primary)" strokeWidth="1.5" fill="none" />
              <circle cx="60" cy="60" r="48" stroke="var(--text-primary)" strokeWidth="0.5" fill="none" />
              <circle cx="60" cy="60" r="40" stroke="var(--text-primary)" strokeWidth="0.5" fill="none" />
              {/* Greek key pattern around */}
              <path
                d="M20 20 L25 20 L25 25 L30 25 L30 20 L35 20 L35 25 L40 25 L40 20 L45 20"
                stroke="var(--text-primary)"
                strokeWidth="0.8"
                fill="none"
              />
              <text
                x="60"
                y="64"
                textAnchor="middle"
                fill="var(--text-primary)"
                fontSize="16"
                fontFamily="serif"
                fontWeight="400"
              >
                Corolas
              </text>
            </svg>
          </div>
          <h1
            className="text-[28px] font-light leading-relaxed tracking-wide mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            格物致知，异想天开
          </h1>
          <p
            className="text-xs tracking-[0.2em] uppercase"
            style={{ color: "var(--text-muted)" }}
          >
            Corolar Admin
          </p>
        </div>
        <p
          className="absolute bottom-8 left-0 right-0 text-center text-[11px]"
          style={{ color: "var(--text-muted)", zIndex: 10 }}
        >
          &copy; 2026 Corolas. All rights reserved.
        </p>
      </div>

      {/* Right: Login Form */}
      <div
        className="flex-1 flex items-center justify-center px-6"
        style={{ background: "var(--bg-card)" }}
      >
        <div className="w-full max-w-[360px]">
          <form onSubmit={handleSubmit} className={`${shake ? "animate-shake" : ""}`}>
            {/* Title */}
            <div className="mb-10">
              <h2 className="text-[20px] font-semibold" style={{ color: "var(--text-primary)" }}>
                管理员登录
              </h2>
              <p
                className="text-xs mt-1 tracking-[0.05em]"
                style={{ color: "var(--text-muted)" }}
              >
                Admin Console Access
              </p>
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <label
                className="block text-xs font-medium tracking-[0.02em] mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                访问密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 text-sm rounded-md outline-none transition-all duration-150"
                  style={{
                    background: "var(--bg-elevated)",
                    border: `1px solid ${error ? "var(--error)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  onFocus={(e) => {
                    if (!error) {
                      e.target.style.borderColor = "var(--border-gold)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.1)";
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = error ? "var(--error)" : "var(--border-subtle)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* AI Agent Toggle */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setIsAgentMode(!isAgentMode)}
                className="flex items-center gap-2 text-sm transition-colors duration-150"
                style={{ color: isAgentMode ? "var(--text-gold)" : "var(--text-secondary)" }}
              >
                <Bot size={16} />
                <span>以 AI Agent 身份登录</span>
              </button>

              {isAgentMode && (
                <div className="mt-3 animate-fade-in-up">
                  <label
                    className="block text-xs font-medium tracking-[0.02em] mb-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Agent 密码
                  </label>
                  <input
                    type="password"
                    value={agentPassword}
                    onChange={(e) => setAgentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 text-sm rounded-md outline-none transition-all duration-150"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--border-gold)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(201,169,110,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-subtle)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="mb-4 flex items-center gap-2 text-sm animate-fade-in-up"
                style={{ color: "var(--error)" }}
              >
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full h-12 rounded-lg font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--text-primary)",
                color: "var(--bg-primary)",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#e5e5e0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--text-primary)";
              }}
            >
              {loading ? (
                <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                "登录"
              )}
            </button>

            {/* Security Note */}
            <p
              className="mt-8 text-center text-[11px]"
              style={{ color: "var(--text-muted)" }}
            >
              此区域仅限授权人员访问。所有操作将被记录。
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
