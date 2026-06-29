<div align="center">

  <img src="frontend/dist/favicon.svg" alt="Black En Logo" width="80" height="80">

  # 🖤 Black En Admin Panel

  **ระบบจัดการเซิร์ฟเวอร์เกม Black En แบบครบวงจร**

  [![Go](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
  [![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite)](https://vitejs.dev)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=flat&logo=postgresql)](https://postgresql.org)
  [![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://docker.com)
  [![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 📋 สารบัญ

- [📖 เกี่ยวกับโปรเจค](#-เกี่ยวกับโปรเจค)
- [✨ ฟีเจอร์ทั้งหมด](#-ฟีเจอร์ทั้งหมด)
- [🛠 เทคโนโลยีที่ใช้](#-เทคโนโลยีที่ใช้)
- [🚀 วิธีติดตั้งและรัน](#-วิธีติดตั้งและรัน)
  - [ความต้องการของระบบ](#ความต้องการของระบบ)
  - [การติดตั้งสำหรับพัฒนา (Development)](#การติดตั้งสำหรับพัฒนา-development)
  - [การติดตั้งสำหรับใช้งานจริง (Production)](#การติดตั้งสำหรับใช้งานจริง-production)
- [🐳 Docker Setup](#-docker-setup)
  - [Docker Compose Services](#docker-compose-services)
  - [คำสั่ง Docker ที่สำคัญ](#คำสั่ง-docker-ที่สำคัญ)
- [🌐 การตั้งค่า DuckDNS](#-การตั้งค่า-duckdns)
- [💳 การตั้งค่า Payment](#-การตั้งค่า-payment)
- [📚 API Documentation](#-api-documentation)
- [🤝 การมีส่วนร่วม](#-การมีส่วนร่วม)
- [📄 ลิขสิทธิ์](#-ลิขสิทธิ์)

---

## 📖 เกี่ยวกับโปรเจค

**Black En Admin Panel** เป็นระบบจัดการเซิร์ฟเวอร์เกม Black En แบบเต็มรูปแบบ ที่พัฒนาด้วย现代化 tech stack ประกอบด้วย Go (Gin) สำหรับ backend API, React + Vite สำหรับ frontend, และ PostgreSQL สำหรับฐานข้อมูล ระบบมาพร้อมฟีเจอร์ครบถ้วนสำหรับการจัดการผู้เล่น สินค้าในเกม คูปอง ความปลอดภัย และอื่นๆ อีกมากมาย

ระบบออกแบบมาให้ deploy ได้ง่ายด้วย Docker Compose และใช้ Caddy เป็น reverse proxy ที่มาพร้อมกับ Let's Encrypt สำหรับ SSL/TLS แบบอัตโนมัติ

---

## ✨ ฟีเจอร์ทั้งหมด

### 🔐 ระบบ Authentication
- เข้าสู่ระบบด้วย JWT (JSON Web Token)
- สมัครสมาชิกสำหรับผู้ดูแลระบบ
- รองรับ OAuth (Google, GitHub) — เตรียมพร้อม
- การยืนยันตัวตนและการจัดการ session

### 📊 Dashboard
- ภาพรวมสถิติเซิร์ฟเวอร์แบบ Real-time
- จำนวนผู้เล่นออนไลน์
- กราฟและการวิเคราะห์ด้วย Recharts
- ตาราง Ranking PvP/PK

### 👥 การจัดการผู้เล่น (Players)
- รายชื่อผู้เล่นทั้งหมด
- ค้นหาและกรองผู้เล่น
- ดูประวัติผู้เล่น
- จัดการสถานะและการแบนผู้เล่น
- Security Dashboard สำหรับตรวจสอบความปลอดภัย

### 🛒 ระบบร้านค้า (Shop)
- จัดการสินค้าภายในเกม
- ระบบการชำระเงินพร้อมท์เพย์ / โอนผ่านธนาคาร
- ประวัติการซื้อขาย
- ระบบคูปองส่วนลด

### 🎮 ระบบ Pets
- จัดการสัตว์เลี้ยงในเกม
- เพิ่ม / แก้ไข / ลบสัตว์เลี้ยง
- ดูสถิติและข้อมูลสัตว์เลี้ยง

### 🏆 PK Ranking
- จัดอันดับผู้เล่นตามคะแนน PvP
- แสดงสถิติการต่อสู้
- ดูประวัติการ PK

### 📝 ระบบ Logs
- บันทึกการกระทำต่างๆ ในระบบ
- Audit trail สำหรับผู้ดูแล
- ค้นหาและกรอง logs

### 💰 ระบบ SaaS / การสมัครสมาชิก
- แผนการใช้งานแบบรายเดือน / รายปี
- ระบบเรียกเก็บเงินอัตโนมัติ
- จัดการบิลและการชำระเงิน
- แผนราคาและฟีเจอร์ในแต่ละระดับ

### 🌍 Online Map
- แผนที่แสดงตำแหน่งผู้เล่นออนไลน์แบบ Real-time
- ดูตำแหน่งและข้อมูลผู้เล่นบนแผนที่

### ⚙️ การตั้งค่า (Settings)
- ตั้งค่าระบบ
- ตั้งค่าเซิร์ฟเวอร์
- จัดการการเชื่อมต่อ

---

## 🛠 เทคโนโลยีที่ใช้

### Backend
| เทคโนโลยี | เวอร์ชัน | 用途 |
|---|---|---|
| [Go](https://golang.org) | 1.22+ | ภาษาโปรแกรมหลัก |
| [Gin](https://gin-gonic.com) | v1.12 | HTTP web framework |
| [Golang JWT](https://github.com/golang-jwt/jwt) | v5 | การจัดการ JWT |
| [lib/pq](https://github.com/lib/pq) | v1.12 | PostgreSQL driver |
| [golang.org/x/crypto](https://golang.org/x/crypto) | - | การเข้ารหัส |

### Frontend
| เทคโนโลยี | เวอร์ชัน | 用途 |
|---|---|---|
| [React](https://react.dev) | 19 | UI library |
| [Vite](https://vitejs.dev) | 8 | Build tool |
| [TypeScript / JSX](https://www.typescriptlang.org) | - | ภาษา |
| [Tailwind CSS](https://tailwindcss.com) | 4 | CSS framework |
| [TanStack Query](https://tanstack.com/query) | v5 | Data fetching |
| [Framer Motion](https://www.framer.com/motion) | - | Animations |
| [React Hook Form](https://react-hook-form.com) | - | Form handling |
| [Zod](https://zod.dev) | - | Validation |
| [Recharts](https://recharts.org) | - | Charts |
| [Lucide Icons](https://lucide.dev) | - | Icon library |
| [Radix UI](https://www.radix-ui.com) | - | Headless UI components |
| [Sonner](https://sonner.emilkowal.ski) | - | Toast notifications |

### Infrastructure
| เทคโนโลยี | 用途 |
|---|---|
| [Docker](https://docker.com) | Containerization |
| [Docker Compose](https://docs.docker.com/compose) | Multi-container orchestration |
| [Caddy](https://caddyserver.com) | Reverse proxy + automatic SSL |
| [PostgreSQL](https://postgresql.org) | Database |
| [DuckDNS](https://duckdns.org) | Dynamic DNS |
| [GitHub Actions](https://github.com/features/actions) | CI/CD |

---

## 🚀 วิธีติดตั้งและรัน

### ความต้องการของระบบ

- **Docker** และ **Docker Compose** (แนะนำสำหรับ Production)
- **Go** 1.22+ (สำหรับพัฒนา backend)
- **Node.js** 20+ (สำหรับพัฒนา frontend)
- **Git**

### การติดตั้งสำหรับพัฒนา (Development)

#### 1. Clone โปรเจค

```bash
git clone <repository-url>
cd AI-V2
```

#### 2. ติดตั้ง Dependencies

**Backend:**
```bash
cd backend
go mod download
```

**Frontend:**
```bash
cd frontend
npm install
```

#### 3. ตั้งค่า Environment Variables

```bash
cp .env.example .env
# แก้ไขค่าตามต้องการ (JWT_SECRET, ฐานข้อมูล ฯลฯ)
```

#### 4. รัน PostgreSQL ด้วย Docker

```bash
docker run -d \
  --name postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=blacken_admin \
  -p 5432:5432 \
  postgres:16-alpine
```

#### 5. รัน Backend

```bash
cd backend
go run main.go
# หรือ build แล้วรัน
go build -o server . && ./server
```

#### 6. รัน Frontend (Development Server)

```bash
cd frontend
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

### การติดตั้งสำหรับใช้งานจริง (Production)

#### วิธีที่ 1: ใช้ Docker Compose (แนะนำ)

```bash
# ดาวน์โหลดโปรเจค
git clone <repository-url>
cd AI-V2

# ตั้งค่า environment
cp .env.example .env
# แก้ไข JWT_SECRET และค่าอื่นๆ

# รันทุก service
docker compose up -d --build
```

#### วิธีที่ 2: Deploy ด้วย Dockerfile โดยตรง

```bash
# Build image
docker build -t blacken-admin:latest .

# รัน container
docker run -d \
  --name blacken-admin \
  -p 80:80 \
  -p 443:443 \
  -p 8080:8080 \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-db-password \
  -e JWT_SECRET=your-jwt-secret \
  -v /path/to/Caddyfile:/etc/caddy/Caddyfile \
  blacken-admin:latest
```

> **หมายเหตุ:** production runtime image ต้องการ PostgreSQL server ที่เข้าถึงได้ ใช้ Docker Compose เพื่อความสะดวกในการจัดการ

---

## 🐳 Docker Setup

### Docker Compose Services

| Service | Image | Ports | Description |
|---|---|---|---|
| **postgres** | postgres:16-alpine | 5432 | ฐานข้อมูลหลัก |
| **backend** | (build) | 8080 | Go API server |
| **frontend** | (build) | 5173 | Vite dev server |
| **caddy** | caddy:2-alpine | 80, 443, 8888, 8443 | Reverse proxy + SSL |

### คำสั่ง Docker ที่สำคัญ

```bash
# สร้างและเริ่ม service ทั้งหมด
make docker-up

# หยุด service ทั้งหมด
make docker-down

# ดู logs
make docker-logs

# รีสตาร์ท service ทั้งหมด
make docker-restart

# ดูสถานะ containers
make docker-ps

# ลบ containers + volumes + images
make docker-clean
```

หรือใช้ Docker Compose โดยตรง:

```bash
# สร้างและเริ่ม
docker compose up -d --build

# หยุด
docker compose down

# ดู logs แบบ real-time
docker compose logs -f

# รันคำสั่งใน container
docker compose exec backend sh
docker compose exec postgres psql -U admin -d blacken_admin
```

---

## 🌐 การตั้งค่า DuckDNS

Black En Admin Panel ใช้โดเมน `ran-dev.duckdns.org` สำหรับบริการ

### 1. สมัคร DuckDNS

ไปที่ [https://www.duckdns.org](https://www.duckdns.org) และ sign in ด้วยบัญชีของคุณ

### 2. สร้างโดเมนย่อย

- เพิ่มโดเมนย่อย (เช่น `ran-dev`)
- จด token ที่ได้ไว้

### 3. ตั้งค่า Caddyfile

ไฟล์ `Caddyfile` ที่แจกจ่ายมาพร้อมโปรเจคมีการตั้งค่า DuckDNS ไว้แล้ว:

```
ran-dev.duckdns.org {
    reverse_proxy /api/* backend:8080
    root * /app/frontend/dist
    ...
}
```

### 4. อัปเดต DuckDNS IP (ถ้าใช้ Docker)

เพิ่ม cron job หรือใช้ script เพื่ออัปเดต IP ของ DuckDNS:

```bash
# อัปเดต DuckDNS (รันทุกๆ 5 นาที)
curl -s "https://www.duckdns.org/update?domains=ran-dev&token=YOUR_TOKEN&ip="
```

หรือใช้ Docker container ที่มี DuckDNS updater ในตัว

### 5. ตรวจสอบ SSL

เมื่อ Caddy รันครั้งแรก มันจะขอ SSL certificate จาก Let's Encrypt อัตโนมัติ ตรวจสอบโดยเปิด:

```
https://ran-dev.duckdns.org
```

---

## 💳 การตั้งค่า Payment

ระบบรองรับการชำระเงินผ่าน:

### พร้อมเพย์ (PromptPay)

```env
PROMPTPAY_ID=your-promptpay-id
```

### ธนาคารไทย

```env
SCB_ACCOUNT=your-scb-account-number
KBANK_ACCOUNT=your-kbank-account-number
```

### วิธีการตั้งค่า

1. เปิดไฟล์ `.env`
2. ใส่หมายเลขพร้อมเพย์หรือเลขบัญชีธนาคารของคุณ
3. ตรวจสอบว่าร้านค้า (Shop) และหน้า SaaS billing แสดงข้อมูลการชำระเงินที่ถูกต้อง

### ระบบ Coupon

ระบบรองรับการสร้างคูปองส่วนลดสำหรับสินค้าในร้านค้าและการสมัครสมาชิก ดูรายละเอียดที่หน้า Coupons ในระบบหลังบ้าน

---

## 📚 API Documentation

API endpoints ทั้งหมดสามารถเข้าถึงได้ผ่าน:

- **Development:** `http://localhost:8080/api/`
- **Production:** `https://ran-dev.duckdns.org/api/`

### จุดเชื่อมต่อหลัก (Endpoints)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | เข้าสู่ระบบ |
| `POST` | `/api/auth/register` | สมัครสมาชิก |
| `GET` | `/api/users` | รายชื่อผู้ใช้ทั้งหมด |
| `GET` | `/api/players` | รายชื่อผู้เล่น |
| `GET` | `/api/players/online` | ผู้เล่นออนไลน์ |
| `GET` | `/api/ranking/pk` | PK Ranking |
| `GET` | `/api/pets` | รายชื่อสัตว์เลี้ยง |
| `GET` | `/api/shop/items` | สินค้าทั้งหมด |
| `POST` | `/api/shop/orders` | สร้างคำสั่งซื้อ |
| `GET` | `/api/coupons` | คูปองทั้งหมด |
| `GET` | `/api/saas/plans` | แผนการใช้งาน |
| `GET` | `/api/logs` | บันทึกการดำเนินการ |
| `GET` | `/api/settings` | ตั้งค่าระบบ |
| `GET` | `/api/health` | ตรวจสอบสถานะเซิร์ฟเวอร์ |

> **หมายเหตุ:** API documentation ฉบับสมบูรณ์ (OpenAPI/Swagger) กำลังอยู่ในระหว่างการพัฒนา

---

## 🤝 การมีส่วนร่วม

เรายินดีต้อนรับทุกการมีส่วนร่วม! ไม่ว่าจะเป็นการรายงาน bug, เสนอฟีเจอร์ใหม่, หรือส่ง Pull Request

### ขั้นตอนการมีส่วนร่วม

1. **Fork** โปรเจคนี้
2. **สร้าง branch** สำหรับฟีเจอร์ของคุณ:
   - `feature/<kebab-case>` — ฟีเจอร์ใหม่
   - `fix/<kebab-case>` — แก้บั๊ก
   - `refactor/<kebab-case>` — ปรับปรุงโค้ด
   - `security/<kebab-case>` — ปรับปรุงความปลอดภัย
   - `chore/<kebab-case>` — งานบำรุงรักษา
3. **Commit** การเปลี่ยนแปลงของคุณ (ใช้ conventional commit format)
4. **Push** ไปยัง branch ของคุณ
5. เปิด **Pull Request** ไปยัง branch `develop`

### Conventional Commit Format

```
<type>(<scope>): <description>

feat(shop): add discount coupon support
fix(auth): resolve token expiry issue
refactor(api): simplify player query
```

### กฎของโปรเจค

- **Restart Rule:** หลังจากแก้ไขหรือเพิ่มฟังก์ชันใหม่ ให้ restart backend + frontend ทุกครั้ง
- **Push Workflow:** แจ้งผู้ดูแลก่อน push ไปยัง GitHub ทุกครั้ง
- **Code Style:** ใช้ `go vet` สำหรับ Go และ `oxlint` สำหรับ frontend

---

## 📄 ลิขสิทธิ์

MIT License — ดูรายละเอียดเพิ่มเติมในไฟล์ [LICENSE](LICENSE)

---

<div align="center">
  Made with 🖤 by Black En Team
  <br>
  <a href="https://ran-dev.duckdns.org">ran-dev.duckdns.org</a>
</div>
