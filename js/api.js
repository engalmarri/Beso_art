const HF_MODEL = 'runwayml/stable-diffusion-v1-5';

const CORS_PROXIES = [
  { url: 'https://api.allorigins.win/raw?url=', type: 'text' },
  { url: 'https://corsproxy.io/?', type: 'blob' },
];

async function generateWithHF(prompt, negativePrompt, size, hfKey, onProgress) {
  const width = size;
  const height = size;

  if (onProgress) onProgress('Preparing request...');

  const body = JSON.stringify({
    inputs: prompt,
    parameters: {
      negative_prompt: negativePrompt,
      width: width,
      height: height,
      num_inference_steps: 25,
      guidance_scale: 7.5,
    }
  });

  async function directFetch() {
    const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfKey}`,
        'Content-Type': 'application/json',
      },
      body: body,
    });

    if (res.status === 503) {
      if (onProgress) onProgress('Model is loading... please wait');
      const info = await res.json();
      const t = info.estimated_time || 60;
      await new Promise(r => setTimeout(r, t * 1000));
      const retry = await fetch(url, {
        method: 'POST', headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' }, body
      });
      if (!retry.ok) throw new Error(`API error (${retry.status})`);
      return retry.blob();
    }

    if (!res.ok) {
      const txt = await res.text();
      let msg = `API error (${res.status})`;
      try { const e = JSON.parse(txt); if (e.error) msg = e.error; } catch (_) { msg = txt || msg; }
      throw new Error(msg);
    }

    return res.blob();
  }

  async function proxyFetch(proxy, index) {
    const targetUrl = `https://api-inference.huggingface.co/models/${HF_MODEL}?token=${hfKey}`;

    if (onProgress) onProgress(`Trying proxy ${index + 1}...`);

    const proxyRes = await fetch(proxy.url + encodeURIComponent(targetUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });

    if (!proxyRes.ok) {
      const txt = await proxyRes.text();
      throw new Error(`Proxy error (${proxyRes.status})`);
    }

    if (proxy.type === 'blob') {
      return proxyRes.blob();
    }

    const text = await proxyRes.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { throw new Error('Proxy: invalid JSON response'); }

    if (data.contents) {
      const binaryStr = atob(data.contents);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      return new Blob([bytes], { type: 'image/png' });
    }
    if (data.error) throw new Error('Proxy: ' + data.error);
    throw new Error('Proxy: unexpected response format');
  }

  try {
    if (onProgress) onProgress('Connecting to Hugging Face...');
    const blob = await directFetch();
    if (onProgress) onProgress('Processing image...');
    return blob;
  } catch (directErr) {
    console.warn('Direct fetch failed:', directErr);

    for (let i = 0; i < CORS_PROXIES.length; i++) {
      try {
        const blob = await proxyFetch(CORS_PROXIES[i], i);
        if (onProgress) onProgress('Processing image...');
        return blob;
      } catch (proxyErr) {
        console.warn(`Proxy ${i + 1} failed:`, proxyErr);
        continue;
      }
    }

    throw new Error(
      'Cannot connect to Hugging Face API. Try:\n' +
      '1. Serve the site with: python -m http.server 8080\n' +
      '2. Or deploy to GitHub Pages\n' +
      '3. Or check your internet connection'
    );
  }
}

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
