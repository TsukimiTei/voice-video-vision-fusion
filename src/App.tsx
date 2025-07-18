import { useState } from 'react';
import { HomePage } from './components/HomePage';
import { VideoRecorder } from './components/VideoRecorder';
import { ImageEditor } from './components/ImageEditor';
import { Toaster } from './components/ui/sonner';

type AppState = 'home' | 'video' | 'image';

function App() {
  const [currentView, setCurrentView] = useState<AppState>('home');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomePage 
            onVideoRecord={() => setCurrentView('video')}
            onImageEdit={() => setCurrentView('image')}
          />
        );
      case 'video':
        return <VideoRecorder onBack={() => setCurrentView('home')} />;
      case 'image':
        return <ImageEditor onBack={() => setCurrentView('home')} />;
      default:
        return (
          <HomePage 
            onVideoRecord={() => setCurrentView('video')}
            onImageEdit={() => setCurrentView('image')}
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