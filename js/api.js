const HF_MODEL = 'runwayml/stable-diffusion-v1-5';

const CORS_PROXIES = [
  'https://corsproxy.io/?',
];

function processImageWithLimits(blob, maxWidth, maxHeight, crop, format, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      if (maxWidth || maxHeight) {
        const targetW = maxWidth || w;
        const targetH = maxHeight || h;

        if (crop) {
          const scale = Math.max(targetW / w, targetH / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        } else {
          const scale = Math.min(targetW / w, targetH / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const dx = (targetW - w) / 2;
        const dy = (targetH - h) / 2;
        ctx.drawImage(img, dx, dy, w, h);

        canvas.toBlob((newBlob) => {
          if (newBlob) resolve({ blob: newBlob, width: targetW, height: targetH });
          else reject(new Error('Failed to process image'));
        }, `image/${format}`, quality / 100);
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((newBlob) => {
          if (newBlob) resolve({ blob: newBlob, width: w, height: h });
          else reject(new Error('Failed to process image'));
        }, `image/${format}`, quality / 100);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(blob);
  });
}

async function generateImage(prompt, negativePrompt, size, hfKey, onProgress) {
  const width = size;
  const height = size;

  if (hfKey && hfKey.startsWith('hf_')) {
    if (onProgress) onProgress('Trying Hugging Face...');
    try {
      return await generateWithHF(prompt, negativePrompt, width, height, hfKey, onProgress);
    } catch (hfErr) {
      console.warn('HF failed, falling back to Pollinations:', hfErr.message);
    }
  }

  if (onProgress) onProgress('Using Pollinations.ai (free, no key needed)...');
  return generateWithPollinations(prompt, width, height, onProgress);
}

async function generateWithPollinations(prompt, width, height, onProgress) {
  if (onProgress) onProgress('Generating via Pollinations.ai...');

  const url = 'https://image.pollinations.ai/prompt/'
    + encodeURIComponent(prompt)
    + `?width=${width}&height=${height}&nologo=true&model=stable-diffusion`;

  if (onProgress) onProgress('Downloading image...');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pollinations error (${res.status})`);

  return res.blob();
}

async function generateWithHF(prompt, negativePrompt, width, height, hfKey, onProgress) {
  if (onProgress) onProgress('Connecting to Hugging Face...');

  const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  const body = JSON.stringify({
    inputs: prompt,
    parameters: {
      negative_prompt: negativePrompt,
      width, height,
      num_inference_steps: 25,
      guidance_scale: 7.5,
    }
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
      body,
    });

    if (res.status === 503) {
      if (onProgress) onProgress('Model loading... please wait');
      const info = await res.json();
      const t = info.estimated_time || 60;
      await new Promise(r => setTimeout(r, t * 1000));
      const retry = await fetch(url, {
        method: 'POST', headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' }, body
      });
      if (!retry.ok) throw new Error(`API error (${retry.status})`);
      if (onProgress) onProgress('Processing image...');
      return retry.blob();
    }

    if (!res.ok) {
      const txt = await res.text();
      let msg = `API error (${res.status})`;
      try { const e = JSON.parse(txt); if (e.error) msg = e.error; } catch (_) { msg = txt || msg; }
      throw new Error(msg);
    }

    if (onProgress) onProgress('Processing image...');
    return res.blob();

  } catch (err) {
    if (onProgress) onProgress('Direct HF failed, trying through proxy...');

    const proxyUrl = CORS_PROXIES[0] + encodeURIComponent(url + `?token=${hfKey}`);

    try {
      const proxyRes = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!proxyRes.ok) throw new Error(`Proxy error (${proxyRes.status})`);

      const ct = proxyRes.headers.get('content-type') || '';
      if (ct.includes('image')) {
        return proxyRes.blob();
      }

      const text = await proxyRes.text();
      try {
        const data = JSON.parse(text);
        if (data.contents) {
          const bin = atob(data.contents);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return new Blob([bytes], { type: 'image/png' });
        }
        if (typeof data === 'string' && data.length > 100) {
          const bin = atob(data);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return new Blob([bytes], { type: 'image/png' });
        }
      } catch (_) {}

      throw new Error('Proxy returned unexpected format');

    } catch (proxyErr) {
      throw new Error(
        'Hugging Face unavailable. The site will use Pollinations.ai (free, no key needed) as backup.\n' +
        'Or try again later.'
      );
    }
  }
}
