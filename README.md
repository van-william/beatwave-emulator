# 808 Emulator

## Purpose
I started with a lovable dev project and shifted to cursor to learn more about supabase and 
google auth methods. Why learn these in a book when I could make an 808 emulator instead!?!
A web-based TR-808 drum machine emulator with modern UI and sound synthesis.

## Features
- Authentic TR-808 sound emulation
- Google Authentication for saving beats
- Modern, responsive UI
- Real-time sound playback
- Pattern saving and loading
- Audio recording with optional microphone input
- Pattern export

## Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build
```

## Environment Setup
This project uses environment variables for configuration. Create a `.env` file in the root directory with the following:

```
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Add other environment variables below
```

**IMPORTANT:** Never commit your `.env` file to version control. The `.env.example` file should be used as a template.

## Deployment
This app is configured for deployment on Netlify:

1. Fork/clone this repository
2. Connect your GitHub repository to Netlify
3. Add the environment variables to your Netlify project:
   - Go to Site settings > Environment variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Deploy with the following settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 16.x (or your preferred version)

### Authentication Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Enable Google OAuth in Supabase Authentication settings
3. Configure the following redirect URLs in Supabase:
   - `https://your-netlify-domain.netlify.app/auth/callback`
   - `https://your-netlify-domain.netlify.app`
   - `http://localhost:5173/auth/callback` (for local development)
   - `http://localhost:5173` (for local development)
4. Get your Supabase URL and anon key from your Supabase project settings

## Security Best Practices
- Always use environment variables for sensitive credentials
- Never hard-code API keys or secrets in your application code
- Regularly update dependencies to address security vulnerabilities
- Use the `.gitignore` file to exclude sensitive files like `.env` from version control

## Sound Synthesis
The app uses Web Audio API for real-time synthesis of TR-808 sounds with the following characteristics:
- Authentic analog drum synthesis
- Multiple velocity layers
- Natural decay and envelope shaping
- Stereo field positioning
- Round-robin variations for natural feel

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
MIT