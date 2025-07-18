import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <>
      <div className="min-h-screen bg-background">
        <h1 className="text-center py-8 text-2xl font-bold text-foreground">Demo App</h1>
      </div>
      <Toaster />
    </>
  );
}

export default App;