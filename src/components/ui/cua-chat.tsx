import React, { useState } from "react";
import { Button } from "./button";
import { Zap } from "lucide-react";
import AIMessageBar from "./ai-message-bar";

const CUAChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        className="bg-gradient-primary hover:opacity-90 glow"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Zap className="w-4 h-4 mr-2" />
        CUA Optimization
      </Button>

      {/* Side Chat */}
      {isOpen && (
        <div className="fixed right-4 top-4 bottom-4 z-50 animate-slide-in-right">
          <AIMessageBar onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
};

export default CUAChat;
