import { registerAIAnalysisHandlers } from './ai-analysis.handlers';

// Bootstrap handlers when module is loaded
registerAIAnalysisHandlers();

export { aiAnalysisRoutes } from './ai-analysis.routes';
export * as aiAnalysisService from './ai-analysis.service';
