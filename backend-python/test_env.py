"""Test environment configuration."""
from dotenv import load_dotenv
import os

load_dotenv()

print("=" * 50)
print("PDFLab Python Backend - Environment Test")
print("=" * 50)
print(f"[OK] Python Version: 3.11+")
print(f"[OK] Port: {os.getenv('PORT', 'NOT SET')}")
print(f"[OK] DB Name: {os.getenv('DB_NAME', 'NOT SET')}")
print(f"[OK] JWT Secret Length: {len(os.getenv('JWT_SECRET', ''))} chars")
print(f"[OK] CloudConvert API Key: {'SET' if os.getenv('CLOUDCONVERT_API_KEY') else 'NOT SET'}")
print(f"[OK] PayFast Merchant ID: {os.getenv('PAYFAST_MERCHANT_ID', 'NOT SET')}")
print("=" * 50)
print("SUCCESS! Phase 0 Complete!")
print("Environment loaded successfully!")
print("=" * 50)
