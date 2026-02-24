'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StickyNote, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface StickyNotesProps {
  workspaceId: string;
  userId: string;
}

export function StickyNotes({ workspaceId, userId }: StickyNotesProps) {
  const [notes, setNotes] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const storageKey = `notes_${workspaceId}_${userId}`;

  // Load from local storage specifically for this user and workspace
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }, [workspaceId, userId]);

  const saveNotes = (newNotes: string[]) => {
    setNotes(newNotes);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newNotes));
    } catch (error) {
      console.error('Failed to save notes:', error);
      toast.error('Failed to save note');
    }
  };

  const addNote = () => {
    if (!input.trim()) {
      toast.error('Please enter a note');
      return;
    }
    saveNotes([...notes, input.trim()]);
    setInput('');
    toast.success('Note added');
  };

  const deleteNote = (index: number) => {
    saveNotes(notes.filter((_, idx) => idx !== index));
    toast.success('Note deleted');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  return (
    <Card className="h-[400px] flex flex-col bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg">My Sticky Notes</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="flex gap-2 mb-4 sticky top-0 bg-amber-50/50 dark:bg-amber-900/10 z-10 pb-2">
          <Input
            className="bg-white dark:bg-background border-amber-200 dark:border-amber-800"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="New quick note..."
          />
          <Button
            size="icon"
            onClick={addNote}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <StickyNote className="w-12 h-12 mx-auto mb-2 opacity-20 text-amber-500" />
            <p>No notes yet</p>
            <p className="text-xs mt-1">Add your first quick note!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {notes.map((note, i) => (
              <div
                key={i}
                className="group relative p-3 bg-amber-100 dark:bg-amber-800/30 rounded border border-amber-200 dark:border-amber-700 text-sm shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="pr-6 break-words">{note}</p>
                <button
                  onClick={() => deleteNote(i)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-amber-200 dark:hover:bg-amber-700 rounded text-amber-700 dark:text-amber-300"
                  title="Delete note"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
