import * as A from 'astronomy-engine';

const time = A.MakeTime(new Date());

const getLon = (body) => {
  const vec = A.GeoVector(body, time, true);
  return A.Ecliptic(vec).elon;
};

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const printLon = (name, body) => {
  const lon = getLon(body);
  const index = Math.floor(lon / 30);
  const degree = lon % 30;
  console.log(`${name}: ${degree.toFixed(2)}° ${SIGNS[index]}`);
};

printLon('Sun', A.Body.Sun);
printLon('Moon', A.Body.Moon);
printLon('Mercury', A.Body.Mercury);
printLon('Venus', A.Body.Venus);
printLon('Mars', A.Body.Mars);
printLon('Jupiter', A.Body.Jupiter);
printLon('Saturn', A.Body.Saturn);
printLon('Uranus', A.Body.Uranus);
printLon('Neptune', A.Body.Neptune);
printLon('Pluto', A.Body.Pluto);
