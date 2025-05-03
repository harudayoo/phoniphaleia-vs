<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Your OTP Code</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f9f9f9; }
      .container { background: #fff; padding: 32px; border-radius: 8px; max-width: 400px; margin: 40px auto; box-shadow: 0 2px 8px rgba(0,0,0,0.07);}
      .otp { font-size: 2em; letter-spacing: 8px; color: #2d7ff9; margin: 24px 0; }
      .footer { font-size: 0.9em; color: #888; margin-top: 32px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h2>Your One-Time Password (OTP)</h2>
      <p>Use the code below to continue your authentication process:</p>
      <div class="otp">{{ otp }}</div>
      <p>This code will expire in 5 minutes.</p>
      <div class="footer">
        If you did not request this, please ignore this email.<br/>
        &copy; {{ year }} Phoniphaleia
      </div>
    </div>
  </body>
</html>