import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function json(res, statusCode, payload) {
  res.status(statusCode).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function verifyRecaptcha(token, remoteIp) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.append("remoteip", remoteIp);
  }

  const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("reCAPTCHA verification request failed");
  }

  return response.json();
}

function sanitize(value) {
  return String(value || "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      success: false,
      message: "Method not allowed.",
    });
  }

  try {
    const {
      name = "",
      email = "",
      subject = "",
      message = "",
      recaptchaToken = "",
    } = req.body || {};

    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email);
    const cleanSubject = sanitize(subject);
    const cleanMessage = sanitize(message);
    const cleanToken = sanitize(recaptchaToken);

    if (!cleanName || !cleanEmail || !cleanMessage || !cleanToken) {
      return json(res, 400, {
        success: false,
        message: "Please complete all required fields.",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(cleanEmail)) {
      return json(res, 400, {
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const recaptchaResult = await verifyRecaptcha(
      cleanToken,
      req.headers["x-forwarded-for"] || ""
    );

    if (!recaptchaResult.success) {
      return json(res, 400, {
        success: false,
        message: "reCAPTCHA verification failed. Please try again.",
      });
    }

    await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL,
      to: [process.env.CONTACT_TO_EMAIL],
      reply_to: cleanEmail,
      subject: cleanSubject
        ? `Website enquiry: ${cleanSubject}`
        : "Website enquiry: New contact form submission",
      text: [
        "New website enquiry",
        "",
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Subject: ${cleanSubject || "-"}`,
        "",
        "Message:",
        cleanMessage,
      ].join("\n"),
    });

    return json(res, 200, {
      success: true,
      message: "Your message has been sent successfully.",
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return json(res, 500, {
      success: false,
      message: "Unable to send your message right now. Please try again later.",
    });
  }
}
