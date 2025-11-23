$files = Get-ChildItem -Path "tests\integration" -Filter "*.test.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Replace the environment-based URL to use external VPS IP
    $newContent = $content -replace "const API_BASE_URL = process\.env\.TEST_ENV === 'vps' \? 'http://localhost:3007' : 'http://localhost:3006'", "const API_BASE_URL = process.env.TEST_ENV === 'vps' ? 'http://141.136.44.168:3007' : 'http://localhost:3006'"
    Set-Content $file.FullName -Value $newContent -NoNewline
    Write-Host "Updated: $($file.Name)"
}

Write-Host "Done! Updated all test files to use external VPS IP."
