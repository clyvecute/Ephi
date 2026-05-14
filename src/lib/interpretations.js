/**
 * lib/interpretations.js
 *
 * Built-in interpretation library for transit aspects.
 * No API needed — instant, offline, free.
 *
 * Usage:
 *   import { getInterpretation, getSummary } from '@/lib/interpretations';
 *
 *   const result = getInterpretation('mars', 'square', 'moon');
 *   // {
 *   //   keywords: ['emotional friction', 'reactivity', 'drive vs feeling'],
 *   //   core: 'Short 2-sentence meaning...',
 *   //   shadow: 'What to watch out for...',
 *   //   gift: 'The upside / opportunity...',
 *   //   domains: ['emotions', 'relationships', 'energy'],
 *   //   advice: 'Practical tip...',
 *   // }
 */

// ─── Aspect character ─────────────────────────────────────────────────────────

export const ASPECT_CHARACTER = {
  conjunction: {
    mode: 'fusion',
    tone: 'The energies of both planets merge and amplify each other — for better or worse depending on the planets involved.',
  },
  sextile: {
    mode: 'opportunity',
    tone: 'A harmonious opening. The energy is available but requires a small push to activate — it won\'t just happen on its own.',
  },
  square: {
    mode: 'tension',
    tone: 'Friction that demands action. Uncomfortable but growth-producing — the pressure is pointing at something that needs to shift.',
  },
  trine: {
    mode: 'flow',
    tone: 'Natural ease and support. Gifts arrive with little resistance. The risk is taking it for granted or being too passive.',
  },
  opposition: {
    mode: 'polarity',
    tone: 'A tug-of-war between two sides. Awareness, balance, and integration are the keys — one side can\'t simply win.',
  },
};

// ─── Interpretation table ─────────────────────────────────────────────────────
// Structure: INTERPRETATIONS[transitPlanet][natalPlanet][aspectName]
// Each entry: { keywords[], core, shadow, gift, domains[], advice }

const INTERPRETATIONS = {

  // ── TRANSIT SUN ────────────────────────────────────────────────────────────
  sun: {
    sun: {
      conjunction: {
        keywords: ['solar return energy', 'identity reset', 'new cycle', 'vitality surge'],
        core: 'Your annual solar return — the Sun returns to its natal position, marking a personal new year. A moment to set intentions, check your life direction, and recommit to your core identity.',
        shadow: 'Ego inflation or burnout from trying to do too much at once.',
        gift: 'Renewed vitality, clarity of purpose, and a natural fresh start.',
        domains: ['identity', 'vitality', 'purpose', 'life direction'],
        advice: 'Reflect on the past year and set one clear intention for the year ahead.',
        insight: 'The Solar Return is the "Soul\'s Birthday" — a recursive loop where your primary creative spark is re-calibrated. It is not just about "luck" for the year, but about whether your current character is still a fit for the destiny your Sun originally envisioned. Look at the House this falls in; that is your primary theater of evolution for the next 12 months.',
      },
      sextile: {
        keywords: ['confidence boost', 'creative flow', 'self-expression', 'light social energy'],
        core: 'A gentle but real boost to your confidence and self-expression. Things you put your name to right now tend to land well.',
        shadow: 'Overconfidence in small matters, missing bigger picture.',
        gift: 'Easy charm and likability — good for presentations, dating, or pitching ideas.',
        domains: ['identity', 'creativity', 'social life'],
        advice: 'Put yourself out there. Reach out to people you admire.',
      },
      square: {
        keywords: ['identity friction', 'ego challenge', 'course correction', 'will tested'],
        core: 'External circumstances or other people are challenging your sense of self and direction. The question is whether your current path truly reflects who you are.',
        shadow: 'Stubbornness, ego clashes, or feeling unseen and undervalued.',
        gift: 'Clarifying what actually matters to you by removing what doesn\'t.',
        domains: ['identity', 'career', 'authority figures'],
        advice: 'Don\'t force or prove — observe where the friction is pointing.',
      },
      trine: {
        keywords: ['self-assurance', 'flow state', 'recognition', 'effortless expression'],
        core: 'You\'re aligned with yourself. Things you do now carry extra weight and are more likely to be recognized or succeed.',
        shadow: 'Complacency — the ease can make you coast.',
        gift: 'Natural leadership and magnetism. A great time for anything that requires presence.',
        domains: ['identity', 'career', 'creativity', 'leadership'],
        advice: 'Take initiative on something you\'ve been hesitating on.',
      },
      opposition: {
        keywords: ['self vs other', 'relationship mirror', 'identity pressure', 'visibility'],
        core: 'Other people or relationships are reflecting something back to you about your identity. There may be a tension between what you want and what others expect.',
        shadow: 'Projecting your own issues onto others, or losing yourself in relationships.',
        gift: 'Deep self-awareness through contrast and comparison.',
        domains: ['relationships', 'identity', 'partnerships'],
        advice: 'Listen to what others are mirroring before reacting.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional clarity', 'heart-mind alignment', 'instinct activated', 'nurturing impulse'],
        core: 'Your conscious will and emotional instincts are working together. What you want and what you feel are unusually aligned right now.',
        shadow: 'Moodiness bleeding into decision-making, or over-relying on feelings.',
        gift: 'Authentic emotional expression and genuine warmth in interactions.',
        domains: ['emotions', 'home', 'family', 'intuition'],
        advice: 'Trust your gut — it and your head are saying the same thing today.',
      },
      sextile: {
        keywords: ['emotional ease', 'social warmth', 'intuitive insight', 'nurturing'],
        core: 'A pleasant transit that smooths emotional interactions. People find you approachable and genuine.',
        shadow: 'Sentimentality that prevents clear thinking.',
        gift: 'Natural empathy and the ability to make others feel at ease.',
        domains: ['emotions', 'social life', 'home', 'relationships'],
        advice: 'Connect with family or close friends — emotional bonds strengthen easily now.',
      },
      square: {
        keywords: ['emotional tension', 'inner conflict', 'mood vs logic', 'irritability'],
        core: 'Your rational drives and emotional needs are pulling in different directions, creating inner friction or conflict with others — especially women or family.',
        shadow: 'Reactive outbursts, emotional volatility, or repressing feelings until they explode.',
        gift: 'Recognising a genuine need or wound that has been ignored.',
        domains: ['emotions', 'home', 'family', 'relationships'],
        advice: 'Pause before reacting. Ask: what is the feeling underneath the frustration?',
      },
      trine: {
        keywords: ['emotional flow', 'harmony', 'receptivity', 'creative sensitivity'],
        core: 'Emotions flow naturally and harmoniously. A good time for creative work, healing, or deepening emotional connections.',
        shadow: 'Being too emotionally accommodating to the point of losing your own needs.',
        gift: 'Deep empathy, artistic sensitivity, and emotional restoration.',
        domains: ['emotions', 'creativity', 'home', 'healing'],
        advice: 'Lean into creative or nurturing activities — they replenish you now.',
      },
      opposition: {
        keywords: ['emotional pushback', 'needs vs wants', 'relationship tension', 'sensitivity spike'],
        core: 'Tension between your personal will and the emotional needs of others — or your own unmet emotional needs pushing back against your plans.',
        shadow: 'Power struggles in relationships, or feeling emotionally invalidated.',
        gift: 'Seeing what emotional needs have been neglected.',
        domains: ['relationships', 'emotions', 'family'],
        advice: 'Make space for the emotional reality, even if it\'s inconvenient.',
      },
    },
    mercury: {
      conjunction: {
        keywords: ['mental clarity', 'communication focus', 'ideas crystallize', 'decisive thinking'],
        core: 'Your mind is lit up with purpose. Mental clarity is unusually high — decisions come easier and communication lands with authority.',
        shadow: 'Overloading yourself with information or saying too much.',
        gift: 'Clear, confident communication that others take seriously.',
        domains: ['communication', 'decisions', 'learning', 'writing'],
        advice: 'Write, speak, pitch, or publish — your words carry weight right now.',
      },
      sextile: {
        keywords: ['mental agility', 'good conversations', 'learning ease', 'networking'],
        core: 'The mind is sharp and social. Good for conversations, studying, and making connections.',
        shadow: 'Scattered thinking — too many interesting threads at once.',
        gift: 'Easy wit and the ability to explain complex ideas simply.',
        domains: ['communication', 'learning', 'social life'],
        advice: 'Have the conversation you\'ve been putting off.',
      },
      square: {
        keywords: ['mental friction', 'miscommunication', 'overthinking', 'decisions challenged'],
        core: 'Thinking is complicated by ego or external pressure. Decisions may feel harder than usual, or communications go sideways.',
        shadow: 'Arrogance in opinions, or ignoring important information.',
        gift: 'Forced to think more carefully and question assumptions.',
        domains: ['communication', 'decisions', 'contracts'],
        advice: 'Slow down before committing to anything in writing.',
      },
      trine: {
        keywords: ['eloquence', 'mental flow', 'learning ease', 'confident communication'],
        core: 'Thinking and speaking come naturally. A great transit for writing, teaching, negotiating, or any mental work.',
        shadow: 'Overconfidence in your conclusions.',
        gift: 'Natural eloquence and the ability to persuade without effort.',
        domains: ['communication', 'writing', 'learning', 'travel'],
        advice: 'Send that email. Have that pitch. Sign that contract.',
      },
      opposition: {
        keywords: ['debate', 'opposing views', 'mental contrast', 'perspective shift'],
        core: 'You\'re confronted with ideas or information that challenge your current thinking. Someone may argue a point that forces you to defend or revise your views.',
        shadow: 'Stubbornness, defensiveness, or talking past each other.',
        gift: 'Gaining a genuinely different perspective that improves your thinking.',
        domains: ['communication', 'relationships', 'decisions'],
        advice: 'Be willing to actually update your views — not just argue.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['creative confidence', 'radiance', 'attractive energy', 'pleasure'],
        core: 'You radiate warmth and attractiveness. A natural time for creative expression, romance, and enjoying beauty.',
        shadow: 'Vanity, overindulgence, or spending too freely.',
        gift: 'Genuine magnetism — people are drawn to you without effort.',
        domains: ['romance', 'creativity', 'beauty', 'finances'],
        advice: 'Invest in beauty, pleasure, or a creative project today.',
      },
      sextile: {
        keywords: ['social grace', 'harmony', 'mild attraction', 'aesthetic sense'],
        core: 'A pleasant social energy — easy to get along with others and enjoy small luxuries.',
        shadow: 'Superficiality or avoiding necessary hard conversations.',
        gift: 'Peacemaking ability and aesthetic sensitivity.',
        domains: ['social life', 'romance', 'creativity'],
        advice: 'Reach out to someone you care about just to connect.',
      },
      square: {
        keywords: ['values conflict', 'relationship friction', 'desire vs reality', 'money tension'],
        core: 'What you want and what is available are in conflict. Relationships or finances may feel strained.',
        shadow: 'Jealousy, possessiveness, or overspending to compensate.',
        gift: 'Clarifying what you truly value and what you\'re willing to work for.',
        domains: ['romance', 'finances', 'self-worth', 'relationships'],
        advice: 'Examine if you\'re chasing something out of insecurity or genuine desire.',
      },
      trine: {
        keywords: ['attraction', 'harmony', 'artistic flow', 'abundance'],
        core: 'Love, beauty, and creative flow come easily. Relationships are warm, artistic projects flourish, and finances may improve.',
        shadow: 'Passive enjoyment without taking action on opportunities.',
        gift: 'Natural grace and the capacity to attract what you want.',
        domains: ['romance', 'creativity', 'finances', 'social life'],
        advice: 'Make a move in love or launch a creative project.',
      },
      opposition: {
        keywords: ['relationship mirror', 'attraction-repulsion', 'values polarity', 'compromise'],
        core: 'Relationships bring up questions of values, desire, and fairness. You may be drawn to someone or something that also challenges you.',
        shadow: 'Projection, jealousy, or relationship power plays.',
        gift: 'Understanding what you truly want from relationships by contrast.',
        domains: ['relationships', 'romance', 'finances'],
        advice: 'Look at what the other person is reflecting back to you about your own desires.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['willpower surge', 'ambition activated', 'assertiveness', 'competitive drive'],
        core: 'A surge of drive, confidence, and ambition. You\'re ready to fight for what you want — channel it well.',
        shadow: 'Aggression, recklessness, or burning bridges in pursuit of goals.',
        gift: 'Extraordinary energy and the courage to initiate.',
        domains: ['career', 'goals', 'physical energy', 'competition'],
        advice: 'Start the project, make the move, assert your position.',
      },
      sextile: {
        keywords: ['productive energy', 'motivated', 'physical vitality', 'ambition'],
        core: 'Energy and initiative flow easily. A great time to get things done without the typical friction.',
        shadow: 'Restlessness if you don\'t channel the energy.',
        gift: 'Steady, productive momentum.',
        domains: ['work', 'physical health', 'goals'],
        advice: 'Tackle the task you\'ve been avoiding.',
      },
      square: {
        keywords: ['willpower clash', 'ego vs drive', 'obstacles', 'frustration'],
        core: 'Your drive to act meets resistance — either internally (self-sabotage) or externally (people or circumstances blocking you). The friction is asking you to refine your approach.',
        shadow: 'Anger, impatience, accidents, or forcing things that aren\'t ready.',
        gift: 'Strengthening your will by working through real resistance.',
        domains: ['career', 'goals', 'conflict', 'physical health'],
        advice: 'Slow down slightly and check your strategy — brute force won\'t work.',
      },
      trine: {
        keywords: ['effortless drive', 'physical vitality', 'confident action', 'momentum'],
        core: 'Action flows easily and powerfully. A natural time for physical activity, bold moves, and advancing goals.',
        shadow: 'Overextension — it feels easy so you take on too much.',
        gift: 'Sustained, confident momentum without burning out.',
        domains: ['career', 'physical health', 'goals', 'competition'],
        advice: 'Move boldly — this is a green-light transit.',
      },
      opposition: {
        keywords: ['conflict', 'opposition', 'power struggle', 'assertiveness tested'],
        core: 'Someone or something is directly opposing your will. The challenge is to assert yourself without escalating into unnecessary conflict.',
        shadow: 'Open conflict, aggression, or becoming the aggressor.',
        gift: 'Learning to negotiate and hold your ground with composure.',
        domains: ['relationships', 'career', 'conflict'],
        advice: 'Choose your battles carefully — not every hill is worth taking.',
      },
    },
    jupiter: {
      conjunction: {
        keywords: ['expansion', 'luck', 'optimism', 'growth opportunity', 'abundance'],
        core: 'A significant opportunity for growth, expansion, and good fortune arrives in the area ruled by natal Jupiter\'s house. One of the luckier transits in astrology.',
        shadow: 'Overconfidence, excess, or expanding so fast that foundations crack.',
        gift: 'Real, tangible opportunity for growth, success, or abundance.',
        domains: ['growth', 'finances', 'travel', 'education', 'luck'],
        advice: 'Say yes to the big opportunity — this one actually has legs.',
      },
      sextile: {
        keywords: ['opportunity', 'optimism', 'expanding horizons', 'mild luck'],
        core: 'Small but real opportunities for growth and good fortune. The universe is nudging open a door — you need to walk through it.',
        shadow: 'Missing the opportunity because it seems too small to bother with.',
        gift: 'Easy optimism and expanded thinking.',
        domains: ['growth', 'learning', 'social life'],
        advice: 'Follow up on that connection or opportunity — it\'s more significant than it looks.',
      },
      square: {
        keywords: ['overreach', 'growth friction', 'hubris check', 'expansion vs reality'],
        core: 'The desire to grow or improve runs into real-world constraints. Enthusiasm may outpace resources, timing, or readiness.',
        shadow: 'Overconfidence, waste, legal issues, or biting off more than you can chew.',
        gift: 'Learning the difference between real opportunity and wishful thinking.',
        domains: ['finances', 'career', 'beliefs', 'growth'],
        advice: 'Temper enthusiasm with a realistic assessment of what\'s actually possible now.',
      },
      trine: {
        keywords: ['abundance flow', 'blessings', 'expansion', 'wisdom', 'confidence'],
        core: 'One of the most fortunate transits — growth, abundance, and wisdom flow naturally. Doors open with less effort than usual.',
        shadow: 'Laziness, or expecting luck to do all the work.',
        gift: 'Genuine good fortune and expanded possibilities.',
        domains: ['finances', 'career', 'travel', 'education', 'luck'],
        advice: 'Make your big moves now. Fortune strongly favors the bold under this transit.',
      },
      opposition: {
        keywords: ['excess vs restraint', 'over-commitment', 'idealism vs reality', 'expansion tension'],
        core: 'You may be pulled between wanting more and what your current reality can support. A belief, commitment, or plan may be tested for its true value.',
        shadow: 'Overextension, unrealistic expectations, or conflicts with authority.',
        gift: 'Refining your vision of growth to be more sustainable.',
        domains: ['finances', 'relationships', 'beliefs', 'career'],
        advice: 'Ask honestly: am I expanding wisely or just escaping my current situation?',
      },
    },
    saturn: {
      conjunction: {
        keywords: ['identity tested', 'discipline required', 'responsibility', 'maturation'],
        core: 'Saturn asks: are you living with integrity and purpose? This transit can feel heavy — challenges, delays, and responsibilities arrive. But what it builds lasts.',
        shadow: 'Depression, self-doubt, over-restriction, or fear of failure.',
        gift: 'Deep maturation, real achievement, and structures that actually hold.',
        domains: ['career', 'identity', 'discipline', 'responsibility'],
        advice: 'Put in the work. What you build now under difficulty is built to last.',
      },
      sextile: {
        keywords: ['disciplined effort', 'practical progress', 'stability', 'steady growth'],
        core: 'A quiet but productive time. Effort is rewarded. Systems and structures work in your favour.',
        shadow: 'Tedium — this transit rewards consistency, not excitement.',
        gift: 'Real, measurable progress on long-term goals.',
        domains: ['career', 'finances', 'health', 'discipline'],
        advice: 'Focus on the unglamorous but important work — it\'s paying off.',
      },
      square: {
        keywords: ['obstacle', 'reality check', 'structure vs freedom', 'pressure'],
        core: 'External pressure or internal blocks force a reality check. Plans meet obstacles; responsibilities feel heavy. Saturn is asking you to get serious.',
        shadow: 'Rigidity, fear, or collapse under pressure.',
        gift: 'The discipline this demands will produce something genuinely solid.',
        domains: ['career', 'finances', 'health', 'relationships'],
        advice: 'Don\'t try to escape the pressure — work within it.',
      },
      trine: {
        keywords: ['earned reward', 'stable progress', 'discipline pays off', 'structure'],
        core: 'Past work and discipline now support you. Things that were built carefully begin to show results. Authority comes naturally.',
        shadow: 'Stagnation if you mistake stability for completion.',
        gift: 'Tangible rewards for long-term effort and integrity.',
        domains: ['career', 'finances', 'discipline', 'health'],
        advice: 'Consolidate and build on what\'s working — expand from a stable foundation.',
      },
      opposition: {
        keywords: ['authority clash', 'structure vs freedom', 'relationship discipline', 'limitation'],
        core: 'Tension between your needs and external demands, authority, or responsibility. Relationships may feel like burdens; obligations conflict with desires.',
        shadow: 'Resentment, rigidity in conflict, or avoiding necessary commitments.',
        gift: 'Clarifying which commitments and structures truly serve your growth.',
        domains: ['relationships', 'career', 'authority', 'discipline'],
        advice: 'Take responsibility for your role in the limitation — that\'s the path through.',
      },
    },
  },

  // ── TRANSIT MOON ───────────────────────────────────────────────────────────
  moon: {
    sun: {
      conjunction: {
        keywords: ['emotional authenticity', 'heart-led', 'instinctive action', 'visibility'],
        core: 'A brief but significant window of emotional and personal authenticity. What you feel and what you project are unusually aligned.',
        shadow: 'Mood dominates decision-making.',
        gift: 'Genuine presence and warmth that others notice.',
        domains: ['emotions', 'identity', 'social life'],
        advice: 'Show up as you actually are right now — authenticity is magnetic.',
      },
      sextile: {
        keywords: ['emotional ease', 'warmth', 'social flow', 'creative mood'],
        core: 'Pleasant emotional energy — a good few hours for connecting, creating, or simply enjoying the moment.',
        shadow: 'Emotional drift, lack of focus.',
        gift: 'Light, genuine warmth in interactions.',
        domains: ['social life', 'emotions', 'creativity'],
        advice: 'Connect with someone you care about.',
      },
      square: {
        keywords: ['emotional irritability', 'tension', 'inner conflict', 'mood vs goals'],
        core: 'Your emotional state and your outer intentions are briefly at odds. Small frustrations may feel larger than they are.',
        shadow: 'Reactivity, mood swings, or taking things personally.',
        gift: 'Awareness of a recurring emotional pattern.',
        domains: ['emotions', 'home', 'work'],
        advice: 'Give yourself breathing room before responding to anything that irritates you.',
      },
      trine: {
        keywords: ['flow', 'ease', 'emotional support', 'contentment'],
        core: 'A few hours of genuine emotional ease. Things feel right, and you move through the day with grace.',
        shadow: 'Passivity.',
        gift: 'Natural joy and ease.',
        domains: ['emotions', 'daily life', 'social life'],
        advice: 'Enjoy it. Rest, play, or connect.',
      },
      opposition: {
        keywords: ['emotional push-pull', 'needs vs expectations', 'sensitivity'],
        core: 'Brief tension between your emotional needs and outer demands or other people\'s expectations.',
        shadow: 'Oversensitivity, feeling unseen.',
        gift: 'Clear signal of what you actually need right now.',
        domains: ['emotions', 'relationships'],
        advice: 'State your need simply — don\'t wait to be read.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['lunar return', 'emotional reset', 'instinct sharp', 'monthly cycle'],
        core: 'The Moon returns to its natal position — your personal monthly reset. Emotions and instincts are heightened and unusually accurate.',
        shadow: 'Over-emotional, reactive.',
        gift: 'Sharpened intuition and emotional self-knowledge.',
        domains: ['emotions', 'intuition', 'home', 'body'],
        advice: 'Check in with your body and gut feelings — they\'re speaking clearly.',
      },
      square: {
        keywords: ['emotional friction', 'inner tension', 'restlessness', 'mood'],
        core: 'Brief emotional turbulence — feelings are up, and small things may sting more than usual.',
        shadow: 'Over-reaction, brooding.',
        gift: 'Surfacing an emotional need that deserves attention.',
        domains: ['emotions', 'relationships', 'home'],
        advice: 'Write in a journal instead of sending that message.',
      },
      trine: {
        keywords: ['emotional harmony', 'intuitive flow', 'nurturing', 'ease'],
        core: 'Feelings are calm and clear. A good few hours for emotional processing, nurturing others, or creative work.',
        shadow: 'Emotional passivity.',
        gift: 'Genuine calm and receptivity.',
        domains: ['emotions', 'home', 'creativity'],
        advice: 'Rest, nourish yourself, or nurture someone else.',
      },
      opposition: {
        keywords: ['emotional tension', 'external pressure on feelings', 'relationship sensitivity'],
        core: 'Other people or events are triggering your emotional sensitivities. A need for space or acknowledgment rises.',
        shadow: 'Projection, emotional reactivity.',
        gift: 'Clarity on an emotional boundary.',
        domains: ['emotions', 'relationships', 'home'],
        advice: 'Give yourself space before engaging.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['emotional drive', 'reactive energy', 'passion', 'urgency'],
        core: 'Emotions and impulses are running hot. Energy is high but so is reactivity. Great for physical activity or passionate work — risky for sensitive conversations.',
        shadow: 'Short temper, impulsive decisions, arguments.',
        gift: 'Powerful emotional energy that gets things done.',
        domains: ['energy', 'emotions', 'physical body', 'relationships'],
        advice: 'Channel into exercise or creative work. Avoid confrontations.',
      },
      square: {
        keywords: ['emotional friction', 'irritability', 'reactive', 'tension'],
        core: 'The classic "emotional friction" transit. Small things ignite big reactions. Awareness is everything.',
        shadow: 'Arguments, accidents from rushing, emotional reactivity.',
        gift: 'Noticing what genuinely angers or frustrates you — it\'s information.',
        domains: ['emotions', 'relationships', 'physical energy'],
        advice: 'Count to ten. Seriously. This transit passes within hours.',
      },
      trine: {
        keywords: ['emotional courage', 'motivated', 'passionate', 'vitality'],
        core: 'Emotions and drive align — you feel passionate, motivated, and willing to act on what matters to you.',
        shadow: 'Overexertion.',
        gift: 'Emotional courage and physical vitality.',
        domains: ['energy', 'emotions', 'creativity', 'relationships'],
        advice: 'Act on what you feel strongly about right now.',
      },
      opposition: {
        keywords: ['conflict', 'reactive', 'opposition', 'emotional standoff'],
        core: 'Tension with others — someone may be pushing your emotional buttons, or you\'re in opposition to someone else\'s drive or agenda.',
        shadow: 'Arguments, power struggles.',
        gift: 'Understanding where your emotional boundaries lie.',
        domains: ['relationships', 'emotions', 'conflict'],
        advice: 'State your need clearly without attacking. This passes quickly.',
      },
    },
    jupiter: {
      conjunction: {
        keywords: ['emotional generosity', 'optimism', 'abundance feeling', 'expansive mood'],
        core: 'A brief but genuinely uplifting window. Emotions expand toward optimism, generosity, and a sense that things are going to be okay.',
        shadow: 'Overindulgence, emotional excess.',
        gift: 'Real joy, hope, and emotional spaciousness.',
        domains: ['emotions', 'optimism', 'social life', 'abundance'],
        advice: 'Enjoy this window. Celebrate something.',
      },
      square: {
        keywords: ['emotional excess', 'overindulgence', 'restlessness', 'wanting more'],
        core: 'Feelings are amplified beyond what\'s proportionate. The urge to overdo — eat, spend, feel — is high.',
        shadow: 'Emotional excess, overpromising.',
        gift: 'Recognising where you\'re actually hungry for more growth.',
        domains: ['emotions', 'finances', 'impulse'],
        advice: 'Pause before indulging. Ask what you\'re really seeking.',
      },
      trine: {
        keywords: ['joy', 'emotional flow', 'generosity', 'wellbeing'],
        core: 'A few hours of genuine emotional wellbeing and expansiveness. Feel-good energy with real warmth.',
        shadow: 'None significant.',
        gift: 'Genuine happiness and generosity of spirit.',
        domains: ['emotions', 'social life', 'optimism'],
        advice: 'Share it with others — generosity compounds under this transit.',
      },
    },
    saturn: {
      conjunction: {
        keywords: ['emotional heaviness', 'seriousness', 'duty', 'isolation'],
        core: 'A brief but noticeable emotional weight descends. You may feel more serious, lonely, or aware of your responsibilities.',
        shadow: 'Sadness, self-criticism, withdrawal.',
        gift: 'Clarity about what truly matters and what needs to be handled.',
        domains: ['emotions', 'responsibility', 'isolation', 'discipline'],
        advice: 'Don\'t mistake temporary heaviness for permanent reality.',
      },
      square: {
        keywords: ['emotional restriction', 'blocked feelings', 'duty vs needs', 'frustration'],
        core: 'Emotional needs feel blocked or dismissed — by circumstances, others, or your own inner critic.',
        shadow: 'Suppression, resentment, feeling unsupported.',
        gift: 'Understanding which emotional patterns need restructuring.',
        domains: ['emotions', 'relationships', 'responsibility'],
        advice: 'Be honest with yourself about what you need, even if you can\'t get it right now.',
      },
      trine: {
        keywords: ['emotional maturity', 'calm', 'steadiness', 'grounded feeling'],
        core: 'Emotions are calm, grounded, and mature. A good few hours for practical emotional work or quiet focus.',
        shadow: 'Emotional flatness.',
        gift: 'Steadiness and clear-eyed emotional assessment.',
        domains: ['emotions', 'work', 'discipline'],
        advice: 'Use the calm to handle something that requires emotional steadiness.',
      },
      opposition: {
        keywords: ['emotional burden', 'restriction from others', 'responsibility tension'],
        core: 'Other people\'s expectations or external structure feels limiting to your emotional needs.',
        shadow: 'Resentment, feeling controlled or unsupported.',
        gift: 'Clarifying what commitments you\'re actually willing to keep.',
        domains: ['relationships', 'emotions', 'responsibility'],
        advice: 'Identify the actual source of the heaviness — is it truly external?',
      },
    },
    venus: {
      conjunction: {
        keywords: ['emotional sweetness', 'affection', 'pleasure', 'beauty'],
        core: 'A lovely few hours — feelings are warm, affectionate, and drawn toward beauty and pleasure.',
        shadow: 'Overindulgence or avoiding necessary action.',
        gift: 'Genuine warmth, tenderness, and aesthetic sensitivity.',
        domains: ['romance', 'emotions', 'social life', 'beauty'],
        advice: 'Enjoy beauty, connect with loved ones, treat yourself.',
      },
      square: {
        keywords: ['emotional dissatisfaction', 'desire vs reality', 'relationship friction'],
        core: 'What you feel and what you want are briefly misaligned. Relationship tensions or a vague sense of dissatisfaction may surface.',
        shadow: 'Jealousy, self-indulgence, or emotional manipulation.',
        gift: 'Awareness of an unmet emotional or relational need.',
        domains: ['romance', 'emotions', 'relationships', 'finances'],
        advice: 'Name the need honestly rather than acting it out indirectly.',
      },
      trine: {
        keywords: ['warmth', 'affection', 'social ease', 'pleasure'],
        core: 'Easy warmth and affection in all interactions. Relationships feel harmonious, and simple pleasures are deeply satisfying.',
        shadow: 'Passivity.',
        gift: 'Real social ease and relationship warmth.',
        domains: ['romance', 'social life', 'emotions'],
        advice: 'Reach out, connect, enjoy — this is one of the nicest transits.',
      },
    },
    mercury: {
      conjunction: {
        keywords: ['emotional communication', 'feeling-thinking link', 'intuitive words', 'talking feelings'],
        core: 'Emotions and thoughts are closely linked — you\'re able to articulate what you feel with unusual clarity.',
        shadow: 'Over-analysis of emotions, or saying too much.',
        gift: 'Emotional intelligence in communication.',
        domains: ['communication', 'emotions', 'learning'],
        advice: 'Have that honest emotional conversation you\'ve been postponing.',
      },
      square: {
        keywords: ['emotional confusion', 'feelings cloud thinking', 'miscommunication', 'overthinking'],
        core: 'Feelings are interfering with clear thinking, or you\'re struggling to communicate your emotional needs clearly.',
        shadow: 'Emotional reactivity in conversation, misreading signals.',
        gift: 'Uncovering the emotional driver behind your thinking.',
        domains: ['communication', 'emotions', 'decisions'],
        advice: 'Wait a few hours before sending emotionally charged messages.',
      },
      trine: {
        keywords: ['emotional clarity', 'expressive', 'good conversations', 'intuitive insight'],
        core: 'Thoughts and feelings harmonise — a great few hours for journalling, meaningful conversations, or creative writing.',
        shadow: 'None significant.',
        gift: 'Natural emotional intelligence and expressive ease.',
        domains: ['communication', 'emotions', 'creativity'],
        advice: 'Write, talk, create — the words will come easily.',
      },
    },
    uranus: {
      conjunction: {
        keywords: ['emotional disruption', 'sudden feelings', 'restlessness', 'breakthrough'],
        core: 'Sudden emotional shifts or unexpected events stir things up. Restlessness is high and the usual routines feel confining.',
        shadow: 'Emotional instability, erratic behavior.',
        gift: 'Breaking free from an emotional rut.',
        domains: ['emotions', 'change', 'freedom', 'surprise'],
        advice: 'Allow the disruption — it\'s clearing something stale.',
      },
    },
    neptune: {
      conjunction: {
        keywords: ['emotional sensitivity', 'dreaminess', 'spiritual feeling', 'compassion'],
        core: 'Heightened sensitivity, empathy, and spiritual feeling. The boundary between self and other softens.',
        shadow: 'Confusion, escapism, emotional vulnerability.',
        gift: 'Deep compassion and spiritual receptivity.',
        domains: ['spirituality', 'emotions', 'creativity', 'dreams'],
        advice: 'Meditate, create, or help someone — avoid numbing.',
      },
    },
    pluto: {
      conjunction: {
        keywords: ['emotional intensity', 'depth', 'power', 'transformation'],
        core: 'Emotional intensity is very high. Buried feelings may surface unexpectedly. Power dynamics in relationships become visible.',
        shadow: 'Obsession, control, emotional manipulation.',
        gift: 'Access to deep emotional truth and transformative feeling.',
        domains: ['emotions', 'transformation', 'power', 'relationships'],
        advice: 'Allow depth without forcing it. What surfaces is meant to be seen.',
      },
    },
  },

  // ── TRANSIT MARS ───────────────────────────────────────────────────────────
  mars: {
    sun: {
      conjunction: {
        keywords: ['power surge', 'assertiveness', 'drive', 'boldness', 'energy peak'],
        core: 'One of the most energising transits. Your will and Mars\'s drive fuse — you can move mountains if directed well.',
        shadow: 'Aggression, burnout, recklessness.',
        gift: 'Extraordinary energy, courage, and competitive ability.',
        domains: ['career', 'physical health', 'goals', 'competition'],
        advice: 'Initiate your most ambitious project. This window is powerful — use it.',
      },
      square: {
        keywords: ['ego conflict', 'forced action', 'frustration', 'willpower tested'],
        core: 'Drive meets friction. External obstacles or inner resistance create frustration. The challenge is acting without ego or recklessness.',
        shadow: 'Arguments, accidents, burnout from forcing.',
        gift: 'Real strength tested and proven.',
        domains: ['career', 'conflict', 'physical health'],
        advice: 'Redirect energy toward productive challenges — not people.',
      },
      trine: {
        keywords: ['confident action', 'physical vitality', 'bold success', 'momentum'],
        core: 'Drive and identity align perfectly. Action is confident, physical energy is high, and results follow.',
        shadow: 'Overextension.',
        gift: 'Sustained, powerful momentum.',
        domains: ['career', 'physical health', 'goals'],
        advice: 'Act boldly — you have the energy to back it up.',
      },
      opposition: {
        keywords: ['confrontation', 'opposition', 'assertiveness vs others', 'conflict'],
        core: 'Direct friction with others — someone challenges your authority or autonomy. The key is assertiveness without escalation.',
        shadow: 'Open conflict, aggression, power plays.',
        gift: 'Clarifying your position and asserting your genuine needs.',
        domains: ['relationships', 'career', 'conflict'],
        advice: 'Hold your ground without drawing first blood.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional drive', 'reactive', 'passion', 'intensity'],
        core: 'Emotions run hot. Energy and feeling collide — powerful for creative or physical work, risky in relationships.',
        shadow: 'Short temper, reactive decisions, arguments.',
        gift: 'Passionate drive and emotional courage.',
        domains: ['emotions', 'relationships', 'physical energy'],
        advice: 'Physical activity is your best friend right now.',
      },
      square: {
        keywords: ['irritability', 'emotional friction', 'reactive', 'temper'],
        core: 'The classic irritability transit. Emotional triggers are sensitive and reactions come fast.',
        shadow: 'Arguments, emotional outbursts, accidents from rushing.',
        gift: 'Recognising what genuinely irritates you — it\'s pointing at a boundary.',
        domains: ['emotions', 'relationships', 'home'],
        advice: 'Don\'t send the message. Go for a walk instead.',
      },
      trine: {
        keywords: ['emotional courage', 'passionate', 'vital', 'expressive'],
        core: 'Drive and emotion work together — you act on what you feel, and it works.',
        shadow: 'Overexertion.',
        gift: 'Emotional courage and genuine passion.',
        domains: ['emotions', 'creativity', 'relationships'],
        advice: 'Express what you feel and act on it.',
      },
    },
    mercury: {
      conjunction: {
        keywords: ['sharp mind', 'direct speech', 'mental drive', 'debate'],
        core: 'Mind and drive combine — thinking is fast, direct, and assertive. Excellent for debate, negotiation, or hard conversations.',
        shadow: 'Aggression in speech, cutting words, rushing decisions.',
        gift: 'Mental sharpness, directness, and persuasive power.',
        domains: ['communication', 'decisions', 'debate'],
        advice: 'Be direct, but check for unnecessary sharpness.',
      },
      square: {
        keywords: ['harsh words', 'mental friction', 'miscommunication', 'argument'],
        core: 'Communication runs the risk of being overly blunt or combative. Others may push back on your ideas.',
        shadow: 'Arguments, regrettable statements, rushed decisions.',
        gift: 'Uncovering real disagreements that needed surfacing.',
        domains: ['communication', 'decisions', 'conflict'],
        advice: 'Edit before you send. Sleep on major decisions.',
      },
      trine: {
        keywords: ['decisive', 'clear thinking', 'direct communication', 'mental energy'],
        core: 'Mind and drive in harmony — you think and speak with clarity and confidence.',
        shadow: 'Overconfidence in your conclusions.',
        gift: 'Decisive, effective communication.',
        domains: ['communication', 'work', 'decisions'],
        advice: 'Make the decision. Have the direct conversation.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['desire', 'passion', 'attraction', 'creative drive'],
        core: 'Desire and attraction are heightened — romantic passion, creative drive, and the urge to pursue what you want.',
        shadow: 'Impulsive relationship decisions, aggression in pursuit of desire.',
        gift: 'Magnetic attraction and bold romantic or creative energy.',
        domains: ['romance', 'creativity', 'desire'],
        advice: 'Pursue what you want with confidence — but respect others\' pace.',
      },
      square: {
        keywords: ['desire friction', 'relationship tension', 'jealousy', 'values vs drive'],
        core: 'Wants and values are in conflict — or pursuit of desire meets resistance. Relationships may feel tense.',
        shadow: 'Jealousy, possessiveness, impulsive spending.',
        gift: 'Clarifying what you truly want versus what you\'re compelled by.',
        domains: ['romance', 'finances', 'relationships'],
        advice: 'Don\'t force affection or pursue from a place of frustration.',
      },
      trine: {
        keywords: ['passionate creativity', 'romantic drive', 'attraction', 'confident desire'],
        core: 'Desire and values align — a great time for romance, creative projects, or boldly pursuing what you love.',
        shadow: 'Overindulgence.',
        gift: 'Creative passion and confident romantic energy.',
        domains: ['romance', 'creativity', 'social life'],
        advice: 'Make your move. Express your desire.',
      },
    },
    jupiter: {
      conjunction: {
        keywords: ['big energy', 'ambition surge', 'courage', 'confidence', 'expansion'],
        core: 'Drive and expansion combine — ambition is enormous and confidence is real. One of the best transits for bold action.',
        shadow: 'Overreach, recklessness, promising more than you can deliver.',
        gift: 'Genuine boldness and expanded capacity for action.',
        domains: ['career', 'goals', 'ambition', 'physical energy'],
        advice: 'Think big and act. Just make sure your foundation is solid.',
      },
      square: {
        keywords: ['overreach', 'frustrated ambition', 'excess drive', 'recklessness'],
        core: 'Ambition outruns reality — the urge to expand and conquer runs into genuine limits.',
        shadow: 'Overconfidence, accidents, burning bridges.',
        gift: 'Learning the difference between healthy ambition and hubris.',
        domains: ['career', 'goals', 'conflict'],
        advice: 'Scale back the plan slightly. You can still move boldly, just more precisely.',
      },
    },
    saturn: {
      conjunction: {
        keywords: ['disciplined drive', 'focused effort', 'hard work', 'endurance'],
        core: 'Drive meets discipline — hard work, endurance, and focused effort. Not glamorous, but extraordinarily productive.',
        shadow: 'Frustration, feeling blocked or limited.',
        gift: 'The ability to sustain difficult effort for real results.',
        domains: ['career', 'discipline', 'goals', 'physical health'],
        advice: 'Put your head down and do the unglamorous work. It counts.',
      },
      square: {
        keywords: ['blocked drive', 'frustration', 'obstacles', 'restriction'],
        core: 'Drive meets a wall — obstacles, delays, and restrictions slow progress. Frustration is high.',
        shadow: 'Anger at circumstances, pushing too hard against immovable limits.',
        gift: 'Learning which battles are actually worth fighting.',
        domains: ['career', 'goals', 'conflict', 'health'],
        advice: 'Accept the delay gracefully and work on what you can control.',
      },
    },
    uranus: {
      conjunction: {
        keywords: ['explosive energy', 'sudden action', 'breakthrough', 'rebellion'],
        core: 'Sudden, electric energy — the urge to break free and act without hesitation. Can be brilliant or reckless.',
        shadow: 'Accidents, impulsive decisions, rebellion without cause.',
        gift: 'Breaking through a stagnant situation with sudden force.',
        domains: ['change', 'freedom', 'energy', 'innovation'],
        advice: 'Channel the electricity into innovation, not destruction.',
      },
    },
    neptune: {
      conjunction: {
        keywords: ['diffuse energy', 'spiritual drive', 'compassionate action', 'confusion'],
        core: 'Drive is diffused by sensitivity and idealism — hard to be direct, but great for creative or spiritual action.',
        shadow: 'Misdirected energy, confusion, deception.',
        gift: 'Action guided by compassion and vision.',
        domains: ['spirituality', 'creativity', 'service'],
        advice: 'Serve a larger cause with your energy. Avoid ego-driven action.',
      },
    },
    pluto: {
      conjunction: {
        keywords: ['power', 'transformation', 'intensity', 'unstoppable drive'],
        core: 'Immense power and drive — you can achieve extraordinary things, but the force can be overwhelming or destructive if misused.',
        shadow: 'Power hunger, obsession, destructive force.',
        gift: 'Transformative willpower that can achieve the seemingly impossible.',
        domains: ['transformation', 'power', 'career', 'goals'],
        advice: 'Use this power for something genuinely worth it.',
      },
    },
  },

  // ── TRANSIT JUPITER ────────────────────────────────────────────────────────
  jupiter: {
    sun: {
      conjunction: {
        keywords: ['peak expansion', 'opportunity year', 'confidence', 'abundance', 'breakthrough'],
        core: 'One of the most significant transits — Jupiter expands everything the Sun represents. A year of genuine growth, confidence, and opening doors.',
        shadow: 'Overconfidence, excess, or expanding so fast that foundations crack.',
        gift: 'Real, lasting expansion in identity, career, and vitality.',
        domains: ['identity', 'career', 'vitality', 'luck'],
        advice: 'Make your biggest moves this year. Fortune is genuinely on your side.',
      },
      trine: {
        keywords: ['flowing abundance', 'effortless growth', 'confidence', 'recognition'],
        core: 'Growth, recognition, and confidence come naturally. A wonderful transit for career advancement, creative projects, and personal development.',
        shadow: 'Passivity under abundant conditions.',
        gift: 'Effortless expansion and genuine good fortune.',
        domains: ['career', 'identity', 'growth', 'finances'],
        advice: 'Act with confidence — the conditions strongly support you.',
      },
      square: {
        keywords: ['overreach', 'hubris', 'growth friction', 'excess'],
        core: 'The urge to expand runs into reality. Guard against overconfidence and biting off more than you can chew.',
        shadow: 'Arrogance, overcommitment, waste.',
        gift: 'Learning sustainable growth versus reckless expansion.',
        domains: ['career', 'identity', 'finances'],
        advice: 'Temper ambition with realism. The opportunity is real — don\'t blow it.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional abundance', 'optimism', 'emotional growth', 'nurturing expansion'],
        core: 'Emotional life expands — more warmth, generosity, and emotional capacity. Family and home life tend to flourish.',
        shadow: 'Emotional excess or over-nurturing at your own expense.',
        gift: 'Genuine emotional richness and warmth.',
        domains: ['emotions', 'family', 'home', 'nurturing'],
        advice: 'Open your heart wider than usual — you have the capacity.',
      },
    },
    mercury: {
      conjunction: {
        keywords: ['expanded thinking', 'big ideas', 'publishing', 'teaching', 'optimistic mind'],
        core: 'Mental horizons expand dramatically. Great for writing, teaching, publishing, or any intellectual endeavour.',
        shadow: 'Overloading with ideas, unfocused thinking.',
        gift: 'The ability to think and communicate on a grand scale.',
        domains: ['communication', 'education', 'writing', 'travel'],
        advice: 'Write the book. Launch the course. Share your knowledge widely.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['abundance in love', 'financial expansion', 'beauty', 'pleasure', 'luck in relationships'],
        core: 'Love, money, and beauty all expand. A wonderful transit for relationships, finances, and creative projects.',
        shadow: 'Overindulgence, overspending.',
        gift: 'Real abundance in love and financial life.',
        domains: ['romance', 'finances', 'creativity', 'beauty'],
        advice: 'Invest in love and beauty — it returns multiplied.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['enormous energy', 'ambition', 'courage', 'breakthrough action'],
        core: 'Drive and expansion fuse — boundless energy and courage. The window for enormous achievement.',
        shadow: 'Recklessness, overreach.',
        gift: 'Extraordinary ambition backed by real energy.',
        domains: ['career', 'goals', 'competition', 'physical energy'],
        advice: 'Launch your biggest initiative.',
      },
    },
    saturn: {
      conjunction: {
        keywords: ['structured growth', 'wisdom', 'discipline rewards', 'mature expansion'],
        core: 'The great teacher and the great expander meet — growth that is disciplined and lasting. Wisdom is the gift.',
        shadow: 'Conflict between optimism and realism.',
        gift: 'Sustainable, structured expansion that actually lasts.',
        domains: ['career', 'discipline', 'wisdom', 'long-term planning'],
        advice: 'Expand with a plan. The work you do now builds for decades.',
      },
    },
  },

  // ── TRANSIT SATURN ─────────────────────────────────────────────────────────
  saturn: {
    sun: {
      conjunction: {
        keywords: ['identity tested', 'major restructuring', 'discipline', 'maturation', 'responsibility'],
        core: 'One of the most significant transits — Saturn tests the very foundations of who you are. Challenges arrive, but what survives is solid and real.',
        shadow: 'Depression, isolation, failure if foundations weren\'t solid.',
        gift: 'Deep maturation, lasting achievement, and unshakeable identity.',
        domains: ['identity', 'career', 'discipline', 'responsibility'],
        advice: 'Do the hard work with integrity. This is building something that will last 30 years.',
      },
      square: {
        keywords: ['reality check', 'obstacle', 'discipline demanded', 'course correction'],
        core: 'External pressure or inner blockages force a serious reassessment of direction and effort.',
        shadow: 'Depression, fear, avoidance of necessary change.',
        gift: 'Honest reckoning that leads to genuine improvement.',
        domains: ['career', 'identity', 'discipline'],
        advice: 'Face the difficulty directly. Avoidance only prolongs it.',
      },
      trine: {
        keywords: ['earned authority', 'discipline pays', 'stability', 'recognition'],
        core: 'Past effort and integrity pay off. Authority, recognition, and stability arrive as rewards for real work.',
        shadow: 'Complacency.',
        gift: 'The satisfaction of earned success.',
        domains: ['career', 'identity', 'discipline', 'finances'],
        advice: 'Build on this — consolidate and expand from a position of strength.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional burden', 'responsibility', 'isolation', 'emotional work'],
        core: 'Emotional life feels heavy and serious. Responsibilities, limitations, or loneliness weigh on the heart. Deep inner work is being done.',
        shadow: 'Depression, emotional shutdown, feeling unloved.',
        gift: 'Emotional maturity and the capacity to handle difficult feeling with grace.',
        domains: ['emotions', 'home', 'family', 'inner work'],
        advice: 'Be gentle with yourself. This is emotionally difficult — and genuinely important.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['relationship test', 'financial discipline', 'love matured', 'values tested'],
        core: 'Relationships and finances are tested — only what is real and solid survives. Superficial connections may end; deep ones deepen.',
        shadow: 'Loneliness, financial restriction, ending of relationships.',
        gift: 'Relationships and financial situations that emerge are genuine and lasting.',
        domains: ['romance', 'finances', 'relationships', 'values'],
        advice: 'Invest in what is real. Let go of what was only surface.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['disciplined effort', 'controlled drive', 'sustained work', 'delayed results'],
        core: 'Drive must be disciplined and sustained. Results come slowly, but the effort builds something genuinely solid.',
        shadow: 'Frustration, blocked energy, feeling stuck.',
        gift: 'The capacity for extraordinary sustained effort.',
        domains: ['career', 'goals', 'discipline', 'physical health'],
        advice: 'Accept the pace. Steady effort now produces lasting results.',
      },
    },
    jupiter: {
      conjunction: {
        keywords: ['structured opportunity', 'wisdom', 'mature growth', 'realistic expansion'],
        core: 'Discipline and optimism find a rare balance. Growth that is realistic and structured — not reckless.',
        shadow: 'Cynicism, or growth stunted by excessive caution.',
        gift: 'Wisdom-guided expansion that actually holds.',
        domains: ['career', 'finances', 'growth', 'wisdom'],
        advice: 'Expand with a real plan. This combination rewards serious effort.',
      },
    },
  },

  // ── TRANSIT URANUS ─────────────────────────────────────────────────────────
  uranus: {
    sun: {
      conjunction: {
        keywords: ['radical change', 'awakening', 'liberation', 'identity revolution', 'breakthrough'],
        core: 'A major life awakening — the old version of you is breaking down to make room for something more authentic. Can feel like upheaval, but it\'s liberation.',
        shadow: 'Instability, reckless abandon of the good along with the bad.',
        gift: 'Genuine freedom and a radically more authentic version of yourself.',
        domains: ['identity', 'freedom', 'change', 'awakening'],
        advice: 'Don\'t resist the change — but don\'t blow up everything in one day either.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional awakening', 'sudden change', 'restlessness', 'liberation from patterns'],
        core: 'Old emotional patterns are disrupted suddenly and sometimes shockingly. The instability is pointing toward genuine emotional liberation.',
        shadow: 'Erratic behavior, emotional instability, disrupted home.',
        gift: 'Freedom from conditioning and outdated emotional patterns.',
        domains: ['emotions', 'home', 'family', 'patterns'],
        advice: 'Allow the disruption. It is dismantling something that was confining you.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['relationship revolution', 'sudden attraction', 'freedom in love', 'values shift'],
        core: 'Love life and values are electrified — sudden attractions, unexpected relationship changes, or a deep shift in what you value.',
        shadow: 'Impulsive relationship decisions, instability in finances.',
        gift: 'A more authentic, liberated approach to love and relationships.',
        domains: ['romance', 'relationships', 'values', 'finances'],
        advice: 'Explore what\'s new without abandoning what\'s real.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['electric drive', 'sudden action', 'rebellion', 'breakthrough'],
        core: 'Energy is electric and unpredictable — the drive to break free and act suddenly is overwhelming. Can produce breakthroughs or accidents.',
        shadow: 'Recklessness, impulsive action, accidents.',
        gift: 'Breaking through a stagnant situation with sudden, decisive force.',
        domains: ['energy', 'change', 'freedom', 'career'],
        advice: 'Channel the electricity into innovation and bold action — not destruction.',
      },
    },
  },

  // ── TRANSIT NEPTUNE ────────────────────────────────────────────────────────
  neptune: {
    sun: {
      conjunction: {
        keywords: ['dissolution', 'spiritual awakening', 'idealism', 'identity confusion', 'transcendence'],
        core: 'The ego softens and the spiritual self awakens — or dissolves into confusion. A profound but disorienting transit requiring spiritual grounding.',
        shadow: 'Loss of direction, deception, escapism, victim mentality.',
        gift: 'Spiritual depth, creative genius, and compassionate wisdom.',
        domains: ['spirituality', 'identity', 'creativity', 'dreams'],
        advice: 'Ground yourself daily. Meditate, create, serve. Don\'t escape.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional dissolution', 'psychic sensitivity', 'compassion', 'confusion', 'spiritual feeling'],
        core: 'Emotional boundaries dissolve — heightened empathy, psychic sensitivity, and spiritual feeling. Also potential for emotional confusion.',
        shadow: 'Emotional confusion, co-dependency, being deceived in emotional matters.',
        gift: 'Profound compassion, artistic sensitivity, and spiritual connection.',
        domains: ['emotions', 'spirituality', 'creativity', 'dreams'],
        advice: 'Practice discernment in emotional and spiritual matters. Trust but verify.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['idealized love', 'spiritual romance', 'artistic peak', 'dissolution in relationships'],
        core: 'Love is idealized and spiritualized — profound romantic yearning, artistic inspiration, and possible disillusionment.',
        shadow: 'Deception in love, unrealistic expectations, financial confusion.',
        gift: 'Soul-level love and peak artistic inspiration.',
        domains: ['romance', 'creativity', 'spirituality', 'finances'],
        advice: 'Enjoy the beauty — but stay grounded about who people actually are.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['diffuse energy', 'spiritual action', 'compassionate drive', 'confusion in goals'],
        core: 'Drive is spiritualized and diffused — hard to be direct, but capable of inspired creative or compassionate action.',
        shadow: 'Confusion about goals, deception, wasted effort.',
        gift: 'Action guided by vision, compassion, and spiritual purpose.',
        domains: ['spirituality', 'creativity', 'service', 'goals'],
        advice: 'Ground your inspiration in specific, concrete action.',
      },
    },
  },

  // ── TRANSIT PLUTO ──────────────────────────────────────────────────────────
  pluto: {
    sun: {
      conjunction: {
        keywords: ['total transformation', 'death and rebirth', 'power', 'destiny', 'regeneration'],
        core: 'The most powerful personal transformation transit. The old self is composted — what emerges is unrecognisably more real, powerful, and authentic.',
        shadow: 'Power obsession, destruction, loss, intensity that consumes.',
        gift: 'Complete regeneration and access to your deepest power.',
        domains: ['identity', 'power', 'transformation', 'destiny'],
        advice: 'Surrender what is already dying. Fight only for what is truly you.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional transformation', 'depth', 'power', 'catharsis', 'rebirth'],
        core: 'The deepest possible emotional transformation — buried feelings, ancestral patterns, and unconscious drives surface for reckoning.',
        shadow: 'Emotional obsession, manipulation, overwhelming intensity.',
        gift: 'Emotional depth, healing, and the release of deeply buried material.',
        domains: ['emotions', 'transformation', 'healing', 'power'],
        advice: 'Allow the depth. What surfaces has been waiting to be seen.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['relationship transformation', 'deep desire', 'power in love', 'values overhauled'],
        core: 'Love, desire, and values are transformed at the deepest level. Relationships become intense and transformative.',
        shadow: 'Obsession, control, manipulation in love.',
        gift: 'Soul-level love and a complete values transformation.',
        domains: ['romance', 'relationships', 'values', 'finances'],
        advice: 'Let what needs to die in your relationship life die gracefully.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['unstoppable drive', 'transformative power', 'obsessive ambition', 'force'],
        core: 'Power and drive reach their maximum. You can achieve the seemingly impossible — but the force must be wielded responsibly.',
        shadow: 'Obsession, destructive power, crossing lines in pursuit of goals.',
        gift: 'Extraordinary transformative capacity and power.',
        domains: ['career', 'power', 'transformation', 'goals'],
        advice: 'Use this for something genuinely worthy. Power this concentrated demands integrity.',
      },
    },
  },

  // ── TRANSIT MERCURY ────────────────────────────────────────────────────────
  mercury: {
    sun: {
      conjunction: {
        keywords: ['mental clarity', 'communication focus', 'sharp thinking', 'decisions'],
        core: 'Mind and identity align — a window of mental clarity, focused thinking, and confident communication.',
        shadow: 'Overthinking, saying too much.',
        gift: 'Clear, authoritative thinking and communication.',
        domains: ['communication', 'decisions', 'learning'],
        advice: 'Write, decide, communicate. Your mind is sharp.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional communication', 'intuitive insight', 'talking feelings', 'emotional intelligence'],
        core: 'Mind and feeling connect — you\'re able to articulate what you feel and think with equal clarity.',
        shadow: 'Over-analysis of emotions.',
        gift: 'Emotional intelligence and expressive clarity.',
        domains: ['communication', 'emotions', 'relationships'],
        advice: 'Have the honest emotional conversation.',
      },
    },
    mercury: {
      conjunction: {
        keywords: ['mental activation', 'ideas flow', 'busy mind', 'communication peak'],
        core: 'Mercury activates your natal Mercury — thinking is rapid, ideas multiply, and communication is flowing.',
        shadow: 'Scattered thinking, information overload.',
        gift: 'Mental agility and communicative ease.',
        domains: ['communication', 'learning', 'decisions'],
        advice: 'Capture all the ideas — then choose one to act on.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['charming communication', 'love letters', 'aesthetic ideas', 'social wit'],
        core: 'Mind and beauty unite — charming, creative, socially graceful communication. A good day for romantic messages or creative writing.',
        shadow: 'Superficiality, avoiding direct communication.',
        gift: 'Charm, wit, and aesthetic intelligence.',
        domains: ['communication', 'romance', 'creativity'],
        advice: 'Write the message. Express the affection.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['sharp thinking', 'decisive', 'direct speech', 'debate'],
        core: 'Mind is sharp and direct — fast decisions, confident communication, strong opinions.',
        shadow: 'Aggression in speech, rushing.',
        gift: 'Mental decisiveness and persuasive power.',
        domains: ['communication', 'decisions', 'debate'],
        advice: 'Be direct — just check your tone.',
      },
    },
    jupiter: {
      conjunction: {
        keywords: ['big thinking', 'optimism', 'publishing', 'expanded perspective'],
        core: 'Thinking expands — big ideas, optimistic perspective, and the drive to share knowledge widely.',
        shadow: 'Over-promising, overstating.',
        gift: 'Grand vision and the ability to inspire through words.',
        domains: ['communication', 'education', 'travel', 'writing'],
        advice: 'Share your biggest idea. Write, teach, publish.',
      },
    },
    saturn: {
      conjunction: {
        keywords: ['serious thinking', 'disciplined mind', 'careful communication', 'mental work'],
        core: 'Thinking is disciplined, careful, and serious. Good for detailed analysis, planning, and careful communication.',
        shadow: 'Mental rigidity, pessimistic thinking.',
        gift: 'Clarity through careful, structured thought.',
        domains: ['communication', 'decisions', 'work', 'planning'],
        advice: 'Do the careful, detailed mental work. It\'ll be worth it.',
      },
    },
  },

  // ── TRANSIT VENUS ──────────────────────────────────────────────────────────
  venus: {
    sun: {
      conjunction: {
        keywords: ['radiance', 'charm', 'attractiveness', 'creative confidence'],
        core: 'You radiate warmth and beauty. A naturally magnetic time for social events, romance, and creative expression.',
        shadow: 'Vanity, overindulgence.',
        gift: 'Natural attractiveness and creative confidence.',
        domains: ['romance', 'creativity', 'social life'],
        advice: 'Show up. Be seen. Enjoy.',
      },
    },
    moon: {
      conjunction: {
        keywords: ['emotional sweetness', 'affection', 'pleasure', 'tenderness'],
        core: 'Emotional warmth and affection are heightened — a lovely time for closeness, nurturing, and simple pleasures.',
        shadow: 'Overindulgence.',
        gift: 'Genuine tenderness and warmth.',
        domains: ['emotions', 'romance', 'home'],
        advice: 'Connect with loved ones. Enjoy beauty and comfort.',
      },
    },
    venus: {
      conjunction: {
        keywords: ['Venus return', 'values reset', 'beauty', 'love renewed', 'self-worth'],
        core: 'Your annual Venus return — a reset of love, values, and self-worth. What you desire and what you value come into sharp focus.',
        shadow: 'Overindulgence, vanity.',
        gift: 'Clarity about what you truly value and desire.',
        domains: ['romance', 'values', 'self-worth', 'finances'],
        advice: 'Reflect on what you truly value in love and life.',
      },
    },
    mars: {
      conjunction: {
        keywords: ['desire', 'passion', 'attraction', 'romantic initiative'],
        core: 'Desire and passion intensify — bold romantic energy and creative drive.',
        shadow: 'Impulsive romantic decisions.',
        gift: 'Magnetic attraction and passionate creativity.',
        domains: ['romance', 'creativity', 'desire'],
        advice: 'Express your desire clearly and confidently.',
      },
    },
    jupiter: {
      conjunction: {
        keywords: ['abundance in love', 'financial luck', 'beauty expanding', 'generous heart'],
        core: 'Love, beauty, and finances all expand. A genuinely fortunate transit for relationships and creative work.',
        shadow: 'Overindulgence, overspending.',
        gift: 'Real abundance in love and creative life.',
        domains: ['romance', 'finances', 'creativity'],
        advice: 'Invest in love, beauty, and pleasure.',
      },
    },
    saturn: {
      conjunction: {
        keywords: ['relationship commitment', 'love tested', 'financial discipline', 'serious values'],
        core: 'Love and values are tested for their reality and depth. What is genuine deepens; what was surface may end.',
        shadow: 'Loneliness, financial restriction.',
        gift: 'Love that has been tested is love that is real.',
        domains: ['romance', 'relationships', 'finances', 'values'],
        advice: 'Invest in what is real. Value loyalty and depth over novelty.',
      },
    },
  },
};

// ─── Legacy Dictionary ────────────────────────────────────────────────────────

const OLD_DICTIONARY = {
  // Sun Transits
  Sun_conjunction_Sun: { keywords: ['vitality', 'renewal', 'birthday'], description: 'A solar return period bringing renewed energy and focus on your core identity.' },
  Sun_conjunction_Moon: { keywords: ['integration', 'clarity', 'focus'], description: 'Ego and emotions align, offering clarity on personal needs and goals.' },
  Sun_trine_Moon: { keywords: ['harmony', 'flow', 'ease'], description: 'A smooth period where your outer actions naturally support your inner emotional needs.' },
  Sun_square_Moon: { keywords: ['tension', 'friction', 'growth'], description: 'Inner conflict between what you want to do and what you feel you need.' },
  Sun_opposition_Moon: { keywords: ['awareness', 'culmination', 'balance'], description: 'A full moon effect bringing relationship dynamics or internal balances to light.' },
  Sun_conjunction_Mercury: { keywords: ['clarity', 'communication', 'ideas'], description: 'Mental clarity is high; a good time for making decisions and communicating.' },
  Sun_conjunction_Venus: { keywords: ['charm', 'pleasure', 'social'], description: 'A day to enjoy beauty, social interactions, and pleasant experiences.' },
  Sun_conjunction_Mars: { keywords: ['energy', 'drive', 'action'], description: 'Physical energy is boosted; you may feel more assertive or impulsive.' },
  Sun_conjunction_Jupiter: { keywords: ['luck', 'optimism', 'expansion'], description: 'A feeling of abundance and confidence; opportunities may present themselves.' },
  Sun_square_Jupiter: { keywords: ['overconfidence', 'excess', 'restlessness'], description: 'Be careful of overcommitting or acting with too much arrogance.' },
  Sun_conjunction_Saturn: { keywords: ['responsibility', 'focus', 'limits'], description: 'A serious day requiring discipline, hard work, or facing reality.' },
  Sun_square_Saturn: { keywords: ['obstacles', 'delays', 'frustration'], description: 'You may encounter roadblocks that require patience and persistence to overcome.' },
  Sun_conjunction_Uranus: { keywords: ['surprises', 'insight', 'rebellion'], description: 'Expect the unexpected; a desire to break free from routine.' },
  Sun_conjunction_Neptune: { keywords: ['sensitivity', 'dreaminess', 'inspiration'], description: 'Heightened intuition and imagination, but possible low physical energy.' },
  Sun_conjunction_Pluto: { keywords: ['intensity', 'power', 'transformation'], description: 'Deep psychological insights or power struggles may surface.' },

  // Moon Transits (very fast, but good for daily moods)
  Moon_conjunction_Sun: { keywords: ['new beginnings', 'seeds', 'instincts'], description: 'A time of emotional renewal and planting seeds for the month ahead.' },
  Moon_conjunction_Moon: { keywords: ['emotional reset', 'needs', 'comfort'], description: 'Your lunar return highlights your deepest emotional baselines.' },
  Moon_conjunction_Venus: { keywords: ['affection', 'craving', 'sweetness'], description: 'A strong desire for comfort, treats, and loving connections.' },
  Moon_square_Mars: { keywords: ['irritability', 'impatience', 'reaction'], description: 'Watch for snappy reactions and emotional volatility today.' },
  Moon_opposition_Saturn: { keywords: ['loneliness', 'duty', 'heaviness'], description: 'Emotional needs may feel blocked by responsibilities or coldness.' },

  // Mercury Transits
  Mercury_conjunction_Sun: { keywords: ['busy', 'chatty', 'expressive'], description: 'Your mind is active and you have a strong urge to share your thoughts.' },
  Mercury_conjunction_Mercury: { keywords: ['sharpness', 'ideas', 'planning'], description: 'Mental agility is at its peak; excellent for writing and detailing.' },
  Mercury_trine_Jupiter: { keywords: ['big picture', 'optimism', 'learning'], description: 'Broad-minded thinking makes this a great time for studying or planning trips.' },
  Mercury_square_Neptune: { keywords: ['confusion', 'brain fog', 'deception'], description: 'Thinking is clouded by imagination or misunderstandings. Double-check facts.' },

  // Venus Transits
  Venus_conjunction_Sun: { keywords: ['magnetism', 'leisure', 'radiance'], description: 'You attract what you want easily; a time to shine socially.' },
  Venus_conjunction_Venus: { keywords: ['love', 'aesthetics', 'values'], description: 'A reset of your relationship patterns and aesthetic tastes.' },
  Venus_conjunction_Mars: { keywords: ['passion', 'desire', 'sparks'], description: 'Romantic and creative urges are strongly stimulated.' },
  Venus_trine_Jupiter: { keywords: ['indulgence', 'luck', 'generosity'], description: 'Socializing and financial matters flow very smoothly.' },
  Venus_square_Saturn: { keywords: ['isolation', 'rejection', 'frugality'], description: 'Relationships or finances may feel restricted or require serious work.' },
  Venus_conjunction_Uranus: { keywords: ['excitement', 'unconventional', 'spontaneity'], description: 'Sudden attractions or desires for novelty in relationships.' },

  // Mars Transits
  Mars_conjunction_Sun: { keywords: ['vitality', 'courage', 'ego'], description: 'A massive surge of physical energy and desire to assert yourself.' },
  Mars_square_Moon: { keywords: ['agitation', 'conflict', 'defensiveness'], description: 'Emotional frustrations easily boil over into anger.' },
  Mars_conjunction_Mars: { keywords: ['drive', 'initiative', 'cycle'], description: 'A new two-year cycle of how you assert your will and energy begins.' },
  Mars_square_Saturn: { keywords: ['frustration', 'blocks', 'endurance'], description: 'Like driving with the brakes on; requires patience and methodical effort.' },
  Mars_conjunction_Uranus: { keywords: ['explosive', 'accidents', 'breakthroughs'], description: 'Erratic energy that needs a safe, physical outlet to avoid disruption.' },

  // Jupiter Transits (Slower, major themes)
  Jupiter_conjunction_Sun: { keywords: ['growth', 'confidence', 'opportunity'], description: 'A major period of personal expansion, optimism, and new opportunities.' },
  Jupiter_trine_Moon: { keywords: ['well-being', 'support', 'home'], description: 'A wonderful period for domestic happiness and emotional support.' },
  Jupiter_conjunction_Venus: { keywords: ['abundance', 'romance', 'blessings'], description: 'Relationships and finances receive a boost of luck and growth.' },
  Jupiter_conjunction_Jupiter: { keywords: ['expansion', 'vision', 'reward'], description: 'Your Jupiter return brings a new 12-year cycle of learning and growth.' },
  Jupiter_square_Saturn: { keywords: ['tension', 'restructuring', 'growing pains'], description: 'The urge to expand clashes with the need for structure.' },

  // Saturn Transits (Major life lessons)
  Saturn_conjunction_Sun: { keywords: ['maturity', 'burden', 'focus'], description: 'A heavy but important time of taking on responsibilities and growing up.' },
  Saturn_square_Moon: { keywords: ['depression', 'isolation', 'emotional work'], description: 'A challenging time for emotional well-being; feeling unsupported.' },
  Saturn_conjunction_Venus: { keywords: ['commitment', 'reality check', 'loneliness'], description: 'Relationships are tested for their long-term viability.' },
  Saturn_conjunction_Saturn: { keywords: ['milestone', 'karma', 'adulthood'], description: 'The Saturn return: a major life transition and taking stock of your path.' },
  Saturn_square_Uranus: { keywords: ['friction', 'change', 'rigidity'], description: 'The old clashes with the new; structural changes are forced upon you.' },

  // Uranus Transits (Disruption and awakening)
  Uranus_conjunction_Sun: { keywords: ['awakening', 'radical change', 'freedom'], description: 'A period of breaking free from old identities and embracing authenticity.' },
  Uranus_opposition_Venus: { keywords: ['instability', 'breakups', 'excitement'], description: 'Relationships go through sudden changes or need more space.' },
  Uranus_conjunction_Mars: { keywords: ['rebellion', 'danger', 'courage'], description: 'A volatile time where you might act rashly to assert independence.' },

  // Neptune Transits (Dissolution and spirituality)
  Neptune_conjunction_Sun: { keywords: ['confusion', 'spiritual awakening', 'ego-loss'], description: 'Your sense of identity dissolves, making way for spiritual or artistic growth.' },
  Neptune_square_Moon: { keywords: ['illusion', 'sensitivity', 'escapism'], description: 'Emotional boundaries are porous; watch out for deceiving yourself.' },
  Neptune_conjunction_Venus: { keywords: ['soulmate', 'delusion', 'romance'], description: 'A tendency to view love through rose-colored glasses.' },

  // Pluto Transits (Transformation and power)
  Pluto_conjunction_Sun: { keywords: ['rebirth', 'power', 'crisis'], description: 'A profound, often difficult period of ego death and transformation.' },
  Pluto_square_Moon: { keywords: ['obsession', 'purge', 'trauma'], description: 'Deep emotional complexes and buried feelings are brought to the surface.' },
  Pluto_conjunction_Venus: { keywords: ['obsession', 'intensity', 'fatal attraction'], description: 'Relationships take on a heavy, karmic, or transformative quality.' },
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Get interpretation for a transit aspect.
 *
 * @param {string} transitPlanet  e.g. 'mars'
 * @param {string} aspectName     e.g. 'square'
 * @param {string} natalPlanet    e.g. 'moon'
 * @returns {Object} interpretation object, or a generic fallback
 */
export function getInterpretation(transitPlanet, aspectName, natalPlanet) {
  const tp = transitPlanet.toLowerCase();
  const np = natalPlanet.toLowerCase();
  const ak = aspectName.toLowerCase();
  
  const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

  const entry =
    INTERPRETATIONS[tp]?.[np]?.[ak] ||
    INTERPRETATIONS[tp]?.[np]?.['conjunction'] ||
    null;

  if (entry) return entry;

  // Fallback to old dictionary
  const oldKey = `${capitalize(tp)}_${ak}_${capitalize(np)}`;
  const oldEntry = OLD_DICTIONARY[oldKey];
  if (oldEntry) {
    return {
      keywords: oldEntry.keywords,
      core: oldEntry.description,
      shadow: 'Watch for the challenging expression of this combination.',
      gift: 'There is growth and opportunity available in this transit.',
      domains: ['general'],
      advice: 'Stay aware of this energy and work with it consciously.',
    };
  }

  // Generic fallback
  const aspectChar = ASPECT_CHARACTER[aspectName] || {};
  return {
    keywords: [aspectChar.mode || 'activation', `${transitPlanet} energy`, `natal ${natalPlanet} theme`],
    core: `Transit ${transitPlanet} forms a ${aspectName} to your natal ${natalPlanet}. ${aspectChar.tone || 'The planetary energies interact in a significant way.'}`,
    shadow: 'Watch for the challenging expression of this combination.',
    gift: 'There is growth and opportunity available in this transit.',
    domains: ['general'],
    advice: 'Stay aware of this energy and work with it consciously.',
  };
}

/**
 * Get a compact one-liner summary for display in the transit card header.
 *
 * @param {string} transitPlanet
 * @param {string} aspectName
 * @param {string} natalPlanet
 * @returns {string}
 */
export function getSummary(transitPlanet, aspectName, natalPlanet) {
  const interp = getInterpretation(transitPlanet, aspectName, natalPlanet);
  return interp.core.split('.')[0] + '.';
}

/**
 * Get just the keywords array.
 */
export function getKeywords(transitPlanet, aspectName, natalPlanet) {
  return getInterpretation(transitPlanet, aspectName, natalPlanet).keywords;
}

/**
 * Get the nature/tone of an aspect type.
 */
export function getAspectTone(aspectName) {
  return ASPECT_CHARACTER[aspectName] || null;
}
