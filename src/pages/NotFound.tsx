
import React from 'react';
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-tr808-body">
      <div className="tr808-panel p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-5xl font-bold mb-4 text-tr808-orange">404</h1>
        <p className="text-xl text-tr808-silver mb-6">
          Looks like this beat doesn't exist
        </p>
        <a href="/" className="inline-block">
          <Button className="bg-tr808-orange hover:bg-tr808-orange-light text-white">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Drum Machine
          </Button>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
