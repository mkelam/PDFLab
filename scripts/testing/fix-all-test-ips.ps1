$files = Get-ChildItem -Path "tests\integration" -Filter "*.test.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = $content -replace "http://localhost:3007", "http://141.136.44.168:3007"
    Set-Content $file.FullName -Value $newContent -NoNewline
    Write-Host "Updated: $($file.Name)"
}

Write-Host "Done! All test files now use external VPS IP."
