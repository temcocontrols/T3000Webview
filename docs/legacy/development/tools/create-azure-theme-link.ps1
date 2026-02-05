# Create symbolic link for Azure Theme reference files
# This creates a link from the workspace to the Azure-Theme folder

$sourcePath = "D:\1025\github\temcocontrols\T3_Copilot\Azure-Theme"
$linkPath = "d:\1025\github\temcocontrols\T3000Webview5\docs\azure-theme"

# Remove the empty directory first
if (Test-Path $linkPath) {
    Remove-Item $linkPath -Force -Recurse
}

# Create the symbolic link (requires Administrator privileges)
New-Item -ItemType SymbolicLink -Path $linkPath -Target $sourcePath

Write-Host "Symbolic link created successfully!" -ForegroundColor Green
Write-Host "Link: $linkPath"
Write-Host "Target: $sourcePath"
