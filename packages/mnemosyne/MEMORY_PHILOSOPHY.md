# Mnemosyne Memory Philosophy

Mnemosyne is not a generic chat history store. It is the memory layer for an
AI personality that remembers, understands, and grows with its user.

## Core Principle: Remember By Xiang

Human recall is rarely a direct database lookup. People remember because a
scene, tone, time, relationship, or emotional pattern resonates with something
that happened before. Mnemosyne models this through **Xiang**: the whole
configuration of a memory.

In this project, Xiang means more than external context. A complete memory
should preserve:

- **Outer Xiang**: weather, place, activity, ambient mood, sensory details.
- **Inner Xiang**: the user's felt state, desire, fear, stress, trust, or hope.
- **Relationship Xiang**: who was involved and how the relationship felt.
- **Event Xiang**: the shape of the event, such as confession, promise,
  conflict, loss, celebration, or ritual.
- **Change Xiang**: how the relationship or personality was moving at that
  moment, such as becoming closer, withdrawing, awakening, or depending more.
- **Recall Cues**: specific triggers that can bring the memory back later:
  a phrase, time of day, rain, a location, a repeated behavior, or a mood.

## Retrieval Principle

Xiang must be a first-class recall path, not only a score adjustment after
keyword or embedding retrieval. If the current scene strongly resonates with a
stored Xiang, Mnemosyne should be able to surface that memory even when the
query text is weak, empty, or semantically unrelated.

## Product Behavior

The AI personality should use memory naturally. It should not recite logs. It
should recall with a reason:

> "This rainy late-night feeling reminds me of when you said you did not want
> to reply to anyone."

This makes the product an emotional memory infrastructure rather than an AI pet
skin over raw chat history.

## Product Expression Contract

The product promise is:

> 创造属于你的AI人格，它记得你、理解你、陪你长大。

Every product surface should make this promise credible:

- **Remember**: capture emotionally meaningful events, including naming,
  secrets, trust, hurt, silence, preferences, and repeated rituals.
- **Understand**: preserve the user's inner state and the relationship state,
  not only the literal words.
- **Grow**: allow recalled memories to influence tone, distance, initiative,
  personality traits, and awakening moments.
- **Stay bounded**: do not claim perfect empathy, therapy, or omniscience. The
  system recalls patterns and responds as a shaped AI personality.

Do not reduce the system to "AI pet behavior." The visible avatar is an
expression layer; Mnemosyne is the infrastructure that stores and recalls the
relationship.

## Engineering Rules

- Store structured Xiang whenever a memory is created.
- Keep raw content, but do not rely on raw content as the only recall key.
- Prefer resonant, emotionally meaningful memories over merely recent ones.
- Treat missing Xiang fields as unknown, not as negative evidence.
- Keep recall explainable by preserving triggered dimensions and recall cues.
- Test empty queries, missing embeddings, partial Xiang, weak resonance, and
  strong cue-only resonance.
