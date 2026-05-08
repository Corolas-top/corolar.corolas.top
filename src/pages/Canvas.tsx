import { useState, useRef, useEffect, useCallback } from "react";
import {
  MousePointer, Pen, StickyNote, Type, Minus, Square, Circle,
  ZoomIn, ZoomOut, Maximize, Download, Trash2,
} from "lucide-react";
import { trpc } from "@/providers/trpc";

type Tool = "select" | "pen" | "note" | "text" | "line" | "rect" | "circle";
type CanvasElement = {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  points?: { x: number; y: number }[];
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
};

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

export default function Canvas() {
  const { data: savedCanvas } = trpc.canvas.get.useQuery();
  const saveMutation = trpc.canvas.save.useMutation({
    onSuccess: () => {
      setSaveStatus("已保存");
      setTimeout(() => setSaveStatus(""), 2000);
    },
  });

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#c9a96e");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load saved elements
  useEffect(() => {
    if (savedCanvas?.elements && savedCanvas.elements.length > 0) {
      setElements(savedCanvas.elements as CanvasElement[]);
    }
  }, [savedCanvas]);

  // Auto-save every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (elements.length > 0) {
        saveMutation.mutate({ elements });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [elements, saveMutation]);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - offset.x) / zoom,
      y: (screenY - offset.y) / zoom,
    };
  }, [offset, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      return;
    }

    const pos = screenToCanvas(e.clientX, e.clientY);

    if (tool === "select") {
      // Find clicked element
      const clicked = [...elements].reverse().find((el) => {
        if (el.type === "note" || el.type === "text" || el.type === "rect" || el.type === "circle") {
          const w = el.width || 100;
          const h = el.height || (el.type === "note" ? 100 : 30);
          return pos.x >= el.x && pos.x <= el.x + w && pos.y >= el.y && pos.y <= el.y + h;
        }
        return false;
      });
      setSelectedId(clicked?.id || null);
      return;
    }

    if (tool === "pen") {
      setDrawing(true);
      setDrawStart(pos);
      const newEl: CanvasElement = {
        id: Date.now().toString(),
        type: "pen",
        x: pos.x,
        y: pos.y,
        color,
        points: [{ x: pos.x, y: pos.y }],
      };
      setElements((prev) => [...prev, newEl]);
      return;
    }

    if (tool === "line") {
      setDrawing(true);
      setDrawStart(pos);
      return;
    }

    if (tool === "rect" || tool === "circle") {
      setDrawing(true);
      setDrawStart(pos);
      return;
    }

    if (tool === "note") {
      const newEl: CanvasElement = {
        id: Date.now().toString(),
        type: "note",
        x: pos.x - 50,
        y: pos.y - 50,
        width: 100,
        height: 100,
        text: "新便签",
        color: "#fbbf24",
      };
      setElements((prev) => [...prev, newEl]);
      return;
    }

    if (tool === "text") {
      const newEl: CanvasElement = {
        id: Date.now().toString(),
        type: "text",
        x: pos.x,
        y: pos.y,
        text: "点击编辑",
        color,
      };
      setElements((prev) => [...prev, newEl]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (!drawing) return;
    const pos = screenToCanvas(e.clientX, e.clientY);

    if (tool === "pen") {
      setElements((prev) => {
        const last = prev[prev.length - 1];
        if (last?.type === "pen") {
          return [...prev.slice(0, -1), { ...last, points: [...(last.points || []), pos] }];
        }
        return prev;
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!drawing) return;
    setDrawing(false);
    const pos = screenToCanvas(e.clientX, e.clientY);

    if (tool === "line") {
      const newEl: CanvasElement = {
        id: Date.now().toString(),
        type: "line",
        x: drawStart.x,
        y: drawStart.y,
        fromX: drawStart.x,
        fromY: drawStart.y,
        toX: pos.x,
        toY: pos.y,
        color,
      };
      setElements((prev) => [...prev, newEl]);
    }

    if (tool === "rect" || tool === "circle") {
      const newEl: CanvasElement = {
        id: Date.now().toString(),
        type: tool,
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y),
        color,
      };
      setElements((prev) => [...prev, newEl]);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.1, Math.min(5, z + delta)));
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements((prev) => prev.filter((el) => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  const exportImage = () => {
    // Simple JSON export for now
    const dataStr = JSON.stringify(elements, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId]);

  return (
    <div className="fixed inset-0" style={{ background: "var(--bg-primary)" }}>
      {/* Top Toolbar */}
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-xl glass-panel"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const isActive = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className="relative p-2 rounded-lg transition-all duration-150"
              style={{
                background: isActive ? "rgba(201,169,110,0.2)" : "transparent",
                color: isActive ? "var(--text-gold)" : "var(--text-secondary)",
              }}
              title={t.label}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={18} />
            </button>
          );
        })}

        <div className="w-px h-5 mx-1" style={{ background: "var(--border-subtle)" }} />

        {/* Color picker */}
        {tool !== "select" && tool !== "note" && (
          <div className="flex items-center gap-1 px-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full transition-transform duration-150"
                style={{
                  background: c,
                  transform: color === c ? "scale(1.2)" : "scale(1)",
                  boxShadow: color === c ? `0 0 0 2px var(--bg-primary), 0 0 0 3px ${c}` : "none",
                }}
              />
            ))}
          </div>
        )}

        <div className="w-px h-5 mx-1" style={{ background: "var(--border-subtle)" }} />

        <button
          onClick={exportImage}
          className="p-2 rounded-lg transition-colors duration-150"
          style={{ color: "var(--text-secondary)" }}
          title="导出"
        >
          <Download size={18} />
        </button>

        <button
          onClick={deleteSelected}
          className="p-2 rounded-lg transition-colors duration-150"
          style={{ color: selectedId ? "var(--error)" : "var(--text-muted)" }}
          title="删除选中"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className="absolute inset-0 overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          backgroundImage: `radial-circle(circle, var(--border-subtle) 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${offset.x}px ${offset.y}px`,
          cursor: isPanning ? "grabbing" : tool === "select" ? "default" : "crosshair",
        }}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {elements.map((el) => (
            <CanvasElementView
              key={el.id}
              element={el}
              isSelected={el.id === selectedId}
              onUpdate={(updates) => {
                setElements((prev) =>
                  prev.map((e) => (e.id === el.id ? { ...e, ...updates } : e))
                );
              }}
              onDelete={() => {
                setElements((prev) => prev.filter((e) => e.id !== el.id));
                setSelectedId(null);
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className="absolute bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl glass-panel"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        <button
          onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
          className="p-1.5 rounded transition-colors duration-150"
          style={{ color: "var(--text-secondary)" }}
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-xs font-medium min-w-[50px] text-center" style={{ color: "var(--text-secondary)" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
          className="p-1.5 rounded transition-colors duration-150"
          style={{ color: "var(--text-secondary)" }}
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
          className="p-1.5 rounded transition-colors duration-150 ml-1"
          style={{ color: "var(--text-secondary)" }}
          title="适应画布"
        >
          <Maximize size={16} />
        </button>
      </div>

      {/* Save Status */}
      {saveStatus && (
        <div
          className="absolute bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg text-xs animate-fade-in-up"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}
        >
          {saveStatus}
        </div>
      )}
    </div>
  );
}

function CanvasElementView({
  element,
  isSelected,
  onUpdate,
  onDelete,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (u: Partial<CanvasElement>) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (element.type === "pen" && element.points) {
    const path = element.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    return (
      <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <path d={path} fill="none" stroke={element.color || "#c9a96e"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (element.type === "line") {
    return (
      <svg className="absolute pointer-events-none" style={{ left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <line
          x1={element.fromX}
          y1={element.fromY}
          x2={element.toX}
          y2={element.toY}
          stroke={element.color || "#c9a96e"}
          strokeWidth={2}
        />
      </svg>
    );
  }

  if (element.type === "rect") {
    return (
      <div
        className="absolute"
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          border: `2px solid ${element.color || "var(--border-medium)"}`,
          borderRadius: 4,
          background: isSelected ? "rgba(201,169,110,0.05)" : "transparent",
        }}
      />
    );
  }

  if (element.type === "circle") {
    return (
      <div
        className="absolute rounded-full"
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          border: `2px solid ${element.color || "var(--border-medium)"}`,
          background: isSelected ? "rgba(201,169,110,0.05)" : "transparent",
        }}
      />
    );
  }

  if (element.type === "note") {
    return (
      <div
        className="absolute"
        style={{
          left: element.x,
          top: element.y,
          width: element.width || 100,
          height: element.height || 100,
          background: element.color || "#fbbf24",
          borderRadius: 4,
          padding: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          color: "#1a1a1a",
        }}
        onDoubleClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            autoFocus
            value={element.text || ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            className="w-full h-full bg-transparent outline-none text-xs resize-none"
            style={{ color: "#1a1a1a" }}
          />
        ) : (
          <p className="text-xs break-words" style={{ color: "#1a1a1a" }}>
            {element.text || ""}
          </p>
        )}
        {isSelected && (
          <button
            onClick={onDelete}
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: "var(--error)", color: "white" }}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  if (element.type === "text") {
    return (
      <div
        className="absolute"
        style={{ left: element.x, top: element.y }}
        onDoubleClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <input
            autoFocus
            value={element.text || ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onBlur={() => setIsEditing(false)}
            className="bg-transparent outline-none text-sm"
            style={{ color: element.color || "var(--text-primary)", minWidth: 100 }}
          />
        ) : (
          <span className="text-sm whitespace-pre" style={{ color: element.color || "var(--text-primary)" }}>
            {element.text || ""}
          </span>
        )}
        {isSelected && (
          <button
            onClick={onDelete}
            className="absolute -top-2 -right-4 text-xs"
            style={{ color: "var(--error)" }}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return null;
}
