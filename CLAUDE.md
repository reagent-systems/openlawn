# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenLawn is an AI-powered lawn care management platform built with Next.js 15, Firebase, and Capacitor for cross-platform deployment. It enables lawn care businesses to manage crews, optimize routes, track customers, and leverage AI for customer insights.

## Development Commands

### Core Development
```bash
npm run dev                    # Start Next.js dev server on port 9002 with Turbopack
npm run build                  # Production build
npm run start                  # Start production server
npm run typecheck              # Run TypeScript compiler check (no emit)
npm run lint                   # Run ESLint
```

### AI Development (Genkit)
```bash
npm run genkit:dev             # Start Genkit AI dev server (localhost:3400)
npm run genkit:watch           # Start with watch mode for hot reload
```

### Mobile Development (Capacitor)
```bash
npm run build:mobile           # Build for mobile (runs scripts/build-mobile.js)
npm run cap:sync               # Sync web assets to native platforms
npm run cap:open:android       # Open project in Android Studio
npm run cap:open:ios           # Open project in Xcode
npm run cap:init               # Initialize Capacitor (first time setup)
npm run cap:add:android        # Add Android platform
npm run cap:add:ios            # Add iOS platform
```

### Firebase Commands
```bash
npm run firebase:deploy        # Deploy all Firebase resources
npm run firebase:deploy:rules  # Deploy only Firestore security rules
npm run firebase:emulators     # Start Firebase emulators (Auth:9099, Firestore:8080, Hosting:5000)
npm run firebase:init          # Initialize Firebase project
```

### Utilities
```bash
npm run setup:env              # Run environment setup script
npm run export                 # Export static site (Next.js static export)
```

## Architecture Patterns

### Service Layer Architecture

The codebase follows a **service-oriented architecture** with client-side Firebase interactions:

- **Services** (`src/lib/*-service.ts`) - Business logic and Firebase operations
  - `customer-service.ts` - Customer CRUD, priority calculation, service scheduling, photo management
  - `user-service.ts` - User/employee management, role filtering
  - `route-service.ts` - Route generation, crew availability, route optimization
  - `tsp-optimization-service.ts` - Traveling Salesman Problem solver for route optimization
  - `crew-assignment-service.ts` - Crew member assignment logic
  - `photo-service.ts` - Photo upload/download, compression, storage management
  - `firebase-services.ts` - Generic Firestore CRUD operations

- **Core Utilities** (`src/lib/`)
  - `firebase.ts` - Firebase initialization with getters (`getFirebaseAuth()`, `getFirebaseDb()`, `getFirebaseStorage()`)
  - `auth.ts` - Authentication functions (sign in/up/out, password reset, profile management)
  - `env.ts` - Environment configuration with web/mobile detection
  - `firebase-types.ts` - TypeScript interfaces for all data models

### Photo Management System

OpenLawn includes a complete photo management system for before/after work documentation:

**Storage Structure:**
```
/customers/{customerId}/services/{serviceId}/{photoType}/{photoId}.jpg
```
- `photoType`: "before" or "after"
- Photos automatically compressed to max 1920x1920, quality 0.8
- Max file size: 10MB
- Supported formats: JPEG, PNG, WebP (all converted to JPEG)

**Security:**
- Firebase Storage rules enforce role-based access
- Employees can upload photos for their own customers
- Managers/admins can access all photos
- Cross-service calls enabled to check Firestore permissions

**Components:**
- `PhotoCapture.tsx` - Camera/file capture with preview and batch upload
- `PhotoGallery.tsx` - Grid display with lightbox view and delete functionality
- `ServicePhotoManager.tsx` - Integrated tabbed interface (capture + gallery)

**Service Functions** (`photo-service.ts`):
```typescript
uploadPhoto(options) // Upload single photo with compression
uploadMultiplePhotos(customerId, serviceId, photoType, files) // Batch upload
deletePhoto(path) // Delete single photo
listServicePhotos(customerId, serviceId, photoType?) // List all photos
compressImage(file, maxWidth, maxHeight, quality) // Image compression
```

**Customer Service Integration** (`customer-service.ts`):
```typescript
addPhotosToService(customerId, serviceId, photoUrls) // Add photo URLs to service
removePhotoFromService(customerId, serviceId, photoUrl) // Remove photo URL
completeServiceWithPhotos(customerId, serviceId, beforePhotos, afterPhotos, notes) // Complete service with photos
```

**Usage Example:**
```typescript
import { ServicePhotoManager } from '@/components/lawn-route/ServicePhotoManager';

<ServicePhotoManager
  customerId={customer.id}
  serviceId={service.id}
  onPhotosChanged={() => console.log('Photos updated')}
  canEdit={isManager || isEmployee}
/>
```

### Authentication Flow

Authentication uses Firebase Auth with Firestore user profiles:

1. **AuthProvider** (`src/hooks/use-auth.tsx`) - React Context wrapping the entire app
   - Listens to Firebase auth state changes
   - Loads user profile from Firestore on auth
   - Provides `useAuth()` hook for components

2. **Auth Components** (`src/components/auth/`)
   - `AuthForm.tsx` - Sign in/sign up form with role selection
   - `ProtectedRoute.tsx` - Route guard component (checks auth + optional role)
   - `RoleBasedRouter.tsx` - Routes users based on role

3. **Role System**: `admin` | `manager` | `employee`
   - Managed via `role` field in Firestore `users` collection
   - Security rules enforce role-based access

### Data Flow Patterns

**Real-time Subscriptions:**
```typescript
// Services provide subscribe* functions for real-time updates
subscribeToCustomers(callback: (customers: Customer[]) => void)
subscribeToUsers(callback: (users: User[]) => void)
// Components use these in useEffect to listen for changes
```

**Route Optimization Pipeline:**
```typescript
// src/lib/route-service.ts
getAvailableCrews(date)
  → getCustomersNeedingService(date)
  → calculateCustomerPriorities()
  → clusterByZipCode()
  → optimizeRouteForCrew() // Calls TSP service
  → DailyRoute[]
```

**TSP Optimization Strategy:**
- Small datasets (≤10 customers): Nearest neighbor algorithm
- Larger datasets: Google Maps Directions API (up to 25 waypoints)
- Fallback: Haversine distance calculation

### Environment Configuration

**Web Environment** (Next.js):
- Uses `NEXT_PUBLIC_*` prefixed variables (exposed to client)
- Variables loaded via `process.env.NEXT_PUBLIC_*`

**Mobile Environment** (Capacitor):
- Uses non-prefixed variables during build
- Loaded via `scripts/build-mobile.js`

**Detection Logic** (`src/lib/env.ts`):
- Automatically detects web vs. mobile
- Checks for Capacitor presence: `window.Capacitor`
- Handles SSR/SSG build-time configuration

### Firebase Security Model

**Firestore Rules** (`firestore.rules`):
- Users can read/write their own profile
- Managers/admins can read all users
- Customers scoped to `createdBy` field (creator has full access)
- Managers/admins have elevated read access to customers

**Indexes** (`firestore.indexes.json`):
- `customers`: `(createdBy, status, createdAt DESC)`
- `users`: `(role, crewId)`

### Component Architecture

**Page Structure** (`src/app/page.tsx`):
- **Manager View**: 3-column responsive layout
  - Left (2/3): `ManagerMap` + `RouteDisplay`
  - Right (1/3): Tabbed management panels (Customers/Employees/Crews)
  - Mobile: Swipe navigation between views

- **Employee View**: 2-column layout
  - Left (2/3): Map with assigned customers
  - Right (1/3): Customer list

**Component Organization:**
- `src/components/lawn-route/` - Core business components (maps, routes, management sheets)
- `src/components/auth/` - Authentication components
- `src/components/ui/` - Reusable Radix UI wrapper components

### AI Integration (Genkit)

**Configuration** (`src/ai/genkit.ts`):
- Plugin: `@genkit-ai/googleai`
- Model: `gemini-2.0-flash-exp`
- Server-side AI operations (keeps `GOOGLE_AI_API_KEY` secure)

**Flows** (`src/ai/flows/`):
- `customer-summary.ts` - Generate AI customer insights and service recommendations
- `agent-flow.ts` - AI agent for business logic automation

**Development:**
- Run `npm run genkit:dev` to start AI development UI
- Access Genkit Dev UI at http://localhost:3400
- Test AI flows in isolation before integrating

### Mobile Considerations

**Capacitor Configuration** (`capacitor.config.ts`):
- App ID: `com.openlawn.app`
- Web directory: `public` (not `out` - important!)

**Platform Detection:**
- Use `useMobile()` hook for responsive behavior
- Check `window.Capacitor` for native capabilities
- GPS tracking: `useGeolocation()` hook (`src/hooks/use-geolocation.ts`)

**Build Process:**
- `npm run build:mobile` prepares environment and builds
- `npm run cap:sync` copies web assets to native projects
- Open native IDEs for final compilation and signing

## Key Technical Decisions

### Why Client-Side Firebase?
- Firebase security rules provide database-level security
- Eliminates need for custom backend API
- Real-time sync built-in
- Faster development for MVP

### API Key Security
- **Firebase keys**: Intentionally public (security via rules, not key hiding)
- **Google Maps key**: Should be restricted by domain/IP in Google Cloud Console
- **Google AI key**: Server-side only (never in client bundle)

### Route Optimization Approach
- Google Maps API limited to 25 waypoints
- For larger crews: split into multiple routes or use nearest neighbor
- Cache routes by date to reduce API calls
- Traffic-aware routing available via Google Maps Directions API

### Type Safety
- Next.js build currently ignores TypeScript errors (`ignoreBuildErrors: true`)
- This is temporary for rapid development
- Fix TypeScript errors before production deployment

## Database Schema

### Collections

**`users`** - Employees, managers, admins
```typescript
{
  id: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'admin'
  crewId?: string
  crewServiceTypes?: string[]
  schedule?: { [day: string]: { start: string, end: string } }
  currentLocation?: { lat: number, lng: number, timestamp: Timestamp }
  status: 'available' | 'busy' | 'offline'
}
```

**`customers`** - Customer profiles and service history
```typescript
{
  id: string
  name: string
  address: string
  lat: number
  lng: number
  status: 'active' | 'inactive' | 'pending'
  services: Service[]
  servicePreferences: {
    preferredDays: DayOfWeek[]
    preferredTimeRange: { start: string, end: string }
    serviceFrequency: number // days between services
  }
  lastServiceDate?: Timestamp
  nextServiceDate?: Timestamp
  createdBy: string // userId
}
```

## Common Patterns

### Adding a New Feature Component

1. Create component in appropriate directory (`src/components/lawn-route/` or `src/components/auth/`)
2. If it needs Firebase data, create/use service functions in `src/lib/*-service.ts`
3. Use real-time subscriptions for live data: `subscribeToCustomers()`, `subscribeToUsers()`
4. Wrap protected content with `<ProtectedRoute requiredRole="manager">`
5. Use `useAuth()` hook to access current user and profile

### Adding a New Firestore Collection

1. Add TypeScript interface to `src/lib/firebase-types.ts`
2. Create service file `src/lib/[collection]-service.ts` with CRUD operations
3. Update `firestore.rules` with security rules
4. Add indexes to `firestore.indexes.json` if querying with multiple fields
5. Deploy rules: `npm run firebase:deploy:rules`

### Working with Routes

- Route generation: `src/lib/route-service.ts`
- TSP optimization: `src/lib/tsp-optimization-service.ts`
- Display: `src/components/lawn-route/RouteDisplay.tsx`
- Map rendering: `src/components/lawn-route/ManagerMap.tsx`

Routes are cached by date to avoid repeated calculations. Clear cache when customer assignments change.

## Deployment Notes

### Web Deployment
- **Vercel**: Automatic deployment on push (if connected)
- **Firebase Hosting**: `npm run firebase:deploy`
- Set environment variables in deployment platform

### Mobile Deployment
1. Build: `npm run build:mobile`
2. Sync: `npm run cap:sync`
3. Open native IDE: `npm run cap:open:android` or `npm run cap:open:ios`
4. Build signed APK/IPA in native IDE
5. Submit to Google Play / App Store

### Environment Variables
Required for production:
- `NEXT_PUBLIC_FIREBASE_*` (all Firebase config)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (restrict in Google Cloud Console)
- `GOOGLE_AI_API_KEY` (server-side only, for AI features)

## Troubleshooting

### Firebase Not Initialized
- Check `src/lib/firebase.ts` - uses getter functions that return `null` if config missing
- Verify environment variables are loaded: check `src/lib/env.ts` debug logs in dev mode

### Routes Not Generating
- Check crew availability: crews need `schedule` with valid start/end times for the day
- Verify customers have `lat`/`lng` (geocoded addresses)
- Check console for route-service logs

### Mobile Build Issues
- Ensure `webDir: 'public'` in `capacitor.config.ts` matches build output
- Run `npm run cap:sync` after any web build changes
- Check native IDE for platform-specific errors

### Firestore Permission Denied
- Check `firestore.rules` - verify user role and document ownership
- For testing: use Firebase emulators (`npm run firebase:emulators`)
- Check that user profile has correct `role` field

## Future Architecture Considerations

The current architecture is client-heavy for rapid MVP development. For production scale:

1. **Cloud Functions**: Move route optimization, payment processing, and sensitive operations server-side
2. **Security Hardening**: Implement 2FA, rate limiting, audit logs
3. **Type Safety**: Fix TypeScript errors instead of ignoring them
4. **Monitoring**: Add Sentry for error tracking, Firebase Performance Monitoring
5. **Caching**: Implement Redis or similar for route cache persistence
6. **Image Storage**: Set up Firebase Storage rules and implement before/after photo uploads
7. **Payment Integration**: Add Stripe/Square for customer billing
