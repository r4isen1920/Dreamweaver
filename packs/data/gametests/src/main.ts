import { initializeEventSubscriptions } from "./utils/EventDecorators.js";

// Side-effect imports: trigger decorator registration
import "./ui/Selection.js";
import "./ui/Commands.js";

initializeEventSubscriptions();
