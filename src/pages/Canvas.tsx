import { useState, useRef, useEffect, useCallback } from "react";
import { MousePointer, Pen, StickyNote, Type, Minus, Square, Circle, ZoomIn, ZoomOut, Maximize, Download, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Tool = "select" | "pen" | "note" | "text" | "line" | "rect" | "circle";
type El = { id: string; type: Tool; x: number; y: number; width?: number; height?: number; text?: string; color?: string; points?: { x: number; y: number }[]; fromX?: number; fromY?: number; toX?: number; toY?: number };

const TOOLS: { id: Tool; icon: typeof MousePointer; label: string }[] = [
  { id: "select", icon: MousePointer, label: "选择" },
  { id: "pen", icon: Pen, label: "画笔" },
  { id: "note", icon: StickyNote, label: "便签" },
  { id: "text", icon: Type, label: "文字" },
  { id: "line", icon: Minus, label: "连线" },
  { id: "rect", icon: Square, label: "矩形" },
  { id: "circle", icon: Circle, label: "圆形" },
];
const COLORS = ["#c9a96e", "#f5f5f0", "#4ade80", "#f87171", "#60a5fa", "#fbbf24"];

export default function CanvasPage() {
  const [els, setEls] = useState<El[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#c9a96e");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const panStart = useRef({ x: 0, y: 0 });
  const drawStart = useRef({ x: 0, y: 0 });

  // Load from Supabase on mount
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("canvas_data").select("elements").order("id", { ascending: false }).limit(1).single();
      if (!error && data?.elements) setEls(data.elements as El[]);
      setIsLoading(false);
    };
    load();
  }, []);

  // Auto-save to Supabase every 5s
  useEffect(() => {
    if (els.length === 0) return;
    const iv = setInterval(async () => {
      const { data: existing } = await supabase.from("canvas_data").select("id, version").eq("id", 1).single();
      if (existing) {
        await supabase.from("canvas_data").update({ elements: els as any, version: (existing.version || 0) + 1, updated_at: new Date().toISOString() }).eq("id", 1);
      } else {
        await supabase.from("canvas_data").insert({ id: 1, elements: els as any, version: 1 });
      }
      setStatus("已保存"); setTimeout(() => setStatus(""), 2000);
    }, 5000);
    return () => clearInterval(iv);
  }, [els]);

  const s2c = useCallback((sx: number, sy: number) => ({ x: (sx - offset.x) / zoom, y: (sy - offset.y) / zoom }), [offset, zoom]);

  const onDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) { setPanning(true); panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; return; }
    const p = s2c(e.clientX, e.clientY);
    if (tool === "select") {
      const clicked = [...els].reverse().find(el => el.type === "note" || el.type === "text" || el.type === "rect" || el.type === "circle" ? p.x >= el.x && p.x <= el.x + (el.width || 100) && p.y >= el.y && p.y <= el.y + (el.height || (el.type === "note" ? 100 : 30)) : false);
      setSel(clicked?.id || null); return;
    }
    if (tool === "pen") { setDrawing(true); const id = Date.now().toString(); setEls(prev => [...prev, { id, type: "pen", x: p.x, y: p.y, color, points: [{ x: p.x, y: p.y }] }]); return; }
    if (tool === "line" || tool === "rect" || tool === "circle") { setDrawing(true); drawStart.current = p; return; }
    if (tool === "note") { setEls(prev => [...prev, { id: Date.now().toString(), type: "note", x: p.x - 50, y: p.y - 50, width: 100, height: 100, text: "新便签", color: "#fbbf24" }]); return; }
    if (tool === "text") { setEls(prev => [...prev, { id: Date.now().toString(), type: "text", x: p.x, y: p.y, text: "点击编辑", color }]); }
  };

  const onMove = (e: React.MouseEvent) => {
    if (panning) { setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }); return; }
    if (!drawing) return;
    const p = s2c(e.clientX, e.clientY);
    if (tool === "pen") setEls(prev => { const last = prev[prev.length - 1]; if (last?.type === "pen") return [...prev.slice(0, -1), { ...last, points: [...(last.points || []), p] }]; return prev; });
  };

  const onUp = (e: React.MouseEvent) => {
    if (panning) { setPanning(false); return; }
    if (!drawing) return;
    setDrawing(false); const p = s2c(e.clientX, e.clientY);
    if (tool === "line") setEls(prev => [...prev, { id: Date.now().toString(), type: "line", x: drawStart.current.x, y: drawStart.current.y, fromX: drawStart.current.x, fromY: drawStart.current.y, toX: p.x, toY: p.y, color }]);
    if (tool === "rect" || tool === "circle") setEls(prev => [...prev, { id: Date.now().toString(), type: tool, x: Math.min(drawStart.current.x, p.x), y: Math.min(drawStart.current.y, p.y), width: Math.abs(p.x - drawStart.current.x), height: Math.abs(p.y - drawStart.current.y), color }]);
  };

  return (
    <div className="fixed inset-0 bg-[#050505]">
      {isLoading && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#050505]">
          <div className="w-8 h-8 border-2 border-[#c9a96e] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-[#0a0a0a]/80 backdrop-blur border border-[rgba(255,255,255,0.06)]">
        {TOOLS.map(t => { const I = t.icon; const a = tool === t.id; return <button key={t.id} onClick={() => setTool(t.id)} title={t.label} className={`p-2 rounded-lg transition-all ${a ? "bg-[rgba(201,169,110,0.2)] text-[#c9a96e]" : "text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.05)]"}`}><I size={18} /></button>; })}
        <div className="w-px h-5 mx-1 bg-[rgba(255,255,255,0.06)]" />
        {tool !== "select" && tool !== "note" && COLORS.map(c => <button key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full transition-transform" style={{ background: c, transform: color === c ? "scale(1.2)" : "scale(1)", boxShadow: color === c ? `0 0 0 2px #050505,0 0 0 3px ${c}` : "none" }} />)}
        <div className="w-px h-5 mx-1 bg-[rgba(255,255,255,0.06)]" />
        <button onClick={() => { const b = new Blob([JSON.stringify(els)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `canvas-${Date.now()}.json`; a.click(); URL.revokeObjectURL(u); }} className="p-2 rounded-lg text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.05)] transition-colors" title="导出"><Download size={18} /></button>
        <button onClick={() => sel && setEls(prev => prev.filter(e => e.id !== sel))} className="p-2 rounded-lg text-[rgba(245,245,240,0.6)] hover:bg-[rgba(255,255,255,0.05)] transition-colors" title="删除"><Trash2 size={18} /></button>
      </div>

      <div className="absolute inset-0 overflow-hidden cursor-crosshair"
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp}
        onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.1, Math.min(5, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${offset.x}px ${offset.y}px`, cursor: panning ? "grabbing" : tool === "select" ? "default" : "crosshair" }}>
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          {els.map(el => <CanvasEl key={el.id} el={el} sel={sel === el.id} onUpd={u => setEls(prev => prev.map(e => e.id === el.id ? { ...e, ...u } : e))} onDel={() => setEls(prev => prev.filter(e => e.id !== el.id))} />)}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0a0a0a]/80 backdrop-blur border border-[rgba(255,255,255,0.06)]">
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-1.5 rounded text-[rgba(245,245,240,0.6)] hover:text-[#f5f5f0]"><ZoomOut size={16} /></button>
        <span className="text-xs font-medium min-w-[50px] text-center text-[rgba(245,245,240,0.6)]">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(5, z + 0.1))} className="p-1.5 rounded text-[rgba(245,245,240,0.6)] hover:text-[#f5f5f0]"><ZoomIn size={16} /></button>
        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-1.5 rounded text-[rgba(245,245,240,0.6)] hover:text-[#f5f5f0] ml-1" title="适应"><Maximize size={16} /></button>
      </div>
      {status && <div className="absolute bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg text-xs animate-fade-in-up bg-[#111] text-[rgba(245,245,240,0.6)] border border-[rgba(255,255,255,0.06)]">{status}</div>}
    </div>
  );
}

function CanvasEl({ el, sel, onUpd, onDel }: { el: El; sel: boolean; onUpd: (u: Partial<El>) => void; onDel: () => void }) {
  const [editing, setEditing] = useState(false);
  if (el.type === "pen" && el.points) {
    const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}><path d={d} fill="none" stroke={el.color || "#c9a96e"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  if (el.type === "line") return <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}><line x1={el.fromX} y1={el.fromY} x2={el.toX} y2={el.toY} stroke={el.color || "#c9a96e"} strokeWidth={2} /></svg>;
  if (el.type === "rect") return <div className="absolute" style={{ left: el.x, top: el.y, width: el.width, height: el.height, border: `2px solid ${el.color || "rgba(255,255,255,0.1)"}`, borderRadius: 4, background: sel ? "rgba(201,169,110,0.05)" : "transparent" }} />;
  if (el.type === "circle") return <div className="absolute rounded-full" style={{ left: el.x, top: el.y, width: el.width, height: el.height, border: `2px solid ${el.color || "rgba(255,255,255,0.1)"}`, background: sel ? "rgba(201,169,110,0.05)" : "transparent" }} />;
  if (el.type === "note") return (
    <div className="absolute" style={{ left: el.x, top: el.y, width: el.width || 100, height: el.height || 100, background: el.color || "#fbbf24", borderRadius: 4, padding: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.2)", color: "#1a1a1a" }} onDoubleClick={() => setEditing(true)}>
      {editing ? <textarea autoFocus value={el.text || ""} onChange={e => onUpd({ text: e.target.value })} onBlur={() => setEditing(false)} className="w-full h-full bg-transparent outline-none text-xs resize-none" style={{ color: "#1a1a1a" }} /> : <p className="text-xs break-words" style={{ color: "#1a1a1a" }}>{el.text || ""}</p>}
      {sel && <button onClick={onDel} className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-[#f87171] text-white">&times;</button>}
    </div>
  );
  if (el.type === "text") return (
    <div className="absolute" style={{ left: el.x, top: el.y }} onDoubleClick={() => setEditing(true)}>
      {editing ? <input autoFocus value={el.text || ""} onChange={e => onUpd({ text: e.target.value })} onBlur={() => setEditing(false)} className="bg-transparent outline-none text-sm" style={{ color: el.color || "#f5f5f0", minWidth: 100 }} /> : <span className="text-sm whitespace-pre" style={{ color: el.color || "#f5f5f0" }}>{el.text || ""}</span>}
      {sel && <button onClick={onDel} className="absolute -top-2 -right-4 text-xs text-[#f87171]">&times;</button>}
    </div>
  );
  return null;
}
