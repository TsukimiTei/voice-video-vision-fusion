# Voice Video Vision Demo

A minimal React app that combines video recording, speech recognition, and AI image generation using the Flux Kontext API.

## Features

- **Video Recording**: Capture video using MediaRecorder API
- **Speech Recognition**: Real-time speech-to-text using Web Speech API
- **Live Captions**: Display speech transcripts over video feed
- **AI Image Generation**: Generate images from the last video frame + voice command
- **Cross-platform**: Works on desktop and mobile browsers

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file and add your Flux Kontext API key:
   ```
   VITE_FLUX_KONTEXT_API_KEY=your_api_key_here
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to the local development URL

## Environment Variables

- `VITE_FLUX_KONTEXT_API_KEY`: Your Flux Kontext API key for image generation

## Browser Compatibility

### ✅ Fully Supported
- **Chrome** (Desktop & Android): All features work
- **Edge** (Desktop): All features work
- **Chrome Mobile** (Android): All features work

### ⚠️ Limited Support
- **Safari** (Desktop): Speech recognition works, but MediaRecorder API may have issues
- **Safari iOS**: MediaRecorder API not supported, speech recognition works

### 🔧 Requirements
- **HTTPS**: Required for camera/microphone access on mobile devices
- **Permissions**: Camera and microphone permissions required

## Technical Details

### Core Technologies
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **TailwindCSS**: Styling

### APIs Used
- **MediaDevices.getUserMedia()**: Camera/microphone access
- **MediaRecorder API**: Video recording
- **Web Speech API**: Speech recognition
- **Canvas API**: Frame capture from video
- **Flux Kontext API**: AI image generation

### Project Structure
```
src/
├── components/
│   └── Home.tsx              # Main component
├── hooks/
│   ├── useRecorder.ts        # Media recording logic
│   └── useSpeech.ts          # Speech recognition logic
├── types/
│   └── speech.d.ts           # Speech API type definitions
├── constants.ts              # Configuration constants
└── App.tsx                   # App entry point
```

## Manual Setup Steps

1. **Obtain API Key**: Sign up at [Flux Kontext](https://fluxkontext.com) to get an API key
2. **HTTPS Setup**: For mobile testing, ensure your development server uses HTTPS
3. **Camera Permissions**: Grant camera and microphone permissions when prompted
4. **Test Speech**: Ensure your microphone is working and speak clearly for best recognition

## Usage Flow

1. Click **"Start Recording"** button
2. Grant camera/microphone permissions
3. Speak your image generation command while recording
4. Click **"Stop Recording"** to capture frame and generate image
5. View the AI-generated image based on your voice command

## Troubleshooting

- **No camera access**: Check browser permissions and HTTPS requirement
- **Speech not working**: Ensure microphone permissions and speak clearly
- **API errors**: Verify your API key is correctly set in environment variables
- **Mobile issues**: Ensure HTTPS and try Chrome/Edge instead of Safari

## Development

To extend or modify the app:

- **Add new features**: Create new hooks or components
- **Modify recording**: Edit `useRecorder.ts`
- **Change speech settings**: Update `useSpeech.ts` and `constants.ts`
- **Styling changes**: Update TailwindCSS classes in components