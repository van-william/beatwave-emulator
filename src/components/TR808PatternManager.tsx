import React, { useState, useEffect } from 'react';
import { Pattern, SavedPattern } from '@/types';
import TR808Button from './TR808Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Save, Trash, Download, Upload, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { patternService } from '@/services/patternService';
import { Switch } from '@/components/ui/switch';

interface TR808PatternManagerProps {
  currentPattern: Pattern;
  onPatternLoad: (pattern: Pattern) => void;
  onClose: () => void;
  open: boolean;
}

const TR808PatternManager: React.FC<TR808PatternManagerProps> = ({
  currentPattern,
  onPatternLoad,
  onClose,
  open
}) => {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<SavedPattern[]>([]);
  const [patternName, setPatternName] = useState(currentPattern.name);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPatterns = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userPatterns = await patternService.getUserPatterns(user.id);
        setPatterns(userPatterns);
      } catch (error) {
        console.error('Error loading patterns:', error);
        toast.error('Failed to load saved patterns');
      } finally {
        setLoading(false);
      }
    };

    if (open && user) {
      loadPatterns();
      setPatternName(currentPattern.name);
    }
  }, [open, currentPattern.name, user]);

  const saveCurrentPattern = async () => {
    if (!user) {
      toast.error('Please sign in to save patterns');
      return;
    }

    if (!patternName.trim()) {
      toast.error('Please enter a pattern name');
      return;
    }

    try {
      setLoading(true);
      const savedPattern = await patternService.savePattern(
        { ...currentPattern, name: patternName },
        user.id,
        isPublic
      );
      
      setPatterns(prev => [savedPattern, ...prev]);
      toast.success(`Pattern "${patternName}" saved successfully`);
    } catch (error) {
      console.error('Error saving pattern:', error);
      toast.error('Failed to save pattern');
    } finally {
      setLoading(false);
    }
  };

  const deletePattern = async (id: string) => {
    if (!user) return;

    try {
      setLoading(true);
      await patternService.deletePattern(id, user.id);
      setPatterns(prev => prev.filter(p => p.id !== id));
      toast.success('Pattern deleted');
    } catch (error) {
      console.error('Error deleting pattern:', error);
      toast.error('Failed to delete pattern');
    } finally {
      setLoading(false);
    }
  };

  const loadPattern = (pattern: SavedPattern) => {
    onPatternLoad(pattern);
    onClose();
    toast.success(`Pattern "${pattern.name}" loaded`);
  };

  const exportPattern = (pattern: SavedPattern) => {
    try {
      const json = JSON.stringify(pattern);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `TR808-Pattern-${pattern.name.replace(/\s+/g, '-')}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      toast.success('Pattern exported successfully');
    } catch (error) {
      console.error('Error exporting pattern:', error);
      toast.error('Failed to export pattern');
    }
  };

  const importPattern = () => {
    if (!user) {
      toast.error('Please sign in to import patterns');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const pattern = JSON.parse(content) as Pattern;
          
          // Basic validation
          if (!pattern.name || !pattern.steps) {
            throw new Error('Invalid pattern file');
          }
          
          setLoading(true);
          const savedPattern = await patternService.savePattern(pattern, user.id, false);
          setPatterns(prev => [savedPattern, ...prev]);
          
          toast.success(`Pattern "${pattern.name}" imported successfully`);
        } catch (error) {
          console.error('Error importing pattern:', error);
          toast.error('Failed to import pattern. Invalid file format.');
        } finally {
          setLoading(false);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-tr808-panel border-tr808-silver-dark/30 text-tr808-silver">
          <DialogHeader>
            <DialogTitle className="text-tr808-orange text-2xl">Sign In Required</DialogTitle>
            <DialogDescription>
              Please sign in to save and manage your patterns
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-tr808-panel border-tr808-silver-dark/30 text-tr808-silver max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-tr808-orange text-2xl">Pattern Manager</DialogTitle>
          <DialogDescription>
            Save, load, and manage your TR-808 patterns
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              value={patternName}
              onChange={(e) => setPatternName(e.target.value)}
              placeholder="Pattern name"
              className="bg-tr808-body border-tr808-silver-dark/50 text-tr808-silver"
            />
            <div className="flex items-center space-x-2">
              <Switch
                checked={isPublic}
                onCheckedChange={setIsPublic}
                className="data-[state=checked]:bg-tr808-orange"
              />
              <Globe size={16} className={isPublic ? "text-tr808-orange" : "text-tr808-silver-dark"} />
            </div>
            <TR808Button onClick={saveCurrentPattern} variant="orange" disabled={loading}>
              <Save size={16} className="mr-1" /> Save Current
            </TR808Button>
            <TR808Button onClick={importPattern} variant="default" disabled={loading}>
              <Upload size={16} className="mr-1" /> Import
            </TR808Button>
          </div>
          
          <div className="border-t border-tr808-silver-dark/30 pt-4">
            <h3 className="text-tr808-orange font-medium mb-2">Your Patterns</h3>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-tr808-orange mx-auto"></div>
              </div>
            ) : patterns.length === 0 ? (
              <div className="text-center py-4 text-tr808-silver-dark">
                No saved patterns yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {patterns.map((pattern) => (
                  <div 
                    key={pattern.id} 
                    className="flex items-center justify-between bg-tr808-body/50 p-3 rounded-md border border-tr808-silver-dark/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-tr808-silver font-medium">{pattern.name}</span>
                        {pattern.is_public && (
                          <Globe size={14} className="text-tr808-orange" />
                        )}
                      </div>
                      <div className="text-xs text-tr808-silver-dark">
                        BPM: {pattern.bpm} • {new Date(pattern.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => loadPattern(pattern)}
                        className="p-1.5 bg-tr808-amber/90 hover:bg-tr808-amber rounded text-tr808-body"
                        disabled={loading}
                      >
                        <div className="sr-only">Load</div>
                        <Upload size={16} />
                      </button>
                      
                      <button 
                        onClick={() => exportPattern(pattern)}
                        className="p-1.5 bg-tr808-panel hover:bg-tr808-silver-dark/30 rounded text-tr808-silver"
                        disabled={loading}
                      >
                        <div className="sr-only">Export</div>
                        <Download size={16} />
                      </button>
                      
                      <button 
                        onClick={() => deletePattern(pattern.id)}
                        className="p-1.5 bg-red-800/40 hover:bg-red-800/60 rounded text-red-200"
                        disabled={loading}
                      >
                        <div className="sr-only">Delete</div>
                        <Trash size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TR808PatternManager;
