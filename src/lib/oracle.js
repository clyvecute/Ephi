/**
 * Ephi AI Abstraction Layer (The Oracle)
 *
 * This module acts as the central router for all AI interpretations.
 * It allows switching between different models (Gemini, Claude, GPT) 
 * for redundancy and quality control.
 */

import * as GeminiProvider from './gemini';
import * as GroqProvider from './providers/groq';

// Configuration: Which provider is active?
const getActiveProvider = () => localStorage.getItem('ephi_oracle_provider') || import.meta.env.VITE_ORACLE_PROVIDER || 'google';
const PRIMARY_PROVIDER = getActiveProvider();

/**
 * Main entry point for generating astrological readings.
 */
export async function generateReading(params) {
  // Respect Purist Mode: If the user has disabled AI in settings, don't even call the API
  const settings = JSON.parse(localStorage.getItem('ephi_settings') || '{}');
  if (settings.puristMode) {
    throw new Error('AI Synthesis is disabled in your Oracle Settings.');
  }

  const provider = params.provider || getActiveProvider();

  switch (provider) {
    case 'google':
      return await GeminiProvider.generateReading(params);
    
    case 'groq':
      return await GroqProvider.generateReading(params);

    default:
      throw new Error(`Oracle Provider "${provider}" is not configured.`);
  }
}

/**
 * Generate a deep-dive reading for a single transit aspect.
 */
export async function generateAspectReading(params) {
  const provider = params.provider || PRIMARY_PROVIDER;

  switch (provider) {
    case 'google':
      return await GeminiProvider.generateAspectReading(params);
    default:
      throw new Error(`Oracle Provider "${provider}" is not configured.`);
  }
}

/**
 * Generate a specialized synastry reading.
 */
export async function generateSynastryReading(params) {
  const provider = params.provider || PRIMARY_PROVIDER;
  switch (provider) {
    case 'google':
      return await GeminiProvider.generateSynastryReading(params);
    default:
      throw new Error(`Oracle Provider "${provider}" is not configured.`);
  }
}

export async function generateVedicReading(params) {
  const provider = params.provider || PRIMARY_PROVIDER;
  switch (provider) {
    case 'google':
      return await GeminiProvider.generateVedicReading(params);
    default:
      throw new Error(`Oracle Provider "${provider}" is not configured.`);
  }
}

export async function generateHoraryReading(params) {
  const provider = params.provider || PRIMARY_PROVIDER;
  switch (provider) {
    case 'google':
      return await GeminiProvider.generateHoraryReading(params);
    default:
      throw new Error(`Oracle Provider "${provider}" is not configured.`);
  }
}

export async function continueHoraryReading(params) {
  const provider = params.provider || PRIMARY_PROVIDER;
  switch (provider) {
    case 'google':
      return await GeminiProvider.continueHoraryReading(params);
    default:
      throw new Error(`Oracle Provider "${provider}" is not configured.`);
  }
}

export async function generateReturnReading(params) {
  const provider = params.provider || PRIMARY_PROVIDER;
  switch (provider) {
    case 'google':
      return await GeminiProvider.generateReturnReading(params);
    default:
      throw new Error(`Oracle Provider "${provider}" is not configured.`);
  }
}

export function isOracleConfigured() {
  switch (PRIMARY_PROVIDER) {
    case 'google':
      return GeminiProvider.isGeminiConfigured();
    case 'groq':
      return GroqProvider.isGroqConfigured();
    default:
      return false;
  }
}

/**
 * Diagnostic test for the current active provider.
 */
export async function testOracle() {
  switch (PRIMARY_PROVIDER) {
    case 'google':
      return await GeminiProvider.testApi();
    default:
      return { status: 'unknown', latency: 0 };
  }
}

export const FOCUS_AREAS = GeminiProvider.FOCUS_AREAS;
