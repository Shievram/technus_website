document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const lang = localStorage.getItem('siteLanguage') || 'en';
  const t = translations[lang];
  const form = e.target;
  const sendBtn = document.getElementById('sendBtn');
  const helperText = document.getElementById('formHelperText');

  if (!form.reportValidity()) {
    helperText.textContent = 'Please complete all required fields correctly.';
    return;
  }

  const recaptchaToken = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : '';
  if (!recaptchaToken) {
    helperText.textContent = 'Please complete the reCAPTCHA verification.';
    return;
  }

  const payload = {
    name: document.getElementById('nameInput').value.trim(),
    email: document.getElementById('emailInput').value.trim(),
    subject: document.getElementById('subjectInput').value.trim(),
    message: document.getElementById('messageInput').value.trim(),
    recaptchaToken
  };

  helperText.textContent = '';
  sendBtn.disabled = true;
  sendBtn.textContent = t.sending;

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.success !== false) {
      form.reset();
      if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
      showPopup('success', t.popupSuccessTitle, result.message || t.popupSuccessMessage);
    } else {
      if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
      showPopup('error', t.popupErrorTitle, result.message || t.popupErrorMessage);
    }
  } catch (error) {
    if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
    showPopup('error', t.popupErrorTitle, t.popupErrorMessage);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = t.sendBtn;
  }
});
