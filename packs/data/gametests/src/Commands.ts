import { system, Player } from "@minecraft/server";
import { Vec3 } from "@bedrock-oss/bedrock-boost";
import { NAMESPACE, giveWand } from "./Utils.js";
import { SelectionManager } from "./Selection.js";
import { DreamweaverUI } from "./Interface.js";

//#region Commands

export class CommandHandler {
  static register(): void {
    system.afterEvents.scriptEventReceive.subscribe(ev => {
      if (!ev.id.startsWith(`${NAMESPACE}:`)) return;

      const player = ev.sourceEntity;
      if (!(player instanceof Player)) return;

      const cmd = ev.id.slice(NAMESPACE.length + 1);
      const args = ev.message.trim();

      switch (cmd) {
        case "menu": DreamweaverUI.showMainMenu(player); break;
        case "wand": giveWand(player); break;
        case "pos1": this.setPos(player, 1, args); break;
        case "pos2": this.setPos(player, 2, args); break;
        case "capture": DreamweaverUI.showMainMenu(player).then(() => {}); break;
        case "paste": DreamweaverUI.showImportForm(player); break;
        case "cancel": this.clearSelection(player); break;
        default: player.sendMessage(`§cUnknown command: ${cmd}`);
      }
    });
  }

  //#endregion

  //#region Handlers

  private static setPos(player: Player, posNum: 1 | 2, args: string): void {
    const sel = SelectionManager.get(player);
    let pos: Vec3;

    if (args) {
      const parts = args.split(/\s+/).map(Number);
      if (parts.length >= 3 && parts.every(n => !isNaN(n))) {
        pos = Vec3.from(parts[0], parts[1], parts[2]);
      } else {
        player.sendMessage("§cUsage: /scriptevent dw:pos1 <x> <y> <z>");
        return;
      }
    } else {
      pos = Vec3.from(player.location).floor();
    }

    if (posNum === 1) sel.pos1 = pos;
    else sel.pos2 = pos;

    player.sendMessage(`§dPos${posNum} §7set to §f${pos.x}, ${pos.y}, ${pos.z}`);
  }

  private static clearSelection(player: Player): void {
    SelectionManager.get(player).clear();
    player.sendMessage("§7Selection cleared.");
  }
}

//#endregion
