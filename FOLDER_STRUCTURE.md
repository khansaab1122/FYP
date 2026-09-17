# Project Structure

## Folder Organization

```
FYP/
├── public/                 # Static assets (images, icons, etc.)
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Auth.tsx
│   │   ├── CustomerProfile.tsx
│   │   └── index.ts       # Component exports
│   ├── pages/             # Page-level components (full screens)
│   │   ├── AdminPanel.tsx
│   │   ├── Dashboard.tsx
│   │   ├── LandingPage.tsx
│   │   ├── ReportsAnalytics.tsx
│   │   └── index.ts       # Page exports
│   ├── layouts/           # Layout wrappers (headers, sidebars, etc.)
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── index.ts
│   ├── services/          # API communication services
│   │   └── api.ts
│   ├── utils/             # Helper functions
│   │   ├── formatting.ts
│   │   └── index.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── styles/            # Global styles and CSS
│   │   └── index.css
│   ├── App.tsx            # Root component
│   └── main.tsx           # Entry point
├── server/
│   └── index.ts           # Express server
├── .env.local             # Environment variables (local)
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
├── package.json           # Project dependencies
└── README.md              # Project documentation
```

## Import Conventions

### Components
```tsx
// From pages
import { Dashboard, AdminPanel } from '@/src/pages';

// From components
import { Auth, CustomerProfile } from '@/src/components';

// From hooks
import { useAuth } from '@/src/hooks';

// From types
import { Customer, UserSession } from '@/src/types';

// From services
import { apiClient } from '@/src/services/api';

// From utils
import { formatCurrency, formatDate } from '@/src/utils';
```

## Best Practices

1. **Components** - Reusable UI pieces (buttons, forms, modals)
2. **Pages** - Full-screen views (Dashboard, Admin, Reports)
3. **Hooks** - Custom React hooks for logic reuse
4. **Services** - API calls and external data fetching
5. **Utils** - Pure functions for formatting, validation, etc.
6. **Types** - All TypeScript interfaces and types

## Running the Project

```bash
npm install      # Install dependencies
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Run production server
```
