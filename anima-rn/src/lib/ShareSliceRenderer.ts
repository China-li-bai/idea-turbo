import type { ShareSlice, Pet, PetDiary, PersonalityAwakening } from '../types'
import { SPECIES_CONFIG } from '../types'

const SLICE_TEMPLATES: Record<ShareSlice['type'], {
  titleTemplates: string[]
  subtitleTemplates: string[]
}> = {
  diary_highlight: {
    titleTemplates: [
      '{name}的今日观察',
      '{name}的日记本',
      '一只{species}的日常',
    ],
    subtitleTemplates: [
      '来自{species}的内心独白',
      '{name}偷偷写的小日记',
    ],
  },
  awakening: {
    titleTemplates: [
      '{name}觉醒了！',
      '性格觉醒：{label}',
      '{name}的灵魂蜕变',
    ],
    subtitleTemplates: [
      '经过{days}天的观察，{species}终于找到了自己',
      '盲盒开启！{label}诞生',
    ],
  },
  roast_quote: {
    titleTemplates: [
      '{name}的毒舌金句',
      '今日份吐槽',
      '{name}说：',
    ],
    subtitleTemplates: [
      '来自{species}的灵魂拷问',
      '毒舌但爱你的{name}',
    ],
  },
  encounter: {
    titleTemplates: [
      '{name}的星图邂逅',
      '两只灵魂的相遇',
      '{name}交到了新朋友！',
    ],
    subtitleTemplates: [
      '在宠物星图上的浪漫相遇',
      '匹配度{score}%的灵魂伙伴',
    ],
  },
  owner_portrait: {
    titleTemplates: [
      '{name}眼中的主人',
      '主人观察报告',
      '{name}的人类图鉴',
    ],
    subtitleTemplates: [
      '来自{species}的深情凝视',
      '{name}偷偷画的主人画像',
    ],
  },
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '')
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function createDiaryHighlightSlice(pet: Pet, diary: PetDiary): ShareSlice {
  const speciesInfo = SPECIES_CONFIG[pet.species]
  const vars = {
    name: pet.name,
    species: speciesInfo.label,
    emoji: speciesInfo.emoji,
  }

  const bestHighlight = diary.highlights.length > 0
    ? diary.highlights[0]
    : diary.content.slice(0, 30)

  return {
    id: `slice-diary-${pet.id}-${Date.now()}`,
    petId: pet.id,
    type: 'diary_highlight',
    title: fillTemplate(pickRandom(SLICE_TEMPLATES.diary_highlight.titleTemplates), vars),
    content: bestHighlight,
    subtitle: fillTemplate(pickRandom(SLICE_TEMPLATES.diary_highlight.subtitleTemplates), vars),
    createdAt: new Date().toISOString(),
    sharedAt: null,
  }
}

export function createAwakeningSlice(pet: Pet, awakening: PersonalityAwakening): ShareSlice {
  const speciesInfo = SPECIES_CONFIG[pet.species]
  const vars = {
    name: pet.name,
    species: speciesInfo.label,
    emoji: speciesInfo.emoji,
    label: awakening.label,
    days: String(awakening.observationDays),
  }

  return {
    id: `slice-awakening-${pet.id}-${Date.now()}`,
    petId: pet.id,
    type: 'awakening',
    title: fillTemplate(pickRandom(SLICE_TEMPLATES.awakening.titleTemplates), vars),
    content: `${awakening.label} — ${awakening.description}`,
    subtitle: fillTemplate(pickRandom(SLICE_TEMPLATES.awakening.subtitleTemplates), vars),
    createdAt: new Date().toISOString(),
    sharedAt: null,
  }
}

export function createRoastQuoteSlice(pet: Pet, quote: string): ShareSlice {
  const speciesInfo = SPECIES_CONFIG[pet.species]
  const vars = {
    name: pet.name,
    species: speciesInfo.label,
    emoji: speciesInfo.emoji,
  }

  return {
    id: `slice-roast-${pet.id}-${Date.now()}`,
    petId: pet.id,
    type: 'roast_quote',
    title: fillTemplate(pickRandom(SLICE_TEMPLATES.roast_quote.titleTemplates), vars),
    content: quote,
    subtitle: fillTemplate(pickRandom(SLICE_TEMPLATES.roast_quote.subtitleTemplates), vars),
    createdAt: new Date().toISOString(),
    sharedAt: null,
  }
}

export function createEncounterSlice(
  pet: Pet,
  otherSpecies: string,
  matchScore: number
): ShareSlice {
  const speciesInfo = SPECIES_CONFIG[pet.species]
  const vars = {
    name: pet.name,
    species: speciesInfo.label,
    emoji: speciesInfo.emoji,
    score: String(matchScore),
  }

  return {
    id: `slice-encounter-${pet.id}-${Date.now()}`,
    petId: pet.id,
    type: 'encounter',
    title: fillTemplate(pickRandom(SLICE_TEMPLATES.encounter.titleTemplates), vars),
    content: `${pet.name}在星图上遇到了一只${otherSpecies}，灵魂契合度${matchScore}%！`,
    subtitle: fillTemplate(pickRandom(SLICE_TEMPLATES.encounter.subtitleTemplates), vars),
    createdAt: new Date().toISOString(),
    sharedAt: null,
  }
}

export function createOwnerPortraitSlice(pet: Pet, ownerSummary: string): ShareSlice {
  const speciesInfo = SPECIES_CONFIG[pet.species]
  const vars = {
    name: pet.name,
    species: speciesInfo.label,
    emoji: speciesInfo.emoji,
  }

  return {
    id: `slice-portrait-${pet.id}-${Date.now()}`,
    petId: pet.id,
    type: 'owner_portrait',
    title: fillTemplate(pickRandom(SLICE_TEMPLATES.owner_portrait.titleTemplates), vars),
    content: ownerSummary,
    subtitle: fillTemplate(pickRandom(SLICE_TEMPLATES.owner_portrait.subtitleTemplates), vars),
    createdAt: new Date().toISOString(),
    sharedAt: null,
  }
}

export function getShareText(slice: ShareSlice, petName: string): string {
  return `${slice.title}\n\n${slice.content}\n\n${slice.subtitle}\n\n——来自${petName}的数字灵魂 🐾`
}

export function markSliceShared(slice: ShareSlice): ShareSlice {
  return {
    ...slice,
    sharedAt: new Date().toISOString(),
  }
}
