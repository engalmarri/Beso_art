const TRANSLATIONS = {
  ar: {
    title: 'BESO ART - مولد تصميم التيشيرتات',
    tagline: 'مولد تصاميم تيشرتات بالذكاء الاصطناعي',
    descLabel: '✏️ وصف التصميم',
    descPlaceholder: 'صف تصميم التيشيرت الذي تريده... مثال: تنين سايبربانك بعيون نيون',
    enhanceBtn: '✨ تحسين الوصف',
    enhancedLabel: '📝 الوصف المحسّن',
    useEnhanced: 'استخدام هذا',
    colorsLabel: '🎨 الألوان (اختياري)',
    noColors: 'لم تختر أي لون بعد',
    genSizeLabel: '📐 مقاس التوليد',
    printLabel: '📏 حدود الطباعة (اختياري)',
    printHint: 'حدد أقصى أبعاد للصورة لتتوافق مع مواقع الطباعة (مثل Redbubble, Printful)',
    maxWidth: 'أقصى عرض',
    maxHeight: 'أقصى ارتفاع',
    cropToggle: 'تكبير تلقائي مع قص مركزي (Auto upscale + center crop)',
    qualityLabel: '🎚 جودة الصورة',
    lossless: '(بدون فقدان)',
    hfKey: 'Hugging Face API Key (مطلوب)',
    openaiKey: 'OpenAI API Key (اختياري - لتحسين أعمق عبر GPT)',
    getKey: 'الحصول على مفتاح',
    generateBtn: '⚡ توليد الصورة',
    generating: '⚡ جاري التوليد...',
    result: '🖼 النتيجة',
    downloadBtn: '⬇ تحميل الصورة',
    footer: 'مولد تصاميم تيشرتات بالذكاء الاصطناعي',
    error_no_hf: '❌ الرجاء إدخال Hugging Face API Key',
    error_no_prompt: '❌ الرجاء كتابة وصف للتصميم',
    error_generic: '❌ حدث خطأ: ',
    error_hf_key: '❌ مفتاح Hugging Face غير صحيح أو أن الموديل يحتاج وقتاً للتحميل',
    loading_model: '⏳ الموديل قيد التحميل... يرجى الانتظار (قد يستغرق 30-60 ثانية في أول استخدام)',
    mb: 'ميجابايت',
    kb: 'كيلوبايت',
    dimensions: 'الأبعاد',
    size: 'الحجم',
  },
  en: {
    title: 'BESO ART - AI T-Shirt Designer',
    tagline: 'AI T-Shirt Designer',
    descLabel: '✏️ Design Description',
    descPlaceholder: 'Describe your T-shirt design... Example: cyberpunk dragon with neon eyes',
    enhanceBtn: '✨ Enhance Prompt',
    enhancedLabel: '📝 Enhanced Prompt',
    useEnhanced: 'Use This',
    colorsLabel: '🎨 Colors (Optional)',
    noColors: 'No colors selected',
    genSizeLabel: '📐 Generation Size',
    printLabel: '📏 Print Limits (Optional)',
    printHint: 'Set max image dimensions to match print-on-demand requirements (e.g. Redbubble, Printful)',
    maxWidth: 'Max Width',
    maxHeight: 'Max Height',
    cropToggle: 'Auto upscale + center crop to fill dimensions',
    qualityLabel: '🎚 Image Quality',
    lossless: '(lossless)',
    hfKey: 'Hugging Face API Key (Required)',
    openaiKey: 'OpenAI API Key (Optional - for GPT enhanced prompting)',
    getKey: 'Get API Key',
    generateBtn: '⚡ Generate Image',
    generating: '⚡ Generating...',
    result: '🖼 Result',
    downloadBtn: '⬇ Download Image',
    footer: 'AI-Powered T-Shirt Design Generator',
    error_no_hf: '❌ Please enter your Hugging Face API Key',
    error_no_prompt: '❌ Please enter a design description',
    error_generic: '❌ Error: ',
    error_hf_key: '❌ Invalid Hugging Face key or model is still loading',
    loading_model: '⏳ Model is loading... please wait (may take 30-60s on first use)',
    mb: 'MB',
    kb: 'KB',
    dimensions: 'Dimensions',
    size: 'Size',
  }
};

let currentLang = 'ar';
let selectedColors = [];
let genSize = 768;
let currentResultBlob = null;
let currentResultInfo = null;

const DEFAULT_HF_KEY = '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';
const DEFAULT_OPENAI_KEY = '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';

function t(key) {
  return TRANSLATIONS[currentLang][key] || key;
}

function translatePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.getElementById('langBtn').textContent = currentLang === 'ar' ? '🇺🇸 EN' : '🇸🇦 عربي';
}

function toggleLang() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  translatePage();
  localStorage.setItem('beso_lang', currentLang);
}

// Color selection
document.addEventListener('DOMContentLoaded', () => {
  // Restore language
  const savedLang = localStorage.getItem('beso_lang');
  if (savedLang) {
    currentLang = savedLang;
    translatePage();
  }

  // Restore API keys (use defaults if no saved keys)
  const savedHf = localStorage.getItem('beso_hf_key');
  const savedOpenai = localStorage.getItem('beso_openai_key');
  document.getElementById('hfKey').value = savedHf || DEFAULT_HF_KEY;
  document.getElementById('openaiKey').value = savedOpenai || DEFAULT_OPENAI_KEY;

  // Color swatches
  document.querySelectorAll('.color-swatch').forEach(el => {
    el.addEventListener('click', () => {
      const color = el.getAttribute('data-color');
      el.classList.toggle('selected');
      const idx = selectedColors.indexOf(color);
      if (idx > -1) {
        selectedColors.splice(idx, 1);
      } else {
        selectedColors.push(color);
      }
      updateColorInfo();
    });
  });

  // Save API keys on input
  document.getElementById('hfKey').addEventListener('input', () => {
    localStorage.setItem('beso_hf_key', document.getElementById('hfKey').value);
  });
  document.getElementById('openaiKey').addEventListener('input', () => {
    localStorage.setItem('beso_openai_key', document.getElementById('openaiKey').value);
  });

  // Size selection
  document.querySelectorAll('input[name="genSize"]').forEach(el => {
    el.addEventListener('change', () => {
      setGenSize(parseInt(el.value));
    });
  });
});

function setGenSize(size) {
  genSize = size;
  document.querySelectorAll('.size-option').forEach(el => el.classList.remove('selected'));
  document.querySelector(`input[name="genSize"][value="${size}"]`).closest('.size-option').classList.add('selected');
}

function updateColorInfo() {
  const el = document.getElementById('selectedColors');
  if (selectedColors.length === 0) {
    el.textContent = t('noColors');
  } else {
    el.textContent = '✓ ' + selectedColors.join(', ');
  }
}

function updateQualityLabel() {
  document.getElementById('qualityValue').textContent = document.getElementById('qualitySlider').value + '%';
}

function toggleQuality() {
  const format = document.querySelector('input[name="imgFormat"]:checked').value;
  const slider = document.getElementById('qualitySlider');
  if (format === 'png') {
    slider.value = 100;
    slider.disabled = true;
  } else {
    slider.disabled = false;
    slider.value = 95;
  }
  updateQualityLabel();
}

async function enhancePrompt() {
  const input = document.getElementById('promptInput');
  const container = document.getElementById('enhancedContainer');
  const enhancedEl = document.getElementById('enhancedPrompt');
  const userPrompt = input.value.trim();

  if (!userPrompt) {
    alert(t('error_no_prompt'));
    return;
  }

  const openaiKey = document.getElementById('openaiKey').value.trim();

  if (openaiKey) {
    try {
      const gptResult = await enhanceWithGPT(userPrompt, selectedColors, openaiKey);
      if (gptResult) {
        enhancedEl.textContent = gptResult;
        container.classList.remove('hidden');
        return;
      }
    } catch (_) {}
  }

  const localResult = enhancePromptLocally(userPrompt, selectedColors);
  enhancedEl.textContent = localResult;
  container.classList.remove('hidden');
}

function useEnhanced() {
  const enhanced = document.getElementById('enhancedPrompt').textContent;
  document.getElementById('promptInput').value = enhanced;
  document.getElementById('enhancedContainer').classList.add('hidden');
}

async function generate() {
  const hfKey = document.getElementById('hfKey').value.trim();
  const promptInput = document.getElementById('promptInput').value.trim();
  const resultSection = document.getElementById('resultSection');
  const resultImg = document.getElementById('resultImage');
  const genBtn = document.getElementById('generateBtn');
  const genBtnText = document.getElementById('genBtnText');
  const spinner = document.getElementById('spinner');
  const imageInfo = document.getElementById('imageInfo');

  if (!hfKey) {
    alert(t('error_no_hf'));
    return;
  }

  if (!promptInput) {
    alert(t('error_no_prompt'));
    return;
  }

  genBtn.disabled = true;
  genBtnText.textContent = t('generating');
  spinner.classList.remove('hidden');
  resultSection.classList.add('hidden');
  currentResultBlob = null;
  currentResultInfo = null;

  try {
    let finalPrompt = promptInput;

    const enhancedContainer = document.getElementById('enhancedContainer');
    if (!enhancedContainer.classList.contains('hidden')) {
      finalPrompt = document.getElementById('enhancedPrompt').textContent;
    }

    const negativePrompt = buildNegativePrompt();

    const blob = await generateWithHF(finalPrompt, negativePrompt, genSize, hfKey, (msg) => {
      genBtnText.textContent = msg;
    });

    const maxWidth = parseInt(document.getElementById('maxWidth').value) || 0;
    const maxHeight = parseInt(document.getElementById('maxHeight').value) || 0;
    const crop = document.getElementById('cropToggle').checked;
    const format = document.querySelector('input[name="imgFormat"]:checked').value;
    const quality = parseInt(document.getElementById('qualitySlider').value);

    const { blob: processedBlob, width, height } = await processImageWithLimits(
      blob, maxWidth, maxHeight, crop, format, quality
    );

    currentResultBlob = processedBlob;
    currentResultInfo = { width, height, format, size: processedBlob.size };

    const url = URL.createObjectURL(processedBlob);
    resultImg.src = url;

    const dimText = `${width}×${height}px`;
    const sizeMB = (processedBlob.size / (1024 * 1024)).toFixed(2);
    const sizeText = processedBlob.size > 1024 * 1024
      ? `${sizeMB} ${t('mb')}`
      : `${(processedBlob.size / 1024).toFixed(1)} ${t('kb')}`;
    imageInfo.textContent = `${t('dimensions')}: ${dimText} | ${t('size')}: ${sizeText}`;

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    alert(t('error_generic') + err.message);
    console.error(err);
  } finally {
    genBtn.disabled = false;
    genBtnText.textContent = t('generateBtn');
    spinner.classList.add('hidden');
  }
}

function downloadImage() {
  if (!currentResultBlob || !currentResultInfo) return;

  const a = document.createElement('a');
  const ext = currentResultInfo.format === 'png' ? 'png' : 'jpg';
  a.href = URL.createObjectURL(currentResultBlob);
  a.download = `beso-art-design.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// Enter key support
document.getElementById('promptInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    enhancePrompt();
  }
});
