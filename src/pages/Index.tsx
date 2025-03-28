import React, { useState, useEffect } from 'react';
import TR808 from '../components/TR808';
import { toast } from 'sonner';

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Set loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="min-h-screen">
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="bg-tr808-body p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-tr808-orange text-xl font-bold mb-3">TR-808 Loading</h2>
            <p className="text-tr808-silver mb-4">Preparing drum samples...</p>
            <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="bg-tr808-orange h-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      )}
      <TR808 />
    </div>
  );
};

export default Index;
