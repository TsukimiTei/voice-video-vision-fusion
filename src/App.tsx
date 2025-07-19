import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { VideoRecorder } from './components/VideoRecorder';
import { ImageEditor } from './components/ImageEditor';
import { VideoCompiler } from './components/VideoCompiler';
import { Toaster } from './components/ui/sonner';

type AppState = 'home' | 'video' | 'image' | 'compiler';

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
          />
        );
      case 'video':
        return <VideoRecorder onBack={() => setCurrentView('home')} />;
      case 'image':
        return <ImageEditor onBack={() => setCurrentView('home')} />;
      case 'compiler':
        return <VideoCompiler onBack={() => setCurrentView('home')} />;
      default:
        return (
          <HomePage 
            onVideoRecord={() => setCurrentView('video')}
            onImageEdit={() => setCurrentView('image')}
            onVideoCompile={() => setCurrentView('compiler')}
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