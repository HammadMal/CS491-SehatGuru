# SehatGuru

**An AI-Powered Fitness and Nutrition Companion for South Asian Markets**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About

SehatGuru is a mobile health application designed to address healthcare challenges facing South Asian communities, particularly in Pakistan. The project aims to provide an affordable, culturally-relevant fitness and nutrition solution combining AI-powered coaching, adaptive workout planning, and personalized nutrition tracking.

**Project Status:** Early Development / Ideation Phase
**Current Phase:** Requirements specification and system design

This is a Kaavish capstone project at Habib University's Dhanani School of Science and Engineering (Fall 2025).

## Team

- **Hammad Malik**
- **Ahtisham Uddin**
- **Sameer Kamani**
- **Arsal Jangda**

## Quick Start

### Using Docker (Recommended)

1. **Setup environment:**
   - Copy `backend/.env.example` to `backend/.env` and configure required credentials
   - Place Firebase credentials in `backend/firebase-credentials.json`
   - See [backend/SETUP.md](backend/SETUP.md) for detailed configuration instructions

2. **First time - Build and run:**
```bash
# First build (downloads PyTorch ~700MB, takes a few minutes)
docker-compose up --build
```

3. **Daily usage - Just start:**
```bash
# After first build, start containers (much faster!)
docker-compose up

# Stop with Ctrl+C, or:
docker-compose down
```

4. **Access the API:**
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

**Note:** Docker caches pip packages automatically. Only use `--build` when modifying `requirements.txt`. Code changes hot-reload automatically.

### Manual Setup

For detailed manual setup instructions without Docker, see:
- [Backend Setup Guide](backend/SETUP.md)
- [App Setup Guide](app/README.md)

## Features

### ✅ Implemented
- **Authentication System** - Email/password and Google OAuth login
- **User Onboarding** - Personalized health profile setup
- **Food Detection** - AI-powered meal identification via camera
- **Manual Meal Logging** - Search and add meals from nutrition database
- **Dashboard** - Real-time calorie and macro tracking
- **AI Wellness Chatbot** - Instant fitness and nutrition guidance powered by Gemini AI

### 🚧 In Development
- Personalized workout plans
- Meal recommendations
- Progress tracking and analytics

## Documentation

### User Guides
- [App Setup Guide](app/README.md) - Mobile app installation and configuration
- [Authentication & Onboarding](app/AUTHENTICATION_ONBOARDING_DOCS.md) - User account flow
- [Dashboard & Camera Feature](app/DASHBOARD_CAMERAFEATURE.md) - Meal tracking features
- [AI Chatbot Feature](app/CHATBOT_FEATURE.md) - Wellness coach chatbot guide

### Developer Guides
- [Backend Setup](backend/SETUP.md) - Backend server configuration
- [Food Detection Setup](backend/FOOD_DETECTION_SETUP.md) - ML model integration
- [API Testing Guide](Confidence_testing/API_TESTING_GUIDE.md) - Testing endpoints

### Project Documentation
- [Project Proposal](Docs/SehatGuru-ProjectProposal.pdf) - Initial project proposal

## Development Status

**Current Phase:** Active Development

Recent implementations:
- ✅ AI-powered wellness chatbot with Gemini integration
- ✅ Meal type preselection for faster logging
- ✅ Dashboard auto-redirect after meal addition
- ✅ Onboarding flow bug fixes

More details will be added as the project progresses.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Habib University - Dhanani School of Science and Engineering*
