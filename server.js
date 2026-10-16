const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poisson(k, mean) {
  return (Math.pow(mean, k) * Math.exp(-mean)) / factorial(k);
}

function calculateMatchMarkets(homeAvg, awayAvg) {
  let homeWin = 0, draw = 0, awayWin = 0;
  let over15 = 0, under15 = 0, over25 = 0, under25 = 0;
  let btts = 0, bttsNo = 0;
  let homeOver05 = 0, homeOver15 = 0, awayOver05 = 0, awayOver15 = 0;
  let score10 = 0, score21 = 0, score11 = 0;
  
  // Asian Handicap Variables
  let homeMinus15 = 0, homeMinus1 = 0, homeMinus05 = 0;
  let awayPlus15 = 0, awayPlus1 = 0, awayPlus05 = 0;

  for (let h = 0; h <= 10; h++) {
    for (let a = 0; a <= 10; a++) {
      const prob = poisson(h, homeAvg) * poisson(a, awayAvg);
      const total = h + a;
      const diff = h - a; // Positive means home winning, negative means away winning
      
      // 1X2 Market
      if (h > a) homeWin += prob; else if (h === a) draw += prob; else awayWin += prob;

      // Over/Under Goals
      if (total > 1.5) over15 += prob; else under15 += prob;
      if (total > 2.5) over25 += prob; else under25 += prob;

      // Both Teams to Score
      if (h > 0 && a > 0) btts += prob; else bttsNo += prob;

      // Team Goals
      if (h > 0) homeOver05 += prob;
      if (h > 1) homeOver15 += prob;
      if (a > 0) awayOver05 += prob;
      if (a > 1) awayOver15 += prob;

      // Correct Scores
      if (h === 1 && a === 0) score10 += prob;
      if (h === 2 && a === 1) score21 += prob;
      if (h === 1 && a === 1) score11 += prob;

      // Asian Handicaps
      // Home -1.5: Home must win by 2+ goals
      if (diff >= 2) homeMinus15 += prob;
      // Home -1: Home must win by 2+. (Refund if win by 1 - we ignore pushes for simplicity, but standard win prob is diff >= 2)
      if (diff >= 2) homeMinus1 += prob; 
      // Home -0.5: Home must simply win
      if (diff >= 1) homeMinus05 += prob;

      // Away +1.5: Away wins, draws, or loses by 1
      if (diff <= 1) awayPlus15 += prob;
      // Away +1: Away wins, draws, or loses by 1. (Refund if lose by 1 - standard win prob is diff <= 0 for pure win, but let's do diff <= 1)
      if (diff <= 1) awayPlus1 += prob;
      // Away +0.5: Away wins or draws
      if (diff <= 0) awayPlus05 += prob;
    }
  }

  // Half-Time Calculation
  const htTotalAvg = (homeAvg + awayAvg) / 2;
  let htOver05 = 1 - poisson(0, htTotalAvg);
  let htOver15 = 1 - poisson(0, htTotalAvg) - poisson(1, htTotalAvg);

  const pct = (val) => (val * 100).toFixed(2);

  return {
    homeWin: pct(homeWin), draw: pct(draw), awayWin: pct(awayWin),
    oneX: pct(homeWin + draw), oneTwo: pct(homeWin + awayWin), xTwo: pct(draw + awayWin),
    over15: pct(over15), under15: pct(under15), over25: pct(over25), under25: pct(under25),
    btts: pct(btts), bttsNo: pct(bttsNo),
    homeOver05: pct(homeOver05), homeOver15: pct(homeOver15),
    awayOver05: pct(awayOver05), awayOver15: pct(awayOver15),
    htOver05: pct(htOver05), htOver15: pct(htOver15),
    score10: pct(score10), score21: pct(score21), score11: pct(score11),
    // Asian Handicaps
    homeMinus15: pct(homeMinus15), homeMinus1: pct(homeMinus1), homeMinus05: pct(homeMinus05),
    awayPlus15: pct(awayPlus15), awayPlus1: pct(awayPlus1), awayPlus05: pct(awayPlus05)
  };
}

app.post('/api/football', async (req, res) => {
  const { question } = req.body;
  const q = question.toLowerCase();
  const API_KEY = process.env.FOOTBALL_API_KEY;

  if (!API_KEY) return res.status(500).json({ type: 'text', answer: "API key is missing." });

  try {
    if (q.includes('predict') || q.includes('prediction') || q.includes('odds')) {
      const cityAvg = 2.5; 
      const newcastleAvg = 1.2;
      const markets = calculateMatchMarkets(cityAvg, newcastleAvg);
      return res.json({ type: 'prediction', match: 'Manchester City vs Newcastle', markets: markets });
    }

    let endpoint = '', leagueName = '';
    if (q.includes('german') || q.includes('bundesliga')) {
      endpoint = 'https://api.football-data.org/v4/competitions/BL1/matches?status=SCHEDULED&limit=5'; leagueName = 'BUNDESLIGA | GERMANY';
    } else if (q.includes('ligue 1')) {
      endpoint = 'https://api.football-data.org/v4/competitions/FL1/matches?status=SCHEDULED&limit=5'; leagueName = 'LIGUE 1 | FRANCE';
    } else if (q.includes('premier league') || q.includes('epl')) {
      endpoint = 'https://api.football-data.org/v4/competitions/PL/matches?status=SCHEDULED&limit=5'; leagueName = 'PREMIER LEAGUE | ENGLAND';
    } else if (q.includes('results') || q.includes('recent')) {
      endpoint = 'https://api.football-data.org/v4/matches?status=FINISHED&limit=5'; leagueName = 'RECENT RESULTS';
    } else {
      return res.json({ type: 'text', answer: "Ask me for fixtures or predictions!" });
    }

    const response = await fetch(endpoint, { headers: { 'X-Auth-Token': API_KEY } });
    const data = await response.json();
    
    if (data.matches && data.matches.length > 0) {
      const matches = data.matches.map(m => ({
        home: m.homeTeam.name, away: m.awayTeam.name,
        time: new Date(m.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(m.utcDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
      }));
      res.json({ type: 'fixtures', league: leagueName, matches: matches });
    } else {
      res.json({ type: 'text', answer: "I couldn't find any matches." });
    }
  } catch (error) {
    res.status(500).json({ type: 'text', answer: "Error connecting to the API." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OGA AI backend running on port ${PORT}`));
