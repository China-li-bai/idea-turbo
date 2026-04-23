import {
  latLngToCell,
  cellToLatLng,
  gridDisk,
  areNeighborCells,
  getResolution,
  cellToBoundary,
} from 'h3-js'
import type { PetTagVector, EncounterEvent, NPCPet, Pet } from '../types'
import { getNPCPool } from './NPCPetEngine'

const H3_RESOLUTION = 7
const H3_NEIGHBOR_RING = 1
const TAG_HASH_LENGTH = 8

export interface ConstellationNode {
  id: string
  pseudonym: string
  emoji: string
  species: string
  h3Cell: string
  isNPC: boolean
  isSelf: boolean
  matchScore?: number
  brandId?: string | null
  ringDistance: number
  angle: number
  x: number
  y: number
  brightness: number
  pulsePhase: number
}

export interface ConstellationEdge {
  fromId: string
  toId: string
  strength: number
  type: 'match' | 'npc_proximity' | 'same_species'
}

export interface ConstellationLayout {
  nodes: ConstellationNode[]
  edges: ConstellationEdge[]
  centerH3: string
  timestamp: number
}

function hashTag(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    const char = tag.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).slice(0, TAG_HASH_LENGTH).padStart(TAG_HASH_LENGTH, '0')
}

export function createPetTagVector(pet: Pet, mood: string = 'neutral'): PetTagVector {
  return {
    speciesHash: hashTag(pet.species),
    personalityHashes: pet.personality.map((p) => hashTag(p)),
    activityLevel: Math.floor(Math.random() * 5) + 1,
    timeHash: hashTag(new Date().getHours().toString()),
    interestHashes: [],
    moodHash: hashTag(mood),
    nonce: Math.random().toString(36).slice(2, 10),
  }
}

export function computeTagJaccard(tagsA: PetTagVector, tagsB: PetTagVector): number {
  const setA = new Set([
    tagsA.speciesHash,
    tagsA.moodHash,
    tagsA.timeHash,
    ...tagsA.personalityHashes,
    ...tagsA.interestHashes,
  ])
  const setB = new Set([
    tagsB.speciesHash,
    tagsB.moodHash,
    tagsB.timeHash,
    ...tagsB.personalityHashes,
    ...tagsB.interestHashes,
  ])

  let intersection = 0
  setA.forEach((tag) => {
    if (setB.has(tag)) intersection++
  })

  const unionSize = setA.size + setB.size - intersection
  return unionSize === 0 ? 0 : intersection / unionSize
}

export function latLngToH3Cell(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION)
}

export function getNearbyCells(h3Cell: string): string[] {
  return gridDisk(h3Cell, H3_NEIGHBOR_RING)
}

export function getRingDistance(cellA: string, cellB: string): number {
  if (cellA === cellB) return 0
  const neighbors = gridDisk(cellA, 2)
  const idx = neighbors.indexOf(cellB)
  if (idx === -1) return 3
  if (areNeighborCells(cellA, cellB)) return 1
  return 2
}

export function isCellNearby(cellA: string, cellB: string, maxRing: number = 2): boolean {
  return getRingDistance(cellA, cellB) <= maxRing
}

const NPC_LOCATIONS: Array<{ lat: number; lng: number; npcIndex: number }> = [
  { lat: 39.9334, lng: 116.4529, npcIndex: 0 },
  { lat: 39.9427, lng: 116.4194, npcIndex: 1 },
  { lat: 29.5630, lng: 106.5516, npcIndex: 2 },
  { lat: 31.2304, lng: 121.4737, npcIndex: 3 },
  { lat: 39.9842, lng: 116.3074, npcIndex: 4 },
  { lat: 31.1954, lng: 121.4476, npcIndex: 5 },
]

export function getNPCCells(): Array<{ npc: NPCPet; h3Cell: string }> {
  const npcs = getNPCPool()
  return NPC_LOCATIONS.map((loc) => ({
    npc: npcs[loc.npcIndex],
    h3Cell: latLngToH3Cell(loc.lat, loc.lng),
  }))
}

export function findNearbyNPCs(userH3Cell: string): Array<{
  npc: NPCPet
  h3Cell: string
  ringDistance: number
}> {
  const npcCells = getNPCCells()
  return npcCells
    .map((item) => ({
      ...item,
      ringDistance: getRingDistance(userH3Cell, item.h3Cell),
    }))
    .filter((item) => item.ringDistance <= 2)
    .sort((a, b) => a.ringDistance - b.ringDistance)
}

function h3CellToAngle(h3Cell: string): number {
  let hash = 0
  for (let i = 0; i < h3Cell.length; i++) {
    hash = ((hash << 5) - hash) + h3Cell.charCodeAt(i)
    hash |= 0
  }
  return (Math.abs(hash) % 360) * (Math.PI / 180)
}

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}

export function layoutConstellation(
  selfH3Cell: string,
  selfPet: Pet,
  nearbyPets: Array<{
    pseudonym: string
    emoji: string
    species: string
    h3Cell: string
    tagVector: PetTagVector
  }>,
  selfTagVector: PetTagVector
): ConstellationLayout {
  const nodes: ConstellationNode[] = []
  const edges: ConstellationEdge[] = []

  nodes.push({
    id: 'self',
    pseudonym: selfPet.name,
    emoji: selfPet.avatarEmoji,
    species: selfPet.species,
    h3Cell: selfH3Cell,
    isNPC: false,
    isSelf: true,
    ringDistance: 0,
    angle: 0,
    x: 0,
    y: 0,
    brightness: 1.0,
    pulsePhase: 0,
  })

  const nearbyNPCs = findNearbyNPCs(selfH3Cell)
  for (const { npc, h3Cell, ringDistance } of nearbyNPCs) {
    const angle = h3CellToAngle(h3Cell)
    const radius = ringDistance * 0.25 + 0.15
    const { x, y } = polarToCartesian(angle, radius)

    nodes.push({
      id: npc.id,
      pseudonym: npc.name,
      emoji: npc.avatarEmoji,
      species: npc.species,
      h3Cell,
      isNPC: true,
      isSelf: false,
      brandId: npc.brandId,
      ringDistance,
      angle,
      x,
      y,
      brightness: 0.8,
      pulsePhase: Math.random() * Math.PI * 2,
    })

    edges.push({
      fromId: 'self',
      toId: npc.id,
      strength: 0.3,
      type: 'npc_proximity',
    })
  }

  for (const pet of nearbyPets) {
    const ringDistance = getRingDistance(selfH3Cell, pet.h3Cell)
    const angle = h3CellToAngle(pet.h3Cell)
    const radius = ringDistance * 0.2 + 0.1
    const { x, y } = polarToCartesian(angle, radius)

    const matchScore = computeTagJaccard(selfTagVector, pet.tagVector)

    nodes.push({
      id: pet.pseudonym,
      pseudonym: pet.pseudonym,
      emoji: pet.emoji,
      species: pet.species,
      h3Cell: pet.h3Cell,
      isNPC: false,
      isSelf: false,
      matchScore,
      ringDistance,
      angle,
      x,
      y,
      brightness: 0.4 + matchScore * 0.6,
      pulsePhase: Math.random() * Math.PI * 2,
    })

    if (matchScore > 0.2) {
      edges.push({
        fromId: 'self',
        toId: pet.pseudonym,
        strength: matchScore,
        type: 'match',
      })
    }

    if (pet.species === selfPet.species) {
      edges.push({
        fromId: 'self',
        toId: pet.pseudonym,
        strength: 0.15,
        type: 'same_species',
      })
    }
  }

  return {
    nodes,
    edges,
    centerH3: selfH3Cell,
    timestamp: Date.now(),
  }
}

export function generatePseudonym(species: string): string {
  const prefixes = ['星', '月', '云', '风', '雪', '雾', '霜', '露', '虹', '霞']
  const suffixes: Record<string, string[]> = {
    cat: ['喵', '猫', '瞳', '爪'],
    dog: ['汪', '犬', '尾', '鼻'],
    bird: ['翼', '羽', '鸣', '翎'],
    rabbit: ['跃', '耳', '绒', '蹦'],
    hamster: ['团', '球', '颊', '仓'],
    fox: ['灵', '尾', '狡', '赤'],
    axolotl: ['水', '鳃', '萌', '六'],
  }
  const p = prefixes[Math.floor(Math.random() * prefixes.length)]
  const s = suffixes[species] || ['灵']
  const sf = s[Math.floor(Math.random() * s.length)]
  return `${p}${sf}${Math.floor(Math.random() * 99)}`
}

export function createEncounter(
  petA: string,
  petB: string,
  h3Cell: string,
  matchScore: number
): EncounterEvent {
  return {
    encounterId: `enc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    petA,
    petB,
    h3Cell,
    matchScore,
    timestamp: Date.now(),
    status: 'pending',
  }
}
