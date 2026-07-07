const HF_MODEL = 'stabilityai/stable-diffusion-2-1';

async function generateWithHF(prompt, negativePrompt, size, hfKey, onProgress) {
  const width = size;
  const height = size;

  if (onProgress) onProgress('Sending request to Hugging Face...');

  const res = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hfKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        negative_prompt: negativePrompt,
        width: width,
        height: height,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      }
    })
  });

  if (res.status === 503) {
    if (onProgress) onProgress('Model is loading... please wait (this may take 30-60s on first use)');
    const info = await res.json();
    const estimatedTime = info.estimated_time || 60;
    await new Promise(resolve => setTimeout(resolve, estimatedTime * 1000));
    return generateWithHF(prompt, negativePrompt, size, hfKey, onProgress);
  }

  if (!res.ok) {
    const errText = await res.text();
    let msg = `API error (${res.status})`;
    try {
      const err = JSON.parse(errText);
      if (err.error) msg = err.error;
    } catch (_) {
      msg = errText || msg;
    }
    throw new Error(msg);
  }

  if (onProgress) onProgress('Processing image...');

  const blob = await res.blob();
  return blob;
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
          if (newBlob) {
            resolve({ blob: newBlob, width: targetW, height: targetH });
          } else {
            reject(new Error('Failed to process image'));
          }
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
          if (newBlob) {
            resolve({ blob: newBlob, width: w, height: h });
          } else {
            reject(new Error('Failed to process image'));
          }
        }, `image/${format}`, quality / 100);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(blob);
  });
}
