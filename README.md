# FashAI App - Complete AI Virtual Try-On Platform

This is a complete AI virtual try-on platform integrated with Fashn.ai API for high-quality fashion try-on results.

## Features

- 🎨 Virtual Try-On - Upload model and clothing images for realistic try-on results
- 👥 Model Swap - Replace models in existing product photos
- 📸 Photo Editor - Edit and enhance fashion photos
- 📊 Project History - Track and manage all your AI projects
- 🔐 User Authentication - Secure user registration and login
- 📱 Responsive Design - Works on all devices

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (Database, Authentication, Storage, Edge Functions)
- **AI Integration**: Fashn.ai API
- **UI Components**: shadcn/ui

## Getting Started

1. Sign up or log in to your account
2. Add your Fashn.ai API key in the dashboard
3. Start creating AI fashion projects!

## API Integration

This app uses the Fashn.ai API for professional-grade virtual try-on results:
- High-quality 864×1296 resolution outputs
- Fast processing (up to 40 seconds)
- Support for various clothing types
- Model swapping capabilities

## Security Features

- Row Level Security (RLS) on all database tables
- Secure file storage with proper access policies
- User-specific data isolation
- API key encryption in edge functions

## Database Schema

- **profiles**: User profile information
- **projects**: AI project records with status tracking
- **storage**: Secure image storage for uploads and results

Built with ❤️ using Lovable platform