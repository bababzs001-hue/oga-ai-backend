const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OGA_SYSTEM_PROMPT = require('./prompt.js');
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// MAIN API — AI ANALYSIS & FORECASTING
// ==========================================
app.post('/api/football', async (req, res) => {
  const { question } = req.body;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!question) {
    return res.status(400).json({ type: 'text', answer: "No question provided." });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ type: 'text', answer: "Gemini API key is missing. Add GEMINI_API_KEY in Render environment." });
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: OGA_SYSTEM_PROMPT
    });

    const result = await model.generateContent(question);
    const aiText = result.response.text();

    return res.json({ type: 'ai_analysis', text: aiText });

  } catch (err) {
    console.error("Gemini error:", err);
    return res.status(500).json({
      type: 'text',
      answer: "AI is busy or unavailable. Please wait 20-30 seconds and try again."
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OGA AI running on port ${PORT}`));
