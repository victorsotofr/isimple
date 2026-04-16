export type { paths, components, operations } from './generated';

// Convenience aliases for request/response bodies
import type { components } from './generated';

export type ChatRequest = components['schemas']['ChatRequest'];
export type ChatResponse = components['schemas']['ChatResponse'];
export type DraftRequest = components['schemas']['DraftRequest'];
export type DraftResponse = components['schemas']['DraftResponse'];
export type ClassifyRequest = components['schemas']['ClassifyRequest'];
export type ClassifyResponse = components['schemas']['ClassifyResponse'];
export type AgentMessage = components['schemas']['Message'];
export type MessageRole = AgentMessage['role'];
export type DraftTone = DraftRequest['tone'];
