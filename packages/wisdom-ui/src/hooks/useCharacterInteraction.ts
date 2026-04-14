import { useState, useCallback, useRef } from 'react';
import type { CharacterState, CharacterReaction } from '../types.js';

interface InteractionState {
  state: CharacterState;
  reaction: CharacterReaction | null;
  position: { x: number; y: number };
}

export function useCharacterInteraction(agentId: string) {
  const [interaction, setInteraction] = useState<InteractionState>({
    state: 'idle',
    reaction: null,
    position: { x: 0, y: 0 },
  });

  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerReaction = useCallback((reaction: CharacterReaction) => {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);

    setInteraction((prev) => ({
      ...prev,
      reaction,
    }));

    reactionTimer.current = setTimeout(() => {
      setInteraction((prev) => ({
        ...prev,
        reaction: null,
      }));
    }, 600);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setInteraction((prev) => ({
      ...prev,
      state: prev.state === 'speaking' ? 'speaking' : 'hover',
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setInteraction((prev) => ({
      ...prev,
      state: prev.state === 'speaking' ? 'speaking' : 'idle',
      reaction: null,
    }));
  }, []);

  const handleClick = useCallback(() => {
    triggerReaction({ type: 'jump' });
    setInteraction((prev) => ({
      ...prev,
      state: 'clicked',
    }));

    setTimeout(() => {
      setInteraction((prev) => ({
        ...prev,
        state: prev.state === 'speaking' ? 'speaking' : 'hover',
      }));
    }, 500);
  }, [triggerReaction]);

  const handleDoubleClick = useCallback(() => {
    triggerReaction({ type: 'spin' });
  }, [triggerReaction]);

  const setSpeaking = useCallback((speaking: boolean) => {
    setInteraction((prev) => ({
      ...prev,
      state: speaking ? 'speaking' : 'idle',
    }));
  }, []);

  const setActive = useCallback((active: boolean) => {
    setInteraction((prev) => ({
      ...prev,
      state: active ? 'active' : 'idle',
    }));
  }, []);

  return {
    interaction,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onDoubleClick: handleDoubleClick,
    },
    setSpeaking,
    setActive,
  };
}
