import { registerNotificationHandlers } from './notifications.handlers';

// Bootstrap: wire up subscribers on EventBus when module is imported
registerNotificationHandlers();

export { notificationsRoutes } from './notifications.routes';
