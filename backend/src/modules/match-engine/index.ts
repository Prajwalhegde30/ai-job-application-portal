import { registerMatchEngineHandlers } from './match-engine.handlers';

// Bootstrap handlers when module is imported
registerMatchEngineHandlers();

export { matchEngineRoutes } from './match-engine.routes';
export * as matchEngineService from './match-engine.service';
export * from './match-engine.types';
