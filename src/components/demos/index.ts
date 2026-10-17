import type { Component } from 'vue'
import DemoFire from './DemoFire.vue'
import DemoWheel from './DemoWheel.vue'
import DemoPaper from './DemoPaper.vue'
import DemoGunpowder from './DemoGunpowder.vue'
import DemoPrinting from './DemoPrinting.vue'
import DemoSteam from './DemoSteam.vue'
import DemoTelegraph from './DemoTelegraph.vue'
import DemoCircuit from './DemoCircuit.vue'
import DemoTelephone from './DemoTelephone.vue'
import DemoFlight from './DemoFlight.vue'
import DemoRocket from './DemoRocket.vue'
import DemoLogic from './DemoLogic.vue'
import DemoLitho from './DemoLitho.vue'
import DemoNet from './DemoNet.vue'

/** 14 个原理演示：id 与 node.demo.id 对应 */
export const DEMO_COMPONENTS: Record<string, Component> = {
  fire: DemoFire,
  wheel: DemoWheel,
  paper: DemoPaper,
  gunpowder: DemoGunpowder,
  printing: DemoPrinting,
  steam: DemoSteam,
  telegraph: DemoTelegraph,
  circuit: DemoCircuit,
  telephone: DemoTelephone,
  flight: DemoFlight,
  rocket: DemoRocket,
  logic: DemoLogic,
  litho: DemoLitho,
  net: DemoNet
}

export function demoComponent(id: string): Component | null {
  return DEMO_COMPONENTS[id] ?? null
}
