/**
 * app/api/aspects/route.js
 *
 * POST /api/aspects
 *
 * Body:
 * {
 *   natal: {
 *     sun: 182.5, moon: 262.1, mercury: 190.3, venus: 94.3,
 *     mars: 30.0, jupiter: 200.0, saturn: 45.0, uranus: 310.0,
 *     neptune: 280.0, pluto: 240.0
 *   },
 *   options: {                          // all optional
 *     date: "2026-04-26T12:00:00Z",    // defaults to now
 *     transitPlanets: ["moon","sun"],   // defaults to all
 *     natalPlanets:   ["moon","sun"],   // defaults to all
 *     aspectNames: ["conjunction","square","trine","opposition","sextile"]
 *   }
 * }
 *
 * Response:
 * {
 *   timestamp: "2026-04-26T12:00:00.000Z",
 *   currentPositions: { sun: {...}, moon: {...}, ... },
 *   aspects: [
 *     {
 *       transitPlanet: "mars",
 *       natalPlanet: "moon",
 *       aspectName: "square",
 *       symbol: "□",
 *       angle: 90,
 *       nature: "hard",
 *       orb: 0.70,
 *       applying: true,
 *       strength: "exact",
 *       exactAt: "2026-04-26T14:30:00.000Z",
 *       exactAtLabel: "exact in ~2h",
 *       transitDeg: 352.80,
 *       natalDeg: 262.10,
 *       interpretation: {
 *         keywords: ["emotional friction", "reactivity", ...],
 *         core: "...",
 *         shadow: "...",
 *         gift: "...",
 *         domains: [...],
 *         advice: "..."
 *       }
 *     },
 *     ...
 *   ],
 *   summary: {
 *     total: 9,
 *     exact: 1,
 *     strong: 3,
 *     hard: 4,
 *     soft: 5,
 *     neutral: 0
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { getPlanetPositions, getZodiacInfo, PLANET_META } from '@/lib/ephemeris';
import { getActiveAspects, formatExactAt } from '@/lib/aspects';
import { getInterpretation } from '@/lib/interpretations';

export async function POST(request) {
  try {
    const body = await request.json();

    // ── Validate natal chart ──────────────────────────────────────────────────
    if (!body.natal || typeof body.natal !== 'object') {
      return NextResponse.json(
        { error: 'Missing required field: natal (object of planet longitudes)' },
        { status: 400 }
      );
    }

    const natal = body.natal;
    const options = body.options || {};

    // ── Parse date ────────────────────────────────────────────────────────────
    const date = options.date ? new Date(options.date) : new Date();
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date in options.date' },
        { status: 400 }
      );
    }

    // ── Calculate current positions ───────────────────────────────────────────
    const rawCurrentPositions = getPlanetPositions(date);

    // Enrich current positions with zodiac info for the response
    const currentPositions = {};
    for (const [planet, longitude] of Object.entries(rawCurrentPositions)) {
      const zodiac = getZodiacInfo(longitude);
      const meta   = PLANET_META[planet] || {};
      currentPositions[planet] = {
        longitude,
        ...zodiac,
        label: meta.label  || planet,
        glyph: meta.symbol || '?',
        color: meta.color  || '#888',
      };
    }

    // ── Detect aspects ────────────────────────────────────────────────────────
    const rawAspects = getActiveAspects(rawCurrentPositions, natal, {
      transitPlanets: options.transitPlanets,
      natalPlanets:   options.natalPlanets,
      aspectNames:    options.aspectNames,
    });

    // ── Enrich aspects with interpretations and labels ────────────────────────
    const aspects = rawAspects.map((asp) => {
      const interpretation = getInterpretation(
        asp.transitPlanet,
        asp.aspectName,
        asp.natalPlanet
      );

      const transitMeta = PLANET_META[asp.transitPlanet] || {};
      const natalMeta   = PLANET_META[asp.natalPlanet]   || {};

      return {
        ...asp,
        exactAt:      asp.exactAt ? asp.exactAt.toISOString() : null,
        exactAtLabel: asp.exactAt ? formatExactAt(asp.exactAt) : null,
        transitLabel: transitMeta.label  || asp.transitPlanet,
        transitGlyph: transitMeta.symbol || '?',
        natalLabel:   natalMeta.label    || asp.natalPlanet,
        natalGlyph:   natalMeta.symbol   || '?',
        // Natal planet zodiac info
        natalZodiac:  getZodiacInfo(asp.natalDeg),
        interpretation,
      };
    });

    // ── Build summary ─────────────────────────────────────────────────────────
    const summary = {
      total:   aspects.length,
      exact:   aspects.filter((a) => a.strength === 'exact').length,
      strong:  aspects.filter((a) => a.strength === 'strong').length,
      moderate:aspects.filter((a) => a.strength === 'moderate').length,
      wide:    aspects.filter((a) => a.strength === 'wide').length,
      hard:    aspects.filter((a) => a.nature === 'hard').length,
      soft:    aspects.filter((a) => a.nature === 'soft').length,
      neutral: aspects.filter((a) => a.nature === 'neutral').length,
      applying:    aspects.filter((a) => a.applying).length,
      separating:  aspects.filter((a) => !a.applying).length,
    };

    return NextResponse.json({
      timestamp: date.toISOString(),
      currentPositions,
      aspects,
      summary,
    });

  } catch (err) {
    console.error('[/api/aspects] Error:', err);
    return NextResponse.json(
      { error: 'Failed to calculate aspects.' },
      { status: 500 }
    );
  }
}

// ── Optional: GET handler to test the route is alive ─────────────────────────
export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint with a natal chart to get active transits.',
    example: {
      natal: {
        sun: 182.5, moon: 262.1, mercury: 190.3, venus: 94.3,
        mars: 30.0, jupiter: 200.0, saturn: 45.0,
        uranus: 310.0, neptune: 280.0, pluto: 240.0,
      },
      options: {
        date: new Date().toISOString(),
        aspectNames: ['conjunction', 'sextile', 'square', 'trine', 'opposition'],
      },
    },
  });
}
