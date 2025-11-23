#!/bin/bash
# Test guest quota limit

echo "Making 10 guest conversion requests..."
for i in {1..10}; do
  response=$(curl -s -X POST http://localhost:3006/api/upload \
    -F "file=@backend/test-sample.pdf" \
    -F "conversion_type=pdf_to_pptx" \
    -b /tmp/guest-cookies.txt \
    -c /tmp/guest-cookies.txt)

  error=$(echo "$response" | node -e "const data = require('fs').readFileSync(0, 'utf-8'); try { const json = JSON.parse(data); console.log(json.error || 'Success'); } catch(e) { console.log('Error parsing'); }")
  echo "Request $i: $error"
  sleep 0.5
done

echo ""
echo "Now testing 11th request (should hit quota)..."
response=$(curl -s -X POST http://localhost:3006/api/upload \
  -F "file=@backend/test-sample.pdf" \
  -F "conversion_type=pdf_to_pptx" \
  -b /tmp/guest-cookies.txt)

echo "$response" | node -e "const data = require('fs').readFileSync(0, 'utf-8'); console.log(JSON.stringify(JSON.parse(data), null, 2))"
