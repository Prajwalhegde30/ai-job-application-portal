import { registerCareerAdvisorHandlers } from './advisor.handlers';

// Bootstrap handlers when module is imported
registerCareerAdvisorHandlers();

export { careerAdvisorRoutes } from './advisor.routes';
export * as careerAdvisorService from './advisor.service';
export * from './advisor.types';
