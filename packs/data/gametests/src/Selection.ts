import { world, Player, BlockVolume, type ItemStack } from "@minecraft/server";
import { Vec3, Logger } from "@bedrock-oss/bedrock-boost";
import { WAND_ITEM, WAND_NAME, VOLUME_WARN, vec3String } from "./Utils.js";

const log = Logger.getLogger("Selection");

//#region Selection

export class Selection {
  pos1?: Vec3;
  pos2?: Vec3;

  isComplete(): boolean {
    return this.pos1 !== undefined && this.pos2 !== undefined;
  }

  getVolume(): BlockVolume | undefined {
    if (!this.pos1 || !this.pos2) return undefined;
    return new BlockVolume(this.pos1, this.pos2);
  }

  getBlockCount(): number {
    return this.getVolume()?.getCapacity() ?? 0;
  }

  clear(): void {
    this.pos1 = undefined;
    this.pos2 = undefined;
  }
}

//#endregion

//#region Manager

function isWandItem(item?: ItemStack): boolean {
  return item?.typeId === WAND_ITEM && item?.nameTag === WAND_NAME;
}

function isWandHeld(player: Player): boolean {
  const item = player.getComponent("inventory")?.container?.getItem(player.selectedSlotIndex);
  return isWandItem(item);
}

export class SelectionManager {
  private static selections = new Map<string, Selection>();

  static get(player: Player): Selection {
    let sel = this.selections.get(player.id);
    if (!sel) {
      sel = new Selection();
      this.selections.set(player.id, sel);
    }
    return sel;
  }

  static registerEvents(): void {
    world.beforeEvents.playerInteractWithBlock.subscribe(ev => {
      if (!isWandItem(ev.itemStack)) return;

      ev.cancel = true;
      const pos = Vec3.from(ev.block.location);
      const sel = this.get(ev.player);
      sel.pos1 = pos;

      log.info(`${ev.player.name} set pos1 to ${vec3String(pos)}`);
      ev.player.sendMessage(`§dPos1 §7set to §f${vec3String(pos)}`);
      this.showSelectionInfo(ev.player, sel);
    });

    world.beforeEvents.playerBreakBlock.subscribe(ev => {
      if (!isWandHeld(ev.player)) return;

      ev.cancel = true;
      const pos = Vec3.from(ev.block.location);
      const sel = this.get(ev.player);
      sel.pos2 = pos;

      log.info(`${ev.player.name} set pos2 to ${vec3String(pos)}`);
      ev.player.sendMessage(`§dPos2 §7set to §f${vec3String(pos)}`);
      this.showSelectionInfo(ev.player, sel);
    });
  }

  private static showSelectionInfo(player: Player, sel: Selection): void {
    if (!sel.isComplete()) return;

    const vol = sel.getVolume()!;
    const span = vol.getSpan();
    const count = vol.getCapacity();

    let msg = `§7Selection: §f${span.x}§7x§f${span.y}§7x§f${span.z} §7(${count} blocks)`;
    if (count > VOLUME_WARN) {
      msg += `\n§eWarning: Large selection (>${VOLUME_WARN} blocks). Capture may be slow.`;
    }
    player.sendMessage(msg);
  }
}

//#endregion
