# Workflow Rules

## Branch Naming Convention
- `feature/<kebab-case>` - New features
- `fix/<kebab-case>` - Bug fixes
- `refactor/<kebab-case>` - Code refactoring
- `security/<kebab-case>` - Security improvements
- `chore/<kebab-case>` - Maintenance tasks

## Restart Rule
- Restart backend + frontend ทุกครั้งหลังจากมีการอัปเดตหรือเพิ่มฟังก์ชันใหม่

## Push Workflow
1. Always ask user for confirmation before pushing to GitHub
2. Create appropriate branch based on task type
3. Commit with conventional commit message format
4. Push new branch to origin

## Tech Stack
- Backend: Go + Gin + PostgreSQL + JWT
- Frontend: React + Vite + Tailwind CSS v4
- State: TanStack Query
- UI: Framer Motion, Lucide icons, React Hook Form + Zod
