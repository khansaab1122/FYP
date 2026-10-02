# Project Structure

## Folder Organization

```
Smart-Khata-AI/
|-- assets/                    # Currently empty; optional source assets
|-- public/                    # Currently empty; static files served as-is
|-- python_face_service/
|   |-- models/                # YuNet detection and SFace recognition ONNX models
|   |-- app.py                 # Python face verification API
|   |-- download_models.py
|   |-- requirements.txt
|   |-- start.ps1
|   `-- README.md
|-- server/
|   |-- database.json         # Local JSON database fallback
|   |-- faceServiceManager.ts # Starts and monitors the Python service
|   `-- index.ts              # Express API and Vite development server
|-- src/
|   |-- components/           # Auth and customer profile UI
|   |   |-- Auth.tsx
|   |   |-- CustomerProfile.tsx
|   |   `-- index.ts
|   |-- hooks/                # React hooks
|   |   |-- useAuth.ts
|   |   `-- index.ts
|   |-- layouts/              # Reserved for shared page layouts; currently empty
|   |-- pages/                # Landing, dashboard, admin, and reports screens
|   |   |-- AdminPanel.tsx
|   |   |-- Dashboard.tsx
|   |   |-- LandingPage.tsx
|   |   |-- ReportsAnalytics.tsx
|   |   `-- index.ts
|   |-- services/             # Frontend API client
|   |   `-- api.ts
|   |-- styles/               # Global styles
|   |   `-- index.css
|   |-- types/                # Shared TypeScript types
|   |   `-- index.ts
|   |-- utils/                # Formatting and helper functions
|   |   |-- formatting.ts
|   |   `-- index.ts
|   |-- App.tsx
|   `-- main.tsx
|-- .env.example              # Environment variable template
|-- .env.local                # Local configuration; keep secrets uncommitted
|-- .vscode/tasks.json        # VS Code tasks
|-- customers.json            # Customer data file
|-- Dockerfile
|-- FOLDER_STRUCTURE.md
|-- index.html
|-- metadata.json
|-- README.md
|-- README_FACE_RECOGNITION.md
|-- package.json
|-- package-lock.json
|-- request.json
|-- start-all.ps1             # Starts web app and face service
|-- start-face-service.ps1
|-- tsconfig.json
`-- vite.config.ts
```

Generated folders such as `node_modules/`, `dist/`, and `python_face_service/.venv/` are intentionally omitted.

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
npm install       # Install dependencies
npm run dev       # Start the web app and Python face service on Windows
npm run dev:web   # Start only the Express/Vite web server
npm run lint      # Run the TypeScript check
npm run build     # Build the frontend and production server
npm start         # Run the production server
```

The current account model is single-owner. Employee accounts and permissions are tracked as future work in [README.md](./README.md).
