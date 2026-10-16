const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/football', async (req, res) => {
  const { question } = req.body;
  const q = question.toLowerCase();
  
  const API_KEY = process.env.FOOTBALL_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ answer: "API key is missing on the server." });
  }

  try {
    let endpoint = '';
    
    if (q.includes('bundesliga')) {
      endpoint = 'https://api.football-data.org/v4/competitions/BL1/matches?status=SCHEDULED&limit=5';
    } else if (q.includes('ligue 1')) {
      endpoint = 'https://api.football-data.org/v4/competitions/FL1/matches?status=SCHEDULED&limit=5';
    } else if (q.includes('premier league')) {
      endpoint = 'https://api.football-data.org/v4/competitions/PL/matches?status=SCHEDULED&limit=5';
    } else if (q.includes('manchester city')) {
      endpoint = 'https://api.football-data.org/v4/teams/65/matches?status=SCHEDULED&limit=5';
    } else if (q.includes('results') || q.includes('recent')) {
      endpoint = 'https://api.football-data.org/v4/matches?status=FINISHED&limit=5';
    } else {
      return res.json({ answer: "I can help with fixtures, results, and tables for Bundesliga, Ligue 1, and Premier League. Which one do you want?" });
    }

    const response = await fetch(endpoint, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    
    const data = await response.json();
    
    if (data.matches && data.matches.length > 0) {
      let answer = "Here are the matches I found:\n\n";
      data.matches.forEach(m => {
        answer += `⚽ ${m.homeTeam.name} vs ${m.awayTeam.name}\n`;
        answer += `📅 ${new Date(m.utcDate).toLocaleDateString()}\n\n`;
      });
      res.json({ answer });
    } else {
      res.json({ answer: "I couldn't find any matches for that request right now." });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ answer: "Sorry, there was an error connecting to the football API." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OGA AI backend running on port ${PORT}`);
});
