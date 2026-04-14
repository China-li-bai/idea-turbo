import React from 'react';
import type { WisdomTeamBoardProps } from '../types.js';
import { PixelCharacter } from './PixelCharacter.js';
import { sprites } from '../sprites/index.js';

export function WisdomTeamBoard({
  agents,
  onCharacterClick,
  onCharacterHover,
  activeAgentId,
  streamingText = {},
  className = '',
}: WisdomTeamBoardProps) {
  return (
    <div className={`wisdom-board ${className}`}>
      <div className="wisdom-board__container">
        <h1 className="wisdom-board__title">Wisdom Team</h1>
        <div className="wisdom-board__grid">
          {agents.map((agent, index) => {
            const sprite = sprites[agent.id];
            if (!sprite) return null;

            const staggerClass = `wisdom-board__stagger-${Math.min(index + 1, 10)}`;

            return (
              <div key={agent.id} className={staggerClass}>
                <PixelCharacter
                  agent={agent}
                  sprite={sprite}
                  isActive={agent.id === activeAgentId}
                  isSpeaking={agent.id === activeAgentId}
                  streamingText={streamingText[agent.id]}
                  onClick={() => onCharacterClick?.(agent)}
                  onMouseEnter={() => onCharacterHover?.(agent)}
                  onMouseLeave={() => onCharacterHover?.(null)}
                  className="pixel-character--entering"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
