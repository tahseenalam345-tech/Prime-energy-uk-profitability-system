param (
    [Parameter(Mandatory=$true)][string]$docxPath,
    [Parameter(Mandatory=$true)][string]$pdfPath
)

$ErrorActionPreference = "Stop"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = [Microsoft.Office.Interop.Word.WdAlertLevel]::wdAlertsNone

try {
    $doc = $word.Documents.Open($docxPath)
    $doc.SaveAs([ref]$pdfPath, [ref]17) # 17 = wdFormatPDF
    $doc.Close([ref]0) # 0 = wdDoNotSaveChanges
    Write-Host "SUCCESS: PDF generated successfully at $pdfPath"
} catch {
    Write-Error "Failed to convert DOCX to PDF: $_"
    exit 1
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
