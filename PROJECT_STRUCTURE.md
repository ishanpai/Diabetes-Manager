# Diabetes Workflow Companion - Project Structure

This document provides a detailed overview of the project structure and organization.

## 📁 Root Directory Structure

```
diabetes-manager/
├── 📄 README.md                    # Main project documentation
├── 📄 PRD.md                       # Product Requirements Document
├── 📄 PROJECT_STRUCTURE.md         # This file - project structure guide
├── 📄 package.json                 # Node.js dependencies and scripts
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 next.config.js               # Next.js configuration
├── 📄 .eslintrc.json               # ESLint configuration
├── 📄 .gitignore                   # Git ignore rules
├── 📄 env.example                  # Environment variables template
├── 📄 Dockerfile                   # Docker container configuration
├── 📄 docker-compose.yml           # Docker Compose services
├── 📄 nginx.conf                   # Nginx reverse proxy configuration
├── 📄 deploy.sh                    # Automated deployment script
├── 📄 jest.config.js               # Jest testing configuration
├── 📄 jest.setup.js                # Jest setup and mocks
├── 📁 components/                  # Reusable React components
├── 📁 pages/                       # Next.js pages and API routes
├── 📁 lib/                         # Utility functions and configurations
├── 📁 store/                       # Zustand state management
├── 📁 types/                       # TypeScript type definitions
├── 📁 public/                      # Static assets
└── 📁 styles/                      # Global styles and themes
```

## 🧩 Components Directory (`/components`)

```
components/
├── 📁 auth/                        # Authentication components
│   ├── LoginForm.tsx              # User login form
│   ├── SignupForm.tsx             # User registration form
│   └── AuthLayout.tsx             # Authentication page layout
├── 📁 patients/                    # Patient management components
│   ├── PatientList.tsx            # List of patients
│   ├── PatientForm.tsx            # Add/edit patient form
│   ├── PatientCard.tsx            # Individual patient card
│   └── PatientSelector.tsx        # Patient selection dropdown
├── 📁 entries/                     # Data entry components
│   ├── EntryForm.tsx              # Generic entry form
│   ├── GlucoseEntry.tsx           # Blood glucose entry
│   ├── MealEntry.tsx              # Meal description entry
│   ├── InsulinEntry.tsx           # Insulin dose entry
│   ├── EntryList.tsx              # List of entries
│   └── EntryCard.tsx              # Individual entry card
├── 📁 charts/                      # Data visualization components
│   ├── GlucoseChart.tsx           # Blood glucose line chart
│   ├── TimelineChart.tsx          # Timeline visualization
│   ├── ChartContainer.tsx         # Chart wrapper component
│   └── ChartTooltip.tsx           # Custom chart tooltips
└── 📁 common/                      # Shared/common components
    ├── Layout.tsx                 # Main application layout
    ├── Header.tsx                 # Application header
    ├── Sidebar.tsx                # Navigation sidebar
    ├── LoadingSpinner.tsx         # Loading indicator
    ├── ErrorBoundary.tsx          # Error handling component
    ├── ConfirmDialog.tsx          # Confirmation dialogs
    └── UnitToggle.tsx             # Unit conversion toggle
```

## 📄 Pages Directory (`/pages`)

```
pages/
├── 📄 _app.tsx                     # Main app component with providers
├── 📄 index.tsx                    # Landing page
├── 📁 api/                         # API routes (Next.js API)
│   ├── 📄 health.ts               # Health check endpoint
│   ├── 📁 auth/                   # Authentication endpoints
│   │   ├── 📄 login.ts            # User login
│   │   └── 📄 signup.ts           # User registration
│   ├── 📁 patients/               # Patient management endpoints
│   │   ├── 📄 index.ts            # List/create patients
│   │   └── 📄 [id].ts             # Get/update/delete patient
│   ├── 📁 entries/                # Data entry endpoints
│   │   ├── 📄 index.ts            # List/create entries
│   │   └── 📄 [id].ts             # Update/delete entry
│   └── 📄 recommend.ts            # AI recommendation endpoint
├── 📁 auth/                        # Authentication pages
│   ├── 📄 login.tsx               # Login page
│   └── 📄 signup.tsx              # Registration page
├── 📁 patients/                    # Patient management pages
│   ├── 📄 index.tsx               # Patient list page
│   ├── 📄 new.tsx                 # Add new patient
│   └── 📄 [id].tsx                # Patient details/edit
└── 📁 dashboard/                   # Main application pages
    ├── 📄 index.tsx               # Main dashboard
    ├── 📄 entries.tsx             # Data entry page
    ├── 📄 charts.tsx              # Analytics page
    └── 📄 recommendations.tsx     # AI recommendations page
```

## 🔧 Library Directory (`/lib`)

```
lib/
├── 📄 database.ts                  # SQLite database client
├── 📄 auth.ts                      # Authentication utilities
├── 📄 ai.ts                        # AI model integration
├── 📄 validation.ts                # Form validation schemas
├── 📄 api.ts                       # API client utilities
├── 📄 utils.ts                     # General utility functions
├── 📄 constants.ts                 # Application constants
└── 📄 middleware.ts                # API middleware functions
```

## 🗃️ Store Directory (`/store`)

```
store/
├── 📄 index.ts                     # Main Zustand store
├── 📄 selectors.ts                 # Store selectors
├── 📄 actions.ts                   # Store actions
└── 📄 middleware.ts                # Store middleware
```

## 📝 Types Directory (`/types`)

```
types/
├── 📄 index.ts                     # Main type definitions
├── 📄 api.ts                       # API-related types
├── 📄 forms.ts                     # Form-related types
├── 📄 charts.ts                    # Chart-related types
└── 📄 store.ts                     # Store-related types
```

## 🎨 Styles Directory (`/styles`)

```
styles/
├── 📄 globals.css                  # Global CSS styles
├── 📄 theme.ts                     # Material UI theme configuration
└── 📄 components.css               # Component-specific styles
```

## 📦 Public Directory (`/public`)

```
public/
├── 📄 favicon.ico                  # Application favicon
├── 📄 manifest.json                # PWA manifest
├── 📁 images/                      # Static images
└── 📁 icons/                       # Application icons
```

## 🧪 Testing Structure

```
__tests__/                          # Test files (co-located with components)
├── 📁 components/                  # Component tests
├── 📁 pages/                       # Page tests
├── 📁 lib/                         # Utility function tests
└── 📁 api/                         # API endpoint tests
```

## 🔐 Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="file:./data/diabetes.db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"

# AI Model
MODEL_API_KEY="your-openai-or-anthropic-api-key"
MODEL_NAME="openai-4o-mini"

# Application
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Optional Environment Variables

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"

# Logging
LOG_LEVEL="info"
```

## 🚀 Deployment Structure

### Docker Configuration

- **Dockerfile**: Multi-stage build for production
- **docker-compose.yml**: Service orchestration
- **nginx.conf**: Reverse proxy with SSL and rate limiting

### Deployment Scripts

- **deploy.sh**: Automated deployment script
- **Health checks**: Application readiness verification
- **SSL certificates**: Self-signed certificates for development

## 📊 Database Schema

### Core Tables

1. **users**: User accounts and authentication
2. **patients**: Patient profiles and medication preferences
3. **entries**: Blood glucose, meals, and insulin records
4. **recommendations**: AI-generated recommendations

### Relationships

- Users have many Patients (1:N)
- Patients have many Entries (1:N)
- Patients have many Recommendations (1:N)

## 🔄 State Management

### Zustand Store Structure

```typescript
interface AppState {
  user: User | null;
  currentPatient: Patient | null;
  patients: Patient[];
  entries: Entry[];
  recommendations: Recommendation[];
  isLoading: boolean;
  error: string | null;
  recommendationProgress: RecommendationProgress;
  units: {
    glucose: GlucoseUnit;
    insulin: InsulinUnit;
  };
}
```

### Store Actions

- User management (login, logout, profile)
- Patient management (CRUD operations)
- Entry management (CRUD operations)
- Recommendation management
- UI state management

## 🎯 Key Features Implementation

### 1. Multi-Patient Management

- Patient profiles with medication preferences
- Quick patient switching
- Patient-specific data isolation

### 2. Data Entry

- Quick entry forms for glucose, meals, insulin
- Validation and error handling
- Mobile-optimized input fields

### 3. AI Recommendations

- OpenAI/Anthropic integration
- Safety checks and warnings
- Progress indicators

### 4. Visual Analytics

- Recharts integration
- Responsive charts
- Interactive tooltips

### 5. Security

- JWT authentication
- Password hashing
- Rate limiting
- Input validation

## 🔧 Development Workflow

### Setup

1. Clone repository
2. Install dependencies: `npm install`
3. Copy environment file: `cp env.example .env.local`
4. Configure environment variables
5. Setup database: `npm run db:push`
6. Start development: `npm run dev`

### Testing

- Unit tests: `npm run test`
- Integration tests: `npm run test:integration`
- Coverage: `npm run test:coverage`

### Deployment

- Development: `npm run dev`
- Production: `./deploy.sh`
- Docker: `docker-compose up -d`

## 📈 Performance Considerations

- Next.js optimization
- Image optimization
- Code splitting
- Database query optimization
- Caching strategies
- Bundle size optimization

## 🔒 Security Considerations

- HTTPS enforcement
- Input sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Secure headers

This structure provides a scalable, maintainable, and secure foundation for the Diabetes Workflow Companion application.
