import {
	world,
	system,
	PlayerPlaceBlockAfterEvent,
	PlayerBreakBlockAfterEvent,
	PlayerInteractWithBlockBeforeEvent,
	PlayerInteractWithBlockAfterEvent,
	ItemUseBeforeEvent,
	ItemUseAfterEvent,
	PlayerInteractWithEntityBeforeEvent,
	PlayerInteractWithEntityAfterEvent,
	PlayerLeaveAfterEvent,
	PlayerLeaveBeforeEvent,
	PlayerJoinAfterEvent,
	PlayerSpawnAfterEvent,
	EntityDieAfterEvent,
	EntityHurtAfterEvent,
	EntityHitEntityAfterEvent,
	EntityHitBlockAfterEvent,
	EntityLoadAfterEvent,
	EntityRemoveAfterEvent,
	EntityRemoveBeforeEvent,
	EntitySpawnAfterEvent,
	ExplosionAfterEvent,
	ExplosionBeforeEvent,
	ItemStartUseAfterEvent,
	ItemStopUseAfterEvent,
	ItemCompleteUseAfterEvent,
	ItemReleaseUseAfterEvent,
	ItemStartUseOnAfterEvent,
	ItemStopUseOnAfterEvent,
	BlockExplodeAfterEvent,
	ButtonPushAfterEvent,
	LeverActionAfterEvent,
	PistonActivateAfterEvent,
	PressurePlatePopAfterEvent,
	PressurePlatePushAfterEvent,
	ProjectileHitBlockAfterEvent,
	ProjectileHitEntityAfterEvent,
	TargetBlockHitAfterEvent,
	TripWireTripAfterEvent,
	WeatherChangeAfterEvent,
	WeatherChangeBeforeEvent,
	EffectAddAfterEvent,
	EffectAddBeforeEvent,
	PlayerBreakBlockBeforeEvent,
	PlayerGameModeChangeAfterEvent,
	PlayerGameModeChangeBeforeEvent,
	PlayerButtonInputAfterEvent,
	PlayerHotbarSelectedSlotChangeAfterEvent,
	DataDrivenEntityTriggerAfterEvent,
	ScriptEventCommandMessageAfterEvent,
} from '@minecraft/server';
import DreamweaverLogger from './Logger.js';

const log = DreamweaverLogger.get('EventDecorators');

type EventHandler<T> = (event: T) => void;

interface EventRegistry {
	afterEvents: {
		playerPlaceBlock: EventHandler<PlayerPlaceBlockAfterEvent>[];
		playerBreakBlock: EventHandler<PlayerBreakBlockAfterEvent>[];
		playerInteractWithBlock: EventHandler<PlayerInteractWithBlockAfterEvent>[];
		playerInteractWithEntity: EventHandler<PlayerInteractWithEntityAfterEvent>[];
		playerLeave: EventHandler<PlayerLeaveAfterEvent>[];
		playerJoin: EventHandler<PlayerJoinAfterEvent>[];
		playerSpawn: EventHandler<PlayerSpawnAfterEvent>[];
		entityDie: EventHandler<EntityDieAfterEvent>[];
		entityHurt: EventHandler<EntityHurtAfterEvent>[];
		entityHitEntity: EventHandler<EntityHitEntityAfterEvent>[];
		entityHitBlock: EventHandler<EntityHitBlockAfterEvent>[];
		entityLoad: EventHandler<EntityLoadAfterEvent>[];
		entityRemove: EventHandler<EntityRemoveAfterEvent>[];
		entitySpawn: EventHandler<EntitySpawnAfterEvent>[];
		explosion: EventHandler<ExplosionAfterEvent>[];
		itemUse: EventHandler<ItemUseAfterEvent>[];
		itemStartUse: EventHandler<ItemStartUseAfterEvent>[];
		itemStopUse: EventHandler<ItemStopUseAfterEvent>[];
		itemCompleteUse: EventHandler<ItemCompleteUseAfterEvent>[];
		itemReleaseUse: EventHandler<ItemReleaseUseAfterEvent>[];
		itemStartUseOn: EventHandler<ItemStartUseOnAfterEvent>[];
		itemStopUseOn: EventHandler<ItemStopUseOnAfterEvent>[];
		blockExplode: EventHandler<BlockExplodeAfterEvent>[];
		buttonPush: EventHandler<ButtonPushAfterEvent>[];
		leverAction: EventHandler<LeverActionAfterEvent>[];
		pistonActivate: EventHandler<PistonActivateAfterEvent>[];
		pressurePlatePop: EventHandler<PressurePlatePopAfterEvent>[];
		pressurePlatePush: EventHandler<PressurePlatePushAfterEvent>[];
		projectileHitBlock: EventHandler<ProjectileHitBlockAfterEvent>[];
		projectileHitEntity: EventHandler<ProjectileHitEntityAfterEvent>[];
		targetBlockHit: EventHandler<TargetBlockHitAfterEvent>[];
		tripWireTrip: EventHandler<TripWireTripAfterEvent>[];
		weatherChange: EventHandler<WeatherChangeAfterEvent>[];
		effectAdd: EventHandler<EffectAddAfterEvent>[];
		playerGameModeChange: EventHandler<PlayerGameModeChangeAfterEvent>[];
		playerButtonInput: EventHandler<PlayerButtonInputAfterEvent>[];
		playerHotbarSelectedSlotChange: EventHandler<PlayerHotbarSelectedSlotChangeAfterEvent>[];
		dataDrivenEntityTrigger: EventHandler<DataDrivenEntityTriggerAfterEvent>[];
	};
	systemAfterEvents: {
		scriptEventReceive: EventHandler<ScriptEventCommandMessageAfterEvent>[];
	};
	beforeEvents: {
		playerInteractWithBlock: EventHandler<PlayerInteractWithBlockBeforeEvent>[];
		playerInteractWithEntity: EventHandler<PlayerInteractWithEntityBeforeEvent>[];
		playerLeave: EventHandler<PlayerLeaveBeforeEvent>[];
		itemUse: EventHandler<ItemUseBeforeEvent>[];
		entityRemove: EventHandler<EntityRemoveBeforeEvent>[];
		explosion: EventHandler<ExplosionBeforeEvent>[];
		weatherChange: EventHandler<WeatherChangeBeforeEvent>[];
		effectAdd: EventHandler<EffectAddBeforeEvent>[];
		playerBreakBlock: EventHandler<PlayerBreakBlockBeforeEvent>[];
		playerGameModeChange: EventHandler<PlayerGameModeChangeBeforeEvent>[];
	};
}

const eventRegistry: EventRegistry = {
	afterEvents: {
		playerPlaceBlock: [],
		playerBreakBlock: [],
		playerInteractWithBlock: [],
		playerInteractWithEntity: [],
		playerLeave: [],
		playerJoin: [],
		playerSpawn: [],
		entityDie: [],
		entityHurt: [],
		entityHitEntity: [],
		entityHitBlock: [],
		entityLoad: [],
		entityRemove: [],
		entitySpawn: [],
		explosion: [],
		itemUse: [],
		itemStartUse: [],
		itemStopUse: [],
		itemCompleteUse: [],
		itemReleaseUse: [],
		itemStartUseOn: [],
		itemStopUseOn: [],
		blockExplode: [],
		buttonPush: [],
		leverAction: [],
		pistonActivate: [],
		pressurePlatePop: [],
		pressurePlatePush: [],
		projectileHitBlock: [],
		projectileHitEntity: [],
		targetBlockHit: [],
		tripWireTrip: [],
		weatherChange: [],
		effectAdd: [],
		playerGameModeChange: [],
		playerButtonInput: [],
		playerHotbarSelectedSlotChange: [],
		dataDrivenEntityTrigger: [],
	},
	systemAfterEvents: {
		scriptEventReceive: [],
	},
	beforeEvents: {
		playerInteractWithBlock: [],
		playerInteractWithEntity: [],
		playerLeave: [],
		itemUse: [],
		entityRemove: [],
		explosion: [],
		weatherChange: [],
		effectAdd: [],
		playerBreakBlock: [],
		playerGameModeChange: [],
	},
};

/**
 * Creates a decorator for registering event handlers
 */
function createEventDecorator<T>(
	eventType: 'afterEvents' | 'beforeEvents' | 'systemAfterEvents',
	eventName: keyof EventRegistry['afterEvents'] | keyof EventRegistry['beforeEvents'] | keyof EventRegistry['systemAfterEvents']
) {
	return function (
		target: any,
		propertyKey: string,
		descriptor: PropertyDescriptor
	) {
		const handler = descriptor.value as EventHandler<T>;
		const boundHandler = handler.bind(target);
		(eventRegistry[eventType] as any)[eventName].push(boundHandler);
		log.debug(
			`Registered ${eventType}.${eventName} handler: ${target.name}.${propertyKey}`
		);
	};
}




//#region AfterEvents

export function AfterPlayerPlaceBlock(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerPlaceBlockAfterEvent>(
		'afterEvents',
		'playerPlaceBlock'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerBreakBlock(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerBreakBlockAfterEvent>(
		'afterEvents',
		'playerBreakBlock'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerInteractWithBlock(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerInteractWithBlockAfterEvent>(
		'afterEvents',
		'playerInteractWithBlock'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerInteractWithEntity(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerInteractWithEntityAfterEvent>(
		'afterEvents',
		'playerInteractWithEntity'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerLeave(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerLeaveAfterEvent>(
		'afterEvents',
		'playerLeave'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerJoin(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerJoinAfterEvent>(
		'afterEvents',
		'playerJoin'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerSpawn(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerSpawnAfterEvent>(
		'afterEvents',
		'playerSpawn'
	)(target, propertyKey, descriptor);
}

export function AfterEntityDie(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntityDieAfterEvent>(
		'afterEvents',
		'entityDie'
	)(target, propertyKey, descriptor);
}

export function AfterEntityHurt(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntityHurtAfterEvent>(
		'afterEvents',
		'entityHurt'
	)(target, propertyKey, descriptor);
}

export function AfterEntityHitEntity(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntityHitEntityAfterEvent>(
		'afterEvents',
		'entityHitEntity'
	)(target, propertyKey, descriptor);
}

export function AfterEntityHitBlock(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntityHitBlockAfterEvent>(
		'afterEvents',
		'entityHitBlock'
	)(target, propertyKey, descriptor);
}

export function AfterEntityLoad(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntityLoadAfterEvent>(
		'afterEvents',
		'entityLoad'
	)(target, propertyKey, descriptor);
}

export function AfterEntityRemove(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntityRemoveAfterEvent>(
		'afterEvents',
		'entityRemove'
	)(target, propertyKey, descriptor);
}

export function AfterEntitySpawn(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntitySpawnAfterEvent>(
		'afterEvents',
		'entitySpawn'
	)(target, propertyKey, descriptor);
}

export function AfterExplosion(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ExplosionAfterEvent>(
		'afterEvents',
		'explosion'
	)(target, propertyKey, descriptor);
}

export function AfterItemUse(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemUseAfterEvent>('afterEvents', 'itemUse')(
		target,
		propertyKey,
		descriptor
	);
}

export function AfterItemStartUse(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemStartUseAfterEvent>(
		'afterEvents',
		'itemStartUse'
	)(target, propertyKey, descriptor);
}

export function AfterItemStopUse(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemStopUseAfterEvent>(
		'afterEvents',
		'itemStopUse'
	)(target, propertyKey, descriptor);
}

export function AfterItemCompleteUse(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemCompleteUseAfterEvent>(
		'afterEvents',
		'itemCompleteUse'
	)(target, propertyKey, descriptor);
}

export function AfterItemReleaseUse(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemReleaseUseAfterEvent>(
		'afterEvents',
		'itemReleaseUse'
	)(target, propertyKey, descriptor);
}

export function AfterItemStartUseOn(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemStartUseOnAfterEvent>(
		'afterEvents',
		'itemStartUseOn'
	)(target, propertyKey, descriptor);
}

export function AfterItemStopUseOn(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemStopUseOnAfterEvent>(
		'afterEvents',
		'itemStopUseOn'
	)(target, propertyKey, descriptor);
}

export function AfterBlockExplode(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<BlockExplodeAfterEvent>(
		'afterEvents',
		'blockExplode'
	)(target, propertyKey, descriptor);
}

export function AfterButtonPush(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ButtonPushAfterEvent>(
		'afterEvents',
		'buttonPush'
	)(target, propertyKey, descriptor);
}

export function AfterLeverAction(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<LeverActionAfterEvent>(
		'afterEvents',
		'leverAction'
	)(target, propertyKey, descriptor);
}

export function AfterPistonActivate(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PistonActivateAfterEvent>(
		'afterEvents',
		'pistonActivate'
	)(target, propertyKey, descriptor);
}

export function AfterPressurePlatePop(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PressurePlatePopAfterEvent>(
		'afterEvents',
		'pressurePlatePop'
	)(target, propertyKey, descriptor);
}

export function AfterPressurePlatePush(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PressurePlatePushAfterEvent>(
		'afterEvents',
		'pressurePlatePush'
	)(target, propertyKey, descriptor);
}

export function AfterProjectileHitBlock(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ProjectileHitBlockAfterEvent>(
		'afterEvents',
		'projectileHitBlock'
	)(target, propertyKey, descriptor);
}

export function AfterProjectileHitEntity(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ProjectileHitEntityAfterEvent>(
		'afterEvents',
		'projectileHitEntity'
	)(target, propertyKey, descriptor);
}

export function AfterTargetBlockHit(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<TargetBlockHitAfterEvent>(
		'afterEvents',
		'targetBlockHit'
	)(target, propertyKey, descriptor);
}

export function AfterTripWireTrip(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<TripWireTripAfterEvent>(
		'afterEvents',
		'tripWireTrip'
	)(target, propertyKey, descriptor);
}

export function AfterWeatherChange(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<WeatherChangeAfterEvent>(
		'afterEvents',
		'weatherChange'
	)(target, propertyKey, descriptor);
}

export function AfterEffectAdd(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EffectAddAfterEvent>(
		'afterEvents',
		'effectAdd'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerGameModeChange(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerGameModeChangeAfterEvent>(
		'afterEvents',
		'playerGameModeChange'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerButtonInput(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerButtonInputAfterEvent>(
		'afterEvents',
		'playerButtonInput'
	)(target, propertyKey, descriptor);
}

export function AfterPlayerHotbarSelectedSlotChange(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerHotbarSelectedSlotChangeAfterEvent>(
		'afterEvents',
		'playerHotbarSelectedSlotChange'
	)(target, propertyKey, descriptor);
}

export function AfterDataDrivenEntityTrigger(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<DataDrivenEntityTriggerAfterEvent>(
		'afterEvents',
		'dataDrivenEntityTrigger'
	)(target, propertyKey, descriptor);
}




//#region SystemAfterEvents

export function SystemScriptEventReceive(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ScriptEventCommandMessageAfterEvent>(
		'systemAfterEvents',
		'scriptEventReceive'
	)(target, propertyKey, descriptor);
}




//#region BeforeEvents

export function BeforePlayerInteractWithBlock(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerInteractWithBlockBeforeEvent>(
		'beforeEvents',
		'playerInteractWithBlock'
	)(target, propertyKey, descriptor);
}

export function BeforePlayerInteractWithEntity(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerInteractWithEntityBeforeEvent>(
		'beforeEvents',
		'playerInteractWithEntity'
	)(target, propertyKey, descriptor);
}

export function BeforePlayerLeave(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerLeaveBeforeEvent>(
		'beforeEvents',
		'playerLeave'
	)(target, propertyKey, descriptor);
}

export function BeforeItemUse(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ItemUseBeforeEvent>(
		'beforeEvents',
		'itemUse'
	)(target, propertyKey, descriptor);
}

export function BeforeEntityRemove(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EntityRemoveBeforeEvent>(
		'beforeEvents',
		'entityRemove'
	)(target, propertyKey, descriptor);
}

export function BeforeExplosion(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<ExplosionBeforeEvent>(
		'beforeEvents',
		'explosion'
	)(target, propertyKey, descriptor);
}

export function BeforeWeatherChange(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<WeatherChangeBeforeEvent>(
		'beforeEvents',
		'weatherChange'
	)(target, propertyKey, descriptor);
}

export function BeforeEffectAdd(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<EffectAddBeforeEvent>(
		'beforeEvents',
		'effectAdd'
	)(target, propertyKey, descriptor);
}

export function BeforePlayerBreakBlock(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerBreakBlockBeforeEvent>(
		'beforeEvents',
		'playerBreakBlock'
	)(target, propertyKey, descriptor);
}

export function BeforePlayerGameModeChange(
	target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	return createEventDecorator<PlayerGameModeChangeBeforeEvent>(
		'beforeEvents',
		'playerGameModeChange'
	)(target, propertyKey, descriptor);
}




//#region Init

/**
 * Initializes all event subscriptions based on registered decorators.
 * This should be called once during startup.
 */
export function initializeEventSubscriptions() {
	// Subscribe to all after events
	for (const [eventName, handlers] of Object.entries(
		eventRegistry.afterEvents
	)) {
		if (handlers.length > 0) {
			(world.afterEvents as any)[eventName].subscribe((event: any) => {
				for (const handler of handlers) {
					try {
						handler(event);
					} catch (error) {
						log.error(
							`Error in afterEvents.${eventName} handler: ${error}`
						);
					}
				}
			});
			log.info(
				`Subscribed ${handlers.length} handler(s) to afterEvents.${eventName}`
			);
		}
	}

	// Subscribe to all system after events
	for (const [eventName, handlers] of Object.entries(
		eventRegistry.systemAfterEvents
	)) {
		if (handlers.length > 0) {
			(system.afterEvents as any)[eventName].subscribe((event: any) => {
				for (const handler of handlers) {
					try {
						handler(event);
					} catch (error) {
						log.error(
							`Error in system.afterEvents.${eventName} handler: ${error}`
						);
					}
				}
			});
			log.info(
				`Subscribed ${handlers.length} handler(s) to system.afterEvents.${eventName}`
			);
		}
	}

	// Subscribe to all before events
	for (const [eventName, handlers] of Object.entries(
		eventRegistry.beforeEvents
	)) {
		if (handlers.length > 0) {
			(world.beforeEvents as any)[eventName].subscribe((event: any) => {
				for (const handler of handlers) {
					try {
						handler(event);
					} catch (error) {
						log.error(
							`Error in beforeEvents.${eventName} handler: ${error}`
						);
					}
				}
			});
			log.info(
				`Subscribed ${handlers.length} handler(s) to beforeEvents.${eventName}`
			);
		}
	}

	log.info('All event subscriptions initialized.');
}
