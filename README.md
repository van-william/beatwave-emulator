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

## Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Deployment
This app is configured for deployment on Netlify:

1. Fork/clone this repository
2. Connect your GitHub repository to Netlify
3. Deploy with the following settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 16.x (or your preferred version)

### Authentication Setup
1. Create a Supabase project
2. Enable Google OAuth in Supabase Authentication settings
3. Configure the following redirect URLs in Supabase:
   - `https://your-netlify-domain.netlify.app/auth/callback`
   - `https://your-netlify-domain.netlify.app`
4. Add your Supabase URL and anon key to your Netlify environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Sound Samples
The app uses high-quality TR-808 samples with the following characteristics:
- Authentic analog drum synthesis
- Multiple velocity layers
- Natural decay and envelope shaping
- Stereo field positioning
- Round-robin variations for natural feel

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.