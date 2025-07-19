import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { VideoRecorder } from './components/VideoRecorder';
import { ImageEditor } from './components/ImageEditor';
import { VideoCompiler } from './components/VideoCompiler';
import { JWTTester } from './components/JWTTester';
import { Toaster } from './components/ui/sonner';

type AppState = 'home' | 'video' | 'image' | 'compiler' | 'jwt-test';

function App() {
  const [currentView, setCurrentView] = useState<AppState>('home');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomePage 
            onVideoRecord={() => setCurrentView('video')}
            onImageEdit={() => setCurrentView('image')}
            onVideoCompile={() => setCurrentView('compiler')}
            onJWTTest={() => setCurrentView('jwt-test')}
          />
        );
      case 'video':
        return <VideoRecorder onBack={() => setCurrentView('home')} />;
      case 'image':
        return <ImageEditor onBack={() => setCurrentView('home')} />;
      case 'compiler':
        return <VideoCompiler onBack={() => setCurrentView('home')} />;
      case 'jwt-test':
        return <JWTTester />;
      default:
        return (
          <HomePage 
            onVideoRecord={() => setCurrentView('video')}
            onImageEdit={() => setCurrentView('image')}
            onVideoCompile={() => setCurrentView('compiler')}
            onJWTTest={() => setCurrentView('jwt-test')}
          />
        );
    }
  };

  return (
    <>
      {renderCurrentView()}
      <Toaster />
    </>
  );
}

export default App;