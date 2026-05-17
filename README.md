# Corolas 管理员后台

corolar.corolas.top | Corolas子项目

## 简介
Corolas平台的管理员后台系统，提供用户管理、内容审核、数据分析等功能。

## 技术栈
- Frontend: React 19 + TypeScript + Vite
- Styling: Tailwind CSS + shadcn/ui
- Backend: Supabase (Auth + PostgreSQL + Edge Functions)
- Deploy: Vercel (GitHub Push → Auto Deploy)
- CI/CD: GitHub Actions

## 环境变量
| 变量 | 说明 |
|------|------|
| VITE_SUPABASE_URL | Supabase项目URL |
| VITE_SUPABASE_ANON_KEY | Supabase Anon Key |

## 数据库
Supabase项目: https://supabase.com/dashboard/project/corolas-ar

## 本地开发
```bash
git clone https://github.com/CA53411/ar.git
cd ar
npm install
npm run dev
```

## 部署
Push到main分支自动触发Vercel部署
