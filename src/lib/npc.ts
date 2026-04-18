export const NPC_ELO = 900
export const NPC_DISPLAY_NAME = 'NPC'
const NPC_ID_PREFIX = '__npc__'

export function isNpcId(id: string): boolean {
  return id.startsWith(NPC_ID_PREFIX)
}

export function makeNpcId(index: number): string {
  return `${NPC_ID_PREFIX}${index}`
}
