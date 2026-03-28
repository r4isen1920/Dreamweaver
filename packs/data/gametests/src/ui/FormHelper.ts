import { Player } from "@minecraft/server";
import {
	ActionFormData,
	ModalFormData,
	MessageFormData,
	FormCancelationReason,
} from "@minecraft/server-ui";

//#region Form Helper

type FormData = ActionFormData | ModalFormData | MessageFormData;

export async function showForm<T extends FormData>(
	form: T,
	player: Player,
	retries = 5,
): Promise<Awaited<ReturnType<T["show"]>>> {
	for (let i = 0; i < retries; i++) {
		const res = await (form as any).show(player);
		if (res.cancelationReason !== FormCancelationReason.UserBusy) return res;
	}
	return (form as any).show(player);
}

//#endregion
