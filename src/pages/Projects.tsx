import { useState } from "react";
import { Plus, Pencil, ExternalLink, X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import Topbar from "@/components/Topbar";

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(74,222,128,0.1)", text: "#4ade80", label: "运行中" },
  maintenance: { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "维护中" },
  development: { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "开发中" },
  offline: { bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "已下线" },
};

type ProjectForm = {
  id?: number;
  name: string;
  slug: string;
  url: string;
  overview: string;
  description: string;
  status: "active" | "maintenance" | "development" | "offline";
};

const emptyForm: ProjectForm = {
  name: "",
  slug: "",
  url: "",
  overview: "",
  description: "",
  status: "development",
};

export default function Projects() {
  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProjectForm | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      closeModal();
    },
  });

  const updateMutation = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      closeModal();
    },
  });

  const deleteMutation = trpc.projects.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
    },
  });

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (project: ProjectForm) => {
    setForm(project);
    setEditing(project);
    setShowModal(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "项目名称为必填项";
    if (!form.slug.trim()) errs.slug = "标识名为必填项";
    if (!form.url.trim()) errs.url = "URL 为必填项";
    else if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(form.url)) errs.url = "请输入有效的域名格式";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (editing?.id) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Topbar title="项目管理" subtitle="Projects Management" />

      <div className="flex-1 p-6 max-w-[1440px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            项目列表
          </h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{ background: "var(--text-gold)", color: "var(--bg-primary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            <Plus size={16} />
            新建项目
          </button>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl h-[240px] animate-pulse" style={{ background: "var(--bg-card)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(projects || []).map((project) => {
              const status = statusConfig[project.status] || statusConfig.offline;
              const initial = project.name.charAt(0).toUpperCase();
              return (
                <div
                  key={project.id}
                  className="rounded-xl overflow-hidden group transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {/* Logo Area */}
                  <div
                    className="h-[120px] flex items-center justify-center relative"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    {project.logo_url ? (
                      <img src={project.logo_url} alt={project.name} className="h-16 w-16 object-contain" />
                    ) : (
                      <span
                        className="text-3xl font-light"
                        style={{ color: "var(--text-gold)", fontFamily: "serif" }}
                      >
                        {initial}
                      </span>
                    )}
                    {/* Status Badge */}
                    <span
                      className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: status.bg, color: status.text }}
                    >
                      {status.label}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                      {project.name}
                    </h3>
                    <a
                      href={`https://${project.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs block mb-2 transition-colors duration-150 hover:underline"
                      style={{ color: "var(--text-gold)", fontFamily: "monospace" }}
                    >
                      {project.url}
                    </a>
                    <p className="text-sm line-clamp-2 mb-3" style={{ color: "var(--text-secondary)" }}>
                      {project.overview || "暂无概览描述"}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEdit(project as ProjectForm)}
                        className="flex items-center gap-1 text-xs transition-colors duration-150"
                        style={{ color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--text-gold)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                      >
                        <Pencil size={13} />
                        编辑
                      </button>
                      <a
                        href={`https://${project.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs transition-colors duration-150"
                        style={{ color: "var(--text-secondary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--text-gold)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }}
                      >
                        <ExternalLink size={13} />
                        查看详情
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`确定要删除项目 "${project.name}" 吗？`)) {
                            deleteMutation.mutate({ id: project.id });
                          }
                        }}
                        className="flex items-center gap-1 text-xs ml-auto transition-colors duration-150"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--error)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-muted)";
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--bg-card)", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                {editing ? "编辑项目" : "新建项目"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg transition-colors duration-150"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  项目名称 <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="如：Platonic"
                  className="w-full h-10 px-3 rounded-md text-sm outline-none transition-all duration-150"
                  style={{
                    background: "var(--bg-elevated)",
                    border: `1px solid ${errors.name ? "var(--error)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)",
                  }}
                />
                {errors.name && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.name}</p>}
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  标识名 <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="platonic"
                  className="w-full h-10 px-3 rounded-md text-sm outline-none transition-all duration-150"
                  style={{
                    background: "var(--bg-elevated)",
                    border: `1px solid ${errors.slug ? "var(--error)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)",
                  }}
                />
                {errors.slug && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.slug}</p>}
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  项目 URL <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="platonic.corolas.top"
                  className="w-full h-10 px-3 rounded-md text-sm outline-none transition-all duration-150"
                  style={{
                    background: "var(--bg-elevated)",
                    border: `1px solid ${errors.url ? "var(--error)" : "var(--border-subtle)"}`,
                    color: "var(--text-primary)",
                    fontFamily: "monospace",
                  }}
                />
                {errors.url && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.url}</p>}
              </div>

              {/* Overview */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  概览
                </label>
                <textarea
                  value={form.overview}
                  onChange={(e) => setForm({ ...form, overview: e.target.value })}
                  placeholder="一句话描述项目..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none transition-all duration-150"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  详细描述
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="支持 Markdown 格式的详细描述..."
                  rows={6}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none transition-all duration-150"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  状态
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectForm["status"] })}
                  className="w-full h-10 px-3 rounded-md text-sm outline-none transition-all duration-150"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="active">运行中</option>
                  <option value="maintenance">维护中</option>
                  <option value="development">开发中</option>
                  <option value="offline">已下线</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm transition-colors duration-150"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-50"
                  style={{ background: "var(--text-gold)", color: "var(--bg-primary)" }}
                >
                  {isSubmitting ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
