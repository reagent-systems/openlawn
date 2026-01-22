![OpenLawn Screenshot](./Screenshot%202026-01-21%20at%2020.48.40.jpg)

# 🌱 OpenLawn - AI-Powered Lawn Care Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.10.0-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Capacitor](https://img.shields.io/badge/Capacitor-7.4.2-119EFF?style=for-the-badge&logo=capacitor)](https://capacitorjs.com/)

> **The ultimate AI-powered CRM platform for modern lawn care businesses** 🚀

## ✨ Features

### 🎯 **Core Management**
- **Multi-Crew Management** - Organize teams, assign members, and track performance
- **Smart Route Optimization** - AI-powered route planning with Google Maps integration
- **Real-time GPS Tracking** - Live crew location monitoring and progress updates
- **Customer Relationship Management** - Complete customer profiles with service history

### 🤖 **AI-Powered Intelligence**
- **AI Customer Summaries** - Automated customer insights and service recommendations
- **Smart Scheduling** - Intelligent crew assignment based on location and availability
- **Predictive Analytics** - Service optimization and business insights
- **Natural Language Processing** - AI-powered customer communication

### 📱 **Cross-Platform**
- **Web Application** - Modern, responsive web interface
- **Mobile App** - Native iOS and Android apps with Capacitor
- **Offline Support** - Works without internet connection
- **Push Notifications** - Real-time updates and alerts

### 🔐 **Security & Authentication**
- **Role-Based Access** - Admin, Manager, Employee permissions
- **Firebase Authentication** - Secure user management
- **Real-time Data Sync** - Live updates across all devices
- **Data Encryption** - Enterprise-grade security

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Google Cloud APIs enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openlawn.git
cd openlawn

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Visit [http://localhost:9002](http://localhost:9002) to see the application.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI Components
- **Backend**: Firebase (Firestore, Auth, Storage)
- **AI**: Google AI (Gemini), Genkit Framework
- **Maps**: Google Maps API
- **Mobile**: Capacitor 7
- **Deployment**: Vercel

### Project Structure
```
src/
├── app/                    # Next.js app router
│   ├── employee/          # Employee dashboard
│   ├── manager/           # Manager dashboard
│   └── actions.ts         # Server actions
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── lawn-route/       # Route management
│   └── ui/               # Reusable UI components
├── lib/                   # Core services
│   ├── firebase.ts       # Firebase configuration
│   ├── auth.ts           # Authentication logic
│   ├── customer-service.ts # Customer management
│   └── route-service.ts  # Route optimization
├── hooks/                 # Custom React hooks
└── ai/                    # AI integration
    ├── genkit.ts         # AI configuration
    └── flows/            # AI workflows
```

## 📱 Mobile Development

### Building for Mobile
```bash
# Initialize Capacitor
npm run cap:init

# Add platforms
npm run cap:add:android
npm run cap:add:ios

# Build and sync
npm run build:mobile
npm run cap:sync

# Open in native IDEs
npm run cap:open:android  # Android Studio
npm run cap:open:ios      # Xcode
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# Google Maps API
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key

# Google AI (for AI features)
GOOGLE_AI_API_KEY=your_ai_api_key
```

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication, Firestore, and Storage
3. Set up Firestore security rules
4. Configure Google Maps API

## 🚀 Deployment

### Vercel Deployment
```bash
# Deploy to Vercel
vercel --prod
```

See [Vercel Deployment Guide](docs/vercel-deployment.md) for detailed instructions.

### Mobile App Store
```bash
# Build for production
npm run build:mobile

# Build APK/IPA
# Follow platform-specific build instructions
```

## 📊 Features Overview

### 🎯 **Crew Management**
- Create and manage multiple crews
- Assign team members to crews
- Track crew performance and efficiency
- Real-time crew location monitoring

### 🗺️ **Route Optimization**
- AI-powered route planning
- Google Maps integration
- Real-time traffic consideration
- Multi-stop route optimization

### 👥 **Customer Management**
- Complete customer profiles
- Service history tracking
- Customer preferences and notes
- Automated customer summaries

### 📅 **Smart Scheduling**
- Intelligent crew assignment
- Service day/time preferences
- Conflict detection and resolution
- Automated scheduling algorithms

### 📱 **Mobile Features**
- Offline data access
- GPS location tracking
- Photo capture and upload
- Push notifications

## 🤖 AI Features

### Customer Intelligence
- **Automated Summaries** - AI-generated customer insights
- **Service Recommendations** - Smart service suggestions
- **Predictive Analytics** - Business trend analysis
- **Natural Language Processing** - Customer communication

### Route Intelligence
- **Smart Optimization** - AI-powered route planning
- **Traffic Integration** - Real-time traffic consideration
- **Efficiency Analysis** - Route performance metrics
- **Predictive Routing** - Weather and traffic predictions

## 🔐 Security

- **Role-Based Access Control** - Granular permissions
- **Firebase Security Rules** - Database security
- **Data Encryption** - End-to-end encryption
- **Audit Logging** - Complete activity tracking

## 📈 Performance

- **Server-Side Rendering** - Fast initial page loads
- **Code Splitting** - Optimized bundle sizes
- **Image Optimization** - Automatic image compression
- **Caching Strategies** - Intelligent data caching

## 🛠️ Development

### Available Scripts
```bash
# Development
npm run dev              # Start development server
npm run genkit:dev       # Start AI development server
npm run genkit:watch     # Watch AI development server

# Building
npm run build            # Build for production
npm run build:mobile     # Build for mobile
npm run export           # Export static site

# Mobile Development
npm run cap:sync         # Sync with mobile platforms
npm run cap:open:android # Open in Android Studio
npm run cap:open:ios     # Open in Xcode

# Firebase
npm run firebase:deploy  # Deploy to Firebase
npm run firebase:emulators # Start Firebase emulators

# Utilities
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript check
npm run setup:env        # Setup environment
```

## 📚 Documentation

- [Architecture Overview](docs/architecture-overview.md)
- [Firebase Setup](docs/firebase-setup.md)
- [Multi-Crew Management](docs/multi-crew-management.md)
- [Capacitor Setup](docs/capacitor-setup.md)
- [Vercel Deployment](docs/vercel-deployment.md)
- [Firebase Fix Summary](docs/firebase-fix-summary.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Firebase](https://firebase.google.com/) - Backend services
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Capacitor](https://capacitorjs.com/) - Mobile development
- [Google AI](https://ai.google/) - AI capabilities
- [Radix UI](https://www.radix-ui.com/) - UI components

---

<div align="center">
  <strong>Built with ❤️ for modern lawn care businesses</strong>
</div>
