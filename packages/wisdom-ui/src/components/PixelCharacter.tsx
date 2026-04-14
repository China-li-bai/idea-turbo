import React, { useMemo } from 'react';
import type { PixelCharacterProps, CharacterState } from '../types.js';
import { spriteToRects } from '../sprites/sprite-renderer.js';
import { useCharacterInteraction } from '../hooks/useCharacterInteraction.js';

function getStateClass(state: CharacterState, reactionType: string | null): string {
  if (reactionType) return `pixel-character--reaction-${reactionType}`;
  return `pixel-character--${state}`;
}

export function PixelCharacter({
  agent,
  sprite,
  reaction = 'jump',
  isActive = false,
  isSpeaking = false,
  streamingText,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = '',
}: PixelCharacterProps) {
  const { interaction, handlers } = useCharacterInteraction(agent.id);

  const rects = useMemo(() => spriteToRects(sprite), [sprite]);

  const stateClass = getStateClass(
    isSpeaking ? 'speaking' : interaction.state,
    interaction.reaction?.type ?? null,
  );

  return (
    <div
      className={`pixel-character ${stateClass} ${className}`}
      style={{ '--agent-color': agent.color } as React.CSSProperties}
      onClick={(e) => {
        handlers.onClick();
        onClick?.();
      }}
      onMouseEnter={(e) => {
        handlers.onMouseEnter();
        onMouseEnter?.();
      }}
      onMouseLeave={(e) => {
        handlers.onMouseLeave();
        onMouseLeave?.();
      }}
      onDoubleClick={handlers.onDoubleClick}
      role="button"
      tabIndex={0}
      aria-label={`${agent.name} - ${agent.role}`}
    >
      {isSpeaking && streamingText && (
        <div className="speech-bubble">
          <span className="speech-bubble__text">{streamingText}</span>
          <span className="speech-bubble__cursor" />
        </div>
      )}

      <svg
        className="pixel-character__sprite"
        width="56"
        height="80"
        viewBox={`0 0 ${sprite.width} ${sprite.height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {rects.map((rect, index) => (
          <rect
            key={`${rect.x}-${rect.y}-${index}`}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={rect.fill}
          />
        ))}
      </svg>

      <div className="floating-island">
        <div
          className="floating-island__grass"
          style={{
            background: `linear-gradient(to bottom, ${agent.color}88, ${agent.color}44)`,
          }}
        />
        <div className="floating-island__stone" />
        <div className="floating-island__shadow" />
      </div>

      <div
        className="pixel-character__name-tag"
        style={{ color: agent.color }}
      >
        {agent.name}
      </div>
      <div className="pixel-character__role-label">{agent.role}</div>

      {isSpeaking && (
        <div className="xp-bar">
          <div className="xp-bar__fill" style={{ width: '60%' }} />
        </div>
      )}
    </div>
  );
}
