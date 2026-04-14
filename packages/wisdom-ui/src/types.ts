import type { Agent } from '@idea-turbo/brain-trust';

export type CharacterState = 'idle' | 'hover' | 'active' | 'speaking' | 'clicked';

export type CharacterReaction =
  | { type: 'bounce' }
  | { type: 'spin' }
  | { type: 'shake' }
  | { type: 'jump' }
  | { type: 'wave' }
  | { type: 'glow' };

export interface SpritePalette {
  [colorCode: string]: string;
}

export interface SpriteData {
  id: string;
  grid: string[];
  palette: SpritePalette;
  width: number;
  height: number;
}

export interface CharacterConfig {
  agent: Agent;
  sprite: SpriteData;
  reaction: CharacterReaction['type'];
  position: { row: number; col: number };
}

export interface WisdomTeamBoardProps {
  agents: Agent[];
  onCharacterClick?: (agent: Agent) => void;
  onCharacterHover?: (agent: Agent | null) => void;
  activeAgentId?: string;
  streamingText?: Record<string, string>;
  className?: string;
}

export interface PixelCharacterProps {
  agent: Agent;
  sprite: SpriteData;
  reaction?: CharacterReaction['type'];
  isActive?: boolean;
  isSpeaking?: boolean;
  streamingText?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
}
