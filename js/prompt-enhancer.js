const CYBERPUNK_KEYWORDS = [
  'cyberpunk aesthetic', 'neon glow', 'dark background', 'high contrast',
  'bold graphic design', 't-shirt print design', 'synthwave vibes',
  'futuristic', 'retro wave', 'grid lines', 'holographic details',
  'mechanical textures', 'glitch effects', 'chrome reflections',
  'vaporwave style', 'outrun style', 'metallic accents', 'neon cityscape',
  'digital art', 'vector style', 'screen print style', 'halftone dots'
];

const NEGATIVE_KEYWORDS = [
  'ugly', 'blurry', 'low quality', 'deformed', 'distorted',
  'text', 'watermark', 'signature', 'low resolution', 'cropped',
  'worst quality', 'normal quality', 'jpeg artifacts', 'overexposed'
];

const QUALITY_TAGS = [
  'highly detailed', 'sharp focus', 'intricate details',
  'masterpiece', 'best quality', '4k', 'professional design'
];

function enhancePromptLocally(userPrompt, selectedColors) {
  let prompt = userPrompt.trim();
  if (!prompt) return '';

  prompt = prompt.replace(/[،,]/g, ', ');

  let enhanced = prompt;

  enhanced += ', ' + CYBERPUNK_KEYWORDS.slice(0, 6).join(', ');

  enhanced += ', ' + QUALITY_TAGS.slice(0, 4).join(', ');

  if (selectedColors && selectedColors.length > 0) {
    const colorStr = selectedColors.join(', ');
    enhanced += `, color scheme: ${colorStr}, dominated by ${selectedColors[0]}`;
  }

  enhanced += ', no text, no watermark, no letters, no writing';

  return enhanced;
}

function buildNegativePrompt() {
  return NEGATIVE_KEYWORDS.join(', ');
}

async function enhanceWithGPT(prompt, selectedColors, apiKey) {
  const colorsText = selectedColors && selectedColors.length > 0
    ? `\nColor scheme: ${selectedColors.join(', ')}.`
    : '';

  const systemPrompt = `You are an expert prompt engineer for AI image generation (Stable Diffusion). Rewrite the user's T-shirt design description into a professional, highly detailed prompt optimized for generating cyberpunk/vaporwave aesthetic artwork. Rules:
- Keep it under 200 words
- Add specific visual details (lighting, textures, materials, composition)
- Include cyberpunk/synthwave style keywords naturally
- Specify color palette if provided
- End with "no text, no watermark, no letters, no writing"
- Output ONLY the enhanced prompt, no explanations`;

  const userMessage = `Original description: "${prompt}"${colorsText}\n\nGenerate the enhanced prompt:`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 300
      })
    });

    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);

    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    return null;
  }
}
