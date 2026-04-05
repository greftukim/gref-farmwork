# 1단계: 프로젝트 세팅 + 인증 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vite+React+Tailwind 프로젝트를 생성하고, PWA 설정, 공용 컴포넌트, PIN 로그인, 관리자/작업자 레이아웃, 라우팅, 목업 데이터를 구현한다.

**Architecture:** SPA (React 18 + Vite). 인증은 Zustand 스토어로 관리하며 로그인 시 role(admin/worker)에 따라 별도 레이아웃으로 라우팅. Supabase 연결 전까지 모든 데이터는 Zustand 목업 데이터로 동작.

**Tech Stack:** React 18, Vite, Tailwind CSS v4, Zustand, react-router-dom v6, vite-plugin-pwa, recharts

---

## 파일 구조

```
gref-farmwork/
  index.html
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  public/
    manifest.json
    favicon.svg
    icons/
      icon-192.png
      icon-512.png
  src/
    main.jsx
    App.jsx
    index.css
    components/
      common/
        Button.jsx
        Card.jsx
        Modal.jsx
        BottomSheet.jsx
      layout/
        TopBar.jsx
        BottomNav.jsx
        AdminLayout.jsx
        WorkerLayout.jsx
        Sidebar.jsx
    pages/
      LoginPage.jsx
      admin/
        AdminDashboard.jsx
      worker/
        WorkerHome.jsx
    stores/
      authStore.js
      employeeStore.js
      cropStore.js
      zoneStore.js
    hooks/
      useAuth.js
    lib/
      mockData.js
```

---

### Task 1: Vite + React + Tailwind 프로젝트 생성

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `postcss.config.js`, `src/main.jsx`, `src/App.jsx`, `src/index.css`

- [ ] **Step 1: Vite 프로젝트 초기화 및 의존성 설치**

```bash
cd C:\Users\User\Desktop\gref-farmwork
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss @tailwindcss/postcss postcss
npm install react-router-dom zustand recharts vite-plugin-pwa
```

- [ ] **Step 2: Tailwind CSS v4 설정**

`postcss.config.js`:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

`src/index.css` (기존 내용 교체):
```css
@import 'tailwindcss';

@theme {
  --font-heading: 'Work Sans', sans-serif;
  --font-body: 'Public Sans', sans-serif;
}
```

- [ ] **Step 3: index.html에 Google Fonts 추가**

`index.html`의 `<head>` 안에 추가:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Work+Sans:wght@500;600;700&display=swap" rel="stylesheet" />
```

`<title>`을 `GREF FarmWork`로 변경.

- [ ] **Step 4: App.jsx 기본 구조 확인**

`src/App.jsx`:
```jsx
function App() {
  return (
    <div className="min-h-screen bg-gray-50 font-body">
      <h1 className="text-2xl font-heading font-bold text-emerald-900 p-8">
        GREF FarmWork
      </h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 5: 개발 서버 실행 확인**

```bash
npm run dev
```

Expected: 브라우저에서 `http://localhost:5173`에 "GREF FarmWork" 텍스트가 emerald 색상으로 표시됨.

- [ ] **Step 6: 커밋**

```bash
git init
git add package.json package-lock.json vite.config.js postcss.config.js index.html src/ public/ .gitignore
git commit -m "초기 세팅: Vite + React + Tailwind CSS v4"
```

---

### Task 2: PWA 설정

**Files:**
- Modify: `vite.config.js`
- Create: `public/favicon.svg`

- [ ] **Step 1: vite.config.js에 PWA 플러그인 추가**

`vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GREF FarmWork',
        short_name: 'FarmWork',
        description: '온실 인력관리 프로그램',
        theme_color: '#022c22',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
});
```

- [ ] **Step 2: favicon.svg 생성**

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#059669"/>
  <text x="16" y="22" text-anchor="middle" font-size="18" font-weight="bold" fill="white" font-family="sans-serif">G</text>
</svg>
```

- [ ] **Step 3: PWA 아이콘 플레이스홀더 생성**

```bash
mkdir -p public/icons
```

간단한 192px, 512px PNG 아이콘을 생성 (emerald 배경 + "G" 텍스트). Vite 빌드 시 자동으로 manifest에 연결됨.

- [ ] **Step 4: index.html에 favicon 링크 추가**

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 5: 커밋**

```bash
git add vite.config.js public/
git commit -m "PWA 설정: manifest + service worker + 아이콘"
```

---

### Task 3: 디렉토리 구조 + 목업 데이터 (Zustand 스토어)

**Files:**
- Create: `src/lib/mockData.js`, `src/stores/authStore.js`, `src/stores/employeeStore.js`, `src/stores/cropStore.js`, `src/stores/zoneStore.js`

- [ ] **Step 1: 디렉토리 구조 생성**

```bash
mkdir -p src/components/common src/components/layout src/components/hr src/components/work src/components/report src/components/ai src/pages/admin src/pages/worker src/hooks src/stores src/lib
```

- [ ] **Step 2: mockData.js 작성**

`src/lib/mockData.js`:
```js
export const mockEmployees = [
  {
    id: 'emp-001',
    name: '관리자',
    empNo: 'A001',
    phone: '010-1234-0000',
    role: 'admin',
    jobType: '관리',
    hireDate: '2024-01-15',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '000000',
    isActive: true,
  },
  {
    id: 'emp-002',
    name: '김민국',
    empNo: 'W001',
    phone: '010-1234-1111',
    role: 'worker',
    jobType: '재배',
    hireDate: '2024-03-01',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '111111',
    isActive: true,
  },
  {
    id: 'emp-003',
    name: '이강모',
    empNo: 'W002',
    phone: '010-1234-2222',
    role: 'worker',
    jobType: '재배',
    hireDate: '2024-03-01',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '222222',
    isActive: true,
  },
  {
    id: 'emp-004',
    name: '박민식',
    empNo: 'W003',
    phone: '010-1234-3333',
    role: 'worker',
    jobType: '재배',
    hireDate: '2024-04-15',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '333333',
    isActive: true,
  },
  {
    id: 'emp-005',
    name: '최수진',
    empNo: 'W004',
    phone: '010-1234-4444',
    role: 'worker',
    jobType: '관리',
    hireDate: '2024-06-01',
    workHoursPerWeek: 40,
    annualLeaveDays: 15,
    pinCode: '444444',
    isActive: true,
  },
];

export const mockCrops = [
  {
    id: 'crop-001',
    name: '토마토',
    taskTypes: ['수확', '유인·결속', '적엽', '병해충 예찰', 'EC/pH 측정', '수분 작업'],
    isActive: true,
  },
  {
    id: 'crop-002',
    name: '오이',
    taskTypes: ['수확', '유인·결속', '적엽', '병해충 예찰', 'EC/pH 측정'],
    isActive: true,
  },
  {
    id: 'crop-003',
    name: '미니파프리카',
    taskTypes: ['수확', '유인·결속', '적엽', '병해충 예찰', 'EC/pH 측정', '수분 작업'],
    isActive: true,
  },
  {
    id: 'crop-004',
    name: '딸기',
    taskTypes: ['수확', '러너 정리', '적엽', '병해충 예찰', 'EC/pH 측정'],
    isActive: true,
  },
];

export const mockZones = [
  { id: 'zone-001', name: 'A동', description: '토마토 재배동', rowCount: 20, plantCount: 400 },
  { id: 'zone-002', name: 'B동', description: '오이·파프리카 재배동', rowCount: 16, plantCount: 320 },
  { id: 'zone-003', name: 'C동', description: '딸기 재배동', rowCount: 24, plantCount: 600 },
];
```

- [ ] **Step 3: authStore.js 작성**

`src/stores/authStore.js`:
```js
import { create } from 'zustand';
import { mockEmployees } from '../lib/mockData';

const useAuthStore = create((set) => ({
  currentUser: null,
  isAuthenticated: false,

  login: (employeeId, pin) => {
    const employee = mockEmployees.find(
      (e) => e.id === employeeId && e.pinCode === pin && e.isActive
    );
    if (employee) {
      set({ currentUser: employee, isAuthenticated: true });
      return { success: true, role: employee.role };
    }
    return { success: false };
  },

  logout: () => {
    set({ currentUser: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
```

- [ ] **Step 4: employeeStore.js 작성**

`src/stores/employeeStore.js`:
```js
import { create } from 'zustand';
import { mockEmployees } from '../lib/mockData';

const useEmployeeStore = create((set, get) => ({
  employees: mockEmployees,

  getActiveEmployees: () => get().employees.filter((e) => e.isActive),
  getWorkers: () => get().employees.filter((e) => e.role === 'worker' && e.isActive),
  getById: (id) => get().employees.find((e) => e.id === id),
}));

export default useEmployeeStore;
```

- [ ] **Step 5: cropStore.js 작성**

`src/stores/cropStore.js`:
```js
import { create } from 'zustand';
import { mockCrops } from '../lib/mockData';

const useCropStore = create((set, get) => ({
  crops: mockCrops,

  getActiveCrops: () => get().crops.filter((c) => c.isActive),
  getById: (id) => get().crops.find((c) => c.id === id),
}));

export default useCropStore;
```

- [ ] **Step 6: zoneStore.js 작성**

`src/stores/zoneStore.js`:
```js
import { create } from 'zustand';
import { mockZones } from '../lib/mockData';

const useZoneStore = create((set, get) => ({
  zones: mockZones,

  getById: (id) => get().zones.find((z) => z.id === id),
}));

export default useZoneStore;
```

- [ ] **Step 7: 커밋**

```bash
git add src/lib/ src/stores/
git commit -m "목업 데이터 + Zustand 스토어 (auth, employee, crop, zone)"
```

---

### Task 4: 공용 컴포넌트

**Files:**
- Create: `src/components/common/Button.jsx`, `src/components/common/Card.jsx`, `src/components/common/Modal.jsx`, `src/components/common/BottomSheet.jsx`

- [ ] **Step 1: Button.jsx 작성**

`src/components/common/Button.jsx`:
```jsx
const variants = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-lg font-medium
        transition-colors active:scale-[0.98]
        disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Card.jsx 작성**

`src/components/common/Card.jsx`:
```jsx
const accentColors = {
  emerald: 'border-l-emerald-500',
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  gray: 'border-l-gray-300',
};

export default function Card({
  children,
  accent = 'emerald',
  className = '',
  onClick,
}) {
  return (
    <div
      className={`
        bg-white rounded-xl shadow-sm border-l-4
        ${accentColors[accent]}
        ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Modal.jsx 작성**

`src/components/common/Modal.jsx`:
```jsx
import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-heading font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: BottomSheet.jsx 작성**

`src/components/common/BottomSheet.jsx`:
```jsx
import { useEffect } from 'react';

export default function BottomSheet({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-white rounded-t-2xl w-full max-h-[85vh] overflow-y-auto
          animate-[slideUp_0.3s_ease-out]"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {title && (
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-lg font-heading font-semibold text-gray-900">{title}</h2>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: index.css에 BottomSheet 애니메이션 추가**

`src/index.css`에 추가:
```css
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/common/ src/index.css
git commit -m "공용 컴포넌트: Button, Card, Modal, BottomSheet"
```

---

### Task 5: 레이아웃 컴포넌트

**Files:**
- Create: `src/components/layout/TopBar.jsx`, `src/components/layout/Sidebar.jsx`, `src/components/layout/BottomNav.jsx`, `src/components/layout/AdminLayout.jsx`, `src/components/layout/WorkerLayout.jsx`

- [ ] **Step 1: TopBar.jsx 작성**

`src/components/layout/TopBar.jsx`:
```jsx
import useAuthStore from '../../stores/authStore';

export default function TopBar({ title }) {
  const { currentUser, logout } = useAuthStore();

  return (
    <header className="bg-emerald-950 text-white px-4 py-3 flex items-center justify-between min-h-[56px]">
      <h1 className="text-lg font-heading font-semibold">{title || 'GREF FarmWork'}</h1>
      {currentUser && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-emerald-200">{currentUser.name}</span>
          <button
            onClick={logout}
            className="text-sm text-emerald-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Sidebar.jsx 작성**

`src/components/layout/Sidebar.jsx`:
```jsx
import { NavLink } from 'react-router-dom';

const menuItems = [
  { to: '/admin', label: '대시보드', icon: '📊' },
  { to: '/admin/employees', label: '직원 관리', icon: '👥' },
  { to: '/admin/attendance', label: '근무 관리', icon: '🕐' },
  { to: '/admin/leave', label: '휴가 관리', icon: '🌴' },
  { to: '/admin/tasks', label: '작업 관리', icon: '📋' },
  { to: '/admin/records', label: '기록 조회', icon: '📁' },
  { to: '/admin/stats', label: '통계 분석', icon: '📈' },
  { to: '/admin/notices', label: '공지사항', icon: '📢' },
];

export default function Sidebar() {
  return (
    <nav className="w-56 bg-emerald-950 min-h-screen py-4 flex-shrink-0">
      <div className="px-4 pb-4 mb-2 border-b border-emerald-800">
        <span className="text-lg font-heading font-bold text-white">GREF FarmWork</span>
      </div>
      <ul className="space-y-1 px-2">
        {menuItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
                  isActive
                    ? 'bg-emerald-800 text-white font-medium'
                    : 'text-emerald-200 hover:bg-emerald-900 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 3: BottomNav.jsx 작성**

`src/components/layout/BottomNav.jsx`:
```jsx
import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/worker', label: '홈', icon: '🏠' },
  { to: '/worker/tasks', label: '작업', icon: '📋' },
  { to: '/worker/survey', label: '생육조사', icon: '🌱' },
  { to: '/worker/attendance', label: '근태', icon: '🕐' },
  { to: '/worker/more', label: '더보기', icon: '⋯' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center
        border-t border-emerald-900/20 px-2 py-1"
      style={{ backgroundColor: 'rgba(5, 46, 22, 0.96)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/worker'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-2 py-1 rounded-lg transition-colors ${
              isActive ? 'text-emerald-300' : 'text-emerald-100/60'
            }`
          }
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[11px] font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: AdminLayout.jsx 작성**

`src/components/layout/AdminLayout.jsx`:
```jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: WorkerLayout.jsx 작성**

`src/components/layout/WorkerLayout.jsx`:
```jsx
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

export default function WorkerLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar />
      <main className="flex-1 px-4 py-4 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/layout/
git commit -m "레이아웃 컴포넌트: TopBar, Sidebar, BottomNav, AdminLayout, WorkerLayout"
```

---

### Task 6: PIN 로그인 페이지

**Files:**
- Create: `src/pages/LoginPage.jsx`

- [ ] **Step 1: LoginPage.jsx 작성**

`src/pages/LoginPage.jsx`:
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useEmployeeStore from '../stores/employeeStore';
import Button from '../components/common/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const employees = useEmployeeStore((s) => s.getActiveEmployees());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handlePinPress = (digit) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = () => {
    if (!selectedEmployee || pin.length !== 6) return;
    const result = login(selectedEmployee.id, pin);
    if (result.success) {
      navigate(result.role === 'admin' ? '/admin' : '/worker', { replace: true });
    } else {
      setError('PIN이 올바르지 않습니다');
      setPin('');
    }
  };

  if (!selectedEmployee) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-heading font-bold text-white mb-2">GREF FarmWork</h1>
        <p className="text-emerald-300 mb-8">직원을 선택하세요</p>
        <div className="w-full max-w-sm space-y-3">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="w-full bg-emerald-900/50 hover:bg-emerald-800 text-white
                rounded-xl px-5 py-4 text-left transition-colors
                active:scale-[0.98] min-h-[56px] flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-lg">{emp.name}</div>
                <div className="text-sm text-emerald-300">{emp.jobType} · {emp.empNo}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-800 text-emerald-200">
                {emp.role === 'admin' ? '관리자' : '작업자'}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-6">
      <button
        onClick={() => { setSelectedEmployee(null); setPin(''); setError(''); }}
        className="text-emerald-300 mb-6 min-h-[44px] flex items-center gap-1"
      >
        ← 직원 선택으로
      </button>
      <h1 className="text-xl font-heading font-bold text-white mb-1">{selectedEmployee.name}</h1>
      <p className="text-emerald-300 mb-8">PIN 6자리를 입력하세요</p>

      <div className="flex gap-2.5 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full ${
              i < pin.length ? 'bg-emerald-400' : 'bg-emerald-800'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            onClick={() => handlePinPress(String(digit))}
            className="bg-emerald-900/50 hover:bg-emerald-800 text-white text-2xl font-medium
              rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleDelete}
          className="bg-emerald-900/30 hover:bg-emerald-800 text-emerald-300 text-lg
            rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all"
        >
          ⌫
        </button>
        <button
          onClick={() => handlePinPress('0')}
          className="bg-emerald-900/50 hover:bg-emerald-800 text-white text-2xl font-medium
            rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all"
        >
          0
        </button>
        <button
          onClick={handleSubmit}
          disabled={pin.length !== 6}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-base font-medium
            rounded-xl min-h-[64px] min-w-[64px] active:scale-[0.98] transition-all
            disabled:opacity-40 disabled:pointer-events-none"
        >
          확인
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/pages/LoginPage.jsx
git commit -m "PIN 로그인 페이지: 직원 선택 + 6자리 PIN 패드"
```

---

### Task 7: 플레이스홀더 페이지 + 라우팅

**Files:**
- Create: `src/pages/admin/AdminDashboard.jsx`, `src/pages/worker/WorkerHome.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: AdminDashboard.jsx 작성**

`src/pages/admin/AdminDashboard.jsx`:
```jsx
import Card from '../../components/common/Card';
import useEmployeeStore from '../../stores/employeeStore';

export default function AdminDashboard() {
  const workers = useEmployeeStore((s) => s.getWorkers());

  return (
    <div>
      <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">대시보드</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card accent="emerald" className="p-5">
          <div className="text-sm text-gray-500 mb-1">전체 작업자</div>
          <div className="text-2xl font-bold text-gray-900">{workers.length}명</div>
        </Card>
        <Card accent="blue" className="p-5">
          <div className="text-sm text-gray-500 mb-1">오늘 출근</div>
          <div className="text-2xl font-bold text-gray-900">—</div>
        </Card>
        <Card accent="amber" className="p-5">
          <div className="text-sm text-gray-500 mb-1">진행 중 작업</div>
          <div className="text-2xl font-bold text-gray-900">—</div>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: WorkerHome.jsx 작성**

`src/pages/worker/WorkerHome.jsx`:
```jsx
import useAuthStore from '../../stores/authStore';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function WorkerHome() {
  const currentUser = useAuthStore((s) => s.currentUser);

  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">
        {currentUser?.name}님, 안녕하세요
      </h2>

      <Card accent="emerald" className="p-5 mb-4">
        <div className="text-sm text-gray-500 mb-3">출퇴근</div>
        <div className="flex gap-3">
          <Button size="lg" className="flex-1">출근</Button>
          <Button size="lg" variant="secondary" className="flex-1">퇴근</Button>
        </div>
      </Card>

      <Card accent="blue" className="p-5 mb-4">
        <div className="text-sm text-gray-500 mb-2">오늘의 작업</div>
        <p className="text-gray-400 text-sm">배정된 작업이 없습니다</p>
      </Card>

      <Button variant="danger" size="lg" className="w-full">
        긴급 호출
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: useAuth.js 훅 작성**

`src/hooks/useAuth.js`:
```js
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

export default function useAuth(requiredRole) {
  const { isAuthenticated, currentUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (requiredRole && currentUser?.role !== requiredRole) {
      navigate(currentUser.role === 'admin' ? '/admin' : '/worker', { replace: true });
    }
  }, [isAuthenticated, currentUser, requiredRole, navigate]);

  return { isAuthenticated, currentUser };
}
```

- [ ] **Step 4: App.jsx에 라우팅 설정**

`src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/layout/AdminLayout';
import WorkerLayout from './components/layout/WorkerLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import WorkerHome from './pages/worker/WorkerHome';

function ProtectedRoute({ children, role }) {
  const { isAuthenticated, currentUser } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && currentUser?.role !== role) {
    return <Navigate to={currentUser.role === 'admin' ? '/admin' : '/worker'} replace />;
  }
  return children;
}

function AppRedirect() {
  const { isAuthenticated, currentUser } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={currentUser.role === 'admin' ? '/admin' : '/worker'} replace />;
}

function PlaceholderPage({ title }) {
  return (
    <div className="text-gray-400 text-center py-20">
      <div className="text-lg font-medium">{title}</div>
      <div className="text-sm mt-1">준비 중입니다</div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="employees" element={<PlaceholderPage title="직원 관리" />} />
          <Route path="attendance" element={<PlaceholderPage title="근무 관리" />} />
          <Route path="leave" element={<PlaceholderPage title="휴가 관리" />} />
          <Route path="tasks" element={<PlaceholderPage title="작업 관리" />} />
          <Route path="records" element={<PlaceholderPage title="기록 조회" />} />
          <Route path="stats" element={<PlaceholderPage title="통계 분석" />} />
          <Route path="notices" element={<PlaceholderPage title="공지사항" />} />
        </Route>

        <Route path="/worker" element={
          <ProtectedRoute role="worker"><WorkerLayout /></ProtectedRoute>
        }>
          <Route index element={<WorkerHome />} />
          <Route path="tasks" element={<PlaceholderPage title="작업" />} />
          <Route path="survey" element={<PlaceholderPage title="생육조사" />} />
          <Route path="attendance" element={<PlaceholderPage title="근태" />} />
          <Route path="more" element={<PlaceholderPage title="더보기" />} />
        </Route>

        <Route path="*" element={<AppRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: 개발 서버에서 전체 동작 확인**

```bash
npm run dev
```

Expected:
1. `/` → `/login` 리다이렉트
2. 직원 목록 표시, 선택 시 PIN 패드 표시
3. 올바른 PIN 입력 시 role에 따라 `/admin` 또는 `/worker`로 이동
4. 관리자: 사이드바 + 대시보드 카드 표시
5. 작업자: 출퇴근 버튼 + 하단네비 표시
6. 로그아웃 시 `/login`으로 이동

- [ ] **Step 6: 커밋**

```bash
git add src/
git commit -m "라우팅 + 인증: 로그인 → 관리자/작업자 레이아웃 분기"
```

---

## 완료 기준

- [x] Vite + React + Tailwind 개발 서버 정상 동작
- [x] PWA manifest + service worker 설정 완료
- [x] 공용 컴포넌트 4종 (Button, Card, Modal, BottomSheet)
- [x] 레이아웃 5종 (TopBar, Sidebar, BottomNav, AdminLayout, WorkerLayout)
- [x] PIN 로그인 (직원 선택 → 6자리 PIN 패드)
- [x] 역할 기반 라우팅 (admin → 사이드바 레이아웃, worker → 하단네비 레이아웃)
- [x] Zustand 스토어 4종 (auth, employee, crop, zone) + 목업 데이터
