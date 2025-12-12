"""
Simple SMTP test script to verify Hostinger email credentials.
Tests both port 465 (SSL) and port 587 (STARTTLS).
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def test_smtp_connection(host, port, username, password, use_ssl=True):
    """Test SMTP connection with given credentials."""
    print(f"\n{'='*60}")
    print(f"Testing SMTP connection:")
    print(f"  Host: {host}")
    print(f"  Port: {port}")
    print(f"  Username: {username}")
    print(f"  Password: {'*' * len(password)}")
    print(f"  SSL: {use_ssl}")
    print(f"{'='*60}\n")

    try:
        if port == 465 and use_ssl:
            # Port 465 uses SSL from the start
            print("Connecting with SSL (port 465)...")
            server = smtplib.SMTP_SSL(host, port, timeout=10)
            print("SSL connection established")
        else:
            # Port 587 uses STARTTLS
            print("Connecting without SSL (port 587)...")
            server = smtplib.SMTP(host, port, timeout=10)
            print("Connection established")
            print("Starting TLS...")
            server.starttls()
            print("TLS started")

        # Enable debug output
        server.set_debuglevel(1)

        # Login
        print(f"\nAttempting login with username: {username}")
        server.login(username, password)
        print("Login successful!")

        # Send test email
        print("\nPreparing test email...")
        msg = MIMEMultipart()
        msg['From'] = f"PDFLab <{username}>"
        msg['To'] = username  # Send to self
        msg['Subject'] = "SMTP Test - PDFLab"

        body = """
        <html>
        <body>
            <h2>SMTP Test Successful!</h2>
            <p>This is a test email from PDFLab.</p>
            <p>Your Hostinger SMTP credentials are working correctly.</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))

        print(f"Sending test email to {username}...")
        server.send_message(msg)
        print("Test email sent successfully!")

        # Also send to mmkela@fnb.co.za
        print(f"\nSending test email to mmkela@fnb.co.za...")
        msg2 = MIMEMultipart()
        msg2['From'] = f"PDFLab <{username}>"
        msg2['To'] = "mmkela@fnb.co.za"
        msg2['Subject'] = "PDFLab - Email Verification Test"

        body2 = """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4F46E5;">Welcome to PDFLab!</h2>
            <p>This is a test verification email from PDFLab.</p>
            <p>Your email verification system is now fully functional with Hostinger SMTP!</p>
            <p><strong>Click below to verify your email:</strong></p>
            <a href="http://localhost:3000/verify-email?token=TEST_TOKEN_123456"
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
                Verify Email Address
            </a>
            <p style="color: #666; font-size: 14px;">
                This is a test email to confirm the email system is working.
            </p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                If you didn't request this, please ignore this email.
            </p>
        </body>
        </html>
        """
        msg2.attach(MIMEText(body2, 'html'))
        server.send_message(msg2)
        print("Test email to mmkela@fnb.co.za sent successfully!")

        # Close connection
        server.quit()
        print("Connection closed\n")

        print("="*60)
        print("ALL TESTS PASSED - SMTP credentials are working!")
        print("="*60)
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"\nAUTHENTICATION FAILED!")
        print(f"   Error: {e}")
        print(f"\n   Possible causes:")
        print(f"   1. Incorrect password")
        print(f"   2. Email account doesn't exist")
        print(f"   3. SMTP access disabled in Hostinger")
        print(f"   4. Two-factor authentication enabled")
        return False

    except smtplib.SMTPException as e:
        print(f"\nSMTP ERROR!")
        print(f"   Error: {e}")
        return False

    except Exception as e:
        print(f"\nCONNECTION ERROR!")
        print(f"   Error: {e}")
        return False


if __name__ == "__main__":
    print("\n" + "="*60)
    print("PDFLab - Hostinger SMTP Credentials Test")
    print("="*60)

    # Credentials from .env
    HOST = "smtp.hostinger.com"
    USERNAME = "support@pdflab.pro"
    PASSWORD = os.environ.get("SMTP_PASS")
    if not PASSWORD:
        raise SystemExit("Missing environment variable: SMTP_PASS")

    print("\nTesting with your Hostinger credentials:")
    print(f"  Email: {USERNAME}")
    print(f"  Domain: pdflab.pro")

    # Test port 465 (SSL)
    print("\n\nTEST 1: Port 465 with SSL")
    success_465 = test_smtp_connection(HOST, 465, USERNAME, PASSWORD, use_ssl=True)

    # Test port 587 (STARTTLS)
    print("\n\nTEST 2: Port 587 with STARTTLS")
    success_587 = test_smtp_connection(HOST, 587, USERNAME, PASSWORD, use_ssl=False)

    # Summary
    print("\n\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Port 465 (SSL):       {'PASSED' if success_465 else 'FAILED'}")
    print(f"Port 587 (STARTTLS):  {'PASSED' if success_587 else 'FAILED'}")
    print("="*60)

    if success_465 or success_587:
        print("\nAt least one connection method works!")
        print("   The application should be able to send emails.")
        if success_465:
            print("\n   Recommended: Use port 465 in .env file")
        elif success_587:
            print("\n   Recommended: Use port 587 in .env file")
    else:
        print("\nBoth connection methods failed!")
        print("\n   Please check:")
        print("   1. Email account exists in Hostinger (hpanel.hostinger.com)")
        print("   2. Password is correct")
        print("   3. SMTP/Email sending is enabled")
        print("   4. No typos in email address")
        print("\n   You can test login manually at: https://webmail.hostinger.com")

    print("\n")
